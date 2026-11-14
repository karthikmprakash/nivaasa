import SwiftUI

private struct NavigateKey: EnvironmentKey { static let defaultValue: (Destination) -> Void = { _ in } }
private struct NoticeRouteKey: EnvironmentKey { static let defaultValue: ([String: Any]) -> Void = { _ in } }
private struct TicketRouteKey: EnvironmentKey { static let defaultValue: (String) -> Void = { _ in } }
private struct BackKey: EnvironmentKey { static let defaultValue: () -> Void = {} }

extension EnvironmentValues {
    var nivaasaNavigate: (Destination) -> Void {
        get { self[NavigateKey.self] }
        set { self[NavigateKey.self] = newValue }
    }
    var nivaasaNotice: ([String: Any]) -> Void {
        get { self[NoticeRouteKey.self] }
        set { self[NoticeRouteKey.self] = newValue }
    }
    var nivaasaTicket: (String) -> Void {
        get { self[TicketRouteKey.self] }
        set { self[TicketRouteKey.self] = newValue }
    }
    var nivaasaBack: () -> Void {
        get { self[BackKey.self] }
        set { self[BackKey.self] = newValue }
    }
}

enum WebMenu { case navigation, account, services }

struct WebMenuLayer: View {
    let menu: WebMenu
    let account: Account
    let session: Session
    let current: String
    let close: () -> Void
    let navigate: (Destination) -> Void
    let signOut: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var groups: [(String, [Destination])] {
        if account.home == "/app" {
            return [("Community", [.home, .community, .directory, .documents]),
                    ("Everyday services", [.visitors, .deliveries, .helpdesk, .amenities, .payments]),
                    ("Household", [.household, .settings])]
        }
        let role = account.membership?.role ?? ""
        var result: [(String, [Destination])] = [("Overview", [.manage])]
        if ["admin", "manager", "security_manager", "guard"].contains(role) || account.user.globalRole == "super_admin" { result.append(("Operations", [.gate])) }
        if ["admin", "manager", "accountant", "committee", "auditor"].contains(role) || account.user.globalRole == "super_admin" { result.append(("Finance", [.payments])) }
        return result
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: menu == .navigation ? .leading : menu == .account ? .topTrailing : .bottom) {
                Color.black.opacity(menu == .account ? 0 : 0.45)
                    .contentShape(Rectangle()).onTapGesture(perform: close)
                    .accessibilityLabel("Dismiss menu").accessibilityAddTraits(.isButton)
                    .animation(NivaasaMotion.quick(reduceMotion), value: menu)
                if menu == .navigation {
                    drawer(width: min(320, geometry.size.width - 40))
                        .transition(.move(edge: .leading).combined(with: .opacity))
                }
                if menu == .account {
                    accountMenu.frame(width: min(accountMenuWidth, geometry.size.width - 32)).padding(.trailing, 16).padding(.top, 60)
                        .transition(.move(edge: .top).combined(with: .opacity).combined(with: .scale(scale: 0.96, anchor: .topTrailing)))
                }
                if menu == .services {
                    services.frame(height: min(CGFloat((serviceItems.count + 1) / 2) * 64 + 112, geometry.size.height * 0.88))
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(NivaasaMotion.spring(reduceMotion), value: menu)
            .accessibilityAddTraits(.isModal)
        }
        .zIndex(50)
    }

