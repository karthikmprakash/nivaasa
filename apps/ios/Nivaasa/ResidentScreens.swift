import SwiftUI

// MARK: - Home

struct ResidentHomeView: View {
    let account: Account
    let session: Session
    let openTab: (String) -> Void
    let openServices: () -> Void
    @Binding var unread: Int

    @State private var data: [String: Any]?
    @State private var loading = false
    @State private var error: String?
    @State private var pending = Set<String>()
    @State private var showPass = false
    @State private var response: String?
    @State private var sheet: Destination?
    @State private var selectedNotice: NoticeSelection?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                greeting
                if let error {
                    NivaasaCard {
                        Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk)
                        Button("Refresh home") { Task { await load() } }.font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700)
                    }
                }
                if let response {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(NK.mint600)
                        Text(response).font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                    }
                }
                if let data {
                    gate(data)
                    dues(data)
                    services
                    if let poll = rows(data["polls"]).first { pollCard(poll) }
                    notices(data)
                    comingUp(data)
                    deliveries(data)
                    requests(data)
                } else if loading {
                    ProgressView("Loading your community").tint(NK.brand600).frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 24)
            .frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showPass) { CreatePass(token: account.token) }
        .sheet(item: $selectedNotice) { NoticeDetail(notice: $0.notice) }
        .sheet(item: $sheet) { ResidentSheet(destination: $0, token: account.token, account: account, session: session) }
    }

    private var greeting: some View {
        let zone = TimeZone(identifier: "Asia/Kolkata") ?? .current
        let hour = Calendar.current.dateComponents(in: zone, from: Date()).hour ?? 0
        let salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
        let firstName = account.user.name.split(separator: " ").first.map(String.init) ?? account.user.name
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IN")
        formatter.timeZone = zone
        formatter.setLocalizedDateFormatFromTemplate("EEEE d MMMM")
        return VStack(alignment: .leading, spacing: 8) {
            eyebrowStyle("Your community")
            Text("\(salutation), \(firstName).").font(.nivaasaTitle).tracking(-0.8).foregroundStyle(NK.ink)
            Text("\(formatter.string(from: Date()))  /  Home \(session.unit?.number ?? "—")")
                .font(.nivaasaBody).foregroundStyle(NK.muted)
            PrimaryButton(title: "Pre-approve a visitor", icon: "person.badge.plus") { showPass = true }
                .padding(.top, 6)
        }
    }

    private func gate(_ data: [String: Any]) -> some View {
        let visitors = rows(data["pendingVisitors"])
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text("At your gate").font(.nivaasaSection).foregroundStyle(NK.ink)
                if !visitors.isEmpty { NivaasaBadge(text: "\(visitors.count) waiting", tone: .amber, dot: true) }
                Spacer()
                Button { openTab("Visitors") } label: {
                    HStack(spacing: 2) { Text("All visitors"); Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold)) }
                        .font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700).frame(minHeight: 36)
                }.buttonStyle(.plain)
            }
            if visitors.isEmpty {
                EmptyPanel(icon: "checkmark.circle", title: "No visitors waiting", detail: "Approval requests will appear here when someone arrives.")
            } else {
                ForEach(Array(visitors.enumerated()), id: \.offset) { _, visitor in
                    visitorCard(visitor)
                }
            }
        }
    }

    private func visitorCard(_ visitor: [String: Any]) -> some View {
        let id = string(visitor, "id")
        let name = string(visitor, "name", fallback: "Visitor")
        let type = string(visitor, "type").replacingOccurrences(of: "_", with: " ").capitalized
        let company = string(visitor, "company")
        let purpose = string(visitor, "purpose", fallback: type)
        let subtitle = company.isEmpty ? purpose : "\(company) · \(purpose)"
        let sending = pending.contains(id)
        return NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 10) {
                    Text(initials(name))
                        .font(.jakarta(13, .bold)).foregroundStyle(NK.blush700)
                        .frame(width: 42, height: 42).background(NK.blush100, in: Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(subtitle).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Spacer(minLength: 0)
                    VStack(alignment: .trailing, spacing: 4) {
                        NivaasaBadge(text: "At the gate", tone: .amber, dot: true)
                        Text(relativeDate(string(visitor, "createdAt"))).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                }
                if let purpose = visitor["purpose"] as? String, !purpose.isEmpty {
                    Text(purpose).font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                }
                if let notes = visitor["notes"] as? String, !notes.isEmpty {
                    Text(notes).font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                SoftButton(title: sending ? "Sending…" : "Deny", icon: "xmark") { respond(visitor, "deny") }
                PrimaryButton(title: sending ? "Sending…" : "Approve", icon: "checkmark", disabled: sending) { respond(visitor, "approve") }
                if string(visitor, "type") == "delivery" {
                    OutlineButton(title: "Leave at gate", icon: "shippingbox") { respond(visitor, "leave_at_gate") }
                }
            }
        }
    }

    private func dues(_ data: [String: Any]) -> some View {
        let dues = data["dues"] as? [String: Any] ?? [:]
        let total = number(dues, "total")
        let count = Int(number(dues, "count"))
        let overdue = Int(number(dues, "overdue"))
        return NivaasaCard(tinted: true) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Maintenance & dues").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                    Spacer()
                    Image(systemName: "wallet.bifold").font(.system(size: 18, weight: .medium)).foregroundStyle(NK.brand600)
                }
                Text(money(total)).font(.jakarta(38, .bold)).tracking(-1.2).foregroundStyle(NK.ink).monospacedDigit()
                Text(count == 0 ? "All paid. You're up to date." : "\(count) open \(count == 1 ? "invoice" : "invoices")")
                    .font(.nivaasaBody).foregroundStyle(NK.muted)
                if overdue > 0 {
                    Label("\(overdue) invoice\(overdue == 1 ? "" : "s") overdue", systemImage: "clock")
                        .font(.nivaasaCaptionMedium).foregroundStyle(NK.amberInk)
                }
                PrimaryButton(title: total > 0 ? "Review & pay" : "Payment history", icon: "arrow.right") { openTab("Pay") }
            }
        }
    }

    private var services: some View {
        NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Everyday services").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible())], spacing: 8) {
                    QuickActionTile(title: "Raise a request", icon: "wrench.and.screwdriver") { sheet = .helpdesk }
                    QuickActionTile(title: "Book an amenity", icon: "calendar") { sheet = .amenities }
                    QuickActionTile(title: "Payments", icon: "wallet.bifold") { openTab("Pay") }
                    QuickActionTile(title: "Directory", icon: "book.closed") { sheet = .directory }
                    QuickActionTile(title: "Documents", icon: "doc.text") { sheet = .documents }
                    QuickActionTile(title: "My household", icon: "house") { sheet = .household }
                }
            }
        }
    }

    private func pollCard(_ poll: [String: Any]) -> some View {
        let options = rows(poll["options"])
        let counts = poll["counts"] as? [String: Any] ?? [:]
        let total = max(1, number(poll, "total"))
        let myVote = string(poll, "myVote")
        let hidden = (poll["hideResults"] as? Bool ?? false) && myVote.isEmpty
        return NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    NivaasaBadge(text: "Open poll", tone: .pink)
                    Spacer()
                    Text(poll["endsAt"] == nil ? "Voting is open" : "Closes \(shortDate(poll["endsAt"] as? String))")
                        .font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                Text(string(poll, "question")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                if let description = poll["description"] as? String, !description.isEmpty {
                    Text(description).font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                ForEach(Array(options.enumerated()), id: \.offset) { _, option in
                    let id = string(option, "id")
                    let count = Int(number(counts, id))
                    HStack(spacing: 8) {
                        Image(systemName: myVote == id ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(myVote == id ? NK.brand600 : NK.lineStrong)
                        Text(string(option, "label")).font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                        Spacer()
                        if !hidden { Text("\(count)").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted) }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        guard myVote.isEmpty else { return }
                        Task { await vote(poll: string(poll, "id"), option: id) }
                    }
                    if !hidden { ProgressLine(value: Double(count) / Double(total)) }
                }
                Button { openTab("Community") } label: {
                    Text("Open in community").font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700)
                }.buttonStyle(.plain)
            }
        }
    }

    private func notices(_ data: [String: Any]) -> some View {
        let notices = rows(data["notices"]).prefix(3)
        return NivaasaCard {
            VStack(alignment: .leading, spacing: 0) {
                SectionHeading(title: "Community updates", action: "View all") { openTab("Community") }
                Text("Notices from your committee").font(.nivaasaCaption).foregroundStyle(NK.muted).padding(.top, 2)
                ForEach(Array(notices.enumerated()), id: \.offset) { _, notice in
                    Divider().overlay(NK.line).padding(.vertical, 12)
                    Button { selectedNotice = NoticeSelection(notice: notice) } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                NivaasaBadge(text: string(notice, "category").capitalized, tone: badgeTone(notice))
                                if notice["pinned"] as? Bool ?? false { NivaasaBadge(text: "Pinned", tone: .pink) }
                                Spacer()
                                Text(relativeDate(string(notice, "publishedAt"))).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Text(string(notice, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(string(notice, "body")).font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }.buttonStyle(.plain)
                }
            }
        }
    }

    private func comingUp(_ data: [String: Any]) -> some View {
        let events = rows(data["events"]).prefix(2)
        let bookings = rows(data["bookings"]).prefix(2)
        if events.isEmpty && bookings.isEmpty { return AnyView(EmptyView()) }
        return AnyView(NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeading(title: "Coming up", action: "All events") { openTab("Community") }
                ForEach(Array(events.enumerated()), id: \.offset) { _, event in
                    HStack(spacing: 10) {
                        VStack(spacing: 0) {
                            Text(shortDate(event["startAt"] as? String).uppercased()).font(.nivaasaEyebrow).foregroundStyle(NK.blush700)
                            Text(shortDate(event["startAt"] as? String, month: false)).font(.jakarta(18, .bold)).foregroundStyle(NK.ink)
                        }
                        .frame(width: 44, height: 46)
                        .background(NK.blush50, in: RoundedRectangle(cornerRadius: 10))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(string(event, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(string(event, "location")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                }
                ForEach(Array(bookings.enumerated()), id: \.offset) { _, row in
                    let booking = row["booking"] as? [String: Any] ?? [:]
                    HStack(spacing: 10) {
                        Image(systemName: "calendar").foregroundStyle(NK.muted).frame(width: 44, height: 42)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(string(row, "amenity", fallback: "Amenity")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text("\(string(booking, "date")) · \(string(booking, "startTime"))–\(string(booking, "endTime"))")
                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                }
            }
        })
    }

    private func deliveries(_ data: [String: Any]) -> some View {
        let deliveries = rows(data["deliveries"]).prefix(2)
        if deliveries.isEmpty { return AnyView(EmptyView()) }
        return AnyView(NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeading(title: "Deliveries", action: "View all") { sheet = .deliveries }
                ForEach(Array(deliveries.enumerated()), id: \.offset) { _, delivery in
                    let held = string(delivery, "status") == "left_at_gate"
                    HStack(spacing: 10) {
                        Image(systemName: "shippingbox").font(.system(size: 18, weight: .medium)).foregroundStyle(NK.muted).frame(width: 34, height: 34).background(NK.canvas, in: RoundedRectangle(cornerRadius: 9))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(string(delivery, "company")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(held ? "Ready to collect at the gate" : "Waiting at the gate").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            if held, let otp = delivery["otp"] as? String, !otp.isEmpty {
                                Text("Pickup code \(otp)").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft).monospacedDigit()
                            }
                        }
                    }
                }
            }
        })
    }

    private func requests(_ data: [String: Any]) -> some View {
        let tickets = rows(data["tickets"]).prefix(2)
        if tickets.isEmpty { return AnyView(EmptyView()) }
        return AnyView(NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeading(title: "Your requests", action: "All requests") { sheet = .helpdesk }
                ForEach(Array(tickets.enumerated()), id: \.offset) { _, ticket in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(string(ticket, "subject")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(string(ticket, "category")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Spacer()
                        NivaasaBadge(text: string(ticket, "status").replacingOccurrences(of: "_", with: " ").capitalized, tone: .blue)
                    }
                }
            }
        })
    }

    private func badgeTone(_ notice: [String: Any]) -> NivaasaBadge.Tone {
        switch string(notice, "category") {
        case "event": .pink
        case "maintenance", "finance": .amber
        case "security", "emergency": .danger
        default: .blue
        }
    }

    private func load() async {
        guard !loading else { return }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let raw = try await API.request("mobile/home", token: account.token)
            data = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
            unread = Int(number(data ?? [:], "unread"))
        } catch is CancellationError {
        } catch { self.error = error.localizedDescription }
    }

    private func respond(_ visitor: [String: Any], _ action: String) {
        let id = string(visitor, "id")
        guard pending.insert(id).inserted else { return }
        Task {
            defer { pending.remove(id) }
            do {
                _ = try await API.request("visitors/\(id)/respond", token: account.token, body: ["action": action])
                response = action == "deny" ? "Entry declined" : action == "approve" ? "Visitor approved" : "Parcel will stay at the gate"
                await load()
            } catch { self.error = error.localizedDescription }
        }
    }

    private func vote(poll: String, option: String) async {
        do {
            _ = try await API.request("community/poll", token: account.token, body: ["pollId": poll, "optionId": option])
            await load()
        } catch { self.error = error.localizedDescription }
    }
}

