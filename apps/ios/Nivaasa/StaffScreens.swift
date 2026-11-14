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
    @State private var menu: WebMenu?
    @State private var showVerify = false
    @State private var startWithCamera = true

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

    private var tabs: [String] {
        // "More" lives in the side drawer; the footer keeps only real tabs plus the center Scan.
        if guardRole { return ["Gate", "Activity"] }
        return canScan ? ["Overview", "Homes", "Gate", "Billing"] : ["Overview", "Homes", "Billing"]
    }
    private var title: String { tab }
    private var canScan: Bool {
        ["guard", "security_manager", "admin", "manager"].contains(account.membership?.role ?? "")
            || account.user.globalRole == "super_admin"
    }

    var body: some View {
        ZStack {
        VStack(spacing: 0) {
            NivaasaTopBar(unread: unread, userName: account.user.name, onMenu: { menu = .navigation }, onSearch: { showSearch = true }, onNotifications: { showNotifications = true }, onAccount: { menu = .account })
            Group {
                switch tab {
                case "Homes": AdminSectionScreen(token: account.token, section: .homes)
                case "Billing": AdminSectionScreen(token: account.token, section: .billing)
                case "Gate": GuardConsoleView(token: account.token, showVerify: $showVerify, startWithCamera: $startWithCamera)
                case "Activity": GuardActivityView(token: account.token)
                case "More": StaffMoreScreen(account: account, session: session, onSignOut: onSignOut)
                default:
                    if guardRole { GuardConsoleView(token: account.token, showVerify: $showVerify, startWithCamera: $startWithCamera) }
                    else { AdminOverviewView(token: account.token, canScan: canScan) }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            NivaasaStaffBottomBar(tabs: tabs, selection: tab, onSelect: { tab = $0 }, onScan: canScan ? {
                startWithCamera = true
                showVerify = true
                Haptics.shared.play(.selection)
            } : nil)
        }
        .environment(\.nivaasaNavigate, navigate)
        .background(AppWash())
        if let menu {
            WebMenuLayer(menu: menu, account: account, session: session, current: title, close: { self.menu = nil }, navigate: navigate, signOut: {
                Task { _ = try? await API.request("auth/logout", token: account.token, post: true) }
                onSignOut()
            })
        }
        }
        .fullScreenCover(isPresented: $showNotifications) { NotificationsScreen(token: account.token, standalone: true) }
        .fullScreenCover(isPresented: $showSearch) { SearchScreen(token: account.token, standalone: true) }
        .fullScreenCover(isPresented: $showVerify) {
            VerifyPass(token: account.token, startWithCamera: startWithCamera)
        }
    }

    private func navigate(_ destination: Destination) {
        menu = nil
        switch destination {
        case .gate: tab = canScan ? "Gate" : "Overview"
        case .payments: tab = "Billing"
        case .notifications: showNotifications = true
        case .settings: tab = "More"
        default: tab = "Overview"
        }
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
                NivaasaIcon(name: icon, size: 18).foregroundStyle(NK.muted).frame(width: 24)
                Text(title).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                Spacer()
                NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
        }.buttonStyle(NivaasaPressStyle())
        .accessibilityIdentifier("destination-" + title.lowercased())
    }
}

// MARK: - Admin

