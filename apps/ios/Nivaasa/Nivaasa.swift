import SwiftUI

struct Account: Codable {
    struct User: Codable { let name: String; let globalRole: String; let avatarColor: String?; let email: String? }
    struct Membership: Codable { let role: String; let unitId: String? }
    let token: String
    let user: User
    let membership: Membership?
    let home: String
}

struct Session: Codable {
    struct Society: Codable { let name: String; let city: String; let address: String? }
    struct Unit: Codable { let number: String; let type: String; let areaSqft: Int }
    let society: Society
    let unit: Unit?
}

struct APIError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

enum API {
    // Native identity is carried only by the explicit bearer token, never by a
    // stale browser cookie left by an earlier account or document request.
    static let session: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        return URLSession(configuration: configuration)
    }()

    /// Public (non-/api) base of the same server, for shareable links such as invite pages.
    static var publicBase: String {
        var endpoint = Bundle.main.object(forInfoDictionaryKey: "NivaasaAPIURL") as? String ?? ""
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--isolated-api") { endpoint = "http://localhost:3101" }
        #endif
        return endpoint
    }

    static func request(_ path: String, token: String? = nil, body: [String: Any]? = nil, post: Bool = false) async throws -> Data {
        let base = publicBase
        guard let url = URL(string: base + "/api/" + path) else {
            throw APIError(message: "The server address is invalid.")
        }
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.httpMethod = post || body != nil ? "POST" : "GET"
        if let token { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
            let payload = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError(message: payload?["error"] ?? "The server could not complete this request.")
        }
        return data
    }

    /// Multipart POST for gate entry with an optional visitor photo.
    static func upload(_ path: String, token: String?, fields: [String: String], photo: (data: Data, name: String, mime: String)? = nil) async throws -> Data {
        let base = publicBase
        guard let url = URL(string: base + "/api/" + path) else {
            throw APIError(message: "The server address is invalid.")
        }
        var request = URLRequest(url: url, timeoutInterval: 60)
        request.httpMethod = "POST"
        if let token { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        func line(_ s: String) { body.append(s.data(using: .utf8)!) }
        for (key, value) in fields {
            line("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(key)\"\r\n\r\n\(value)\r\n")
        }
        if let photo {
            line("--\(boundary)\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"\(photo.name)\"\r\nContent-Type: \(photo.mime)\r\n\r\n")
            body.append(photo.data)
            line("\r\n")
        }
        line("--\(boundary)--\r\n")
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
            let payload = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError(message: payload?["error"] ?? "The server could not complete the request.")
        }
        return data
    }
}

enum Destination: String, CaseIterable, Identifiable {
    case home, search, visitors, community, payments, helpdesk, gate, manage, deliveries, directory, documents, amenities, household, settings, emergency, notifications
    var id: String { rawValue }
    var title: String {
        switch self {
        case .home: "Home"
        case .search: "Search your community"
        case .community: "Community"
        case .manage: "Overview"
        case .gate: "Gate"
        case .household: "My home"
        default: rawValue.capitalized
        }
    }
    var icon: String {
        switch self {
        case .home: "house"
        case .search: "magnifyingglass"
        case .visitors: "person.crop.circle.badge.checkmark"
        case .community: "newspaper"
        case .payments: "wallet.bifold"
        case .deliveries: "shippingbox"
        case .helpdesk: "wrench.and.screwdriver"
        case .gate: "shield.lefthalf.filled"
        case .manage: "chart.bar.xaxis"
        case .directory: "book.closed"
        case .documents: "doc.text"
        case .amenities: "calendarheart"
        case .household: "house"
        case .settings: "gearshape"
        case .emergency: "exclamationmark.shield"
        case .notifications: "bell"
        }
    }
}

@main
struct Nivaasa: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    var body: some Scene { WindowGroup { RootView().tint(NK.brand600).preferredColorScheme(.light) } }
}