struct NoticeSelection: Identifiable {
    let notice: [String: Any]
    var id: String { string(notice, "id") }
}

// MARK: - Community

struct CommunityScreen: View {
    let token: String
    @State private var data: [String: Any]?
    @State private var tab = "Notices"
    @State private var error: String?
    @State private var selectedNotice: NoticeSelection?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle("Your community")
                    Text("Community").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    Text("Notices, conversations, polls and the moments that bring everyone together.")
                        .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                }
                TabStrip(tabs: ["Notices", "Discussions", "Polls", "Events"], selection: $tab)
                if let error {
                    NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                }
                if let data {
                    switch tab {
                    case "Discussions": discussionList(data)
                    case "Polls": pollList(data)
                    case "Events": eventList(data)
                    default: noticeList(data)
                    }
                } else {
                    ProgressView().tint(NK.brand600).frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24)
            .frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .task { await load() }
        .refreshable { await load() }
        .sheet(item: $selectedNotice) { NoticeDetail(notice: $0.notice) }
    }

    private func noticeList(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["notices"]).enumerated()), id: \.offset) { _, notice in
            Button { selectedNotice = NoticeSelection(notice: notice) } label: {
                NivaasaCard {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            NivaasaBadge(text: string(notice, "category").capitalized, tone: .amber)
                            if notice["pinned"] as? Bool ?? false { NivaasaBadge(text: "Pinned", tone: .pink) }
                            Spacer()
                            Text(relativeDate(string(notice, "publishedAt"))).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Text(string(notice, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(string(notice, "body")).font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(4)
                        HStack {
                            Text(string(notice, "author", fallback: "Community office")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            Spacer()
                            Label("\(Int(number(notice, "views")))", systemImage: "eye").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                }
            }.buttonStyle(.plain)
        }
    }

    private func discussionList(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["discussions"]).enumerated()), id: \.offset) { _, discussion in
            NivaasaCard {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(string(discussion, "category").replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700)
                        Spacer()
                        Text(relativeDate(string(discussion, "createdAt"))).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Text(string(discussion, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    Text(string(discussion, "body")).font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(3)
                    HStack(spacing: 14) {
                        Text(string(discussion, "author")).font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                        Label("\(Int(number(discussion, "likes")))", systemImage: "heart").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        Label("\(Int(number(discussion, "replies")))", systemImage: "message").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                }
            }
        }
    }

    private func pollList(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["polls"]).enumerated()), id: \.offset) { _, poll in
            NivaasaCard {
                VStack(alignment: .leading, spacing: 9) {
                    HStack {
                        NivaasaBadge(text: string(poll, "audience") == "owners" ? "Owners" : "All residents", tone: .pink)
                        Spacer()
                        Text(string(poll, "status") == "active" ? "Closes \(shortDate(poll["endsAt"] as? String))" : "Closed")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Text(string(poll, "question")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    if let description = poll["description"] as? String, !description.isEmpty {
                        Text(description).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    let options = rows(poll["options"])
                    let counts = poll["counts"] as? [String: Any] ?? [:]
                    let total = max(1, number(poll, "total"))
                    let myVote = string(poll, "myVote")
                    ForEach(Array(options.enumerated()), id: \.offset) { _, option in
                        let id = string(option, "id")
                        HStack {
                            Image(systemName: myVote == id ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(myVote == id ? NK.brand600 : NK.lineStrong)
                            Text(string(option, "label")).font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                            Spacer()
                            Text("\(Int(number(counts, id)))").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                        }
                        ProgressLine(value: Double(number(counts, id)) / Double(total))
                    }
                    Text("\(Int(number(poll, "total"))) votes").font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
            }
        }
    }

    private func eventList(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["events"]).enumerated()), id: \.offset) { _, event in
            NivaasaCard {
                HStack(alignment: .top, spacing: 12) {
                    VStack(spacing: 0) {
                        Text(shortDate(event["startAt"] as? String).uppercased()).font(.nivaasaEyebrow).foregroundStyle(NK.blush700)
                        Text(shortDate(event["startAt"] as? String, month: false)).font(.jakarta(20, .bold)).foregroundStyle(NK.ink)
                    }
                    .frame(width: 48, height: 50).background(NK.blush50, in: RoundedRectangle(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(string(event, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text("\(string(event, "location")) · \(shortDate(event["startAt"] as? String))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        Text(string(event, "description")).font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(2)
                    }
                }
            }
        }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/community", token: token)
            data = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
        } catch { self.error = error.localizedDescription }
    }
}

struct NoticeDetail: View {
    let notice: [String: Any]
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    eyebrowStyle(string(notice, "category"))
                    Text(string(notice, "title")).font(.nivaasaTitle).tracking(-0.8).foregroundStyle(NK.ink)
                    HStack {
                        Text(string(notice, "author", fallback: "Community office")).font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                        Text("· \(shortDate(notice["publishedAt"] as? String))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Divider().overlay(NK.line)
                    Text(string(notice, "body")).font(.nivaasaBody).foregroundStyle(NK.inkSoft).lineSpacing(4)
                }
                .padding(20)
            }
            .background(AppWash())
            .navigationTitle("Notice")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Visitors

struct VisitorsScreen: View {
    let token: String
    @State private var data: [String: Any]?
    @State private var tab = "Waiting"
    @State private var showPass = false
    @State private var error: String?
    @State private var pending = Set<String>()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 5) {
                        eyebrowStyle("Gate & security")
                        Text("Visitors").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                        Text("Approve arrivals, share passes and keep the gate moving.")
                            .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                    }
                    Spacer(minLength: 8)
                    Button { showPass = true } label: {
                        Image(systemName: "plus").font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                            .frame(width: 44, height: 44).background(NK.brand600, in: Circle())
                    }.accessibilityLabel("Create a visitor pass")
                }
                TabStrip(tabs: ["Waiting", "Passes", "History", "Daily help"], selection: $tab)
                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if let data {
                    switch tab {
                    case "Passes": passes(data)
                    case "History": history(data)
                    case "Daily help": help(data)
                    default: waiting(data)
                    }
                } else {
                    ProgressView().tint(NK.brand600).frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24)
            .frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showPass) { CreatePass(token: token) }
    }

    private func waiting(_ data: [String: Any]) -> some View {
        let visitors = rows(data["pending"])
        return Group {
            if visitors.isEmpty {
                EmptyPanel(icon: "checkmark.circle", title: "No visitors waiting", detail: "Approval requests will appear here when someone arrives.")
            } else {
                ForEach(Array(visitors.enumerated()), id: \.offset) { _, visitor in
                    visitorCard(visitor)
                }
            }
        }
    }

    private func visitorCard(_ visitor: [String: Any]) -> some View {
        let id = string(visitor, "id")
        let sending = pending.contains(id)
        let name = string(visitor, "name", fallback: "Visitor")
        return NivaasaCard {
            VStack(alignment: .leading, spacing: 9) {
                HStack(spacing: 10) {
                    NivaasaAvatar(name: name, color: NK.blush100, size: 42)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(string(visitor, "company", fallback: string(visitor, "type").replacingOccurrences(of: "_", with: " ").capitalized))
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Spacer()
                    NivaasaBadge(text: "At the gate", tone: .amber, dot: true)
                }
                if let notes = visitor["notes"] as? String, !notes.isEmpty {
                    Text(notes).font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                HStack(spacing: 8) {
                    SoftButton(title: "Deny", icon: "xmark") { respond(visitor, "deny") }
                    PrimaryButton(title: sending ? "Sending…" : "Approve", icon: "checkmark", disabled: sending) { respond(visitor, "approve") }
                }
                if string(visitor, "type") == "delivery" {
                    OutlineButton(title: "Leave at gate", icon: "shippingbox") { respond(visitor, "leave_at_gate") }
                }
            }
        }
    }

    private func passes(_ data: [String: Any]) -> some View {
        let passes = rows(data["passes"])
        return Group {
            if passes.isEmpty {
                NivaasaCard {
                    VStack(spacing: 10) {
                        Image(systemName: "ticket").font(.system(size: 24)).foregroundStyle(NK.blush400)
                        Text("No active passes").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text("Create a pass for a guest, delivery, cab or vendor.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        PrimaryButton(title: "Create a pass", icon: "plus") { showPass = true }
                    }.frame(maxWidth: .infinity)
                }
            } else {
                ForEach(Array(passes.enumerated()), id: \.offset) { _, pass in
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 7) {
                            HStack {
                                Text(string(pass, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Spacer()
                                NivaasaBadge(text: string(pass, "type").replacingOccurrences(of: "_", with: " ").capitalized, tone: .pink)
                            }
                            Text("Valid \(shortDate(pass["validFrom"] as? String)) – \(shortDate(pass["validTo"] as? String))")
                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            HStack {
                                Text(string(pass, "code")).font(.jakarta(20, .bold)).tracking(1.5).foregroundStyle(NK.ink).monospacedDigit()
                                Spacer()
                                ShareLink(item: "Your Nivaasa entry code is \(string(pass, "code")). Show it at the gate.") {
                                    Image(systemName: "square.and.arrow.up").font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(NK.brand700).frame(width: 40, height: 40)
                                }
                            }
                        }
                    }
                }
            }
        }.accessibilityIdentifier("group-passes")
    }

    private func history(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["history"]).enumerated()), id: \.offset) { _, visit in
            NivaasaCard {
                HStack(spacing: 10) {
                    NivaasaAvatar(name: string(visit, "name"), color: NK.canvas, size: 38)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(string(visit, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text("\(string(visit, "type").replacingOccurrences(of: "_", with: " ").capitalized) · \(relativeDate(visit["createdAt"] as? String))")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Spacer()
                    NivaasaBadge(text: string(visit, "status").capitalized, tone: string(visit, "status") == "entered" ? .pink : .neutral)
                }
            }
        }
    }

    private func help(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["help"]).enumerated()), id: \.offset) { _, person in
            NivaasaCard {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        NivaasaAvatar(name: string(person, "name"), color: NK.blush100, size: 38)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(string(person, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(string(person, "role")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Spacer()
                        if person["policeVerified"] as? Bool ?? false { NivaasaBadge(text: "Verified", tone: .mint) }
                    }
                    Text(string(person, "shift", fallback: "Flexible")).font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                    if let attendance = person["attendance"] as? [String: Any], attendance["checkInAt"] != nil {
                        Text(attendance["checkOutAt"] == nil ? "In today" : "Checked out").font(.nivaasaCaption).foregroundStyle(NK.mint600)
                    }
                }
            }
        }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/visitors", token: token)
            data = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
        } catch { self.error = error.localizedDescription }
    }

    private func respond(_ visitor: [String: Any], _ action: String) {
        let id = string(visitor, "id")
        guard pending.insert(id).inserted else { return }
        Task {
            defer { pending.remove(id) }
            do {
                _ = try await API.request("visitors/\(id)/respond", token: token, body: ["action": action])
                await load()
            } catch { self.error = error.localizedDescription }
        }
    }
}

