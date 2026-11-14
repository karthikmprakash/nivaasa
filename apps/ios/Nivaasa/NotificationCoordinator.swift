import UIKit
import UserNotifications
import Combine
import OSLog

enum GateNotification {
    static let category = "VISITOR_AT_GATE"
    static let accept = "VISITOR_ACCEPT"
    static let reject = "VISITOR_REJECT"
    static let call = "VISITOR_CALL"
    static let openVisitors = Notification.Name("nivaasa.openVisitors")
    static let logger = Logger(subsystem: "app.nivaasa.community", category: "gate-notifications")
}

@MainActor
final class NotificationRouter: ObservableObject {
    static let shared = NotificationRouter()
    @Published var openVisitors = false
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        Task { @MainActor in PushRegistration.shared.configure() }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in PushRegistration.shared.receivedDeviceToken(deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Free development provisioning has no push entitlement. Local previews
        // and simulator pushes still exercise the complete notification UI.
        #if DEBUG
        print("Remote notification registration unavailable: \(error.localizedDescription)")
        #endif
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound, .badge]
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let content = response.notification.request.content
        let info = content.userInfo
        let visitorId = info["visitorId"] as? String
        let phone = (info["callPhone"] as? String)?.filter { $0.isNumber || $0 == "+" } ?? ""

        switch response.actionIdentifier {
        case GateNotification.accept, GateNotification.reject:
            guard let visitorId, let stored = SessionVault.load() else { return }
            let action = response.actionIdentifier == GateNotification.accept ? "approve" : "deny"
            await MainActor.run { Haptics.shared.play(action == "approve" ? .success : .error) }
            do {
                _ = try await API.request("visitors/\(visitorId)/respond", token: stored.account.token, body: ["action": action])
            } catch {
                await MainActor.run { Haptics.shared.play(.error) }
                await postActionFailure(action: action, message: error.localizedDescription)
            }
        case GateNotification.call:
            if !phone.isEmpty, let url = URL(string: "tel:" + phone) {
                await MainActor.run { UIApplication.shared.open(url, options: [:], completionHandler: nil) }
            } else {
                await MainActor.run { NotificationRouter.shared.openVisitors = true }
            }
        default:
            if visitorId != nil {
                await MainActor.run { NotificationRouter.shared.openVisitors = true }
            }
        }
    }

    private func postActionFailure(action: String, message: String) async {
        let content = UNMutableNotificationContent()
        content.title = action == "approve" ? "Could not accept visitor" : "Could not reject visitor"
        content.body = message
        content.sound = .default
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        try? await UNUserNotificationCenter.current().add(request)
    }
}

@MainActor
final class PushRegistration {
    static let shared = PushRegistration()
    private let tokenKey = "nivaasa.pendingAPNSToken"
    private var activated = false

    func configure() {
        let accept = UNNotificationAction(identifier: GateNotification.accept, title: "Accept", options: [.authenticationRequired])
        let reject = UNNotificationAction(identifier: GateNotification.reject, title: "Reject", options: [.destructive, .authenticationRequired])
        let call = UNNotificationAction(identifier: GateNotification.call, title: "Call", options: [.foreground])
        let category = UNNotificationCategory(identifier: GateNotification.category, actions: [accept, reject, call], intentIdentifiers: [], options: [.customDismissAction])
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    func activate() {
        guard !ProcessInfo.processInfo.arguments.contains("--ui-testing"), !activated else { return }
        guard SessionVault.load() != nil else { return }
        activated = true
        Task {
            let center = UNUserNotificationCenter.current()
            let settings = await center.notificationSettings()
            var allowed = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
            if settings.authorizationStatus == .notDetermined {
                allowed = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            }
            if allowed {
                UIApplication.shared.registerForRemoteNotifications()
            }
            if let pending = UserDefaults.standard.string(forKey: tokenKey) {
                await upload(token: pending)
            }
        }
    }

    func authorizationStatus() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let status = await center.notificationSettings().authorizationStatus
        if status == .notDetermined {
            let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            if granted { UIApplication.shared.registerForRemoteNotifications() }
            return granted
        }
        if [.authorized, .provisional, .ephemeral].contains(status) {
            UIApplication.shared.registerForRemoteNotifications()
            return true
        }
        return false
    }

    func receivedDeviceToken(_ data: Data) {
        let token = data.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(token, forKey: tokenKey)
        Task { await upload(token: token) }
    }

    func unregister() {
        guard let token = UserDefaults.standard.string(forKey: tokenKey), let stored = SessionVault.load() else { return }
        UserDefaults.standard.removeObject(forKey: tokenKey)
        Task {
            _ = try? await API.request("mobile/push/unregister", token: stored.account.token, body: ["token": token])
        }
    }

