import SwiftUI

struct StaffShell: View {
    let account: Account
    let session: Session
    let guardRole: Bool
    @Binding var unread: Int
    @Binding var showServices: Bool
    @Binding var showNotifications: Bool
    let onSignOut: () -> Void
    @State private var tab: String
    @State private var showSearch = false

    init(account: Account, session: Session, isGuard: Bool, unread: Binding<Int>, showServices: Binding<Bool>, showNotifications: Binding<Bool>, onSignOut: @escaping () -> Void) {
        self.account = account
        self.session = session
        self.guardRole = isGuard
        self._unread = unread
        self._showServices = showServices
        self._showNotifications = showNotifications
        self.onSignOut = onSignOut
        self._tab = State(initialValue: isGuard ? "Gate" : "Overview")
    }

    private var tabs: [String] { guardRole ? ["Gate", "Deliveries", "More"] : ["Overview", "Homes", "Gate", "Billing", "More"] }
    private var title: String { tab }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaTopBar(unread: unread, userName: account.user.name, onMenu: { showServices = true }, onSearch: { showSearch = true }, onNotifications: { showNotifications = true }, onAccount: { showServices = true })
            Group {
                switch tab {
                case "Homes": AdminSectionScreen(token: account.token, section: .homes)
                case "Billing": AdminSectionScreen(token: account.token, section: .billing)
                case "Gate": GuardConsoleView(token: account.token)
                case "Deliveries": GuardDeliveriesView(token: account.token)
                case "More": StaffMoreScreen(account: account, session: session, onSignOut: onSignOut)
                default:
                    if guardRole { GuardConsoleView(token: account.token) }
                    else { AdminOverviewView(token: account.token) }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            NivaasaStaffBottomBar(tabs: tabs, selection: tab) { tab = $0 }
        }
        .background(AppWash())
        .fullScreenCover(isPresented: $showServices) {
            StaffServicesSheet(account: account, session: session, tab: $tab)
        }
        .fullScreenCover(isPresented: $showNotifications) { NotificationsScreen(token: account.token) }
        .fullScreenCover(isPresented: $showSearch) { SearchScreen(token: account.token) }
    }
}

struct StaffServicesSheet: View {
    let account: Account
    let session: Session
    @Binding var tab: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: "Navigation", subtitle: session.society.name, close: { dismiss() })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 12) {
                        NivaasaAvatar(name: account.user.name, color: NK.brand600, size: 44)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(account.user.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(session.society.name).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                    NivaasaCard {
                        VStack(spacing: 0) {
                            service("Overview", "chart.bar.xaxis") { tab = "Overview"; dismiss() }
                            service("Homes", "building.2") { tab = "Homes"; dismiss() }
                            service("Gate", "shield.lefthalf.filled") { tab = "Gate"; dismiss() }
                            service("Billing", "wallet.bifold") { tab = "Billing"; dismiss() }
                            service("Notifications", "bell") { dismiss() }
                            service("More", "ellipsis.circle") { tab = "More"; dismiss() }
                        }
                    }
                }
                .padding(16)
            }
        }
        .background(AppWash())
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
        }.buttonStyle(NivaasaPressStyle())
        .accessibilityIdentifier("destination-" + title.lowercased())
    }
}

// MARK: - Admin