// MARK: - Payments

struct PaymentsScreen: View {
    let token: String
    let session: Session
    @State private var data: [String: Any]?
    @State private var tab = "Invoices"
    @State private var error: String?
    @State private var paying: String?
    @State private var confirmation: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle("Money, clearly")
                    Text("Payments").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    Text("Dues, receipts and the full history of every rupee.")
                        .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                }
                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if let data {
                    let dues = data["dues"] as? Double ?? 0
                    NivaasaCard(tinted: true) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Total dues").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                            Text(money(dues)).font(.jakarta(36, .bold)).tracking(-1).foregroundStyle(NK.ink).monospacedDigit()
                            Text(dues == 0 ? "Everything is settled." : "Pay securely in the app or record an offline payment with the office.")
                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                    TabStrip(tabs: ["Invoices", "History"], selection: $tab)
                    if tab == "Invoices" { invoices(data) } else { history(data) }
                } else {
                    ProgressView().tint(NK.brand600).frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24)
            .frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .task { await load() }
        .refreshable { await load() }
        .alert("Payment recorded", isPresented: Binding(get: { confirmation != nil }, set: { if !$0 { confirmation = nil } })) {
            Button("Done", role: .cancel) { confirmation = nil }
        } message: { Text(confirmation ?? "") }
    }

    private func invoices(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["invoices"]).enumerated()), id: \.offset) { _, invoice in
            let status = string(invoice, "status")
            NivaasaCard {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(string(invoice, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(string(invoice, "number")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Spacer()
                        NivaasaBadge(text: status.replacingOccurrences(of: "_", with: " ").capitalized, tone: status == "paid" ? .mint : status == "overdue" ? .danger : .amber)
                    }
                    HStack(alignment: .lastTextBaseline) {
                        Text(money(number(invoice, "total"))).font(.jakarta(22, .bold)).foregroundStyle(NK.ink).monospacedDigit()
                        Spacer()
                        Text("Due \(shortDate(invoice["dueDate"] as? String))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    if ["due", "overdue", "partially_paid"].contains(status) {
                        PrimaryButton(title: paying == string(invoice, "id") ? "Paying…" : "Pay now", icon: "arrow.right", disabled: paying != nil) {
                            Task { await pay(string(invoice, "id")) }
                        }
                    }
                }
            }
        }
    }

    private func history(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["payments"]).enumerated()), id: \.offset) { _, payment in
            NivaasaCard {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(money(number(payment, "amount"))).font(.nivaasaBodySemibold).foregroundStyle(NK.ink).monospacedDigit()
                        Text("\(string(payment, "receiptNo")) · \(string(payment, "method").uppercased())")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Spacer()
                    NivaasaBadge(text: string(payment, "status").capitalized, tone: string(payment, "status") == "success" ? .mint : .amber)
                }
            }
        }
    }

    private func pay(_ id: String) async {
        paying = id
        defer { paying = nil }
        do {
            _ = try await API.request("payments", token: token, body: ["invoiceId": id, "method": "upi"])
            confirmation = "Your payment was successful. A receipt is now available in History."
            await load()
        } catch { self.error = error.localizedDescription }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/payments", token: token)
            data = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - More

struct MoreScreen: View {
    let account: Account
    let session: Session
    let unread: Int
    let openTab: (String) -> Void
    let showServices: Binding<Bool>
    let onSignOut: () -> Void
    @State private var sheet: Destination?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle("Your account")
                    Text("More").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                }
                NivaasaCard(tinted: true) {
                    HStack(spacing: 12) {
                        NivaasaAvatar(name: account.user.name, color: NK.brand600, size: 48)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(account.user.name).font(.nivaasaTitle).tracking(-0.5).foregroundStyle(NK.ink)
                            Text("Home \(session.unit?.number ?? "—") · \(session.society.name)").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            Text(account.membership?.role.replacingOccurrences(of: "_", with: " ").capitalized ?? "Member")
                                .font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700)
                        }
                    }
                }
                NivaasaCard {
                    VStack(spacing: 0) {
                        moreRow("My home", "house") { sheet = .household }
                        moreRow("Directory", "book.closed") { sheet = .directory }
                        moreRow("Documents", "doc.text") { sheet = .documents }
                        moreRow("Amenities", "calendar") { sheet = .amenities }
                        moreRow("Helpdesk", "wrench.and.screwdriver") { sheet = .helpdesk }
                        moreRow("Deliveries", "shippingbox") { sheet = .deliveries }
                        moreRow("Settings", "gearshape") { sheet = .settings }
                        moreRow("Emergency", "exclamationmark.shield") { sheet = .emergency }
                    }
                }
                NivaasaCard {
                    HStack {
                        Image(systemName: "bell").foregroundStyle(NK.muted)
                        Text("Notifications").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                        Spacer()
                        if unread > 0 { NivaasaBadge(text: "\(unread) new", tone: .pink) }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { sheet = .notifications }
                }
                Button(role: .destructive) { onSignOut() } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Sign out")
                    }
                    .font(.nivaasaBodySemibold).foregroundStyle(NK.dangerInk)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(NK.dangerSoft, in: RoundedRectangle(cornerRadius: NKRadius.control))
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24)
            .frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .sheet(item: $sheet) { ResidentSheet(destination: $0, token: account.token, account: account, session: session) }
    }

    private func moreRow(_ title: String, _ icon: String, run: @escaping () -> Void) -> some View {
        Button(action: run) {
            HStack(spacing: 12) {
                Image(systemName: icon).font(.system(size: 17, weight: .medium)).foregroundStyle(NK.muted).frame(width: 24)
                Text(title).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
        }.buttonStyle(.plain)
    }
}