    private func upload(token: String) async {
        guard let stored = SessionVault.load() else { return }
        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif
        _ = try? await API.request("mobile/push", token: stored.account.token, body: [
            "token": token,
            "environment": environment,
            "bundleId": Bundle.main.bundleIdentifier ?? "app.nivaasa.community",
            "deviceName": String(UIDevice.current.name.prefix(120)),
        ])
    }

    func previewGateAlert() async throws {
        GateNotification.logger.notice("Gate alert preview requested")
        let status = await authorizationStatus()
        guard [.authorized, .provisional, .ephemeral].contains(status) else {
            throw APIError(message: "Notifications are off. Enable gate alerts first.")
        }
        guard let stored = SessionVault.load() else { throw APIError(message: "Sign in first.") }
        let raw = try? await API.request("mobile/visitors", token: stored.account.token)
        let data = (raw.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }) ?? [:]
        let pending = rows(data["pending"])
        let visitor: [String: Any] = pending.first ?? [
            "id": "preview", "name": "Yash Sharma", "company": "Swiggy",
            "purpose": "Food delivery", "notes": "2 bags — order #SW-884211",
            "photoColor": "#fde8ef", "phone": "+91 98765 44332",
        ]
        let name = string(visitor, "name", fallback: "Visitor")
        let company = string(visitor, "company")
        let purpose = string(visitor, "purpose", fallback: "Visitor at the gate")
        let content = UNMutableNotificationContent()
        content.title = "\(name) is at the gate"
        content.subtitle = "\(company.isEmpty ? "" : company + " · ")Home \(stored.session.unit?.number ?? "")"
        content.body = purpose + (string(visitor, "notes").isEmpty ? "" : " · " + string(visitor, "notes"))
        content.sound = .default
        content.categoryIdentifier = GateNotification.category
        content.threadIdentifier = "visitor-" + string(visitor, "id")
        content.userInfo = [
            "visitorId": string(visitor, "id"),
            "visitorName": name,
            "photoColor": string(visitor, "photoColor", fallback: "#3155d8"),
            "callPhone": string(visitor, "phone"),
            "unitNumber": stored.session.unit?.number ?? "",
        ]
        // Prefer the real gate photo when the guard captured one; fall back to the avatar.
        if let real = await photoAttachment(visitor: visitor, token: stored.account.token) {
            content.attachments = [real]
        } else if let attachment = avatarAttachment(name: name, color: string(visitor, "photoColor", fallback: "#3155d8")) {
            content.attachments = [attachment]
        }
        let request = UNNotificationRequest(identifier: "visitor-preview-\(UUID().uuidString)", content: content, trigger: nil)
        do {
            try await UNUserNotificationCenter.current().add(request)
            GateNotification.logger.notice("Gate alert preview scheduled")
        } catch {
            GateNotification.logger.error("Gate alert preview failed: \(error.localizedDescription, privacy: .public)")
            content.attachments = []
            try await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: request.identifier, content: content, trigger: nil))
            GateNotification.logger.notice("Gate alert preview scheduled without image")
        }
    }

    /// Downloads the gate photo with the stored session token and attaches it as a file.
    private func photoAttachment(visitor: [String: Any], token: String) async -> UNNotificationAttachment? {
        let id = string(visitor, "id")
        guard !id.isEmpty, id != "preview", !string(visitor, "photoUrl").isEmpty else { return nil }
        guard let data = try? await API.request("visitors/\(id)/photo", token: token),
              let image = UIImage(data: data),
              let jpeg = image.jpegData(compressionQuality: 0.85) else { return nil }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("gate-\(id).jpg")
        guard (try? jpeg.write(to: url)) != nil else { return nil }
        return try? UNNotificationAttachment(identifier: "gate-photo", url: url, options: nil)
    }

    private func avatarAttachment(name: String, color: String) -> UNNotificationAttachment? {
        let size = CGSize(width: 512, height: 512)
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { context in
            context.cgContext.setFillColor(UIColor(hex: color).cgColor)
            context.cgContext.fill(CGRect(origin: .zero, size: size))
            let initials = name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined()
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 190, weight: .bold),
                .foregroundColor: UIColor.white,
            ]
            let textSize = initials.size(withAttributes: attributes)
            initials.draw(at: CGPoint(x: (size.width - textSize.width) / 2, y: (size.height - textSize.height) / 2), withAttributes: attributes)
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("gate-\(UUID().uuidString).png")
        guard let data = image.pngData(), (try? data.write(to: url)) != nil else { return nil }
        return try? UNNotificationAttachment(identifier: "visitor-avatar", url: url, options: nil)
    }
}

private extension UIColor {
    convenience init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        self.init(
            red: CGFloat((value >> 16) & 0xff) / 255,
            green: CGFloat((value >> 8) & 0xff) / 255,
            blue: CGFloat(value & 0xff) / 255,
            alpha: 1
        )
    }
}
