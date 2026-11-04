import SwiftUI

func formatRupees(_ paise: Double) -> String {
    (paise / 100).formatted(.currency(code: "INR").precision(.fractionLength(0)).locale(Locale(identifier: "en_IN")))
}

enum WebTheme {
    static let blue = Color(red: 49/255, green: 85/255, blue: 216/255)
    static let accent = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark
        ? UIColor(red: 0.60, green: 0.70, blue: 1, alpha: 1)
        : UIColor(red: 0.15, green: 0.26, blue: 0.72, alpha: 1) })
    static let canvas = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark
        ? .systemGroupedBackground : UIColor(red: 0.96, green: 0.965, blue: 0.973, alpha: 1) })
    static let surface = Color(uiColor: .secondarySystemGroupedBackground)
    static let line = Color(uiColor: .separator).opacity(0.45)
}

struct ResidentSnapshot: Decodable {
    struct Dues: Decodable { let total: Double; let count: Int; let overdue: Int }
    struct Visitor: Decodable, Identifiable {
        let id: String
        let name: String
        let company: String?
        let type: String
        let purpose: String?
    }
    struct Notice: Decodable, Identifiable {
        let id: String
        let title: String
        let body: String
        let category: String
        let pinned: Bool
    }
    struct Delivery: Decodable, Identifiable {
        let id: String
        let company: String
        let status: String
        let otp: String?
    }
    struct Ticket: Decodable, Identifiable {
        let id: String
        let subject: String
        let status: String
    }
    let unit: String?
    let dues: Dues
    let pendingVisitors: [Visitor]
    let notices: [Notice]
    let deliveries: [Delivery]
    let tickets: [Ticket]
}