    private func drawer(width: CGFloat) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image("NivaasaMark").resizable().frame(width: 30, height: 30)
                Text("nivaasa").font(.jakarta(20, .bold)).foregroundStyle(NK.ink)
                Text(".").font(.jakarta(20, .bold)).foregroundStyle(NK.blush400).padding(.leading, -8)
                Spacer()
                closeButton
            }.padding(.horizontal, 20).frame(height: 76)
            NivaasaCard(tinted: true, padding: 12) {
                HStack(spacing: 10) {
                    NivaasaIcon(name: "house").foregroundStyle(NK.brand600).frame(width: 32, height: 32)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(session.society.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(session.unit.map { "Home \($0.number)" } ?? account.membership?.role ?? "Community")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                }
            }.padding(.horizontal, 16).padding(.bottom, 16)
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    ForEach(groups, id: \.0) { label, destinations in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(label).font(.nivaasaCaptionMedium).foregroundStyle(NK.muted).padding(.horizontal, 12).padding(.bottom, 4)
                            ForEach(destinations) { destination in
                                row(destination.title, destination.icon, current == destination.title) { navigate(destination); close() }
                            }
                        }
                    }
                }.padding(12)
            }
            Divider()
            HStack(spacing: 10) {
                NivaasaAvatar(name: account.user.name, size: 32)
                VStack(alignment: .leading, spacing: 3) {
                    Text(account.user.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    if let email = account.user.email { Text(email).font(.nivaasaCaption).foregroundStyle(NK.muted) }
                }
                Spacer()
            }.padding(16)
            row("Sign out", "rectangle.portrait.and.arrow.right", false, destructive: true) { close(); signOut() }.padding(.horizontal, 12).padding(.bottom, 12)
        }
        .frame(width: width).frame(maxHeight: .infinity)
        .background(NK.surface)
    }

    private var accountMenu: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(account.user.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink).padding(.horizontal, 12).padding(.top, 12)
            Text("\(session.unit.map { "Home \($0.number)" } ?? account.membership?.role ?? "Community") · \(session.society.name)")
                .font(.nivaasaCaption).foregroundStyle(NK.muted).padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.vertical, 4)
            if session.unit != nil { row("My home", "house", false) { navigate(.household); close() } }
            row("Settings", "gearshape", false) { navigate(.settings); close() }
            if session.unit != nil { row("Emergency", "exclamationmark.shield", false) { navigate(.emergency); close() } }
            Divider().padding(.vertical, 4)
            row("Sign out", "rectangle.portrait.and.arrow.right", false, destructive: true) { close(); signOut() }
        }
        .padding(6).background(NK.surface, in: RoundedRectangle(cornerRadius: 20))
        .overlay { RoundedRectangle(cornerRadius: 20).strokeBorder(NK.line) }
        .shadow(color: NK.ink.opacity(0.12), radius: 20, y: 10)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("account-dropdown")
    }

    private var services: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("All services").font(.jakarta(18, .semibold)).foregroundStyle(NK.ink)
                        Text(session.society.name).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Spacer()
                    closeButton
                }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(serviceItems) { destination in
                        Button { navigate(destination); close() } label: {
                            HStack(spacing: 10) {
                                NivaasaIcon(name: destination.icon, size: 20).foregroundStyle(NK.brand600)
                                Text(destination.title).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                                Spacer(minLength: 0)
                            }
                            .padding(12).frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                            .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(NK.line) }
                        }.buttonStyle(NivaasaPressStyle()).accessibilityIdentifier("service-" + destination.rawValue)
                    }
                }
            }.padding(20)
        }
        .background(NK.surface, in: UnevenRoundedRectangle(topLeadingRadius: 20, topTrailingRadius: 20))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("all-services")
    }

    private var serviceItems: [Destination] { groups.flatMap(\.1) + (session.unit != nil ? [.emergency] : []) }

    private var accountMenuWidth: CGFloat {
        let context = "\(session.unit.map { "Home \($0.number)" } ?? account.membership?.role ?? "Community") · \(session.society.name)"
        let font = UIFont(name: "PlusJakartaSans-Regular", size: 13) ?? .systemFont(ofSize: 13)
        return max(192, (context as NSString).size(withAttributes: [.font: font]).width + 36)
    }

    private var closeButton: some View {
        Button(action: close) { NivaasaIcon(name: "xmark", size: 20).foregroundStyle(NK.inkSoft).frame(width: 44, height: 44) }
            .buttonStyle(NivaasaPressStyle()).accessibilityLabel("Close menu")
    }

    private func row(_ title: String, _ icon: String, _ active: Bool, destructive: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                NivaasaIcon(name: icon, size: 16)
                Text(title).font(.nivaasaBodyMedium)
                Spacer(minLength: 0)
            }
            .foregroundStyle(destructive ? NK.dangerInk : active ? NK.brand700 : NK.inkSoft)
            .padding(.horizontal, 12).frame(minHeight: 44)
            .background(active ? NK.brand50 : .clear, in: RoundedRectangle(cornerRadius: 10))
            .contentShape(Rectangle())
        }
        .buttonStyle(NivaasaPressStyle()).accessibilityIdentifier("destination-" + title.lowercased())
    }
}
