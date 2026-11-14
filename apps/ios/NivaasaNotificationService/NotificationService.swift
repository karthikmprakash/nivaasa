import UserNotifications
import UIKit

final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttempt: UNMutableNotificationContent?
    private let lock = NSLock()
    private var delivered = false

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
            deliver(request.content)
            return
        }
        bestAttempt = content
        if let attachment = avatarAttachment(
            name: content.userInfo["visitorName"] as? String ?? "Visitor",
            color: content.userInfo["photoColor"] as? String ?? "#3155d8"
        ) {
            content.attachments = [attachment]
        }
        guard let raw = content.userInfo["imageUrl"] as? String,
              let url = URL(string: raw), ["https", "http"].contains(url.scheme?.lowercased() ?? "") else {
            deliver(content)
            return
        }
        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, _ in
            guard let self else { return }
            if let data, data.count <= 6 * 1024 * 1024,
               let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode),
               response.mimeType?.hasPrefix("image/") == true,
               let attachment = self.photoAttachment(data: data, mime: response.mimeType ?? "image/jpeg") {
                content.attachments = [attachment]
            }
            self.deliver(content)
        }
        task.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        if let bestAttempt { deliver(bestAttempt) }
    }

    private func deliver(_ content: UNNotificationContent) {
        lock.lock()
        guard !delivered else { lock.unlock(); return }
        delivered = true
        lock.unlock()
        contentHandler?(content)
        contentHandler = nil
    }

    private func photoAttachment(data: Data, mime: String) -> UNNotificationAttachment? {
        let ext: String
        switch mime {
        case "image/png": ext = "png"
        case "image/webp": ext = "webp"
        case "image/heic": ext = "heic"
        default: ext = "jpg"
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("visitor-\(UUID().uuidString).\(ext)")
        guard (try? data.write(to: url)) != nil else { return nil }
        return try? UNNotificationAttachment(identifier: "visitor-photo", url: url, options: nil)
    }

    private func avatarAttachment(name: String, color: String) -> UNNotificationAttachment? {
        let size = CGSize(width: 512, height: 512)
        let image = UIGraphicsImageRenderer(size: size).image { context in
            context.cgContext.setFillColor(UIColor(hex: color).cgColor)
            context.cgContext.fill(CGRect(origin: .zero, size: size))
            let initials = name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined()
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 190, weight: .bold),
                .foregroundColor: UIColor.white,
            ]
            let textSize = initials.size(withAttributes: attributes)
            initials.draw(
                at: CGPoint(x: (size.width - textSize.width) / 2, y: (size.height - textSize.height) / 2),
                withAttributes: attributes
            )
        }
        guard let data = image.pngData() else { return nil }
        return photoAttachment(data: data, mime: "image/png")
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