struct ResidentHome: View {
    @Environment(\.colorScheme) private var scheme
    let account: Account
    let open: (Destination) -> Void
    @State private var snapshot: ResidentSnapshot?
    @State private var error: String?
    @State private var response: String?
    @State private var pending = Set<String>()
    @State private var showPass = false
    @State private var loading = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                greeting
                if let error {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(error).foregroundStyle(.red)
                        Button("Refresh home") { Task { await load() } }
                    }
                }
                if let response { Label(response, systemImage: "checkmark.circle").foregroundStyle(.secondary) }
                if let snapshot {
                    gate(snapshot.pendingVisitors)
                    dues(snapshot.dues)
                    services
                    notices(snapshot.notices)
                    deliveries(snapshot.deliveries)
                    if !snapshot.tickets.isEmpty {
                        panel {
                            sectionHeader("Your requests", "View all") { open(.helpdesk) }
                            ForEach(snapshot.tickets) { ticket in
                                Text(ticket.subject).font(.subheadline.weight(.semibold))
                                Text(ticket.status.replacingOccurrences(of: "_", with: " ").capitalized)
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                    }
                } else if loading {
                    ProgressView("Loading your community")
                }
            }
            .frame(maxWidth: 600)
            .padding(16)
            .frame(maxWidth: .infinity)
        }
        .background(WebTheme.canvas)
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showPass) { CreatePass(token: account.token) }
    }

    private var greeting: some View {
        let zone = TimeZone(identifier: "Asia/Kolkata") ?? .current
        let date = Date.now
        let hour = Calendar.current.dateComponents(in: zone, from: date).hour ?? 0
        let greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
        let firstName = account.user.name.split(separator: " ").first.map(String.init) ?? account.user.name
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IN")
        formatter.timeZone = zone
        formatter.setLocalizedDateFormatFromTemplate("EEEE d MMMM")
        let dateText = formatter.string(from: date)
        return VStack(alignment: .leading, spacing: 8) {
            Text("YOUR COMMUNITY")
                .font(.caption.weight(.bold)).tracking(1.8)
                .foregroundStyle(scheme == .dark ? Color.pink : Color(red: 0.66, green: 0.18, blue: 0.36))
            Text("\(greeting), \(firstName).")
                .font(.custom("PlusJakartaSans-ExtraBold", size: 29, relativeTo: .title)).accessibilityAddTraits(.isHeader)
            Text([dateText, snapshot?.unit.map { "Home \($0)" }].compactMap { $0 }.joined(separator: " / "))
                .font(.custom("PlusJakartaSans-Medium", size: 15, relativeTo: .subheadline))
                .foregroundStyle(.secondary)
            primary("Pre-approve a visitor", "person.badge.plus") { showPass = true }
                .padding(.top, 8)
        }
    }

    private func gate(_ visitors: [ResidentSnapshot.Visitor]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("At your gate", "All visitors") { open(.visitors) }
            if visitors.isEmpty {
                panel {
                    Label("No visitors waiting", systemImage: "checkmark.circle")
                        .font(.headline)
                    Text("Approval requests will appear here when someone arrives.").foregroundStyle(.secondary)
                }
            }
            ForEach(visitors) { visitor in
                panel {
                    HStack(alignment: .top, spacing: 12) {
                        Text(visitor.name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined())
                            .font(.subheadline.weight(.bold))
                            .frame(width: 42, height: 42)
                            .foregroundStyle(WebTheme.accent)
                            .background(WebTheme.blue.opacity(0.12), in: Circle())
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(visitor.name).font(.headline)
                            Text(visitor.company ?? visitor.type.replacingOccurrences(of: "_", with: " ").capitalized)
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    Text("At the gate")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(scheme == .dark ? Color.yellow : Color(red: 0.53, green: 0.33, blue: 0.05))
                        .padding(.horizontal, 9).padding(.vertical, 5)
                        .background(Color.orange.opacity(0.13), in: RoundedRectangle(cornerRadius: 7))
                    if let purpose = visitor.purpose, !purpose.isEmpty { Text(purpose).foregroundStyle(.secondary) }
                    ViewThatFits {
                        HStack { deny(visitor); approve(visitor) }
                        VStack { deny(visitor); approve(visitor) }
                    }
                    if visitor.type == "delivery" {
                        Button("Leave at gate") { respond(visitor, "leave_at_gate") }
                            .frame(minHeight: 44)
                            .disabled(pending.contains(visitor.id))
                    }
                }
            }
        }
    }

    private func deny(_ visitor: ResidentSnapshot.Visitor) -> some View {
        Button { respond(visitor, "deny") } label: {
            Label("Deny", systemImage: "xmark")
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.plain)
        .foregroundStyle(scheme == .dark ? Color.pink : Color(red: 0.67, green: 0.15, blue: 0.24))
        .background(Color.red.opacity(0.09), in: RoundedRectangle(cornerRadius: 10))
        .disabled(pending.contains(visitor.id))
    }

    private func approve(_ visitor: ResidentSnapshot.Visitor) -> some View {
        primary(pending.contains(visitor.id) ? "Sending…" : "Approve", "checkmark") { respond(visitor, "approve") }
            .disabled(pending.contains(visitor.id))
    }

    private func dues(_ dues: ResidentSnapshot.Dues) -> some View {
        panel(tinted: true) {
            Label("Maintenance & dues", systemImage: "wallet.bifold")
                .font(.headline)
            Text(formatRupees(dues.total))
                .font(.largeTitle.bold().monospacedDigit())
            Text(dues.count == 0 ? "All paid. You're up to date." : "\(dues.count) open \(dues.count == 1 ? "invoice" : "invoices")")
                .foregroundStyle(.secondary)
            if dues.overdue > 0 { Label("\(dues.overdue) overdue", systemImage: "clock").foregroundStyle(.secondary) }
            primary(dues.total > 0 ? "Review dues" : "View payments", "arrow.right") { open(.payments) }
        }
    }

    private var services: some View {
        panel {
            Text("Everyday services").font(.headline).accessibilityAddTraits(.isHeader)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 136))], spacing: 8) {
                service("Helpdesk", "wrench", .helpdesk)
                service("Payments", "wallet.bifold", .payments)
                service("Deliveries", "shippingbox", .deliveries)
                service("Visitors", "person.crop.circle.badge.checkmark", .visitors)
            }
        }
    }

    private func service(_ title: String, _ icon: String, _ destination: Destination) -> some View {
        Button { open(destination) } label: {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.medium))
                .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                .padding(.horizontal, 10)
                .background(WebTheme.canvas, in: RoundedRectangle(cornerRadius: 10))
        }.buttonStyle(.plain)
    }

    private func notices(_ notices: [ResidentSnapshot.Notice]) -> some View {
        panel {
            sectionHeader("Community updates", "View all") { open(.community) }
            Text("Notices from your committee").foregroundStyle(.secondary)
            if notices.isEmpty { Text("No notices yet").foregroundStyle(.secondary) }
            ForEach(notices.prefix(3)) { notice in
                Divider()
                Button { open(.community) } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(notice.category.capitalized + (notice.pinned ? " · Pinned" : ""))
                            .font(.caption.weight(.semibold)).foregroundStyle(WebTheme.accent)
                        Text(notice.title).font(.headline)
                        Text(notice.body).foregroundStyle(.secondary).lineLimit(2)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }.buttonStyle(.plain)
            }
        }
    }

    private func deliveries(_ deliveries: [ResidentSnapshot.Delivery]) -> some View {
        panel {
            sectionHeader("Deliveries", "View all") { open(.deliveries) }
            if deliveries.isEmpty { Text("No deliveries waiting.").foregroundStyle(.secondary) }
            ForEach(deliveries.prefix(3)) { delivery in
                Divider()
                Text(delivery.company).font(.headline)
                Text(delivery.status == "left_at_gate" ? "Ready to collect at the gate" : "Waiting at the gate")
                    .foregroundStyle(.secondary)
                if delivery.status == "left_at_gate", let otp = delivery.otp {
                    Text("Pickup code \(otp)").font(.subheadline.monospacedDigit())
                }
            }
        }
    }

    private func sectionHeader(_ title: String, _ action: String, run: @escaping () -> Void) -> some View {
        ViewThatFits {
            HStack {
                Text(title).font(.title3.weight(.semibold)).accessibilityAddTraits(.isHeader)
                Spacer(minLength: 8)
                Button(action, action: run).font(.subheadline.weight(.semibold)).frame(minHeight: 44)
            }
            VStack(alignment: .leading) {
                Text(title).font(.title3.weight(.semibold)).accessibilityAddTraits(.isHeader)
                Button(action, action: run).frame(minHeight: 44)
            }
        }
    }

    private func panel<Content: View>(tinted: Bool = false, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10, content: content)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background {
                RoundedRectangle(cornerRadius: 16).fill(WebTheme.surface)
                if tinted {
                    RoundedRectangle(cornerRadius: 16).fill(LinearGradient(
                        colors: [WebTheme.blue.opacity(0.08), .clear, .pink.opacity(0.07)],
                        startPoint: .topLeading, endPoint: .bottomTrailing))
                }
            }
            .overlay { RoundedRectangle(cornerRadius: 16).strokeBorder(WebTheme.line).allowsHitTesting(false) }
    }

    private func primary(_ title: String, _ icon: String, run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 44)
                .padding(.horizontal, 10)
                .foregroundStyle(.white)
                .background(WebTheme.blue, in: RoundedRectangle(cornerRadius: 10))
        }.buttonStyle(.plain)
    }

    private func load() async {
        guard !loading else { return }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let data = try await API.request("mobile/home", token: account.token)
            snapshot = try JSONDecoder().decode(ResidentSnapshot.self, from: data)
        } catch is CancellationError {
        } catch { self.error = error.localizedDescription }
    }

    private func respond(_ visitor: ResidentSnapshot.Visitor, _ action: String) {
        guard pending.insert(visitor.id).inserted else { return }
        Task {
            defer { pending.remove(visitor.id) }
            do {
                _ = try await API.request("visitors/\(visitor.id)/respond", token: account.token, body: ["action": action])
                snapshot = snapshot.map { current in
                    ResidentSnapshot(unit: current.unit, dues: current.dues,
                        pendingVisitors: current.pendingVisitors.filter { $0.id != visitor.id },
                        notices: current.notices, deliveries: current.deliveries, tickets: current.tickets)
                }
                response = action == "deny" ? "Entry declined" : action == "approve" ? "Visitor approved" : "Parcel will stay at the gate"
                await load()
            } catch { self.error = error.localizedDescription }
        }
    }
}