struct RootView: View {
    @State private var account: Account?
    @State private var session: Session?
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var busy = false
    @State private var tab = "Home"
    @State private var showServices = false
    @State private var showNotifications = false
    @State private var unread = 0

    init() {
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--ui-testing") || arguments.contains("--notification-test") {
            SessionVault.clear()
        }
        if let stored = SessionVault.load() {
            _account = State(initialValue: stored.account)
            _session = State(initialValue: stored.session)
            _tab = State(initialValue: stored.account.home == "/app" ? "Home" : "Overview")
        }
    }

    var body: some View {
        Group {
            if let account, let session {
                if account.home == "/app" {
                    ResidentShell(account: account, session: session, tab: $tab, unread: $unread, showServices: $showServices, showNotifications: $showNotifications, onSignOut: signOut)
                } else if account.home == "/gate" {
                    StaffShell(account: account, session: session, isGuard: true, unread: $unread, showServices: $showServices, showNotifications: $showNotifications, onSignOut: signOut)
                } else {
                    StaffShell(account: account, session: session, isGuard: false, unread: $unread, showServices: $showServices, showNotifications: $showNotifications, onSignOut: signOut)
                }
            } else if account != nil {
                AppWash().overlay { ProgressView("Opening your community").tint(NK.brand600) }
            } else {
                LoginView(email: $email, password: $password, error: $error, busy: $busy, signIn: signIn)
            }
        }
        .onChange(of: account?.token, initial: true) { _, token in
            if token != nil { PushRegistration.shared.activate() }
        }
    }

    private func signIn() {
        guard !busy, !email.isEmpty, !password.isEmpty else { return }
        busy = true
        error = nil
        Task {
            defer { busy = false }
            do {
                let data = try await API.request("auth/login", body: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
                let decoded = try JSONDecoder().decode(Account.self, from: data)
                let sessionData = try await API.request("auth/session", token: decoded.token)
                let decodedSession = try JSONDecoder().decode(Session.self, from: sessionData)
                account = decoded
                session = decodedSession
                SessionVault.save(StoredSession(account: decoded, session: decodedSession))
                tab = decoded.home == "/app" ? "Home" : "Overview"
                password = ""
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    private func signOut() {
        PushRegistration.shared.unregister()
        if let token = account?.token {
            Task { _ = try? await API.request("auth/logout", token: token, post: true) }
        }
        SessionVault.clear()
        account = nil
        session = nil
        password = ""
        email = ""
        tab = "Home"
        unread = 0
        showServices = false
        showNotifications = false
    }
}

// MARK: - Login

struct LoginView: View {
    @Binding var email: String
    @Binding var password: String
    @Binding var error: String?
    @Binding var busy: Bool
    let signIn: () -> Void
    @Environment(\.openURL) private var openURL

    var body: some View {
        ZStack {
            AppWash()
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 10) {
                        Image("NivaasaMark").resizable().frame(width: 34, height: 34)
                        Text("nivaasa").font(.jakarta(22, .bold)).foregroundStyle(NK.ink)
                        Text(".").font(.jakarta(22, .bold)).foregroundStyle(NK.blush400).padding(.leading, -10)
                        Spacer()
                        NivaasaTextButton(title: "Back home") { openURL(URL(string: "https://nivaasa.karthikmprakash.online")!) }
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Good to see you again.").font(.jakarta(32, .semibold)).tracking(-1.3).foregroundStyle(NK.ink)
                        Text("Sign in to your community. Use a demo persona below if you're exploring.")
                            .font(.nivaasaBody).foregroundStyle(NK.inkSoft).lineSpacing(3)
                    }
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 14) {
                            NivaasaInput(label: "Email address", text: $email, placeholder: "you@nivaasa.app", keyboard: .emailAddress, capitalization: .never, identifier: "email")
                            NivaasaInput(label: "Password", text: $password, placeholder: "Your password", secure: true, identifier: "password", onSubmit: signIn)
                            if let error {
                                Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk)
                            }
                            PrimaryButton(title: busy ? "Signing in…" : "Sign in", icon: "arrow.right", disabled: busy || email.isEmpty || password.isEmpty, run: signIn)
                            HStack(alignment: .top, spacing: 6) {
                                NivaasaIcon(name: "checkmark.shield").foregroundStyle(NK.mint600)
                                Text("Secure, role-based access. Sessions expire after 7 days. Need help? Contact your community manager.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                    }
                    HStack(spacing: 12) {
                        Rectangle().fill(NK.line).frame(height: 1)
                        Text("ONE-CLICK DEMO").font(.nivaasaCaptionMedium).tracking(1.4).foregroundStyle(NK.muted).fixedSize()
                        Rectangle().fill(NK.line).frame(height: 1)
                    }
                    VStack(spacing: 8) {
                        demo("resident", "Aarav Mehta", "Resident", "Verdant Heights · A-402", NK.brand50)
                        demo("admin", "Priya Nair", "Community admin", "Verdant Heights", NK.blush100)
                        demo("guard", "Rajesh Yadav", "Security guard", "Gate 1 · Morning shift", NK.mint50)
                        demo("accountant", "Sanjay Rao", "Accountant", "Billing & reports", NK.brand50)
                    }
                    Text("Password for all demo accounts: demo1234").font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                .frame(maxWidth: 420)
                .padding(20)
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func demo(_ role: String, _ name: String, _ title: String, _ detail: String, _ color: Color) -> some View {
        Button {
            email = role + "@nivaasa.app"; password = "demo1234"
            signIn()
        } label: {
            HStack(spacing: 10) {
                NivaasaAvatar(name: name, color: color, size: 32)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                    Text(detail).font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                Spacer()
                NivaasaIcon(name: "arrow.right").foregroundStyle(NK.muted)
            }.padding(.horizontal, 12).padding(.vertical, 10)
                .background(NK.surface, in: RoundedRectangle(cornerRadius: 12))
                .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(NK.line) }
        }.buttonStyle(NivaasaPressStyle()).disabled(busy).accessibilityIdentifier("demo-" + role)
    }
}

// MARK: - Resident shell

struct ResidentShell: View {
    let account: Account
    let session: Session
    @Binding var tab: String
    @Binding var unread: Int
    @Binding var showServices: Bool
    @Binding var showNotifications: Bool
    let onSignOut: () -> Void
    @State private var menu: WebMenu?
    @State private var page: Destination = .home
    @State private var notice: NoticeSelection?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ObservedObject private var router = NotificationRouter.shared
    @State private var ticketID: String?

    private var pageTitle: String {
        switch tab {
        case "Community": "Community"
        case "Visitors": "Visitors"
        case "Pay": "Payments"
        case "More": "More"
        default: "Home"
        }
    }

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                NivaasaTopBar(unread: unread, userName: account.user.name,
                    onMenu: { menu = .navigation }, onSearch: { go(.search) },
                    onNotifications: { go(.notifications) }, onAccount: { menu = .account })
                Group {
                    if let notice {
                        NoticeDetail(notice: notice.notice)
                    } else {
                        switch page {
                        case .home: ResidentHomeView(account: account, session: session, openTab: selectTab, openServices: { menu = .services }, unread: $unread)
                        case .community: CommunityScreen(token: account.token)
                        case .visitors: VisitorsScreen(token: account.token, host: VisitorPassHost(account: account, session: session), societyAddress: session.society.address ?? "")
                        case .payments: PaymentsScreen(token: account.token, session: session)
                        case .helpdesk: HelpdeskScreen(token: account.token, initialTicket: ticketID)
                        case .deliveries: DeliveriesScreen(token: account.token, host: VisitorPassHost(account: account, session: session))
                        case .directory: DirectoryScreen(token: account.token)
                        case .documents: DocumentsScreen(token: account.token)
                        case .amenities: AmenitiesScreen(token: account.token)
                        case .household: HouseholdScreen(account: account, session: session)
                        case .settings: SettingsScreen(account: account, session: session)
                        case .emergency: EmergencyScreen(token: account.token)
                        case .notifications: NotificationsScreen(token: account.token, onUnreadChanged: { unread = $0 })
                        case .search: SearchScreen(token: account.token)
                        default: ResidentHomeView(account: account, session: session, openTab: selectTab, openServices: { menu = .services }, unread: $unread)
                        }
                    }
                }
                .id(notice?.id ?? page.rawValue)
                .transition(NivaasaMotion.pageTransition)
                .animation(NivaasaMotion.spring(reduceMotion), value: notice?.id ?? page.rawValue)
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("native-page-" + (notice == nil ? page.rawValue : "notice"))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .environment(\.nivaasaNavigate, go)
                .environment(\.nivaasaNotice, { notice = NoticeSelection(notice: $0) })
                .environment(\.nivaasaBack, { notice = nil })
                .environment(\.nivaasaTicket, { id in
                    go(.helpdesk)
                    ticketID = id
                })
                NivaasaBottomBar(selection: quickSelection, unread: unread, onSelect: selectTab)
            }
            if let menu {
                WebMenuLayer(menu: menu, account: account, session: session, current: page.title,
                    close: { self.menu = nil }, navigate: go, signOut: signOut)
            }
        }
        .background(AppWash())
        .onChange(of: router.openVisitors, initial: true) { _, open in
            if open {
                go(.visitors)
                router.openVisitors = false
            }
        }
    }

    private var quickSelection: String {
        switch page {
        case .home: "Home"
        case .community: "Community"
        case .visitors: "Visitors"
        case .payments: "Pay"
        default: "More"
        }
    }

    private func go(_ destination: Destination) {
        notice = nil
        ticketID = nil
        menu = nil
        page = destination
        tab = quickSelection
        Haptics.shared.play(.selection)
    }

    private func selectTab(_ value: String) {
        switch value {
        case "Community": go(.community)
        case "Visitors": go(.visitors)
        case "Pay": go(.payments)
        case "More":
            menu = .services
            Haptics.shared.play(.selection)
        default: go(.home)
        }
    }

    private func signOut() {
        Task { _ = try? await API.request("auth/logout", token: account.token, post: true) }
        onSignOut()
    }
}

struct ServicesSheet: View {
    let account: Account
    let session: Session
    @Binding var tab: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: "Navigation", subtitle: "Everything in your community.", close: { dismiss() })
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 12) {
                        NivaasaAvatar(name: account.user.name, color: NK.brand600, size: 44)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(account.user.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text("Home \(session.unit?.number ?? "—") · \(session.society.name)").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                    VStack(spacing: 2) {
                        service("Home", "house") { tab = "Home"; dismiss() }
                        service("Community", "newspaper") { tab = "Community"; dismiss() }
                        service("Visitors", "person.crop.circle.badge.checkmark") { tab = "Visitors"; dismiss() }
                        service("Payments", "wallet.bifold") { tab = "Pay"; dismiss() }
                        service("Helpdesk", "wrench.and.screwdriver") { tab = "More"; dismiss() }
                        service("Directory", "book.closed") { tab = "More"; dismiss() }
                        service("Documents", "doc.text") { tab = "More"; dismiss() }
                        service("Amenities", "calendar") { tab = "More"; dismiss() }
                        service("Settings", "gearshape") { tab = "More"; dismiss() }
                        service("Emergency", "exclamationmark.shield") { tab = "More"; dismiss() }
                    }
                    .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.card))
                    .overlay { RoundedRectangle(cornerRadius: NKRadius.card).strokeBorder(NK.line) }
                }
                .padding(16)
            }
        }
        .background(AppWash())
    }

    private func service(_ title: String, _ icon: String, run: @escaping () -> Void) -> some View {
        Button(action: run) {
            HStack(spacing: 12) {
                NivaasaIcon(name: icon, size: 18).foregroundStyle(NK.muted).frame(width: 24)
                Text(title).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                Spacer()
                NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityIdentifier("destination-" + title.lowercased())
    }
}