struct AdminOverviewView: View {
    let token: String
    let canScan: Bool
    @Environment(\.nivaasaNavigate) private var navigate
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
                                        NivaasaIcon(name: "indianrupee.circle").foregroundStyle(NK.amberInk)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("Verify \(string(row["payment"] as? [String: Any] ?? [:], "method").uppercased()) payment")
                                                .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                            Text("\(string(row, "user")) · Home \(string(row, "unit")) · \(money(number(row["payment"] as? [String: Any] ?? [:], "amount")))")
                                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                                        }
                                        Spacer()
                                        NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
                                    }
                                }
                            }
                        }
                    }
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Quick actions").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            QuickActionTile(title: "Open the gate console", icon: "shield.lefthalf.filled") { navigate(.gate) }
                            QuickActionTile(title: "Review billing", icon: "wallet.bifold") { navigate(.payments) }
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
    @Binding var showVerify: Bool
    @Binding var startWithCamera: Bool
    @State private var data: [String: Any]?
    @State private var error: String?
    @State private var pending = Set<String>()
    @State private var code = ""
    @State private var verifying = false
    @State private var match: VerifyPass.Match?
    @State private var toast: ToastItem?
    @State private var showNewEntry = false
    @State private var entrySeed = UUID()
    @State private var exiting: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle("Gate & safety")
                    Text("Gate console").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    Text("Use the Scan button in the footer to read a visitor pass, or type the six-digit code below.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                }
                NivaasaCard {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Entry code").font(.nivaasaSection).foregroundStyle(NK.ink)
                            Spacer()
                            if verifying { ProgressView().scaleEffect(0.8) }
                        }
                        Text("Checks automatically as you type the sixth digit.")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                        OtpCodeField(code: $code) { full in
                            Task { await verifyInline(full) }
                        }
                        .onChange(of: code) { _, _ in
                            if code.count < 6 { match = nil }
                        }
                        .disabled(verifying)
                    }
                }
                PrimaryButton(title: "New arrival — request approval", icon: "camera") {
                    entrySeed = UUID() // fresh form (and no reused photo) every time
                    Haptics.shared.play(.selection)
                    showNewEntry = true
                }
                .accessibilityIdentifier("new-arrival")
                if let match {
                    NivaasaCard {
                        HStack(spacing: 10) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(match.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("Home \(match.unit) · \(match.type.replacingOccurrences(of: "_", with: " ").capitalized)")
                                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Spacer()
                            NivaasaBadge(text: "Valid pass", tone: .mint)
                        }
                        if let notes = match.notes, !notes.isEmpty {
                            Text(notes).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        HStack(spacing: 8) {
                            OutlineButton(title: "Clear") {
                                code = ""
                                self.match = nil
                            }
                            PrimaryButton(title: verifying ? "Recording…" : "Record arrival", icon: "checkmark", disabled: verifying) {
                                Task { await recordInline() }
                            }
                        }
                    }
                    .transition(.opacity.combined(with: .scale(scale: 0.98, anchor: .top)))
                }
                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if let data {
                        insideNowCard(data)
                        approvedCard(data)
                        NivaasaCard {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionHeading(title: "Waiting for approval", action: "\(rows(data["queue"]).count) requests")
                                let queue = rows(data["queue"])
                                if queue.isEmpty { Text("No one waiting.").font(.nivaasaCaption).foregroundStyle(NK.muted) }
                                ForEach(Array(queue.prefix(5).enumerated()), id: \.offset) { _, visitor in
                                    HStack(spacing: 10) {
                                        VisitorIdentity(visitor: visitor, token: token, size: 36)
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
                        .id("queue-card")
                        .accessibilityIdentifier("group-queue")
                        panicAlertsCard(data)
                    } else {
                        ProgressView().tint(NK.brand600).frame(maxWidth: .infinity).padding(.top, 40)
                    }
                }
                .frame(maxWidth: 600).padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24).frame(maxWidth: .infinity)
            }
        .background(Color.clear)
        .task { await load() }
        .refreshable { await load() }
        .onChange(of: showVerify) { _, open in
            if !open { Task { await load() } }
        }
        .fullScreenCover(isPresented: $showNewEntry, onDismiss: { Task { await load() } }) {
            GateNewEntry(token: token, units: rows(data?["units"])) { message in
                showNewEntry = false
                toast = ToastItem(message, .success)
                Task { await load() }
            }
            .id(entrySeed)
        }
        .nivaasaToast($toast)
    }

    private func verifyInline(_ full: String) async {
        guard !verifying, full.count == 6 else { return }
        verifying = true
        defer { verifying = false }
        do {
            let data = try await API.request("gate/pass", token: token, body: ["code": full])
            let result = try JSONDecoder().decode(VerifyPass.Search.self, from: data)
            if let first = result.passes.first {
                match = first
                toast = ToastItem("Valid pass · \(first.name) · Home \(first.unit)", .success)
                Haptics.shared.play(.success)
            } else {
                toast = ToastItem("No active pass matches this code.", .error)
                Haptics.shared.play(.error)
            }
        } catch {
            match = nil
            toast = ToastItem(error.localizedDescription, .error)
            Haptics.shared.play(.error)
        }
    }

    private func recordInline() async {
        guard let match, !verifying else { return }
        verifying = true
        defer { verifying = false }
        do {
            let data = try await API.request("gate/entry", token: token, body: [
                "type": match.type, "unitId": match.unitId, "code": code, "passId": match.id,
            ])
            let arrival = try JSONDecoder().decode(VerifyPass.Arrival.self, from: data)
            toast = ToastItem("\(arrival.name) checked in.", .success)
            Haptics.shared.play(.success)
            code = ""
            self.match = nil
            await load()
        } catch {
            toast = ToastItem(error.localizedDescription, .error)
            Haptics.shared.play(.error)
        }
    }

    private func passWindow(_ pass: [String: Any]) -> String {
        let from = pass["validFrom"] as? String
        let to = pass["validTo"] as? String
        guard let fromDate = nivaasaDate(from), let toDate = nivaasaDate(to) else {
            return "\(shortDate(from)) – \(shortDate(to))"
        }
        let cal = communityCalendar
        let allDay = cal.isDate(fromDate, inSameDayAs: toDate)
            && cal.component(.hour, from: fromDate) == 0 && cal.component(.minute, from: fromDate) == 0
            && cal.component(.hour, from: toDate) == 23 && cal.component(.minute, from: toDate) == 59
        if allDay { return shortDate(from) }
        if cal.isDate(fromDate, inSameDayAs: toDate) {
            return "\(shortDate(from)) · \(shortTime(from))–\(shortTime(to))"
        }
        return "\(shortDate(from)) – \(shortDate(to))"
    }

    /// Approved walk-ins waiting to be admitted — tap Admit to move them Inside.
    private func approvedCard(_ data: [String: Any]) -> some View {
        let approved = rows(data["activity"]).filter {
            string($0, "status") == "approved" && !( $0["preApproved"] as? Bool ?? false )
        }
        guard !approved.isEmpty else { return AnyView(EmptyView()) }
        return AnyView(NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    SectionHeading(title: "Approved — ready to admit", action: "\(approved.count)")
                    Spacer()
                    NivaasaBadge(text: "\(approved.count)", tone: .mint, dot: true)
                }
                ForEach(Array(approved.prefix(4).enumerated()), id: \.offset) { _, entry in
                    let id = string(entry, "id")
                    HStack(spacing: 10) {
                        VisitorIdentity(visitor: entry, token: token, size: 36)
                        VStack(alignment: .leading, spacing: 2) {
                            let company = string(entry, "company")
                            Text(company.isEmpty ? string(entry, "name") : "\(string(entry, "name")) · \(company)")
                                .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                            Text("Home \(string(entry, "unit")) · \(string(entry, "type").replacingOccurrences(of: "_", with: " ").capitalized)")
                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Spacer()
                        Button {
                            Haptics.shared.play(.selection)
                            Task { await admit(id) }
                        } label: {
                            Text(exiting == id ? "…" : "Admit").font(.nivaasaCaptionMedium).foregroundStyle(NK.mint600)
                                .frame(minHeight: 36).padding(.horizontal, 12)
                                .background(NK.mint50, in: RoundedRectangle(cornerRadius: 9))
                        }
                        .buttonStyle(NivaasaPressStyle())
                        .accessibilityIdentifier("admit-" + id)
                        .disabled(exiting != nil)
                    }
                }
            }
        }
        .accessibilityIdentifier("approved-card"))
    }

    private func admit(_ id: String) async {
        guard !id.isEmpty else { return }
        exiting = id
        defer { exiting = nil }
        do {
            _ = try await API.request("gate/visitors/\(id)/entry", token: token, post: true)
            toast = ToastItem("Entry recorded — now inside.", .success)
            Haptics.shared.play(.success)
            await load()
        } catch {
            toast = ToastItem(error.localizedDescription, .error)
            Haptics.shared.play(.error)
        }
    }

    /// Active panic alerts from residents — the security emergency view.
    private func panicAlertsCard(_ data: [String: Any]) -> some View {
        let alerts = rows(data["alerts"])
        guard !alerts.isEmpty else { return AnyView(EmptyView()) }
        return AnyView(NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    NivaasaIcon(name: "exclamationmark.shield.fill", size: 18).foregroundStyle(NK.danger)
                    Text("Panic alerts").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Spacer()
                    NivaasaBadge(text: "\(alerts.count) active", tone: .danger, dot: true)
                }
                ForEach(Array(alerts.prefix(3).enumerated()), id: \.offset) { _, alert in
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Home \(string(alert, "unit")) · \(string(alert, "user"))").font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                            Text(string(alert, "message")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Spacer()
                        Text(relativeDate(alert["createdAt"] as? String)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        NivaasaBadge(text: string(alert, "status") == "open" ? "Open" : "Ack", tone: .danger)
                    }
                }
            }
        }
        .accessibilityIdentifier("panic-alerts"))
    }

    /// Who is inside right now — vendors, deliveries and cabs (guests may stay
    /// for hours, so they're tracked in Activity instead). Timer, exit, call.
    private func insideNowCard(_ data: [String: Any]) -> some View {
        let inside = rows(data["activity"]).filter {
            string($0, "status") == "entered" && !["guest", "domestic_help"].contains(string($0, "type"))
        }
        return NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    SectionHeading(title: "Inside now", action: "\(inside.count) on site")
                    Spacer()
                    if !inside.isEmpty { NivaasaBadge(text: "\(inside.count)", tone: .pink, dot: true) }
                }
                if inside.isEmpty {
                    Text("Nobody from deliveries, cabs or vendors is inside.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                ForEach(Array(inside.prefix(5).enumerated()), id: \.offset) { _, entry in
                    insideRow(entry)
                }
            }
        }
        .accessibilityIdentifier("inside-now")
    }

    private func insideRow(_ entry: [String: Any]) -> some View {
        let id = string(entry, "id")
        let type = string(entry, "type")
        let company = string(entry, "company")
        return HStack(spacing: 10) {
            VisitorIdentity(visitor: entry, token: token, size: 38)
            VStack(alignment: .leading, spacing: 2) {
                Text(company.isEmpty ? string(entry, "name") : "\(string(entry, "name")) · \(company)")
                    .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                HStack(spacing: 6) {
                    typeBadge(type)
                    Text("Home \(string(entry, "unit"))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    if let entered = entry["enteredAt"] as? String, let from = nivaasaDate(entered) {
                        ElapsedSince(from: from)
                    }
                }
            }
            Spacer()
            HStack(spacing: 6) {
                let hostPhone = string(entry, "hostPhone")
                if !hostPhone.isEmpty {
                    Button {
                        Haptics.shared.play(.tap)
                        if let url = URL(string: "tel:" + hostPhone.filter { $0.isNumber || $0 == "+" }) {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        NivaasaIcon(name: "phone", size: 16).foregroundStyle(NK.brand700)
                            .frame(width: 36, height: 36).background(NK.brand50, in: Circle())
                    }
                    .buttonStyle(NivaasaPressStyle())
                    .accessibilityIdentifier("call-resident-" + id)
                }
                Button {
                    Haptics.shared.play(.selection)
                    Task { await markExit(id) }
                } label: {
                    Text("Exit").font(.nivaasaCaptionMedium).foregroundStyle(NK.dangerInk)
                        .frame(minHeight: 36).padding(.horizontal, 10)
                        .background(NK.dangerSoft, in: RoundedRectangle(cornerRadius: 9))
                }
                .buttonStyle(NivaasaPressStyle())
                .accessibilityIdentifier("mark-exit-" + id)
                .disabled(exiting == id)
            }
        }
    }

    private func markExit(_ id: String) async {
        guard !id.isEmpty else { return }
        exiting = id
        defer { exiting = nil }
        do {
            _ = try await API.request("gate/visitors/\(id)/exit", token: token, post: true)
            toast = ToastItem("Exit recorded.", .success)
            Haptics.shared.play(.success)
            await load()
        } catch {
            toast = ToastItem(error.localizedDescription, .error)
            Haptics.shared.play(.error)
        }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/gate", token: token)
            data = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
        } catch { self.error = error.localizedDescription }
    }
}