// MARK: - Destination sheets

struct ResidentSheet: View {
    let destination: Destination
    let token: String
    let account: Account
    let session: Session

    var body: some View {
        NavigationStack {
            Group {
                switch destination {
                case .helpdesk: HelpdeskScreen(token: token)
                case .deliveries: DeliveriesScreen(token: token)
                case .directory: DirectoryScreen(token: token)
                case .documents: DocumentsScreen(token: token)
                case .amenities: AmenitiesScreen(token: token)
                case .household: HouseholdScreen(account: account, session: session)
                case .settings: SettingsScreen(account: account, session: session)
                case .emergency: EmergencyScreen(token: token)
                case .notifications: NotificationsScreen(token: token)
                default: EmptyPanel(icon: "square.grid.2x2", title: "Coming soon", detail: "This section is not available yet.")
                    .padding(16)
                }
            }
            .background(AppWash())
            .navigationTitle(destination.title)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct DirectoryScreen: View {
    let token: String
    @State private var rowsData: [[String: Any]] = []
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Your neighbours")
                Text("Directory").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Phone numbers are masked by default.").font(.nivaasaBody).foregroundStyle(NK.muted)
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                ForEach(Array(rowsData.enumerated()), id: \.offset) { _, person in
                    NivaasaCard {
                        HStack(spacing: 10) {
                            NivaasaAvatar(name: string(person, "name"), color: NK.brand600, size: 38)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(person, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("Home \(string(person, "unit")) · \(string(person, "phone"))")
                                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .task { await load() }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            rowsData = rows(data["directory"])
        } catch { self.error = error.localizedDescription }
    }
}

struct DocumentsScreen: View {
    let token: String
    @State private var documents: [[String: Any]] = []
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("The society archive")
                Text("Documents").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Bye-laws, minutes, certificates and forms.").font(.nivaasaBody).foregroundStyle(NK.muted)
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                ForEach(Array(documents.enumerated()), id: \.offset) { _, doc in
                    NivaasaCard {
                        HStack(spacing: 10) {
                            Image(systemName: "doc.text").foregroundStyle(NK.muted).frame(width: 30)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(doc, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("\(string(doc, "category").capitalized) · \(shortDate(doc["createdAt"] as? String))")
                                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .task { await load() }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            documents = rows(data["documents"])
        } catch { self.error = error.localizedDescription }
    }
}

struct AmenitiesScreen: View {
    let token: String
    @State private var amenities: [[String: Any]] = []
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Your community club")
                Text("Amenities").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Availability, capacity and house rules.").font(.nivaasaBody).foregroundStyle(NK.muted)
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                ForEach(Array(amenities.enumerated()), id: \.offset) { _, amenity in
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(string(amenity, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Spacer()
                                if number(amenity, "price") > 0 { NivaasaBadge(text: money(number(amenity, "price")), tone: .pink) }
                            }
                            Text(string(amenity, "description")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            Text("\(string(amenity, "openTime"))–\(string(amenity, "closeTime")) · up to \(Int(number(amenity, "capacity"))) people")
                                .font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                        }
                    }
                }
            }
            .padding(16)
        }
        .task { await load() }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            amenities = rows(data["amenities"])
        } catch { self.error = error.localizedDescription }
    }
}

struct HouseholdScreen: View {
    let account: Account
    let session: Session
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                eyebrowStyle("Your home")
                Text("Home \(session.unit?.number ?? "—")").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                NivaasaCard {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(session.society.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text("\(session.unit?.type ?? "Home") · \(session.unit?.areaSqft ?? 0) sq ft").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        Text(account.user.name).font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                    }
                }
                Text("Family members, vehicles, pets, daily help and move requests are managed on the web app.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            .padding(16)
        }
    }
}

struct SettingsScreen: View {
    let account: Account
    let session: Session
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                eyebrowStyle("Your account")
                Text("Settings").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                NivaasaCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(account.user.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(account.user.globalRole == "user" ? "Resident" : account.user.globalRole)
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                        Text("Home \(session.unit?.number ?? "—") · \(session.society.name)")
                            .font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                    }
                }
                Text("Profile edits, notification preferences and security settings are available on the web app.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            .padding(16)
        }
    }
}