struct AdminOverviewView: View {
    let token: String
    @State private var data: [String: Any]?
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle("Overview")
                    Text("Community operations").font(.nivaasaPageTitle).tracking(-0.7).foregroundStyle(NK.ink)
                    Text("The pulse of your community, with the money and the gate in view.")
                        .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                }
                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if let data {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
                        StatCard(label: "Collected", value: money(number(data, "collections")), hint: "This month", tone: .blue, icon: "arrow.down.circle")
                        StatCard(label: "Outstanding", value: money(number(data, "outstanding")), hint: "\(Int(number(data, "outstandingCount"))) open invoices", tone: .pink, icon: "wallet.bifold")
                        StatCard(label: "Open requests", value: "\(Int(number(data, "openTickets")))", hint: "Helpdesk queue", icon: "wrench.and.screwdriver")
                        StatCard(label: "Homes", value: "\(Int(number(data, "units")))", hint: "\(Int(number(data, "visitors"))) gate entries this month", icon: "building.2")
                    }
                    if let payments = data["pendingPayments"] as? [[String: Any]], !payments.isEmpty {
                        NivaasaCard {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionHeading(title: "Needs attention", action: "\(payments.count) payments")
                                ForEach(Array(payments.prefix(4).enumerated()), id: \.offset) { _, row in
                                    HStack {
                                        Image(systemName: "indianrupee.circle").foregroundStyle(NK.amberInk)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("Verify \(string(row["payment"] as? [String: Any] ?? [:], "method").uppercased()) payment")
                                                .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                            Text("\(string(row, "user")) · Home \(string(row, "unit")) · \(money(number(row["payment"] as? [String: Any] ?? [:], "amount")))")
                                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right").foregroundStyle(NK.muted)
                                    }
                                }
                            }
                        }
                    }
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Quick actions").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            QuickActionTile(title: "Open the gate console", icon: "shield.lefthalf.filled") {}
                            QuickActionTile(title: "Review billing", icon: "wallet.bifold") {}
                            QuickActionTile(title: "Publish a notice", icon: "megaphone") {}
                            QuickActionTile(title: "Open reports", icon: "chart.bar") {}
                        }
                    }
                } else {
                    ProgressView().tint(NK.brand600).frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .frame(maxWidth: 600).padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24).frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/manage", token: token)
            data = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
        } catch { self.error = error.localizedDescription }
    }
}

struct AdminSectionScreen: View {
    enum Section { case homes, billing }
    let token: String
    let section: Section
    @State private var data: [String: Any]?
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle(section == .homes ? "People" : "Money")
                    Text(section == .homes ? "Residents & homes" : "Billing & accounts")
                        .font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    Text(section == .homes ? "Every home and every resident, with the financial context that matters." : "Collections, outstanding dues and the verification queue.")
                        .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                }
                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if let data {
                    if section == .billing {
                        NivaasaCard(tinted: true) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Outstanding").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                                Text(money(number(data, "outstanding"))).font(.jakarta(38, .bold)).tracking(-1).foregroundStyle(NK.ink).monospacedDigit()
                                Text("\(Int(number(data, "outstandingCount"))) open invoices").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
                            StatCard(label: "Homes", value: "\(Int(number(data, "units")))", hint: "In this community", tone: .blue, icon: "building.2")
                            StatCard(label: "Gate entries", value: "\(Int(number(data, "visitors")))", hint: "This month", tone: .pink, icon: "door.left.hand.open")
                        }
                    }
                    if let payments = data["pendingPayments"] as? [[String: Any]], !payments.isEmpty, section == .billing {
                        NivaasaCard {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionHeading(title: "Verification queue", action: "\(payments.count) waiting")
                                ForEach(Array(payments.prefix(6).enumerated()), id: \.offset) { _, row in
                                    let payment = row["payment"] as? [String: Any] ?? [:]
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("\(string(row, "user")) · Home \(string(row, "unit"))").font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                            Text("\(money(number(payment, "amount"))) · \(string(payment, "method").uppercased())").font(.nivaasaCaption).foregroundStyle(NK.muted)
                                        }
                                        Spacer()
                                        NivaasaBadge(text: "Pending", tone: .amber)
                                    }
                                }
                            }
                        }
                    }
                    if let moves = data["moves"] as? [[String: Any]], !moves.isEmpty, section == .homes {
                        NivaasaCard {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionHeading(title: "Move requests", action: "\(moves.count) pending")
                                ForEach(Array(moves.prefix(5).enumerated()), id: \.offset) { _, row in
                                    let request = row["r"] as? [String: Any] ?? [:]
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("\(string(request, "type").replacingOccurrences(of: "_", with: " ").capitalized) · Home \(string(row, "unit"))")
                                                .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                            Text("\(string(row, "user")) · \(shortDate(request["date"] as? String))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                                        }
                                        Spacer()
                                        NivaasaBadge(text: "Pending", tone: .amber)
                                    }
                                }
                            }
                        }
                    }
                } else {
                    ProgressView().tint(NK.brand600).frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .frame(maxWidth: 600).padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24).frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .task { await load() }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/manage", token: token)
            data = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - Guard