/// Activity tab: every entry/exit/approval event today in one compact, divided
/// list — logo/photo, color-coded type, live time-inside, phone search, and
/// Admit (approved walk-ins) / Mark exit / Call icon actions.
struct GuardActivityView: View {
    let token: String
    @Environment(\.openURL) private var openURL
    @State private var entries: [[String: Any]] = []
    @State private var error: String?
    @State private var toast: ToastItem?
    @State private var busyId: String?
    @State private var query = ""
    @State private var statusFilter = "All"
    @State private var typeFilter = "All"
    @State private var sort = "Newest"

    private let statuses = ["All", "Inside", "Waiting", "Approved", "Exited", "Denied"]
    private let types = ["All", "Delivery", "Cab", "Vendor", "Guest", "Other"]
    private let sorts = ["Newest", "Oldest", "Type"]

    private var filtered: [[String: Any]] {
        var list = entries
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            list = list.filter {
                string($0, "name").lowercased().contains(q)
                    || string($0, "phone").filter(\.isNumber).contains(q.filter(\.isNumber))
                    || string($0, "unit").lowercased().contains(q)
                    || string($0, "company").lowercased().contains(q)
            }
        }
        if statusFilter != "All" {
            let map: [String: String] = ["Inside": "entered", "Waiting": "pending", "Approved": "approved", "Exited": "exited", "Denied": "denied"]
            if let status = map[statusFilter] { list = list.filter { string($0, "status") == status } }
        }
        if typeFilter != "All" {
            list = list.filter { string($0, "type") == typeFilter.lowercased() }
        }
        switch sort {
        case "Oldest": list = list.reversed()
        case "Type": list = list.sorted { (typeRank(string($0, "type")), string($0, "name")) < (typeRank(string($1, "type")), string($1, "name")) }
        default: break
        }
        return list
    }

    private func typeRank(_ type: String) -> Int {
        ["delivery", "cab", "vendor", "guest", "domestic_help", "other"].firstIndex(of: type) ?? 99
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Gate & safety")
                Text("Activity").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)

                // Phone / name / flat search — the exit flow starts here.
                NivaasaCard(padding: 10) {
                    HStack(spacing: 8) {
                        NivaasaIcon(name: "magnifyingglass", size: 16).foregroundStyle(NK.muted)
                        TextField("Search phone, name or flat — e.g. 98765 or A-402", text: $query)
                            .font(.nivaasaBody).foregroundStyle(NK.ink)
                            .autocorrectionDisabled()
                            .accessibilityIdentifier("activity-search")
                        if !query.isEmpty {
                            Button { query = "" } label: {
                                NivaasaIcon(name: "xmark", size: 13).foregroundStyle(NK.muted)
                                    .frame(width: 28, height: 28)
                            }.buttonStyle(NivaasaPressStyle())
                        }
                    }
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        filterMenu(title: "Status: \(statusFilter)", options: statuses, selection: $statusFilter)
                        filterMenu(title: "Type: \(typeFilter)", options: types, selection: $typeFilter)
                        filterMenu(title: "Sort: \(sort)", options: sorts, selection: $sort)
                    }
                }

                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if filtered.isEmpty {
                    EmptyPanel(icon: "clock", title: "No entries match", detail: "Try a different search, filter or sort.")
                }
                // One compact card, rows divided — no per-entry card chrome.
                NivaasaCard(padding: 6) {
                    VStack(spacing: 0) {
                        ForEach(Array(filtered.enumerated()), id: \.offset) { index, entry in
                            activityRow(entry)
                            if index < filtered.count - 1 { Divider().padding(.leading, 54) }
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color.clear)
        .task { await load() }
        .refreshable { await load() }
        .nivaasaToast($toast)
        .accessibilityIdentifier("page-activity")
    }

    private func filterMenu(title: String, options: [String], selection: Binding<String>) -> some View {
        Menu {
            ForEach(options, id: \.self) { option in
                Button {
                    selection.wrappedValue = option
                    Haptics.shared.play(.selection)
                } label: {
                    if selection.wrappedValue == option {
                        Label(option, systemImage: "checkmark")
                    } else {
                        Text(option)
                    }
                }
            }
        } label: {
            HStack(spacing: 6) {
                Text(title).font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                NivaasaIcon(name: "chevron.down", size: 13).foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 12).frame(minHeight: 38)
            .background(NK.surface, in: RoundedRectangle(cornerRadius: 10))
            .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(NK.lineStrong) }
        }
    }

    private func activityRow(_ entry: [String: Any]) -> some View {
        let id = string(entry, "id")
        let type = string(entry, "type")
        let status = string(entry, "status")
        let company = string(entry, "company")
        let isWalkInApproved = status == "approved" && !(entry["preApproved"] as? Bool ?? false)
        return HStack(spacing: 10) {
            VisitorIdentity(visitor: entry, token: token, size: 38)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(company.isEmpty ? string(entry, "name") : "\(string(entry, "name")) · \(company)")
                        .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                        .lineLimit(1)
                    typeBadge(type)
                }
                HStack(spacing: 8) {
                    Text("Home \(string(entry, "unit"))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    if let entered = entry["enteredAt"] as? String, let from = nivaasaDate(entered) {
                        if status == "entered" {
                            ElapsedSince(from: from)
                        } else {
                            Text("in \(shortTime(entered))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                    if let exited = entry["exitedAt"] as? String, nivaasaDate(exited) != nil {
                        Text("out \(shortTime(exited))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    if status != "entered" && string(entry, "enteredAt").isEmpty {
                        Text(relativeDate(entry["createdAt"] as? String)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                }
            }
            Spacer()
            statusBadge(status)
            // Icon-only actions: call, admit approved walk-in, mark exit.
            let hostPhone = string(entry, "hostPhone")
            if !hostPhone.isEmpty {
                Button {
                    Haptics.shared.play(.tap)
                    if let url = URL(string: "tel:" + hostPhone.filter { $0.isNumber || $0 == "+" }) { openURL(url) }
                } label: {
                    NivaasaIcon(name: "phone", size: 16).foregroundStyle(NK.brand700)
                        .frame(width: 34, height: 34).background(NK.brand50, in: Circle())
                }
                .buttonStyle(NivaasaPressStyle())
                .accessibilityIdentifier("call-resident-" + id)
                .accessibilityLabel("Call resident")
            }
            if isWalkInApproved {
                Button {
                    Haptics.shared.play(.selection)
                    Task { await admit(id) }
                } label: {
                    Text(busyId == id ? "…" : "Admit").font(.nivaasaCaptionMedium).foregroundStyle(NK.mint600)
                        .frame(minHeight: 34).padding(.horizontal, 10)
                        .background(NK.mint50, in: RoundedRectangle(cornerRadius: 9))
                }
                .buttonStyle(NivaasaPressStyle())
                .accessibilityIdentifier("admit-" + id)
                .disabled(busyId != nil)
            }
            if status == "entered" {
                Button {
                    Haptics.shared.play(.selection)
                    Task { await markExit(id) }
                } label: {
                    NivaasaIcon(name: "door.left.hand.open", size: 16).foregroundStyle(NK.dangerInk)
                        .frame(width: 34, height: 34).background(NK.dangerSoft, in: Circle())
                }
                .buttonStyle(NivaasaPressStyle())
                .accessibilityIdentifier("mark-exit-" + id)
                .accessibilityLabel("Mark exit")
                .disabled(busyId != nil)
            }
        }
        .padding(.horizontal, 8).padding(.vertical, 9)
        .contentShape(Rectangle())
    }

    private func statusBadge(_ status: String) -> NivaasaBadge {
        switch status {
        case "entered": return NivaasaBadge(text: "Inside", tone: .pink, dot: true)
        case "pending": return NivaasaBadge(text: "Waiting", tone: .amber)
        case "approved": return NivaasaBadge(text: "Approved", tone: .mint)
        case "exited": return NivaasaBadge(text: "Exited", tone: .neutral)
        case "denied": return NivaasaBadge(text: "Denied", tone: .danger)
        default: return NivaasaBadge(text: status.capitalized, tone: .neutral)
        }
    }

    /// Approved walk-in → record entry (lands in "Inside now").
    private func admit(_ id: String) async {
        guard !id.isEmpty else { return }
        busyId = id
        defer { busyId = nil }
        do {
            _ = try await API.request("gate/visitors/\(id)/entry", token: token, post: true)
            toast = ToastItem("Entry recorded — now inside.", .success)
            Haptics.shared.play(.success)
            await load()
        } catch {
            toast = ToastItem(error.localizedDescription, .error)
            Haptics.shared.play(.error)
        }
    }

    private func markExit(_ id: String) async {
        guard !id.isEmpty else { return }
        busyId = id
        defer { busyId = nil }
        do {
            _ = try await API.request("gate/visitors/\(id)/exit", token: token, post: true)
            toast = ToastItem("Exit recorded.", .success)
            Haptics.shared.play(.success)
            await load()
        } catch {
            toast = ToastItem(error.localizedDescription, .error)
            Haptics.shared.play(.error)
        }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/gate", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            entries = rows(data["activity"])
        } catch { self.error = error.localizedDescription }
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
                        NivaasaIcon(name: "rectangle.portrait.and.arrow.right")
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