struct EmergencyScreen: View {
    let token: String
    @State private var message: String?
    @State private var error: String?
    @State private var busy = false
    @State private var confirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                eyebrowStyle("Safety first")
                Text("Emergency").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("One tap alerts the guard and community team.")
                    .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                if let message {
                    NivaasaCard { Text(message).font(.nivaasaBody).foregroundStyle(NK.mint600) }
                }
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                Button { confirm = true } label: {
                    VStack(spacing: 8) {
                        Image(systemName: "exclamationmark.shield.fill").font(.system(size: 30))
                        Text(busy ? "Sending alert…" : "Send emergency alert").font(.nivaasaSection)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 130)
                    .background(NK.danger, in: RoundedRectangle(cornerRadius: NKRadius.card))
                }
                .buttonStyle(.plain)
                .disabled(busy)
                .confirmationDialog("Send an emergency alert?", isPresented: $confirm, titleVisibility: .visible) {
                    Button("Send alert", role: .destructive) { Task { await send() } }
                    Button("Cancel", role: .cancel) {}
                } message: { Text("The guard and community team will be notified immediately.") }
                Text("Only use this for a real emergency.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            .padding(16)
        }
    }

    private func send() async {
        busy = true
        defer { busy = false }
        do {
            _ = try await API.request("panic", token: token, body: ["category": "security", "message": "Emergency alert from the Nivaasa app"])
            message = "Your alert was sent. Security is responding."
        } catch { self.error = error.localizedDescription }
    }
}