struct GuardConsoleView: View {
    let token: String
    @State private var data: [String: Any]?
    @State private var error: String?
    @State private var showVerify = false
    @State private var pending = Set<String>()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 5) {
                        eyebrowStyle("Gate & safety")
                        Text("Gate console").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                        Text("A calm gate is a safe gate. Verify every arrival.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                    }
                    Spacer(minLength: 8)
                    Button { showVerify = true } label: {
                        Image(systemName: "qrcode.viewfinder").font(.system(size: 19, weight: .semibold)).foregroundStyle(.white)
                            .frame(width: 44, height: 44).background(NK.brand600, in: Circle())
                    }.accessibilityLabel("Verify entry code")
                }
                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if let data {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
                        StatCard(label: "Waiting", value: "\(rows(data["queue"]).count)", hint: "Resident approval", tone: .pink, icon: "clock")
                        StatCard(label: "Pre-approved", value: "\(rows(data["passes"]).count)", hint: "Active passes", tone: .blue, icon: "checkmark.shield")
                    }
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionHeading(title: "Waiting at the gate", action: "\(rows(data["queue"]).count) visitors")
                            let queue = rows(data["queue"])
                            if queue.isEmpty { Text("No one waiting.").font(.nivaasaCaption).foregroundStyle(NK.muted) }
                            ForEach(Array(queue.prefix(5).enumerated()), id: \.offset) { _, visitor in
                                HStack(spacing: 10) {
                                    NivaasaAvatar(name: string(visitor, "name"), color: NK.blush100, size: 36)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(string(visitor, "name")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                        Text("\(string(visitor, "company", fallback: string(visitor, "type").capitalized)) · Home \(string(visitor, "unit"))")
                                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                                    }
                                    Spacer()
                                    NivaasaBadge(text: "Waiting", tone: .amber)
                                }
                            }
                        }
                    }
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionHeading(title: "Deliveries", action: "\(rows(data["deliveries"]).count) at gate")
                            let deliveries = rows(data["deliveries"])
                            if deliveries.isEmpty { Text("No parcels waiting.").font(.nivaasaCaption).foregroundStyle(NK.muted) }
                            ForEach(Array(deliveries.prefix(4).enumerated()), id: \.offset) { _, delivery in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(string(delivery, "company")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                        Text("Home \(string(delivery, "unit")) · \(string(delivery, "courierName"))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                                    }
                                    Spacer()
                                    if let otp = delivery["otp"] as? String, !otp.isEmpty {
                                        Text(otp).font(.jakarta(15, .bold)).foregroundStyle(NK.ink).monospacedDigit()
                                    }
                                }
                            }
                        }
                    }
                } else {
                    ProgressView().tint(NK.brand600).frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .frame(maxWidth: 600).padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24).frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .task { await load() }
        .refreshable { await load() }
        .fullScreenCover(isPresented: $showVerify) { VerifyPass(token: token) }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/gate", token: token)
            data = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
        } catch { self.error = error.localizedDescription }
    }
}

struct GuardDeliveriesView: View {
    let token: String
    @State private var deliveries: [[String: Any]] = []
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Gate & safety")
                Text("Deliveries").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                ForEach(Array(deliveries.enumerated()), id: \.offset) { _, delivery in
                    NivaasaCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(delivery, "company")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("Home \(string(delivery, "unit")) · \(string(delivery, "courierName"))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Spacer()
                            if let otp = delivery["otp"] as? String { Text(otp).font(.jakarta(16, .bold)).monospacedDigit() }
                        }
                    }
                }
                if deliveries.isEmpty { EmptyPanel(icon: "shippingbox", title: "No deliveries", detail: "Parcels will appear here.") }
            }.padding(16)
        }
        .task {
            if let raw = try? await API.request("mobile/gate", token: token),
               let data = try? JSONSerialization.jsonObject(with: raw) as? [String: Any] {
                deliveries = rows(data["deliveries"])
            }
        }
    }
}

struct StaffMoreScreen: View {
    let account: Account
    let session: Session
    let onSignOut: () -> Void
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                eyebrowStyle("Your account")
                Text("More").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                NivaasaCard {
                    HStack(spacing: 12) {
                        NivaasaAvatar(name: account.user.name, color: NK.brand600, size: 44)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(account.user.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(session.society.name).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                }
                Text("Role-aware operations, reports, staff and settings remain available in the web console.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                Button(role: .destructive) { onSignOut() } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Sign out")
                    }
                    .font(.nivaasaBodySemibold).foregroundStyle(NK.dangerInk)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(NK.dangerSoft, in: RoundedRectangle(cornerRadius: NKRadius.control))
                }.buttonStyle(NivaasaPressStyle())
            }.padding(16)
        }
    }
}
