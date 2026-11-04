import SwiftUI

struct Account: Decodable {
    struct User: Decodable { let name: String; let globalRole: String; let avatarColor: String? }
    struct Membership: Decodable { let role: String; let unitId: String? }
    let token: String
    let user: User
    let membership: Membership?
    let home: String
}

struct Session: Decodable {
    struct Society: Decodable { let name: String; let city: String }
    struct Unit: Decodable { let number: String; let type: String; let areaSqft: Int }
    let society: Society
    let unit: Unit?
}

struct APIError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

enum API {
    static func request(_ path: String, token: String? = nil, body: [String: Any]? = nil, post: Bool = false) async throws -> Data {
        var endpoint = Bundle.main.object(forInfoDictionaryKey: "NivaasaAPIURL") as? String
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--isolated-api") { endpoint = "http://localhost:3101" }
        #endif
        guard let base = endpoint, let url = URL(string: base + "/api/" + path) else {
            throw APIError(message: "The server address is invalid.")
        }
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.httpMethod = post || body != nil ? "POST" : "GET"
        if let token { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
            let payload = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError(message: payload?["error"] ?? "The server could not complete this request.")
        }
        return data
    }
}

enum Destination: String, CaseIterable, Identifiable {
    case visitors, community, payments, helpdesk, gate, manage, deliveries, directory, documents, amenities, household, settings, emergency, notifications
    var id: String { rawValue }
    var title: String {
        switch self {
        case .community: "Community"
        case .manage: "Overview"
        case .gate: "Gate"
        case .household: "My home"
        default: rawValue.capitalized
        }
    }
    var icon: String {
        switch self {
        case .visitors: "person.crop.circle.badge.checkmark"
        case .community: "newspaper"
        case .payments: "wallet.bifold"
        case .deliveries: "shippingbox"
        case .helpdesk: "wrench.and.screwdriver"
        case .gate: "shield.lefthalf.filled"
        case .manage: "chart.bar.xaxis"
        case .directory: "book.closed"
        case .documents: "doc.text"
        case .amenities: "calendar"
        case .household: "house"
        case .settings: "gearshape"
        case .emergency: "exclamationmark.shield"
        case .notifications: "bell"
        }
    }
}

@main
struct Nivaasa: App {
    var body: some Scene { WindowGroup { RootView().tint(NK.brand600) } }
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

    var body: some View {
        Group {
            if let account, let session {
                if account.home == "/app" {
                    ResidentShell(account: account, session: session, tab: $tab, unread: $unread, showServices: $showServices, showNotifications: $showNotifications, onSignOut: { self.account = nil; self.session = nil })
                } else if account.home == "/gate" {
                    StaffShell(account: account, session: session, isGuard: true, unread: $unread, showServices: $showServices, showNotifications: $showNotifications, onSignOut: { self.account = nil; self.session = nil })
                } else {
                    StaffShell(account: account, session: session, isGuard: false, unread: $unread, showServices: $showServices, showNotifications: $showNotifications, onSignOut: { self.account = nil; self.session = nil })
                }
            } else if account != nil {
                AppWash().overlay { ProgressView("Opening your community").tint(NK.brand600) }
            } else {
                LoginView(email: $email, password: $password, error: $error, busy: $busy, signIn: signIn)
            }
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
                tab = decoded.home == "/app" ? "Home" : "Overview"
                password = ""
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

// MARK: - Login

struct LoginView: View {
    @Binding var email: String
    @Binding var password: String
    @Binding var error: String?
    @Binding var busy: Bool
    let signIn: () -> Void
    @FocusState private var focus: Field?
    private enum Field { case email, password }

    var body: some View {
        ZStack {
            AppWash()
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 10) {
                        Image("NivaasaMark").resizable().frame(width: 40, height: 40)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("nivaasa").font(.jakarta(22, .bold)).foregroundStyle(NK.ink)
                            Text("community, in one place").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        eyebrowStyle("Welcome home")
                        Text("Your community,\nin one place.").font(.jakarta(34, .bold)).tracking(-1.3).foregroundStyle(NK.ink)
                        Text("Approvals, dues, notices and the people around you — all in one calm place.")
                            .font(.nivaasaBody).foregroundStyle(NK.inkSoft).lineSpacing(3)
                    }
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 14) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Email address").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                                TextField("you@nivaasa.app", text: $email)
                                    .textContentType(.username).keyboardType(.emailAddress)
                                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                                    .focused($focus, equals: .email)
                                    .accessibilityIdentifier("email")
                                    .font(.nivaasaBody)
                                    .padding(.horizontal, 12).frame(height: 48)
                                    .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                                    .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.lineStrong) }
                            }
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Password").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                                SecureField("Your password", text: $password)
                                    .textContentType(.password).focused($focus, equals: .password)
                                    .onSubmit(signIn).accessibilityIdentifier("password")
                                    .font(.nivaasaBody)
                                    .padding(.horizontal, 12).frame(height: 48)
                                    .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                                    .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.lineStrong) }
                            }
                            if let error {
                                Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk)
                            }
                            PrimaryButton(title: busy ? "Signing in…" : "Sign in", icon: "arrow.right", disabled: busy || email.isEmpty || password.isEmpty, run: signIn)
                        }
                    }
                    HStack(spacing: 8) {
                        Circle().fill(NK.blush400).frame(width: 6, height: 6)
                        Text("Demo accounts use demo1234").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    .frame(maxWidth: .infinity)
                }
                .frame(maxWidth: 500)
                .padding(20)
                .frame(maxWidth: .infinity)
            }
        }
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
    @State private var showSearch = false

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
        VStack(spacing: 0) {
            NivaasaTopBar(unread: unread, userName: account.user.name, onMenu: { showServices = true }, onSearch: { showSearch = true }, onNotifications: { showNotifications = true }, onAccount: { showServices = true })
            Group {
                switch tab {
                case "Community": CommunityScreen(token: account.token)
                case "Visitors": VisitorsScreen(token: account.token)
                case "Pay": PaymentsScreen(token: account.token, session: session)
                case "More": MoreScreen(account: account, session: session, unread: unread, openTab: { tab = $0 }, showServices: $showServices, onSignOut: onSignOut)
                default: ResidentHomeView(account: account, session: session, openTab: { tab = $0 }, openServices: { showServices = true }, unread: $unread)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            NivaasaBottomBar(selection: tab, unread: unread) { tab = $0 }
        }
        .background(AppWash())
        .sheet(isPresented: $showServices) {
            ServicesSheet(account: account, session: session, tab: $tab)
        }
        .sheet(isPresented: $showNotifications) {
            NotificationsScreen(token: account.token)
        }
        .sheet(isPresented: $showSearch) {
            SearchScreen(token: account.token)
        }
    }
}

struct ServicesSheet: View {
    let account: Account
    let session: Session
    @Binding var tab: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
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
            .background(AppWash())
            .navigationTitle("Navigation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        }
    }

    private func service(_ title: String, _ icon: String, run: @escaping () -> Void) -> some View {
        Button(action: run) {
            HStack(spacing: 12) {
                Image(systemName: icon).font(.system(size: 17, weight: .medium)).foregroundStyle(NK.muted).frame(width: 24)
                Text(title).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("destination-" + title.lowercased())
    }
}