struct NotificationsScreen: View {
    let token: String
    @State private var notifications: [[String: Any]] = []
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Your updates")
                Text("Notifications").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                if notifications.isEmpty { EmptyPanel(icon: "bell", title: "You're all caught up", detail: "New updates will appear here.") }
                ForEach(Array(notifications.enumerated()), id: \.offset) { _, note in
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(string(note, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Spacer()
                                if note["readAt"] == nil { Circle().fill(NK.blush400).frame(width: 7, height: 7) }
                            }
                            Text(string(note, "body")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            Text(relativeDate(note["createdAt"] as? String)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { Task { await markRead(string(note, "id")) } }
                }
            }
            .padding(16)
        }
        .task { await load() }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            notifications = rows(data["notifications"])
        } catch { self.error = error.localizedDescription }
    }

    private func markRead(_ id: String) async {
        _ = try? await API.request("notifications/read", token: token, body: ["id": id])
        await load()
    }
}

// MARK: - Helpdesk

struct HelpdeskScreen: View {
    let token: String
    @State private var tickets: [[String: Any]] = []
    @State private var error: String?
    @State private var showNew = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 5) {
                        eyebrowStyle("Here to help")
                        Text("Helpdesk").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                        Text("Raise a request and follow every update.").font(.nivaasaBody).foregroundStyle(NK.muted)
                    }
                    Spacer(minLength: 8)
                    Button { showNew = true } label: {
                        Image(systemName: "plus").font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                            .frame(width: 44, height: 44).background(NK.brand600, in: Circle())
                    }.accessibilityLabel("Raise a request")
                }
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                if tickets.isEmpty {
                    EmptyPanel(icon: "wrench.and.screwdriver", title: "No requests yet", detail: "Raise a request when something needs attention.")
                }
                ForEach(Array(tickets.enumerated()), id: \.offset) { _, ticket in
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                NivaasaBadge(text: string(ticket, "category"), tone: .blue)
                                Spacer()
                                NivaasaBadge(text: string(ticket, "status").replacingOccurrences(of: "_", with: " ").capitalized, tone: statusTone(string(ticket, "status")))
                            }
                            Text(string(ticket, "subject")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(string(ticket, "description")).font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(2)
                            HStack {
                                Text(string(ticket, "assignee", fallback: "Awaiting assignment")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                                Spacer()
                                Text(relativeDate(ticket["updatedAt"] as? String)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showNew) { NewTicketSheet(token: token) { showNew = false; Task { await load() } } }
    }

    private func statusTone(_ status: String) -> NivaasaBadge.Tone {
        switch status {
        case "resolved", "closed": .mint
        case "open", "reopened": .blue
        case "in_progress", "assigned": .amber
        default: .neutral
        }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/helpdesk", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            tickets = rows(data["tickets"])
        } catch { self.error = error.localizedDescription }
    }
}

struct NewTicketSheet: View {
    let token: String
    let done: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var category = "Plumbing"
    @State private var scope = "personal"
    @State private var subject = ""
    @State private var description = ""
    @State private var priority = "medium"
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    eyebrowStyle("Helpdesk")
                    Text("Raise a request").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    field("Category", value: $category, options: ["Plumbing", "Electrical", "Housekeeping", "Common areas", "Security", "Other"])
                    field("Scope", value: $scope, options: ["personal", "community"])
                    field("Priority", value: $priority, options: ["low", "medium", "high", "urgent"])
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Subject").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                            TextField("What needs attention?", text: $subject)
                                .font(.nivaasaBody).padding(12).background(NK.surface, in: RoundedRectangle(cornerRadius: 10))
                                .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(NK.line) }
                            Text("Description").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                            TextEditor(text: $description)
                                .font(.nivaasaBody).frame(minHeight: 100).padding(8)
                                .background(NK.surface, in: RoundedRectangle(cornerRadius: 10))
                                .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(NK.line) }
                        }
                    }
                    if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                    PrimaryButton(title: busy ? "Sending…" : "Submit request", icon: "paperplane", disabled: busy || subject.count < 5 || description.count < 10) {
                        Task { await submit() }
                    }
                }
                .padding(16)
            }
            .background(AppWash())
            .navigationTitle("New request")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
    }

    private func field(_ label: String, value: Binding<String>, options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
            Picker(label, selection: value) {
                ForEach(options, id: \.self) { Text($0.replacingOccurrences(of: "_", with: " ").capitalized).tag($0) }
            }.pickerStyle(.segmented)
        }
    }

    private func submit() async {
        busy = true
        defer { busy = false }
        do {
            _ = try await API.request("mobile/helpdesk", token: token, body: [
                "category": category, "scope": scope, "subject": subject,
                "description": description, "priority": priority,
            ])
            done()
            dismiss()
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - Deliveries

struct DeliveriesScreen: View {
    let token: String
    @State private var deliveries: [[String: Any]] = []
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Gate & security")
                Text("Deliveries").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Everything headed to your door, with a clear handover record.")
                    .font(.nivaasaBody).foregroundStyle(NK.muted)
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                if deliveries.isEmpty { EmptyPanel(icon: "shippingbox", title: "No deliveries", detail: "Parcels and food deliveries will appear here.") }
                ForEach(Array(deliveries.enumerated()), id: \.offset) { _, delivery in
                    let held = string(delivery, "status") == "left_at_gate"
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(string(delivery, "company")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Spacer()
                                NivaasaBadge(text: held ? "At the gate" : string(delivery, "status").capitalized, tone: held ? .amber : .neutral)
                            }
                            Text(held ? "Ready to collect at the gate" : "Waiting at the gate")
                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            if held, let otp = delivery["otp"] as? String, !otp.isEmpty {
                                Text("Pickup code \(otp)").font(.jakarta(18, .bold)).foregroundStyle(NK.ink).monospacedDigit()
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .task { await load() }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/home", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            deliveries = rows(data["deliveries"])
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - Search

struct SearchScreen: View {
    let token: String
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var notices: [[String: Any]] = []
    @State private var directory: [[String: Any]] = []
    @State private var documents: [[String: Any]] = []
    @State private var amenities: [[String: Any]] = []

    private var term: String { query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass").foregroundStyle(NK.muted)
                        TextField("Notices, people, documents…", text: $query)
                            .font(.nivaasaBody).textInputAutocapitalization(.never).autocorrectionDisabled()
                            .accessibilityIdentifier("search")
                    }
                    .padding(.horizontal, 12).frame(height: 48)
                    .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                    .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.line) }

                    if term.isEmpty {
                        EmptyPanel(icon: "text.magnifyingglass", title: "Search your community", detail: "Find notices, neighbours, documents and amenities.")
                    } else {
                        results("Notices", notices.filter { matches($0, keys: ["title", "body"]) }) { notice in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(notice, "title")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                Text(string(notice, "category").capitalized).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                        results("People", directory.filter { matches($0, keys: ["name", "unit", "role"]) }) { person in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(person, "name")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                Text("Home \(string(person, "unit"))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                        results("Documents", documents.filter { matches($0, keys: ["title", "category"]) }) { doc in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(doc, "title")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                Text(string(doc, "category").capitalized).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                        results("Amenities", amenities.filter { matches($0, keys: ["name", "description", "location"]) }) { amenity in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(amenity, "name")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                Text(string(amenity, "location")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                    }
                }
                .padding(16)
            }
            .background(AppWash())
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
        .task { await load() }
    }

    private func matches(_ row: [String: Any], keys: [String]) -> Bool {
        keys.contains { string(row, $0).lowercased().contains(term) }
    }

    @ViewBuilder
    private func results<Content: View>(_ title: String, _ rows: [[String: Any]], @ViewBuilder row: @escaping ([String: Any]) -> Content) -> some View {
        if !rows.isEmpty {
            NivaasaCard {
                VStack(alignment: .leading, spacing: 10) {
                    Text(title).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    ForEach(Array(rows.prefix(6).enumerated()), id: \.offset) { _, item in
                        row(item)
                        Divider().overlay(NK.line)
                    }
                }
            }
        }
    }

    private func load() async {
        if let raw = try? await API.request("mobile/community", token: token),
           let data = try? JSONSerialization.jsonObject(with: raw) as? [String: Any] {
            notices = rows(data["notices"])
        }
        if let raw = try? await API.request("mobile/more", token: token),
           let data = try? JSONSerialization.jsonObject(with: raw) as? [String: Any] {
            directory = rows(data["directory"])
            documents = rows(data["documents"])
            amenities = rows(data["amenities"])
        }
    }
}
