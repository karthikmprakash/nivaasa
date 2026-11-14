import SwiftUI
import UserNotifications

// MARK: - Home

struct ResidentHomeView: View {
    @Environment(\.nivaasaNavigate) private var navigate
    @Environment(\.nivaasaNotice) private var openNotice
    @Environment(\.nivaasaTicket) private var openTicket
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
                        NivaasaIcon(name: "checkmark.circle").foregroundStyle(NK.mint600)
                        Text(response).font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                    }
                }
                if let data {
                    gate(data)
                    onTheWay(data)
                    dues(data)
                    services
                    notices(data)
                    Button { navigate(.emergency) } label: {
                        NivaasaCard(padding: 14) {
                            HStack(spacing: 12) {
                                NivaasaIcon(name: "exclamationmark.shield", size: 19).foregroundStyle(NK.dangerInk)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text("Emergency & safety").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                    Text("Alert the guard or find a contact").font(.nivaasaCaption).foregroundStyle(NK.muted)
                                }
                                Spacer()
                                NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
                            }
                        }
                    }.buttonStyle(NivaasaPressStyle())
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
        .fullScreenCover(isPresented: $showPass) { CreatePass(token: account.token, host: VisitorPassHost(account: account, session: session)) }
    }

    private var greeting: some View {
        let zone = TimeZone(identifier: "Asia/Kolkata") ?? .current
        let hour = Calendar.current.dateComponents(in: zone, from: Date()).hour ?? 0
        let salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
        let firstName = account.user.name.split(separator: " ").first.map(String.init) ?? account.user.name
        return VStack(alignment: .leading, spacing: 8) {
            eyebrowStyle("Your community")
            Text("\(salutation), \(firstName).").font(.nivaasaTitle).tracking(-0.8).foregroundStyle(NK.ink)
            Text("Home \(session.unit?.number ?? "—")").font(.nivaasaCaption).foregroundStyle(NK.muted)
            PrimaryButton(title: "Pre-approve a visitor", icon: "person.badge.plus") { showPass = true }
                .padding(.top, 4)
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
                    HStack(spacing: 2) { Text("All visitors"); NivaasaIcon(name: "chevron.right") }
                        .font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700).frame(minHeight: 36)
                }.buttonStyle(NivaasaPressStyle())
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
                if !string(visitor, "photoUrl").isEmpty {
                    VisitorPhotoBanner(visitor: visitor, token: account.token)
                }
                HStack(alignment: .top, spacing: 10) {
                    VisitorIdentity(visitor: visitor, token: account.token, size: 42)
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
                if let notes = visitor["notes"] as? String, !notes.isEmpty {
                    Text(notes).font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                SoftButton(title: "Deny", icon: "xmark", disabled: sending) { respond(visitor, "deny") }
                PrimaryButton(title: sending ? "Sending…" : "Approve", icon: "checkmark", disabled: sending) { respond(visitor, "approve") }
                if string(visitor, "type") == "delivery" {
                    OutlineButton(title: "Leave at gate", icon: "shippingbox", disabled: sending) { respond(visitor, "leave_at_gate") }
                }
            }
        }
    }

    private func onTheWay(_ data: [String: Any]) -> some View {
        let passes = rows(data["passes"])
        guard !passes.isEmpty else { return AnyView(EmptyView()) }
        return AnyView(VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text("On the way").font(.nivaasaSection).foregroundStyle(NK.ink)
                NivaasaBadge(text: "\(passes.count) pre-approved", tone: .mint)
                Spacer()
                Button { openTab("Visitors") } label: {
                    HStack(spacing: 2) { Text("All passes"); NivaasaIcon(name: "chevron.right") }
                        .font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700).frame(minHeight: 36)
                }.buttonStyle(NivaasaPressStyle())
            }
            NivaasaCard(padding: 8) {
                VStack(spacing: 0) {
                    ForEach(Array(passes.prefix(3).enumerated()), id: \.offset) { index, pass in
                        Button { openTab("Visitors") } label: {
                            HStack(spacing: 10) {
                                VisitorIdentity(visitor: pass, token: account.token, size: 36)
                                VStack(alignment: .leading, spacing: 2) {
                                    let company = string(pass, "company")
                                    Text(company.isEmpty ? string(pass, "name") : "\(string(pass, "name")) · \(company)")
                                        .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                    Text(passHomeWindow(pass)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                                }
                                Spacer()
                                Text(string(pass, "code")).font(.jakarta(13, .bold)).foregroundStyle(NK.brand700).monospacedDigit()
                            }
                            .padding(.horizontal, 8).padding(.vertical, 8)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(NivaasaPressStyle())
                        if index < min(3, passes.count) - 1 { Divider().padding(.leading, 54) }
                    }
                }
            }
        })
    }

    private func passHomeWindow(_ pass: [String: Any]) -> String {
        let from = pass["validFrom"] as? String
        let to = pass["validTo"] as? String
        let type = string(pass, "type").replacingOccurrences(of: "_", with: " ").capitalized
        guard let fromDate = nivaasaDate(from), let toDate = nivaasaDate(to) else {
            return "\(type) · \(shortDate(from)) – \(shortDate(to))"
        }
        let cal = communityCalendar
        let allDay = cal.isDate(fromDate, inSameDayAs: toDate)
            && cal.component(.hour, from: fromDate) == 0 && cal.component(.minute, from: fromDate) == 0
            && cal.component(.hour, from: toDate) == 23 && cal.component(.minute, from: toDate) == 59
        if allDay { return "\(type) · \(shortDate(from))" }
        if cal.isDate(fromDate, inSameDayAs: toDate) {
            return "\(type) · \(shortDate(from)) · \(shortTime(from))–\(shortTime(to))"
        }
        return "\(type) · \(shortDate(from)) – \(shortDate(to))"
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
                    NivaasaIcon(name: "wallet.bifold", size: 18).foregroundStyle(NK.brand600)
                }
                Text(money(total)).font(.jakarta(36, .semibold)).tracking(-1.1).foregroundStyle(NK.ink).monospacedDigit()
                Text(count == 0 ? "All paid. You're up to date." : "\(count) open \(count == 1 ? "invoice" : "invoices")")
                    .font(.nivaasaBody).foregroundStyle(NK.muted)
                if overdue > 0 {
                    Label { Text("\(overdue) invoice\(overdue == 1 ? "" : "s") overdue") } icon: { NivaasaIcon(name: "clock") }
                        .font(.nivaasaCaptionMedium).foregroundStyle(NK.amberInk)
                }
                PrimaryButton(title: total > 0 ? "Review & pay" : "Payment history", icon: "arrow.right") { openTab("Pay") }
                NivaasaTextButton(title: "Payment history & receipts") { openTab("Pay") }.frame(maxWidth: .infinity)
            }
        }
    }

    private var services: some View {
        NivaasaCard(padding: 10) {
            IconActionRow(items: [
                IconActionRow.Item(title: "Raise a request", icon: "wrench.and.screwdriver") { navigate(.helpdesk) },
                IconActionRow.Item(title: "Book amenity", icon: "calendarheart") { navigate(.amenities) },
                IconActionRow.Item(title: "Payments", icon: "wallet.bifold") { openTab("Pay") },
                IconActionRow.Item(title: "Directory", icon: "book.closed") { navigate(.directory) },
            ])
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
                         NivaasaIcon(name: myVote == id ? "checkmark.circle.fill" : "circle")
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
                }.buttonStyle(NivaasaPressStyle())
            }
        }
    }

    private func notices(_ data: [String: Any]) -> some View {
        let notices = rows(data["notices"]).prefix(1)
        return NivaasaCard {
            VStack(alignment: .leading, spacing: 0) {
                SectionHeading(title: "Community updates", action: "View all") { openTab("Community") }
                Text("Notices from your committee").font(.nivaasaCaption).foregroundStyle(NK.muted).padding(.top, 2)
                ForEach(Array(notices.enumerated()), id: \.offset) { _, notice in
                    Divider().overlay(NK.line).padding(.vertical, 12)
                    Button { openNotice(notice) } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                NivaasaBadge(text: string(notice, "category").capitalized, tone: badgeTone(notice))
                                if notice["pinned"] as? Bool ?? false { NivaasaBadge(text: "Pinned", tone: .pink) }
                                Spacer()
                                Text(relativeDate(string(notice, "publishedAt"))).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Text(string(notice, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(string(notice, "body").replacingOccurrences(of: "\n", with: " ")).font(.nivaasaBody).foregroundStyle(NK.muted).lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }.buttonStyle(NivaasaPressStyle())
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
                        NivaasaIcon(name: "calendar").foregroundStyle(NK.muted).frame(width: 44, height: 42)
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
        let deliveries = rows(data["deliveries"]).prefix(1)
        if deliveries.isEmpty { return AnyView(EmptyView()) }
        return AnyView(NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeading(title: "Deliveries", action: "View all") { navigate(.deliveries) }
                ForEach(Array(deliveries.enumerated()), id: \.offset) { _, delivery in
                    let held = string(delivery, "status") == "left_at_gate"
                    HStack(spacing: 10) {
                        NivaasaIcon(name: "shippingbox", size: 18).foregroundStyle(NK.muted).frame(width: 34, height: 34).background(NK.canvas, in: RoundedRectangle(cornerRadius: 9))
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
                SectionHeading(title: "Your requests", action: "View all") { navigate(.helpdesk) }
                ForEach(Array(tickets.enumerated()), id: \.offset) { _, ticket in
                    Button { openTicket(string(ticket, "id")) } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(string(ticket, "subject")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(string(ticket, "category")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Spacer()
                        NivaasaBadge(text: string(ticket, "status").replacingOccurrences(of: "_", with: " ").capitalized, tone: .blue)
                        NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                    }
                    .buttonStyle(NivaasaPressStyle())
                }
            }
        })
    }

    private func householdSummary(_ data: [String: Any]) -> some View {
        NivaasaCard {
            SectionHeading(title: "Home \(session.unit?.number ?? "—")", action: "Manage") { navigate(.household) }
            Text("\(session.unit?.type ?? "Home") · \(session.unit?.areaSqft ?? 0) sq ft").font(.nivaasaBody).foregroundStyle(NK.muted)
            Divider()
            HStack(spacing: 0) {
                ForEach([("family", "Family"), ("vehicles", "Vehicles"), ("pets", "Pets")], id: \.0) { key, label in
                    Button { navigate(.household) } label: {
                        VStack(spacing: 5) {
                            Text((data["household"] as? [String: Any])?[key].map { "\($0)" } ?? "—")
                                .font(.jakarta(20, .semibold)).foregroundStyle(NK.ink)
                            Text(label).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }.frame(maxWidth: .infinity, minHeight: 56)
                    }.buttonStyle(NivaasaPressStyle())
                }
            }
        }
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
                await MainActor.run { Haptics.shared.play(action == "deny" ? .warning : .success) }
                await load()
            } catch { self.error = error.localizedDescription }
        }
    }

    private func vote(poll: String, option: String) async {
        do {
            _ = try await API.request("community/poll", token: account.token, body: ["pollId": poll, "optionId": option])
            Haptics.shared.play(.success)
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
    @Environment(\.nivaasaNotice) private var openNotice
    @Environment(\.nivaasaNavigate) private var navigate
    @State private var data: [String: Any]?
    @State private var tab = "All updates"
    @State private var error: String?
    @State private var selectedNotice: NoticeSelection?
    @State private var showComposer = false
    @State private var busy: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle("Your community")
                    Text("Community").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    Text("The private, moderated space for your community. Notices from the committee, conversations with neighbours, polls and everything coming up.")
                        .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                    PrimaryButton(title: "Start a discussion", icon: "plus") { showComposer = true }.padding(.top, 10)
                }
                TabStrip(tabs: ["All updates", "Notices", "Discussions", "Polls", "Events"], selection: $tab)
                if let error {
                    NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                }
                if let data {
                    switch tab {
                    case "All updates":
                        if let featured = rows(data["notices"]).first {
                            Button { openNotice(featured) } label: {
                                NivaasaCard(tinted: true) {
                                    HStack(alignment: .top, spacing: 14) {
                                        NivaasaIcon(name: "newspaper", size: 20).foregroundStyle(NK.brand600)
                                            .frame(width: 44, height: 44).background(.white, in: RoundedRectangle(cornerRadius: 16))
                                        VStack(alignment: .leading, spacing: 7) {
                                            NivaasaBadge(text: string(featured, "category").capitalized, tone: .amber)
                                            Text(string(featured, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                            Text(string(featured, "body").replacingOccurrences(of: "\n", with: " ")).font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(2)
                                        }
                                    }
                                }
                            }.buttonStyle(NivaasaPressStyle())
                        }
                        discussionList(data)
                        noticeList(data)
                        pollList(data)
                        eventList(data)
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
        .fullScreenCover(isPresented: $showComposer) { DiscussionComposer(token: token) { showComposer = false; Task { await load() } } }
    }

    private func noticeList(_ data: [String: Any]) -> some View {
        NivaasaCard {
            Text("Notices").font(.nivaasaSection).foregroundStyle(NK.ink)
            Text("Official updates from the committee").font(.nivaasaBody).foregroundStyle(NK.muted)
            ForEach(Array(rows(data["notices"]).prefix(tab == "All updates" ? 4 : 20).enumerated()), id: \.offset) { _, notice in
                Divider()
                Button { openNotice(notice) } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            NivaasaBadge(text: string(notice, "category").capitalized, tone: .amber)
                            if notice["pinned"] as? Bool ?? false { NivaasaBadge(text: "Pinned", tone: .pink) }
                            Spacer()
                            Text(relativeDate(string(notice, "publishedAt"))).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Text(string(notice, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(string(notice, "body").replacingOccurrences(of: "\n", with: " ")).font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(2)
                        HStack {
                            Text(string(notice, "author", fallback: "Community office")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            Spacer()
                            Label { Text("\(Int(number(notice, "views")))") } icon: { NivaasaIcon(name: "eye") }.font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                }
            }.buttonStyle(NivaasaPressStyle())
        }
    }

    private func discussionList(_ data: [String: Any]) -> some View {
        NivaasaCard {
            SectionHeading(title: "Neighbourhood conversations", action: "Start a post") { showComposer = true }
            Text("Questions, suggestions and the small things that build a community").font(.nivaasaBody).foregroundStyle(NK.muted)
            ForEach(Array(rows(data["discussions"]).prefix(tab == "All updates" ? 3 : 10).enumerated()), id: \.offset) { _, discussion in
                Divider()
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
                        Label { Text("\(Int(number(discussion, "likes")))") } icon: { NivaasaIcon(name: "heart") }.font(.nivaasaCaption).foregroundStyle(NK.muted)
                        Label { Text("\(Int(number(discussion, "replies")))") } icon: { NivaasaIcon(name: "message") }.font(.nivaasaCaption).foregroundStyle(NK.muted)
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
                            NivaasaIcon(name: myVote == id ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(myVote == id ? NK.brand600 : NK.lineStrong)
                            Text(string(option, "label")).font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                            Spacer()
                            Text("\(Int(number(counts, id)))").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                        }
                        ProgressLine(value: Double(number(counts, id)) / Double(total))
                        if myVote.isEmpty {
                            NivaasaTextButton(title: busy == string(poll, "id") ? "Voting…" : "Vote for this choice") {
                                Task { await vote(poll: string(poll, "id"), option: id) }
                            }.disabled(busy != nil)
                        }
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
                        let going = (data["myRsvps"] as? [String] ?? []).contains(string(event, "id"))
                        NivaasaTextButton(title: going ? "Going ✓" : "RSVP") { Task { await rsvp(string(event, "id")) } }
                            .disabled(busy != nil)
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

    private func vote(poll: String, option: String) async {
        guard busy == nil else { return }
        busy = poll
        defer { busy = nil }
        do {
            _ = try await API.request("community/poll", token: token, body: ["pollId": poll, "optionId": option])
            Haptics.shared.play(.success)
            await load()
        } catch { self.error = error.localizedDescription }
    }

    private func rsvp(_ id: String) async {
        guard busy == nil else { return }
        busy = id
        defer { busy = nil }
        do {
            _ = try await API.request("mobile/rsvp", token: token, body: ["eventId": id])
            Haptics.shared.play(.success)
            await load()
        } catch { self.error = error.localizedDescription }
    }
}

struct NoticeDetail: View {
    let notice: [String: Any]
    @Environment(\.nivaasaBack) private var back
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        VStack(spacing: 0) {
            NivaasaTextButton(title: "Back to community", icon: "arrow.left", action: back).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 16)
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
        }
        .background(AppWash())
    }
}

// MARK: - Visitors

struct VisitorsScreen: View {
    let token: String
    let host: VisitorPassHost
    var societyAddress: String = ""
    @Environment(\.nivaasaNavigate) private var navigate
    @State private var data: [String: Any]?
    @State private var tab = "Waiting"
    @State private var showPass = false
    @State private var showGroup = false
    @State private var qrSelection: PassSelection?

    private struct PassSelection: Identifiable {
        let artwork: VisitorPassArtwork
        var id: String { artwork.pass.id }
    }
    private struct RecordSelection: Identifiable {
        let record: [String: Any]
        var id: String { string(record, "id") }
    }
    @State private var visitSelection: RecordSelection?
    @State private var inviteSelection: RecordSelection?
    @State private var dailyPickup = false
    @State private var error: String?
    @State private var pending = Set<String>()
    @State private var confirmingCancel: String?
    @State private var cancelling: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    VStack(alignment: .leading, spacing: 5) {
                        eyebrowStyle("Gate & security")
                        Text("Visitors").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                        Text("Approve people at the gate, create passes for expected guests, and see every entry linked to your home.")
                            .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                    }
                    PrimaryButton(title: "Pre-approve", icon: "person.badge.plus") { dailyPickup = false; showPass = true }
                    OutlineButton(title: "Invite a group", icon: "person.2") { showGroup = true }
                }
                if let data {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        StatCard(label: "Waiting at gate", value: "\(rows(data["pending"]).count)", hint: "Needs your response", tone: .pink, icon: "clock")
                        StatCard(label: "Active passes", value: "\(rows(data["passes"]).count)", hint: "Pre-approved visitors", tone: .blue, icon: "key")
                        StatCard(label: "Entries this month", value: "\(monthEntries(data))", hint: "Linked to your home", icon: "checkmark.shield")
                        StatCard(label: "Daily help today", value: "\(todayHelp(data).count)", hint: "Household staff", tone: .green, icon: "person.2")
                    }
                }
                TabStrip(tabs: ["Waiting", "Pre-approved", "History"], selection: $tab,
                    counts: ["Waiting": rows(data?["pending"]).count, "Pre-approved": rows(data?["passes"]).count, "History": rows(data?["history"]).count])
                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if let data {
                    switch tab {
                    case "Pre-approved": passes(data)
                    case "History": history(data)
                    default: waiting(data)
                    }
                    NivaasaCard {
                        SectionHeading(title: "Daily help attendance", action: "Manage") { navigate(.household) }
                        Text("Today's check-ins for your household staff").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        if todayHelp(data).isEmpty {
                            Text("No one has checked in yet today.").font(.nivaasaBody).foregroundStyle(NK.muted)
                                .frame(maxWidth: .infinity, alignment: .center).padding(.vertical, 12)
                        }
                        ForEach(Array(todayHelp(data).enumerated()), id: \.offset) { _, person in
                            let attendance = person["attendance"] as? [String: Any] ?? [:]
                            HStack(spacing: 10) {
                                NivaasaAvatar(name: string(person, "name"), color: NK.blush100, size: 36)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(string(person, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                    Text(string(person, "role", fallback: "Daily help")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                                }
                                Spacer()
                                Text(shortTime(attendance["checkOutAt"] as? String).isEmpty ? "In at \(shortTime(attendance["checkInAt"] as? String))" : "Left at \(shortTime(attendance["checkOutAt"] as? String))")
                                    .font(.nivaasaCaptionMedium).foregroundStyle(NK.mint600)
                            }
                        }
                    }
                    NivaasaCard {
                        HStack(alignment: .top, spacing: 12) {
                            NivaasaIcon(name: "calendarheart", size: 19).foregroundStyle(NK.brand600)
                                .frame(width: 40, height: 40).background(NK.brand50, in: RoundedRectangle(cornerRadius: 11))
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Daily cab pickup").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("Set a date range for a regular pickup. The same code works once per day until the pass ends.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                        NivaasaTextButton(title: "Set up daily pickup", icon: "chevron.right") { dailyPickup = true; showPass = true }
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
        .fullScreenCover(isPresented: $showGroup, onDismiss: { Task { await load() } }) {
            GroupInvite(token: token, host: host)
        }
        .sheet(item: $qrSelection) {
            AccessPassPreview(artwork: $0.artwork)
        }
        .sheet(item: $visitSelection) {
            VisitDetailView(visit: $0.record, token: token)
        }
        .sheet(item: $inviteSelection) {
            InviteDetailView(pass: $0.record, token: token, host: host, societyAddress: societyAddress)
        }
        .fullScreenCover(isPresented: $showPass, onDismiss: { Task { await load() } }) {
            CreatePass(token: token, host: host, initialType: dailyPickup ? .cab : .guest, dailyPickup: dailyPickup)
        }
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
                if !string(visitor, "photoUrl").isEmpty {
                    VisitorPhotoBanner(visitor: visitor, token: token)
                }
                HStack(spacing: 10) {
                    VisitorIdentity(visitor: visitor, token: token, size: 42)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(string(visitor, "company", fallback: string(visitor, "purpose", fallback: string(visitor, "type").replacingOccurrences(of: "_", with: " ").capitalized)))
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Spacer()
                    NivaasaBadge(text: "At the gate", tone: .amber, dot: true)
                }
                if let notes = visitor["notes"] as? String, !notes.isEmpty {
                    Text(notes).font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                HStack(spacing: 8) {
                    SoftButton(title: "Deny", icon: "xmark", disabled: sending) { respond(visitor, "deny") }
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
                    VStack(spacing: 12) {
                        NivaasaIcon(name: "key", size: 26).foregroundStyle(NK.brand600)
                            .frame(width: 54, height: 54).background(NK.brand50, in: RoundedRectangle(cornerRadius: 16))
                        Text("No active passes").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text("Pre-approve a guest or regular visitor and they can walk straight in with their code.")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted).multilineTextAlignment(.center)
                        PrimaryButton(title: "Create a pass", icon: "plus") { dailyPickup = false; showPass = true }
                    }.frame(maxWidth: .infinity)
                }
            } else {
                ForEach(Array(passes.enumerated()), id: \.offset) { _, pass in
                    passCard(pass)
                }
            }
        }.accessibilityIdentifier("group-passes")
    }

    private func passCard(_ pass: [String: Any]) -> some View {
        let id = string(pass, "id")
        let type = VisitorPassType(rawValue: string(pass, "type")) ?? .guest
        let daily = pass["recurringCab"] as? Bool ?? false
        let atGate = pass["leaveAtGate"] as? Bool ?? false
        let expired = string(pass, "status") != "approved"
        let header = HStack(spacing: 11) {
            NivaasaIcon(name: type.icon, size: 20).foregroundStyle(type.tint)
                .frame(width: 40, height: 40).background(type.softTint, in: RoundedRectangle(cornerRadius: 11))
            VStack(alignment: .leading, spacing: 3) {
                Text(string(pass, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                Text(string(pass, "company").isEmpty ? type.title : "\(string(pass, "company")) · \(type.title)")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            Spacer(minLength: 0)
            NivaasaBadge(text: expired ? "Expired" : daily ? "Daily pickup" : atGate ? "Leave at gate" : "Pre-approved",
                         tone: expired ? .neutral : atGate ? .amber : .mint)
            if type == .guest && !expired {
                NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
            }
        }
        .opacity(expired ? 0.65 : 1)
        return NivaasaCard {
            Group {
                if type == .guest && !expired {
                    Button {
                        inviteSelection = RecordSelection(record: pass)
                        Haptics.shared.play(.selection)
                    } label: { header }
                    .buttonStyle(NivaasaPressStyle())
                    .accessibilityIdentifier("open-invite")
                } else {
                    header
                }
            }
            HStack(spacing: 10) {
                NivaasaIcon(name: "key").foregroundStyle(NK.brand600)
                VStack(alignment: .leading, spacing: 2) {
                    Text("ENTRY CODE").font(.nivaasaEyebrow).foregroundStyle(NK.muted)
                    Text(string(pass, "code")).font(.jakarta(18, .bold)).tracking(2).foregroundStyle(NK.ink).monospacedDigit()
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("VALID").font(.nivaasaEyebrow).foregroundStyle(NK.muted)
                    Text(passValidity(pass)).font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                }
            }
            .padding(12)
            .background(NK.canvas, in: RoundedRectangle(cornerRadius: 12))
            if type == .guest && !expired, let qr = AccessPassCode(id: id, code: string(pass, "code")) {
                OutlineButton(title: "Show QR pass", icon: "qrcode.viewfinder") {
                    qrSelection = PassSelection(artwork: VisitorPassArtwork(
                        pass: qr,
                        host: host.recordedCreator(string(pass, "creatorName")),
                        visitor: string(pass, "name"),
                        type: type.title,
                        from: nivaasaDate(pass["validFrom"] as? String),
                        to: nivaasaDate(pass["validTo"] as? String),
                        daily: daily, leaveAtGate: atGate
                    ))
                }
            }
            HStack {
                NivaasaCopyButton(value: string(pass, "code"), label: "Copy code")
                if !expired && confirmingCancel != id {
                    Button { confirmingCancel = id } label: {
                        Text("Cancel pass").font(.nivaasaCaptionMedium).foregroundStyle(NK.dangerInk)
                            .frame(minHeight: 44).padding(.horizontal, 8)
                    }
                    .buttonStyle(NivaasaPressStyle())
                    .accessibilityIdentifier("cancel-pass")
                }
            }
            if confirmingCancel == id {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Cancel this pass?").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    Text("The code will stop working immediately. You can create a new pass at any time.")
                        .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    HStack(spacing: 8) {
                        OutlineButton(title: "Keep pass") { confirmingCancel = nil }
                        SoftButton(title: cancelling == id ? "Cancelling…" : "Cancel pass", disabled: cancelling != nil) {
                            Task { await cancel(pass) }
                        }
                    }
                }
                .padding(12)
                .background(NK.dangerSoft, in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func passValidity(_ pass: [String: Any]) -> String {
        let from = shortDate(pass["validFrom"] as? String)
        let to = shortDate(pass["validTo"] as? String)
        if from == to {
            let rawFrom = pass["validFrom"] as? String
            let rawTo = pass["validTo"] as? String
            if nivaasaDate(rawFrom) != nil && nivaasaDate(rawTo) != nil {
                return "\(from) · \(shortTime(rawFrom))–\(shortTime(rawTo))"
            }
            return from
        }
        return "\(from) – \(to)"
    }

    private func history(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["history"]).enumerated()), id: \.offset) { _, visit in
            Button {
                visitSelection = RecordSelection(record: visit)
                Haptics.shared.play(.selection)
            } label: {
                NivaasaCard {
                    HStack(spacing: 10) {
                        VisitorIdentity(visitor: visit, token: token, size: 38)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(string(visit, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text(historySubtitle(visit)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Spacer()
                        NivaasaBadge(text: historyStatus(visit).text, tone: historyStatus(visit).tone)
                    }
                }
            }
            .buttonStyle(NivaasaPressStyle())
            .accessibilityIdentifier("history-visit")
        }
    }

    private func historySubtitle(_ visit: [String: Any]) -> String {
        let type = string(visit, "type").replacingOccurrences(of: "_", with: " ").capitalized
        var parts = [type, relativeDate(visit["createdAt"] as? String)]
        if let entered = visit["enteredAt"] as? String, nivaasaDate(entered) != nil {
            parts.append("in \(shortTime(entered))")
        }
        if let exited = visit["exitedAt"] as? String, nivaasaDate(exited) != nil {
            parts.append("out \(shortTime(exited))")
        } else if string(visit, "status") == "entered" {
            parts.append("inside now")
        }
        return parts.joined(separator: " · ")
    }

    private func historyStatus(_ visit: [String: Any]) -> (text: String, tone: NivaasaBadge.Tone) {
        let status = string(visit, "status")
        let leaveAtGate = status == "exited" && (visit["leaveAtGate"] as? Bool ?? false) && string(visit, "enteredAt").isEmpty
        switch status {
        case "denied": return ("Denied", .danger)
        case "expired": return ("Expired", .neutral)
        case "entered": return ("Inside", .pink)
        case "exited": return leaveAtGate ? ("Left at gate", .amber) : ("Exited", .mint)
        default: return (status.capitalized, .neutral)
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

    private func todayHelp(_ data: [String: Any]) -> [[String: Any]] {
        rows(data["help"]).filter { ($0["attendance"] as? [String: Any])?["checkInAt"] as? String != nil }
    }

    private func monthEntries(_ data: [String: Any]) -> Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Kolkata")!
        return rows(data["history"]).filter { visitor in
            guard let date = nivaasaDate(visitor["enteredAt"] as? String) else { return false }
            return calendar.isDate(date, equalTo: Date(), toGranularity: .month)
        }.count
    }

    private func respond(_ visitor: [String: Any], _ action: String) {
        let id = string(visitor, "id")
        guard pending.insert(id).inserted else { return }
        Task {
            defer { pending.remove(id) }
            do {
                _ = try await API.request("visitors/\(id)/respond", token: token, body: ["action": action])
                Haptics.shared.play(action == "deny" ? .error : action == "approve" ? .success : .warning)
                await load()
            } catch {
                self.error = error.localizedDescription
                Haptics.shared.play(.error)
            }
        }
    }

    private func cancel(_ pass: [String: Any]) async {
        let id = string(pass, "id")
        guard !id.isEmpty, cancelling == nil else { return }
        cancelling = id
        error = nil
        defer { cancelling = nil }
        do {
            _ = try await API.request("mobile/visitors/cancel", token: token, body: ["visitorId": id])
            confirmingCancel = nil
            Haptics.shared.play(.warning)
            await load()
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}

// MARK: - Payments

struct PaymentsScreen: View {
    let token: String
    let session: Session
    @Environment(\.nivaasaNavigate) private var navigate
    @State private var data: [String: Any]?
    @State private var tab = "Invoices"
    @State private var error: String?
    @State private var paying: String?
    @State private var confirmation: String?
    @State private var paymentForm: PaymentSelection?
    @State private var receipt: NoticeSelection?
    @State private var showStatement = false
    @State private var showAdvance = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle("Money, clearly")
                    Text("Payments").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    Text("Your maintenance, water and clubhouse charges — pay online, record an offline payment, or download a statement. No surprises.")
                        .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                    OutlineButton(title: "Statement", icon: "arrow.down.circle") { showStatement = true }.padding(.top, 8)
                }
                if let error { NivaasaCard { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) } }
                if let confirmation { NivaasaFeedback(text: confirmation, tone: .mint) }
                if let data {
                    WebPaymentOverview(data: data, unit: session.unit?.number ?? "—", pay: { invoice in paymentForm = PaymentSelection(invoice: invoice) }, addAdvance: { showAdvance = true })
                    TabStrip(tabs: ["Invoices", "Payment history", "Verifications"], selection: $tab, counts: ["Invoices": rows(data["invoices"]).filter { ["due", "overdue", "partially_paid"].contains(string($0, "status")) }.count, "Payment history": rows(data["payments"]).filter { string($0, "status") != "pending" }.count, "Verifications": rows(data["payments"]).filter { string($0, "status") == "pending" }.count])
                    if tab == "Invoices" {
                        invoices(data)
                        NivaasaCard {
                            Text("What you're paying for").font(.nivaasaSection).foregroundStyle(NK.ink)
                            Divider()
                            ForEach(Array(rows(data["breakdown"]).enumerated()), id: \.offset) { _, item in
                                HStack { Text(string(item, "description")); Spacer(); Text(money(number(item, "amount"))) }.font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                            }
                            if rows(data["breakdown"]).isEmpty { Text("The committee has not issued a breakdown for this invoice yet.").font(.nivaasaCaption).foregroundStyle(NK.muted) }
                        }
                        NivaasaCard {
                            Text("Paying by NEFT or cheque?").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text("Use “I have paid”, add the reference and the accounts team will verify it. You'll get a receipt once matched.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            let bank = data["bank"] as? [String: Any] ?? [:]
                            Text(string(bank, "name", fallback: "Society bank account") + " · ••" + string(bank, "last4", fallback: "Not configured")).font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                        }
                    } else { history(data) }
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
        .fullScreenCover(item: $paymentForm, onDismiss: { Task { await load() } }) { PaymentForm(token: token, selection: $0) }
        .fullScreenCover(item: $receipt) { ReceiptPreview(payment: $0.notice) }
        .fullScreenCover(isPresented: $showStatement) { DocumentPreview(document: DocumentSelection(path: "/api/export/statement", title: "Statement"), token: token) }
        .fullScreenCover(isPresented: $showAdvance, onDismiss: { Task { await load() } }) { AdvancePaymentForm(token: token, balance: number(data ?? [:], "advance")) }
    }

    private func invoices(_ data: [String: Any]) -> some View {
        let all = rows(data["invoices"])
        let unpaid = all.filter { ["due", "overdue", "partially_paid"].contains(string($0, "status")) }
        let paidCount = all.count - unpaid.count
        return VStack(alignment: .leading, spacing: 12) {
            if unpaid.isEmpty {
                EmptyPanel(icon: "checkmark.circle", title: "All paid up", detail: "No open invoices right now. Paid invoices live in Payment history.")
            }
            ForEach(Array(unpaid.enumerated()), id: \.offset) { _, invoice in
                let status = string(invoice, "status")
                NivaasaCard {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(invoice, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text(string(invoice, "number")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Spacer()
                            NivaasaBadge(text: status.replacingOccurrences(of: "_", with: " ").capitalized, tone: status == "overdue" ? .danger : .amber)
                        }
                        HStack(alignment: .lastTextBaseline) {
                            Text(money(number(invoice, "total"))).font(.jakarta(22, .bold)).foregroundStyle(NK.ink).monospacedDigit()
                            Spacer()
                            Text("Due \(shortDate(invoice["dueDate"] as? String))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        let pending = rows(data["payments"]).contains { string($0, "invoiceId") == string(invoice, "id") && string($0, "status") == "pending" }
                        if pending {
                            NivaasaBadge(text: "Awaiting verification", tone: .amber)
                        } else {
                            HStack(spacing: 8) {
                                OutlineButton(title: "I have paid") { paymentForm = PaymentSelection(invoice: invoice, offline: true) }
                                PrimaryButton(title: "Pay now", icon: "arrow.right") { paymentForm = PaymentSelection(invoice: invoice) }
                            }
                        }
                    }
                }
            }
            if paidCount > 0 {
                Button {
                    tab = "Payment history"
                    Haptics.shared.play(.selection)
                } label: {
                    NivaasaCard(padding: 14) {
                        HStack(spacing: 10) {
                            NivaasaIcon(name: "clock", size: 17).foregroundStyle(NK.muted)
                            Text("\(paidCount) paid invoice\(paidCount == 1 ? "" : "s") collapsed")
                                .font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                            Spacer()
                            Text("View history").font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700)
                            NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
                        }
                    }
                }
                .buttonStyle(NivaasaPressStyle())
                .accessibilityIdentifier("collapsed-history")
            }
        }
    }

    private func history(_ data: [String: Any]) -> some View {
        ForEach(Array(rows(data["payments"]).filter { (string($0, "status") == "pending") == (tab == "Verifications") }.enumerated()), id: \.offset) { _, payment in
            let success = string(payment, "status") == "success"
            NivaasaCard(padding: 14) {
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(money(number(payment, "amount"))).font(.nivaasaBodySemibold).foregroundStyle(NK.ink).monospacedDigit()
                        Text("\(string(payment, "receiptNo")) · \(string(payment, "method").uppercased())")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Spacer()
                    NivaasaBadge(text: string(payment, "status").capitalized, tone: success ? .mint : .amber)
                    Button {
                        receipt = NoticeSelection(notice: payment)
                        Haptics.shared.play(.selection)
                    } label: {
                        HStack(spacing: 5) {
                            NivaasaIcon(name: success ? "arrow.down.circle" : "doc.text", size: 15)
                            Text(success ? "Receipt" : "View").font(.nivaasaCaptionMedium)
                        }
                        .foregroundStyle(NK.brand700)
                        .padding(.horizontal, 10).frame(minHeight: 36)
                        .background(NK.brand50, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                    }
                    .buttonStyle(NivaasaPressStyle())
                    .accessibilityIdentifier("receipt-" + string(payment, "id"))
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
            Haptics.shared.play(.success)
            await load()
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
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
                        NivaasaIcon(name: "bell").foregroundStyle(NK.muted)
                        Text("Notifications").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                        Spacer()
                        if unread > 0 { NivaasaBadge(text: "\(unread) new", tone: .pink) }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { sheet = .notifications }
                }
                Button(role: .destructive) { onSignOut() } label: {
                    HStack(spacing: 8) {
                        NivaasaIcon(name: "rectangle.portrait.and.arrow.right")
                        Text("Sign out")
                    }
                    .font(.nivaasaBodySemibold).foregroundStyle(NK.dangerInk)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(NK.dangerSoft, in: RoundedRectangle(cornerRadius: NKRadius.control))
                }
                .buttonStyle(NivaasaPressStyle())
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, 16).padding(.top, 20).padding(.bottom, 24)
            .frame(maxWidth: .infinity)
        }
        .background(Color.clear)
        .fullScreenCover(item: $sheet) { ResidentSheet(destination: $0, token: account.token, account: account, session: session) }
    }

    private func moreRow(_ title: String, _ icon: String, run: @escaping () -> Void) -> some View {
        Button(action: run) {
            HStack(spacing: 12) {
                NivaasaIcon(name: icon, size: 18).foregroundStyle(NK.muted).frame(width: 24)
                Text(title).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                Spacer()
                NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
        }.buttonStyle(NivaasaPressStyle())
    }
}

// MARK: - Destination sheets

struct ResidentSheet: View {
    let destination: Destination
    let token: String
    let account: Account
    let session: Session
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            NivaasaCloseBar(close: { dismiss() })
            Group {
                switch destination {
                case .helpdesk: HelpdeskScreen(token: token)
                case .deliveries: DeliveriesScreen(token: token, host: VisitorPassHost(account: account, session: session))
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
        }
        .background(AppWash())
    }
}

struct DirectoryScreen: View {
    let token: String
    @Environment(\.openURL) private var openURL
    @Environment(\.nivaasaNavigate) private var navigate
    @State private var rowsData: [[String: Any]] = []
    @State private var payload: [String: Any] = [:]
    @State private var tab = "Residents"
    @State private var role = "Everyone"
    @State private var query = ""
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Your neighbours")
                Text("Directory").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("The people, pets and trusted help that make up your community. Phone numbers are masked by default.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                NivaasaBadge(text: "Privacy-first directory", tone: .mint)
                NivaasaChips(options: ["Residents", "Pets", "Vehicles", "Daily help"], selection: $tab, icons: ["Residents": "person.2", "Pets": "pawprint", "Vehicles": "car", "Daily help": "sparkles"])
                HStack(spacing: 8) {
                    NivaasaIcon(name: "magnifyingglass").foregroundStyle(NK.muted)
                    TextField("Search name, flat or pet…", text: $query).font(.nivaasaCaption).foregroundStyle(NK.ink)
                        .textInputAutocapitalization(.never).autocorrectionDisabled().accessibilityLabel("Search")
                }.padding(.horizontal, 12).frame(height: 44).background(NK.surface, in: Capsule()).overlay { Capsule().strokeBorder(NK.line) }
                if tab == "Residents" { NivaasaChips(options: ["Everyone", "Owners", "Tenants", "Committee"], selection: $role, activeColor: NK.ink) }
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                ForEach(Array(filtered.enumerated()), id: \.offset) { index, person in
                    if tab == "Residents", index == 0 || string(filtered[index - 1], "towerName") != string(person, "towerName") {
                        HStack(spacing: 8) {
                            NivaasaIcon(name: "building.2").foregroundStyle(NK.brand600)
                            Text("Tower " + string(person, "towerName") + " (" + string(person, "towerCode") + ")").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        }.padding(.top, 12)
                    }
                    NivaasaCard(padding: 14) {
                        HStack(spacing: 10) {
                            NivaasaAvatar(name: string(person, "name", fallback: string(person, "registrationNo")), color: identityColor(person), size: 40)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(person, "name", fallback: string(person, "registrationNo"))).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("Home \(string(person, "unit")) · \(string(person, "role", fallback: string(person, "species", fallback: string(person, "model"))).capitalized)")
                                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                                if !string(person, "designation").isEmpty { Text(string(person, "designation")).font(.nivaasaCaption).foregroundStyle(NK.muted) }
                                if !string(person, "phone").isEmpty { Text(string(person, "phone")).font(.nivaasaCaption).foregroundStyle(NK.muted) }
                            }
                            Spacer(minLength: 0)
                            if tab == "Residents" || tab == "Daily help" {
                                Button { contactGuard() } label: {
                                    NivaasaIcon(name: "phone").foregroundStyle(NK.muted).frame(width: 44, height: 44).background(NK.canvas, in: Circle())
                                }.buttonStyle(NivaasaPressStyle()).accessibilityLabel("Contact via guard about " + string(person, "name"))
                            }
                        }
                    }
                }
                if filtered.isEmpty && error == nil { EmptyPanel(icon: "book.closed", title: "Nothing here", detail: "Try another name, flat or filter.") }
                NivaasaTextButton(title: "Manage my visibility") { navigate(.settings) }
            }
            .padding(16)
        }
        .task { await load() }
    }

    private func identityColor(_ person: [String: Any]) -> Color {
        guard let value = UInt32(string(person, "color").replacingOccurrences(of: "#", with: ""), radix: 16) else { return NK.brand600 }
        return Color(hex: value)
    }

    private func contactGuard() {
        let contacts = payload["contacts"] as? [String: Any] ?? [:]
        let phone = string(contacts["guard"] as? [String: Any] ?? [:], "phone").filter { $0.isNumber || $0 == "+" }
        if !phone.isEmpty, let url = URL(string: "tel:" + phone) { openURL(url) }
        else { navigate(.helpdesk) }
    }

    private var filtered: [[String: Any]] {
        let list: [[String: Any]]
        switch tab {
        case "Pets": list = rows(payload["directoryPets"])
        case "Vehicles": list = rows(payload["directoryVehicles"])
        case "Daily help": list = rows(payload["directoryHelp"])
        default: list = rowsData
        }
        return list.filter { record in
            let memberRole = string(record, "role")
            if tab == "Residents" && role == "Owners" && !["owner", "committee"].contains(memberRole) { return false }
            if tab == "Residents" && role == "Tenants" && memberRole != "tenant" { return false }
            if tab == "Residents" && role == "Committee" && memberRole != "committee" { return false }
            return query.isEmpty || ["name", "unit", "registrationNo", "make", "model", "species"].contains { string(record, $0).localizedCaseInsensitiveContains(query) }
        }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            payload = data
            rowsData = rows(data["directory"])
        } catch { self.error = error.localizedDescription }
    }
}

struct DocumentsScreen: View {
    let token: String
    @Environment(\.nivaasaNavigate) private var navigate
    @State private var documents: [[String: Any]] = []
    @State private var category = "All documents"
    @State private var query = ""
    @State private var preview: DocumentSelection?
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("The society archive")
                Text("Documents").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Bye-laws, AGM minutes, audited accounts and the forms you actually need — in one place, with the right access.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                NivaasaBadge(text: "Access-controlled", tone: .mint)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    StatCard(label: "Documents", value: "\(documents.count)", hint: "Available to you", tone: .blue, icon: "doc.text")
                    StatCard(label: "Categories", value: "6", hint: "Organised and searchable", icon: "book.closed")
                    StatCard(label: "Latest", value: shortDate(documents.first?["createdAt"] as? String), hint: string(documents.first ?? [:], "category"), tone: .pink, icon: "doc.text")
                    StatCard(label: "Access", value: "Role-based", hint: "Owners and committee", tone: .green, icon: "checkmark.shield")
                }
                NivaasaChips(options: ["All documents", "Bye-laws", "AGM minutes", "Financials", "Forms", "Circulars", "Maintenance"], selection: $category)
                NivaasaInput(label: "Search", text: $query, placeholder: "Search documents…")
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                ForEach(Array(filteredDocuments.enumerated()), id: \.offset) { _, doc in
                    NivaasaCard {
                        HStack(spacing: 10) {
                            NivaasaIcon(name: "doc.text").foregroundStyle(NK.muted).frame(width: 30)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(doc, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("\(string(doc, "category").capitalized) · \(shortDate(doc["createdAt"] as? String))")
                                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                        OutlineButton(title: "Download", icon: "arrow.down.circle") { preview = DocumentSelection(path: string(doc, "fileUrl"), title: string(doc, "title")) }
                    }
                }
                if filteredDocuments.isEmpty && error == nil { EmptyPanel(icon: "doc.text", title: "No documents here", detail: "Try another category or search term.") }
                NivaasaCard(tinted: true) {
                    Text("Looking for something?").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    Text("If you need a document that isn't here — an NOC, a past AGM minute or an auditor's letter — ask the community office.").font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                    NivaasaTextButton(title: "Request a document", icon: "arrow.right") { navigate(.helpdesk) }
                }
            }
            .padding(16)
        }
        .task { await load() }
        .fullScreenCover(item: $preview) { DocumentPreview(document: $0, token: token) }
    }

    private var filteredDocuments: [[String: Any]] {
        let keys = ["Bye-laws": "bylaws", "AGM minutes": "minutes", "Financials": "financials", "Forms": "forms", "Circulars": "circulars", "Maintenance": "maintenance"]
        return documents.filter { doc in
            (category == "All documents" || string(doc, "category") == keys[category]) && (query.isEmpty || string(doc, "title").localizedCaseInsensitiveContains(query))
        }
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
    @Environment(\.nivaasaNavigate) private var navigate
    @State private var amenities: [[String: Any]] = []
    @State private var bookings: [[String: Any]] = []
    @State private var selection: AmenitySelection?
    @State private var error: String?
    @State private var feedback: String?
    @State private var cancelID: String?
    @State private var showCancelConfirmation = false
    @State private var cancelMessage = ""
    @State private var cancelling = false

    var body: some View {
        ScrollViewReader { proxy in
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Your community club")
                Text("Amenities").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Book the pool, the court or the party hall in seconds. Live availability, clear rules and payments built in.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                if let error { NivaasaFeedback(text: error, tone: .danger) }
                if let feedback { NivaasaFeedback(text: feedback) }

                // Next booking as a compact banner with the amenity's icon
                if let next = upcoming.first {
                    let booking = next["booking"] as? [String: Any] ?? [:]
                    let amenityIcon = amenities.first { string($0, "name") == string(next, "amenity") }.map { string($0, "icon", fallback: "sparkles") } ?? "calendar"
                    NivaasaCard(padding: 12) {
                        HStack(spacing: 12) {
                            let tint = iconTint(string(next, "amenity"))
                            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(tint.bg)
                                .frame(width: 46, height: 46)
                                .overlay { NivaasaIcon(name: amenityIcon, size: 22).foregroundStyle(tint.fg) }
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Next booking · \(string(next, "amenity"))").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("\(shortDate(booking["date"] as? String)) · \(string(booking, "startTime"))–\(string(booking, "endTime"))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Spacer()
                            NivaasaBadge(text: "Confirmed", tone: .mint)
                            Button { proxy.scrollTo("my-bookings", anchor: .top) } label: {
                                NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
                            }.buttonStyle(NivaasaPressStyle())
                        }
                    }
                }

                Text("Community spaces").font(.nivaasaSection).foregroundStyle(NK.ink).id("amenities-list")
                Text("Tap a space to see live slots and book.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(Array(amenities.enumerated()), id: \.offset) { _, amenity in
                        let price = number(amenity, "price")
                        IconTile(
                            icon: string(amenity, "icon", fallback: "sparkles"),
                            title: string(amenity, "name"),
                            subtitle: string(amenity, "location"),
                            badge: price > 0 ? money(price) : "Free",
                            badgeTone: price > 0 ? .pink : .mint,
                            tintedBy: string(amenity, "name"),
                            identifier: "amenity-" + string(amenity, "id")
                        ) {
                            Haptics.shared.play(.selection)
                            selection = AmenitySelection(amenity: amenity)
                        }
                    }
                }

                NivaasaCard(padding: 8) {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("My bookings").font(.nivaasaSection).foregroundStyle(NK.ink).id("my-bookings")
                            Spacer()
                            Text("\(upcoming.count) upcoming").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        if bookings.isEmpty {
                            Text("No bookings yet. Pick a space above and make a little time for yourself.").font(.nivaasaBody).foregroundStyle(NK.muted).padding(.vertical, 8)
                        }
                        ForEach(Array(bookings.enumerated()), id: \.offset) { index, row in
                            let booking = row["booking"] as? [String: Any] ?? [:]
                            let amenityIcon = amenities.first { string($0, "name") == string(row, "amenity") }.map { string($0, "icon", fallback: "sparkles") } ?? "calendar"
                            let tint = iconTint(string(row, "amenity"))
                            let canCancel = string(booking, "status") == "confirmed" && (startTime(booking) ?? .distantPast) > Date()
                            HStack(spacing: 12) {
                                RoundedRectangle(cornerRadius: 12, style: .continuous).fill(tint.bg)
                                    .frame(width: 42, height: 42)
                                    .overlay { NivaasaIcon(name: amenityIcon, size: 20).foregroundStyle(tint.fg) }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(string(row, "amenity")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink).lineLimit(1)
                                    Text("\(shortDate(booking["date"] as? String)) · \(string(booking, "startTime"))–\(string(booking, "endTime")) · \(Int(number(booking, "guests"))) guests")
                                        .font(.nivaasaCaption).foregroundStyle(NK.muted)
                                }
                                Spacer(minLength: 8)
                                NivaasaBadge(text: string(booking, "status").replacingOccurrences(of: "_", with: " ").capitalized,
                                             tone: string(booking, "status") == "confirmed" ? .mint : .neutral)
                                if canCancel {
                                    Button {
                                        cancelMessage = number(booking, "amount") == 0
                                            ? "This will release your slot."
                                            : "Bookings cancelled at least 24 hours before the start time are eligible for a refund."
                                        cancelID = string(booking, "id")
                                        showCancelConfirmation = true
                                        Haptics.shared.play(.tap)
                                    } label: {
                                        HStack(spacing: 5) {
                                            NivaasaIcon(name: "xmark", size: 12)
                                            Text("Cancel").font(.nivaasaCaptionMedium)
                                        }
                                        .foregroundStyle(NK.dangerInk)
                                        .frame(minHeight: 36).padding(.horizontal, 10)
                                        .background(NK.dangerSoft, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                                        .contentShape(Rectangle())
                                    }
                                    .buttonStyle(NivaasaPressStyle())
                                    .disabled(cancelling)
                                    .accessibilityIdentifier("cancel-booking-" + string(booking, "id"))
                                }
                            }
                            .padding(.horizontal, 12).padding(.vertical, 12)
                            .contentShape(Rectangle())
                            if index < bookings.count - 1 { Divider().padding(.leading, 66) }
                        }
                    }
                }
                NivaasaCard {
                    Text("Fair use, by design").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    Text("Check the house rules, capacity and any charges before confirming. Cancellation and refund details are shown with your booking.").font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                    NivaasaTextButton(title: "Request a booking", icon: "arrow.right") { navigate(.helpdesk) }
                }
            }
            .padding(16)
        }
        }
        .task { await load() }
        .refreshable { await load() }
        .alert("Cancel this booking?", isPresented: $showCancelConfirmation) {
            Button("Cancel booking", role: .destructive) {
                guard let id = cancelID else { return }
                cancelID = nil
                Task { await cancelBooking(id) }
            }
            Button("Keep booking", role: .cancel) { cancelID = nil }
        } message: { Text(cancelMessage) }
        .fullScreenCover(item: $selection, onDismiss: { Task { await load() } }) { AmenityBookingForm(token: token, amenity: $0.amenity) }
    }

    private var upcoming: [[String: Any]] {
        bookings.filter { row in
            let booking = row["booking"] as? [String: Any] ?? [:]
            return string(booking, "status") == "confirmed" && (startTime(booking) ?? .distantPast) > Date()
        }
    }

    private func startTime(_ booking: [String: Any]) -> Date? {
        let day = string(booking, "date")
        let time = string(booking, "startTime")
        return nivaasaDate("\(day)T\(time):00+05:30")
    }

    private func cancelBooking(_ id: String) async {
        guard !cancelling else { return }
        cancelling = true
        error = nil
        feedback = nil
        defer { cancelling = false }
        do {
            let data = try await API.request("amenities/cancel", token: token, body: ["bookingId": id])
            struct Result: Decodable { let refundable: Bool }
            let result = try JSONDecoder().decode(Result.self, from: data)
            feedback = result.refundable ? "Booking cancelled. Refund recorded." : "Booking cancelled."
            Haptics.shared.play(.warning)
            await load()
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
            await load()
        }
    }

    private var monthHours: String {
        let hours = bookings.reduce(0.0) { total, row in
            let b = row["booking"] as? [String: Any] ?? [:]
            guard let date = nivaasaDate(b["date"] as? String), Calendar.current.isDate(date, equalTo: Date(), toGranularity: .month), string(b, "status") != "cancelled" else { return total }
            func minutes(_ value: String) -> Double { let parts = value.split(separator: ":").compactMap { Double($0) }; return parts.count == 2 ? parts[0] * 60 + parts[1] : 0 }
            let duration = minutes(string(b, "endTime")) - minutes(string(b, "startTime"))
            return total + (duration > 0 ? duration : duration + 1440) / 60
        }
        return String(format: "%.1f", hours)
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            amenities = rows(data["amenities"])
            bookings = rows(data["bookings"])
        } catch { self.error = error.localizedDescription }
    }
}

struct HouseholdScreen: View {
    let account: Account
    let session: Session
    @State private var data: [String: Any] = [:]
    @State private var failure: String?
    @State private var showDailyHelp = false
    @State private var dailyHelp: DailyHelpSelection?

    private struct DailyHelpSelection: Identifiable { let id: String }
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
                if let failure { NivaasaFeedback(text: failure, tone: .danger) }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    StatCard(label: "Family", value: "\(rows(data["family"]).count)", hint: "Members of your household", tone: .blue, icon: "person.2")
                    StatCard(label: "Vehicles", value: "\(rows(data["vehicles"]).count)", hint: "Registered with the society", icon: "car")
                    StatCard(label: "Pets", value: "\(rows(data["pets"]).count)", hint: "Part of the family", tone: .pink, icon: "pawprint")
                    StatCard(label: "Daily help", value: "\(rows(data["help"]).count)", hint: "Registered for your home", tone: .green, icon: "person.2")
                }
                homeSection("Family members", records: rows(data["family"]), title: "name", subtitle: "relation")
                homeSection("Vehicles & parking", records: rows(data["vehicles"]), title: "registrationNo", subtitle: "model")
                homeSection("Pets", records: rows(data["pets"]), title: "name", subtitle: "species")
                NivaasaCard {
                    Text("Daily help").font(.nivaasaSection).foregroundStyle(NK.ink)
                    let people = rows(data["help"])
                    if people.isEmpty { Text("No daily help registered yet.").foregroundStyle(NK.muted) }
                    ForEach(Array(people.enumerated()), id: \.offset) { _, person in
                        Button { dailyHelp = DailyHelpSelection(id: string(person, "id")) } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(string(person, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                    Text(string(person, "role")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                                }
                                Spacer()
                                NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
                            }
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }.buttonStyle(NivaasaPressStyle())
                    }
                    OutlineButton(title: "Register daily help", icon: "plus") { showDailyHelp = true }
                }
                NivaasaCard {
                    Text("Home contacts").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Divider()
                    let unit = data["unit"] as? [String: Any] ?? [:]
                    Text("Primary e-Intercom").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    Text(string(unit, "intercomPrimary", fallback: "Not set")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                    Text("Emergency contact").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    Text(string(unit, "emergencyName", fallback: "Not set")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                    Text(string(unit, "emergencyContact")).font(.nivaasaBody).foregroundStyle(NK.muted)
                }
                homeSection("Move requests", records: rows(data["moves"]), title: "type", subtitle: "status")
            }
            .padding(16)
        }
        .task { await load() }
        .fullScreenCover(isPresented: $showDailyHelp, onDismiss: { Task { await load() } }) {
            DailyHelpForm(token: account.token) { _ in }
        }
        .sheet(item: $dailyHelp) { DailyHelpDetail(token: account.token, staffID: $0.id) }
        .accessibilityIdentifier("page-household")
    }

    private func load() async {
        failure = nil
        do {
            let raw = try await API.request("mobile/more", token: account.token)
            let payload = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            data = payload["household"] as? [String: Any] ?? [:]
        } catch { failure = error.localizedDescription }
    }

    private func homeSection(_ heading: String, records: [[String: Any]], title: String, subtitle: String) -> some View {
        NivaasaCard {
            Text(heading).font(.nivaasaSection).foregroundStyle(NK.ink)
            Divider()
            if records.isEmpty { Text("No \(heading.lowercased()) yet.").font(.nivaasaBody).foregroundStyle(NK.muted) }
            ForEach(Array(records.enumerated()), id: \.offset) { _, record in
                HStack(spacing: 12) {
                    NivaasaAvatar(name: string(record, title), color: NK.brand50, size: 36)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(string(record, title).replacingOccurrences(of: "_", with: " ")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(string(record, subtitle).replacingOccurrences(of: "_", with: " ")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    Spacer()
                }
            }
        }
    }
}

struct SettingsScreen: View {
    let account: Account
    let session: Session
    @Environment(\.nivaasaNavigate) private var navigate
    @Environment(\.openURL) private var openURL
    @State private var profile: [String: Any] = [:]
    @State private var name = ""
    @State private var phone = ""
    @State private var visible = true
    @State private var visitors = true
    @State private var payments = true
    @State private var community = true
    @State private var helpdesk = true
    @State private var current = ""
    @State private var next = ""
    @State private var confirm = ""
    @State private var busy = false
    @State private var message: String?
    @State private var failure: String?
    @State private var notificationsAllowed: Bool?
    @State private var previewStatus: String?
    @State private var hapticsOn = Haptics.enabled
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                eyebrowStyle("Your account")
                Text("Settings").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Manage your profile, privacy and how the community reaches you.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                if let failure { NivaasaFeedback(text: failure, tone: .danger) }
                if let message { NivaasaFeedback(text: message) }
                NivaasaCard {
                    VStack(alignment: .leading, spacing: 8) {
                        NivaasaAvatar(name: name.isEmpty ? account.user.name : name, size: 64)
                        Text(name.isEmpty ? account.user.name : name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text(string(profile, "email")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        HStack {
                            NivaasaBadge(text: string(profile, "role").capitalized, tone: .blue)
                            NivaasaBadge(text: "Home \(session.unit?.number ?? "—")")
                        }
                        Divider()
                        settingsRow("Joined", shortDate(profile["joinedAt"] as? String))
                        settingsRow("Society", session.society.name)
                        settingsRow("Directory", visible ? "Visible" : "Hidden")
                    }
                }
                NivaasaCard {
                    Text("Quick links").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                    NivaasaTextButton(title: "My home", icon: "house") { navigate(.household) }
                    NivaasaTextButton(title: "Notifications", icon: "bell") { navigate(.notifications) }
                    NivaasaTextButton(title: "Emergency", icon: "exclamationmark.shield") { navigate(.emergency) }
                }
                NivaasaCard {
                    Text("Profile").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Text("Your name and contact number").font(.nivaasaBody).foregroundStyle(NK.muted)
                    Divider()
                    NivaasaInput(label: "Full name", text: $name)
                    NivaasaInput(label: "Phone number", text: $phone, keyboard: .phonePad)
                    Text(string(profile, "email")).font(.nivaasaBody).foregroundStyle(NK.muted)
                    PrimaryButton(title: "Save profile", disabled: busy || name.count < 2) { save(["action": "profile", "name": name, "phone": phone]) }
                }
                NivaasaCard {
                    Text("Directory privacy").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Text("Control whether neighbours can find you").font(.nivaasaBody).foregroundStyle(NK.muted)
                    Divider()
                    NivaasaToggleRow(label: "Show me in the resident directory", isOn: $visible, help: "Your name, flat and masked phone number are visible to other residents.")
                    PrimaryButton(title: "Save privacy", disabled: busy) { save(["action": "privacy", "visible": visible]) }
                }
                NivaasaCard {
                    Text("App experience").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Text("How the app feels when you tap and move around").font(.nivaasaBody).foregroundStyle(NK.muted)
                    Divider()
                    NivaasaToggleRow(label: "Haptics", isOn: $hapticsOn, help: "Subtle vibrations on taps, tab changes and confirmations. Respects the system Reduce Motion setting.") { on in
                        Haptics.enabled = on
                    }
                }
                NivaasaCard {
                    Text("Notifications").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Text("What you want to hear about").font(.nivaasaBody).foregroundStyle(NK.muted)
                    Divider()
                    NivaasaToggleRow(label: "Visitors & deliveries", isOn: $visitors, help: "Gate approvals, passes and parcel updates")
                    NivaasaToggleRow(label: "Payments & invoices", isOn: $payments, help: "Due dates, receipts and verification updates")
                    NivaasaToggleRow(label: "Community updates", isOn: $community, help: "Notices, polls, events and discussions")
                    NivaasaToggleRow(label: "Helpdesk", isOn: $helpdesk, help: "Ticket assignments, replies and resolutions")
                    Text("In-app security alerts are always on.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    PrimaryButton(title: "Save preferences", disabled: busy) { save(["action": "notifications", "visitors": visitors, "payments": payments, "community": community, "helpdesk": helpdesk]) }
                    HStack(spacing: 8) {
                        Text("System gate alerts").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                        Spacer()
                        NivaasaBadge(text: notificationsAllowed == true ? "On" : notificationsAllowed == false ? "Off" : "Checking…", tone: notificationsAllowed == true ? .mint : .neutral)
                    }
                    if notificationsAllowed != true {
                        OutlineButton(title: "Enable gate alerts", icon: "bell") {
                            Task {
                                let granted = await PushRegistration.shared.requestAuthorization()
                                notificationsAllowed = granted
                                if !granted, let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                            }
                        }
                        .accessibilityIdentifier("enable-gate-alerts")
                        Text("Required for visitor alerts on the lock screen. You can change this in system notification settings.")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    NivaasaTextButton(title: "System notification settings", icon: "bell") {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    }
                    #if DEBUG
                    Divider()
                    Text("Gate alert preview").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    Text("Show the lock-screen layout and Accept, Reject and Call actions using the current gate queue.")
                        .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    OutlineButton(title: "Preview gate alert", icon: "exclamationmark.shield") {
                        Task {
                            previewStatus = "Preparing preview…"
                            do {
                                try await PushRegistration.shared.previewGateAlert()
                                previewStatus = "Preview sent. Check the notification banner."
                            } catch {
                                previewStatus = error.localizedDescription
                            }
                        }
                    }
                    if let previewStatus {
                        Text(previewStatus).font(.nivaasaCaptionMedium).foregroundStyle(previewStatus.hasPrefix("Preview sent") ? NK.mint600 : NK.dangerInk)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    #endif
                }
                NivaasaCard {
                    Text("Security").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Text("Password and sessions").font(.nivaasaBody).foregroundStyle(NK.muted)
                    Divider()
                    Text("Sessions expire automatically after 7 days. Passwords are stored with scrypt.").font(.nivaasaCaption).foregroundStyle(NK.mint600)
                    NivaasaInput(label: "Current password", text: $current, secure: true)
                    NivaasaInput(label: "New password", text: $next, secure: true)
                    NivaasaInput(label: "Confirm password", text: $confirm, secure: true)
                    PrimaryButton(title: "Change password", disabled: busy || current.isEmpty || next.count < 8 || next != confirm) { save(["action": "password", "current": current, "next": next, "confirm": confirm]) }
                }
            }
            .padding(16)
        }
        .task { await load() }
        .accessibilityIdentifier("page-settings")
    }

    private func settingsRow(_ label: String, _ value: String) -> some View {
        HStack { Text(label).foregroundStyle(NK.muted); Spacer(); Text(value).foregroundStyle(NK.ink) }.font(.nivaasaCaption)
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: account.token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            profile = data["profile"] as? [String: Any] ?? [:]
            name = string(profile, "name", fallback: account.user.name)
            phone = string(profile, "phone")
            visible = profile["directoryVisible"] as? Bool ?? true
            let prefs = profile["notificationPrefs"] as? [String: Bool] ?? [:]
            visitors = prefs["visitors"] ?? true; payments = prefs["payments"] ?? true
            community = prefs["community"] ?? true; helpdesk = prefs["helpdesk"] ?? true
            notificationsAllowed = [.authorized, .provisional, .ephemeral].contains(await PushRegistration.shared.authorizationStatus())
        } catch { failure = error.localizedDescription }
    }

    private func save(_ body: [String: Any]) {
        guard !busy else { return }
        busy = true; failure = nil; message = nil
        Task {
            defer { busy = false }
            do {
                _ = try await API.request("mobile/settings", token: account.token, body: body)
                message = "Changes saved."
                current = ""; next = ""; confirm = ""
                Haptics.shared.play(.success)
            } catch {
                failure = error.localizedDescription
                Haptics.shared.play(.error)
            }
        }
    }
}

struct EmergencyScreen: View {
    let token: String
    @Environment(\.nivaasaNavigate) private var navigate
    @Environment(\.openURL) private var openURL
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var message: String?
    @State private var error: String?
    @State private var busy = false
    @State private var confirm = false
    @State private var category = "Medical"
    @State private var pulse = false
    @State private var payload: [String: Any] = [:]

    private var active: [String: Any]? { rows(payload["alerts"]).first { ["open", "acknowledged"].contains(string($0, "status")) } }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                eyebrowStyle("Safety first")
                Text("Emergency").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("One tap alerts the guard and community team. Keep the numbers you might need in a hurry close at hand.")
                    .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                OutlineButton(title: "Edit emergency contact") { navigate(.household) }
                if let message {
                    NivaasaCard { Text(message).font(.nivaasaBody).foregroundStyle(NK.mint600) }
                }
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                if let active {
                    NivaasaCard(tinted: true) {
                        Text("Active alert · \(string(active, "status") == "open" ? "Security responding" : "Acknowledged")").font(.nivaasaBodySemibold).foregroundStyle(NK.dangerInk)
                        Text(string(active, "message")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        OutlineButton(title: "I am safe — resolve alert", disabled: busy) { Task { await resolve(active) } }
                    }
                } else {
                    Button { confirm = true } label: {
                        HStack(spacing: 12) {
                            ZStack {
                                Circle().stroke(NK.danger.opacity(0.55), lineWidth: 2)
                                    .frame(width: 44, height: 44)
                                    .scaleEffect(pulse ? 1.45 : 1)
                                    .opacity(pulse ? 0 : 1)
                                    .animation(reduceMotion ? nil : .easeOut(duration: 1.15).repeatForever(autoreverses: false), value: pulse)
                                NivaasaIcon(name: "exclamationmark.shield", size: 20).foregroundStyle(.white)
                                    .frame(width: 44, height: 44).background(NK.danger, in: Circle())
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Emergency panic button").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("Alerts the guard and community team instantly").font(.nivaasaCaption).foregroundStyle(NK.dangerInk)
                            }
                            .layoutPriority(1)
                            Spacer(minLength: 0)
                            Text("Open alert").font(.nivaasaCaptionMedium).foregroundStyle(.white).padding(8).background(NK.danger, in: Capsule())
                                .overlay {
                                    Capsule().stroke(NK.danger.opacity(0.6), lineWidth: 2)
                                        .scaleEffect(pulse ? 1.22 : 1)
                                        .opacity(pulse ? 0 : 1)
                                        .animation(reduceMotion ? nil : .easeOut(duration: 1.15).repeatForever(autoreverses: false), value: pulse)
                                }
                        }.padding(16).background(NK.dangerSoft, in: RoundedRectangle(cornerRadius: 20))
                    }
                    .buttonStyle(NivaasaPressStyle()).disabled(busy)
                }
                if confirm {
                    NivaasaCard {
                        Text("Send an emergency alert?").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text("The guard and community team will be notified immediately.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        NivaasaChips(label: "What kind of emergency?", options: ["Medical", "Security", "Fire"], selection: $category)
                        HStack(spacing: 8) {
                            OutlineButton(title: "Cancel") { confirm = false }
                            Button { confirm = false; Task { await send() } } label: {
                                Text("Send alert").font(.nivaasaBodySemibold).foregroundStyle(.white)
                                    .frame(maxWidth: .infinity, minHeight: 46)
                                    .background(NK.danger, in: RoundedRectangle(cornerRadius: NKRadius.control))
                            }.buttonStyle(NivaasaPressStyle())
                        }
                    }
                }
                NivaasaCard {
                    Text("Your emergency contact").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    Text(string(payload, "emergencyName", fallback: "No emergency contact saved. Add one so the guard knows who to call if you can't be reached.")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    if !string(payload, "emergencyContact").isEmpty { Text(string(payload, "emergencyContact")).font(.nivaasaCaption).foregroundStyle(NK.muted) }
                    NivaasaTextButton(title: "Manage contact →") { navigate(.household) }
                }
                Text("Emergency contacts").font(.nivaasaSection).foregroundStyle(NK.ink)
                ForEach(contacts, id: \.0) { name, phone, role in
                    Button {
                        let digits = phone.filter { $0.isNumber || $0 == "+" }
                        if let url = URL(string: "tel:" + digits) { openURL(url) }
                    } label: {
                        NivaasaCard(padding: 14) {
                            HStack(spacing: 12) {
                                NivaasaIcon(name: "phone").foregroundStyle(NK.brand600)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(name).font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                                    Text(role).font(.nivaasaCaption).foregroundStyle(NK.muted)
                                }
                                Spacer()
                                Text(phone).font(.nivaasaCaptionMedium).foregroundStyle(NK.brand600)
                            }
                        }
                    }.buttonStyle(NivaasaPressStyle())
                }
                NivaasaCard {
                    Text("If you're in immediate danger").font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                    Text("1. Call 112 (police) or 108 (ambulance) first if life is at risk.\n\n2. Then use the panic button so the gate knows responders are coming.\n\n3. If it is safe, move to a well-lit common area and stay on the line.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
                NivaasaCard {
                    Text("Community safety drills").font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                    Text("Fire drills are conducted twice a year. The committee will announce the next drill in the community feed. Floor marshals guide residents to the assembly point.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    NivaasaTextButton(title: "See safety notices", icon: "arrow.right") { navigate(.community) }
                }
            }
            .padding(16)
        }
        .task { await load() }
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeOut(duration: 1.15).repeatForever(autoreverses: false)) { pulse = true }
        }
    }

    private var contacts: [(String, String, String)] {
        let data = payload["contacts"] as? [String: Any] ?? [:]
        var result: [(String, String, String)] = []
        for (key, label, role) in [("guard", "Gate security", "24×7 gate desk"), ("security", "Security manager", "Escalation contact"), ("manager", "Community manager", "Society office")] {
            if let person = data[key] as? [String: Any], !string(person, "phone").isEmpty {
                result.append((label + " · " + string(person, "name"), string(person, "phone"), role))
            }
        }
        return result + [("Ambulance", "108", "National emergency"), ("Police", "112", "National emergency"), ("Fire", "101", "National emergency")]
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/emergency", token: token)
            payload = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
        } catch { self.error = error.localizedDescription }
    }

    private func resolve(_ alert: [String: Any]) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            _ = try await API.request("mobile/emergency", token: token, body: ["id": string(alert, "id")])
            message = "Your alert is resolved."
            Haptics.shared.play(.success)
            await load()
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }

    private func send() async {
        guard !busy else { return }
        Haptics.shared.play(.heavy)
        busy = true
        defer { busy = false }
        do {
            _ = try await API.request("panic", token: token, body: ["category": category.lowercased(), "message": "Emergency assistance needed"])
            message = "Your alert was sent. Security is responding."
            Haptics.shared.play(.success)
            await load()
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}

struct NotificationsScreen: View {
    let token: String
    var standalone = false
    var onUnreadChanged: (Int) -> Void = { _ in }
    @Environment(\.dismiss) private var dismiss
    @Environment(\.nivaasaNavigate) private var navigate
    @Environment(\.nivaasaTicket) private var openTicket
    @State private var notifications: [[String: Any]] = []
    @State private var error: String?
    @State private var filter = "All"
    @State private var busy = false

    var body: some View {
        VStack(spacing: 0) {
            if standalone { NivaasaCloseBar(close: { dismiss() }) }
            ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Your updates")
                Text("Notifications").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Approvals, payments, community news and the things that need you.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                OutlineButton(title: "Preferences", icon: "gearshape") { navigate(.settings) }
                HStack {
                    NivaasaChips(options: ["All", "Unread"], selection: $filter)
                    Spacer(minLength: 0)
                    if unread > 0 {
                        NivaasaTextButton(title: "Mark all read", icon: "checkmark") { Task { await markRead(nil) } }.disabled(busy)
                    }
                }
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                if filtered.isEmpty { EmptyPanel(icon: "bell", title: "All caught up", detail: filter == "Unread" ? "Nothing unread. Lovely." : "New updates will appear here.") }
                ForEach(Array(filtered.enumerated()), id: \.offset) { _, note in
                    Button {
                        Task { await markRead(string(note, "id")); open(note) }
                    } label: {
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(string(note, "title")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Spacer()
                                if isUnread(note) { Circle().fill(NK.blush400).frame(width: 7, height: 7) }
                            }
                            Text(string(note, "body")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            Text(relativeDate(note["createdAt"] as? String)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                    }.buttonStyle(NivaasaPressStyle()).disabled(busy)
                }
            }
            .padding(16)
            }
        }
        .background(AppWash())
        .task { await load() }
    }

    private func isUnread(_ note: [String: Any]) -> Bool { note["readAt"] == nil || note["readAt"] is NSNull }
    private var unread: Int { notifications.filter(isUnread).count }
    private var filtered: [[String: Any]] { notifications.filter { filter == "All" || isUnread($0) } }

    private func open(_ note: [String: Any]) {
        let link = string(note, "link")
        if link.hasPrefix("/app/payments") { navigate(.payments) }
        else if link.hasPrefix("/app/helpdesk") {
            let path = URLComponents(string: link)?.path.split(separator: "/") ?? []
            if path.count == 3, UUID(uuidString: String(path[2])) != nil { openTicket(String(path[2])) }
            else { navigate(.helpdesk) }
        }
        else if link.hasPrefix("/app/visitors") { navigate(.visitors) }
        else if link.hasPrefix("/app/community") { navigate(.community) }
        else if link.hasPrefix("/app/amenities") { navigate(.amenities) }
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            notifications = rows(data["notifications"])
            onUnreadChanged(Int(number(data, "unread")))
        } catch { self.error = error.localizedDescription }
    }

    private func markRead(_ id: String?) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            _ = try await API.request("notifications/read", token: token, body: id.map { ["id": $0] } ?? ["all": true])
            await load()
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - Helpdesk

struct HelpdeskScreen: View {
    let token: String
    var initialTicket: String? = nil
    @Environment(\.nivaasaNavigate) private var navigate
    @State private var tickets: [[String: Any]] = []
    @State private var error: String?
    @State private var showNew = false
    @State private var newCategory = "Plumbing"
    @State private var selectedTicket: String?
    @State private var filter = "All"

    var body: some View {
        NavigationStack {
            requests
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(item: $selectedTicket) { id in
                    TicketDetail(token: token, ticketID: id) { Task { await load() } }
                        .toolbar(.visible, for: .navigationBar)
                }
        }
        .onChange(of: initialTicket, initial: true) { _, id in selectedTicket = id }
    }

    private var requests: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 5) {
                    eyebrowStyle("Here to help")
                    Text("Helpdesk").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    Text("Raise a request, follow its progress and know exactly who is working on it. No more chasing WhatsApp groups.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                }

                // Quick categories — icon row, tap to raise a request in that category
                Text("What needs attention?").font(.nivaasaSection).foregroundStyle(NK.ink)
                IconActionRow(items: ["Plumbing", "Electrical", "Housekeeping", "Common areas", "Security", "Other"].map { category in
                    IconActionRow.Item(title: category, icon: categoryIcon(category)) {
                        newCategory = category
                        Haptics.shared.play(.selection)
                        showNew = true
                    }
                })
                NivaasaTextButton(title: "Or describe something else", icon: "plus") {
                    newCategory = "Other"
                    showNew = true
                }

                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }

                // Slim inline stats strip (no 2×2 cards)
                NivaasaCard(padding: 12) {
                    HStack(spacing: 0) {
                        inlineStat(value: "\(openTickets.count)", label: "Open", tone: openTickets.isEmpty ? NK.mint600 : NK.brand600)
                        Divider().frame(height: 34)
                        inlineStat(value: "\(resolvedTickets.count)", label: "Resolved", tone: NK.mint600)
                        Divider().frame(height: 34)
                        inlineStat(value: satisfaction, label: "Rating · \(ratedTickets.count)", tone: NK.amberInk)
                    }
                }

                TabStrip(tabs: ["All", "In progress", "Open", "Resolved", "Closed"], selection: $filter, counts: Dictionary(uniqueKeysWithValues: ["All", "In progress", "Open", "Resolved", "Closed"].map { label in
                    (label, label == "All" ? tickets.count : tickets.filter { string($0, "status") == label.lowercased().replacingOccurrences(of: " ", with: "_") }.count)
                }))
                if filteredTickets.isEmpty {
                    EmptyPanel(icon: "wrench.and.screwdriver", title: "No requests yet", detail: "Raise a request when something needs attention.")
                }
                // One compact divided list instead of per-ticket cards
                NivaasaCard(padding: 6) {
                    VStack(spacing: 0) {
                        ForEach(Array(filteredTickets.enumerated()), id: \.offset) { index, ticket in
                            Button { selectedTicket = string(ticket, "id") } label: {
                                let category = string(ticket, "category")
                                let tint = iconTint(category)
                                HStack(spacing: 10) {
                                    RoundedRectangle(cornerRadius: 10, style: .continuous).fill(tint.bg)
                                        .frame(width: 40, height: 40)
                                        .overlay { NivaasaIcon(name: categoryIcon(category), size: 19).foregroundStyle(tint.fg) }
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(string(ticket, "subject")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink).lineLimit(1)
                                        Text("\(category) · \(string(ticket, "assignee", fallback: "Awaiting assignment")) · \(relativeDate(ticket["updatedAt"] as? String))")
                                            .font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(1)
                                    }
                                    Spacer()
                                    NivaasaBadge(text: string(ticket, "status").replacingOccurrences(of: "_", with: " ").capitalized, tone: statusTone(string(ticket, "status")))
                                    NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
                                }
                                .padding(.horizontal, 8).padding(.vertical, 9)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(NivaasaPressStyle())
                            .accessibilityIdentifier("helpdesk-ticket-" + string(ticket, "id"))
                            if index < filteredTickets.count - 1 { Divider().padding(.leading, 58) }
                        }
                    }
                }
                NivaasaCard {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Your service promise").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text("Requests escalate automatically when the SLA is breached — to the helpdesk manager, then the community manager. Rate resolved requests to hold vendors accountable.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                        Spacer(minLength: 8)
                        NivaasaTextButton(title: "Emergency →", icon: "arrow.right") { navigate(.emergency) }
                    }
                }
            }
            .padding(16)
        }
        .task { await load() }
        .refreshable { await load() }
        .fullScreenCover(isPresented: $showNew, onDismiss: {
            Task { await load() }
        }) {
            NewTicketSheet(token: token, initialCategory: newCategory) { id in
                showNew = false
                selectedTicket = id
            }
        }
    }

    private func inlineStat(value: String, label: String, tone: Color) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.jakarta(20, .bold)).foregroundStyle(tone).monospacedDigit()
            Text(label.uppercased()).font(.jakarta(9, .bold)).tracking(0.8).foregroundStyle(NK.muted)
        }
        .frame(maxWidth: .infinity)
    }

    private var openTickets: [[String: Any]] { tickets.filter { ["open", "assigned", "in_progress", "reopened"].contains(string($0, "status")) } }
    private var resolvedTickets: [[String: Any]] { tickets.filter { ["resolved", "closed"].contains(string($0, "status")) } }
    private var ratedTickets: [[String: Any]] { tickets.filter { number($0, "rating") > 0 } }
    private var satisfaction: String {
        ratedTickets.isEmpty ? "—" : String(format: "%.1f", ratedTickets.reduce(0) { $0 + number($1, "rating") } / Double(ratedTickets.count))
    }
    private var averageResolution: String {
        let durations = resolvedTickets.compactMap { ticket -> Double? in
            guard let start = nivaasaDate(ticket["createdAt"] as? String), let end = nivaasaDate(ticket["resolvedAt"] as? String) else { return nil }
            return end.timeIntervalSince(start) / 3600
        }
        return durations.isEmpty ? "—" : String(format: "%.1fh", durations.reduce(0, +) / Double(durations.count))
    }
    private var filteredTickets: [[String: Any]] {
        tickets.filter { filter == "All" || string($0, "status") == filter.lowercased().replacingOccurrences(of: " ", with: "_") }
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
        error = nil
        do {
            let raw = try await API.request("mobile/helpdesk", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            tickets = rows(data["tickets"])
        } catch { self.error = error.localizedDescription }
    }
}

struct NewTicketSheet: View {
    let token: String
    let done: (String) -> Void
    var initialCategory: String = "Plumbing"
    @Environment(\.dismiss) private var dismiss
    @State private var category = "Plumbing"
    @State private var scope = "personal"
    @State private var subject = ""
    @State private var customSubject = false
    @State private var description = ""
    @State private var priority = "medium"
    @State private var photo: UIImage?
    @State private var showCamera = false
    @State private var busy = false
    @State private var error: String?

    /// A couple of preselected subjects per category — pick one or write your own.
    static let presets: [String: [String]] = [
        "Plumbing": ["Kitchen tap leaking", "Bathroom pipe leak", "Low water pressure", "Drain clogged"],
        "Electrical": ["Power outage in flat", "MCB tripping repeatedly", "Light or fan not working", "Socket sparking"],
        "Housekeeping": ["Common area not cleaned", "Garbage not collected", "Spill in corridor", "Pest control needed"],
        "Common areas": ["Gym equipment broken", "Pool water not clean", "Clubhouse AC issue", "Play area light out"],
        "Security": ["Gate access issue", "Visitor was not allowed", "Suspicious activity", "CCTV not working"],
        "Other": ["Parking slot conflict", "Intercom not working", "Internet down", "Noise complaint"],
    ]

    init(token: String, initialCategory: String = "Plumbing", done: @escaping (String) -> Void) {
        self.token = token
        self.done = done
        self.initialCategory = initialCategory
        self._category = State(initialValue: initialCategory)
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: "Raise a request", subtitle: "Pick what's wrong, add a photo, done.", close: { if !busy { dismiss() } })
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    NivaasaChips(label: "Category", options: ["Plumbing", "Electrical", "Housekeeping", "Common areas", "Security", "Other"], selection: Binding(get: { category }, set: { category = $0; customSubject = false; if subject.isEmpty == false && !(NewTicketSheet.presets[$0] ?? []).contains(subject) { customSubject = true } }))
                    if let options = NewTicketSheet.presets[category] {
                        NivaasaCard(padding: 12) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Common issues").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                                FlowLayout(spacing: 8) {
                                    ForEach(options, id: \.self) { option in
                                        Button {
                                            subject = option
                                            customSubject = false
                                            Haptics.shared.play(.selection)
                                        } label: {
                                            Text(option)
                                                .font(.nivaasaCaptionMedium)
                                                .foregroundStyle(subject == option && !customSubject ? NK.brand700 : NK.inkSoft)
                                                .padding(.horizontal, 10).frame(minHeight: 36)
                                                .background(subject == option && !customSubject ? NK.brand50 : NK.canvas, in: Capsule())
                                                .overlay { Capsule().strokeBorder(subject == option && !customSubject ? NK.brand500 : NK.line, lineWidth: 1) }
                                        }
                                        .buttonStyle(NivaasaPressStyle())
                                    }
                                    Button {
                                        customSubject = true
                                        Haptics.shared.play(.selection)
                                    } label: {
                                        Text("Something else…").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                                            .padding(.horizontal, 10).frame(minHeight: 36)
                                            .background(NK.canvas, in: Capsule())
                                            .overlay { Capsule().strokeBorder(NK.line, lineWidth: 1) }
                                    }
                                    .buttonStyle(NivaasaPressStyle())
                                }
                            }
                        }
                    }
                    NivaasaChips(label: "Scope", options: ["personal", "community"], selection: $scope)
                    NivaasaChips(label: "Priority", options: ["low", "medium", "high", "urgent"], selection: $priority)
                    NivaasaCard {
                        if customSubject || subject.isEmpty {
                            NivaasaInput(label: "Subject", text: $subject, placeholder: "What needs attention?", capitalization: .sentences)
                        } else {
                            HStack {
                                Text("Subject").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                                Spacer()
                                Text(subject).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            }
                        }
                        NivaasaTextArea(label: "Description", text: $description, placeholder: "Add a little detail so the right person can help.", minHeight: 100)
                    }
                    // Photo attachment
                    NivaasaCard {
                        HStack(spacing: 12) {
                            if let photo {
                                Image(uiImage: photo).resizable().scaledToFill()
                                    .frame(width: 56, height: 56).clipShape(RoundedRectangle(cornerRadius: 12))
                            } else {
                                NivaasaIcon(name: "camera", size: 22).foregroundStyle(NK.brand600)
                                    .frame(width: 56, height: 56).background(NK.brand50, in: RoundedRectangle(cornerRadius: 12))
                            }
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Attach a photo").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text(photo == nil ? "Optional — helps the team fix it faster." : "Attached. Tap to retake.")
                                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Spacer()
                            Button { showCamera = true } label: {
                                Text(photo == nil ? "Take photo" : "Retake").font(.nivaasaCaptionMedium).foregroundStyle(NK.brand700)
                                    .frame(minHeight: 40).padding(.horizontal, 10)
                            }.buttonStyle(NivaasaPressStyle())
                        }
                    }
                    .sheet(isPresented: $showCamera) { CameraPicker(image: $photo) }
                    if let error { NivaasaFeedback(text: error, tone: .danger) }
                    PrimaryButton(title: busy ? "Sending…" : "Submit request", icon: "paperplane", disabled: busy || subject.count < 5 || description.count < 10) {
                        Task { await submit() }
                    }
                }
                .padding(20)
            }
        }
        .background(AppWash())
        .interactiveDismissDisabled(busy)
    }

    private func submit() async {
        busy = true
        defer { busy = false }
        let fields: [String: String] = [
            "category": category, "scope": scope, "subject": subject,
            "description": description, "priority": priority,
        ]
        let image = photo?.jpegData(compressionQuality: 0.8).map { (data: $0, name: "ticket.jpg", mime: "image/jpeg") }
        do {
            let data = try await API.upload("mobile/helpdesk", token: token, fields: fields, photo: image)
            struct Created: Decodable { let id: String }
            Haptics.shared.play(.success)
            done(try JSONDecoder().decode(Created.self, from: data).id)
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}

// MARK: - Deliveries

struct DeliveriesScreen: View {
    let token: String
    let host: VisitorPassHost
    @State private var deliveries: [[String: Any]] = []
    @State private var error: String?
    @State private var showPass = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                eyebrowStyle("Gate & security")
                Text("Deliveries").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                Text("Everything headed to your door — food, parcels and courier — with a clear handover record.")
                    .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                PrimaryButton(title: "Pre-approve delivery", icon: "shippingbox") { showPass = true }
                if let error { Text(error).font(.nivaasaCaption).foregroundStyle(NK.dangerInk) }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    StatCard(label: "At the gate", value: "\(active.count)", hint: "Waiting for your response", tone: .pink, icon: "shippingbox")
                    StatCard(label: "Deliveries this month", value: "\(thisMonth)", hint: "Linked to your home", tone: .blue, icon: "calendar")
                }
                Text("At the gate").font(.nivaasaSection).foregroundStyle(NK.ink)
                if active.isEmpty { EmptyPanel(icon: "shippingbox", title: "Nothing at the gate", detail: "When a delivery arrives, you'll see it here.") }
                ForEach(Array(active.enumerated()), id: \.offset) { _, delivery in
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
                NivaasaCard {
                    Text("Past deliveries").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Text("A clear handover record").font(.nivaasaBody).foregroundStyle(NK.muted)
                    Divider()
                    ForEach(Array(past.enumerated()), id: \.offset) { _, delivery in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(string(delivery, "company", fallback: "Delivery")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text(shortDate(delivery["createdAt"] as? String)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Spacer()
                            NivaasaBadge(text: string(delivery, "status").replacingOccurrences(of: "_", with: " ").capitalized, tone: .mint)
                        }
                        Divider()
                    }
                    if past.isEmpty { Text("No past deliveries.").font(.nivaasaBody).foregroundStyle(NK.muted) }
                }
            }
            .padding(16)
        }
        .task { await load() }
        .refreshable { await load() }
        .fullScreenCover(isPresented: $showPass) { CreatePass(token: token, host: host, initialType: .delivery) }
    }

    private var active: [[String: Any]] { deliveries.filter { ["arrived", "left_at_gate"].contains(string($0, "status")) } }
    private var past: [[String: Any]] { deliveries.filter { !["arrived", "left_at_gate"].contains(string($0, "status")) } }
    private var thisMonth: Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Kolkata") ?? .current
        return deliveries.filter { nivaasaDate($0["createdAt"] as? String).map { calendar.isDate($0, equalTo: Date(), toGranularity: .month) } ?? false }.count
    }

    private func load() async {
        do {
            let raw = try await API.request("mobile/more", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            deliveries = rows(data["deliveries"])
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - Search

struct SearchScreen: View {
    let token: String
    var standalone = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.nivaasaNavigate) private var navigate
    @Environment(\.nivaasaNotice) private var openNotice
    @State private var query = ""
    @State private var notices: [[String: Any]] = []
    @State private var directory: [[String: Any]] = []
    @State private var documents: [[String: Any]] = []
    @State private var amenities: [[String: Any]] = []
    @State private var preview: DocumentSelection?
    @State private var failure: String?

    private var term: String { query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }

    var body: some View {
        VStack(spacing: 0) {
            if standalone { NivaasaCloseBar(close: { dismiss() }) }
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    eyebrowStyle("Find anything")
                    Text("Search your community").font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                    Text("Notices, conversations, requests, amenities and documents — all in one place.").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                    HStack(spacing: 8) {
                        NivaasaIcon(name: "magnifyingglass").foregroundStyle(NK.muted)
                        TextField("Try “water”, “parking”, “Diwali”…", text: $query)
                             .font(.nivaasaBody).textInputAutocapitalization(.never).autocorrectionDisabled()
                            .foregroundStyle(NK.ink)
                            .accessibilityIdentifier("search")
                    }
                    .padding(.horizontal, 12).frame(height: 48)
                    .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                    .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.line) }

                    if let failure { NivaasaFeedback(text: failure, tone: .danger) }
                    if term.isEmpty {
                        Text("TRY SEARCHING FOR").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                        FlowLayout(spacing: 7) {
                            ForEach(["water", "parking", "Diwali", "maintenance", "lift", "pool"], id: \.self) { hint in
                                NivaasaTextButton(title: hint) { query = hint }
                            }
                        }
                        ForEach([(Destination.community, "Notices", "Official updates", "newspaper"), (.community, "Discussions", "Neighbourhood Q&A", "message"), (.directory, "Directory", "Residents & help", "book.closed")], id: \.1) { destination, title, detail, icon in
                            Button { navigate(destination) } label: {
                                NivaasaCard(padding: 16) {
                                    NivaasaIcon(name: icon).foregroundStyle(NK.brand600)
                                    Text(title).font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                                    Text(detail).font(.nivaasaCaption).foregroundStyle(NK.muted)
                                }
                            }.buttonStyle(NivaasaPressStyle())
                        }
                    } else {
                        results("Notices", notices.filter { matches($0, keys: ["title", "body"]) }) { notice in
                            Button { openNotice(notice) } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(notice, "title")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                Text(string(notice, "category").capitalized).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            }.buttonStyle(NivaasaPressStyle())
                        }
                        results("People", directory.filter { matches($0, keys: ["name", "unit", "role"]) }) { person in
                            Button { navigate(.directory) } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(person, "name")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                Text("Home \(string(person, "unit"))").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            }.buttonStyle(NivaasaPressStyle())
                        }
                        results("Documents", documents.filter { matches($0, keys: ["title", "category"]) }) { doc in
                            Button { preview = DocumentSelection(path: string(doc, "fileUrl"), title: string(doc, "title")) } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(doc, "title")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                Text(string(doc, "category").capitalized).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            }.buttonStyle(NivaasaPressStyle())
                        }
                        results("Amenities", amenities.filter { matches($0, keys: ["name", "description", "location"]) }) { amenity in
                            Button { navigate(.amenities) } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(amenity, "name")).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                                Text(string(amenity, "location")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            }.buttonStyle(NivaasaPressStyle())
                        }
                        if !hasResults && failure == nil { EmptyPanel(icon: "magnifyingglass", title: "No results for “\(query)”", detail: "Try a shorter word, or ask the community in a discussion.") }
                    }
                }
                .padding(16)
            }
        }
        .background(AppWash())
        .task { await load() }
        .fullScreenCover(item: $preview) { DocumentPreview(document: $0, token: token) }
    }

    private var hasResults: Bool {
        notices.contains { matches($0, keys: ["title", "body"]) } || directory.contains { matches($0, keys: ["name", "unit", "role"]) } || documents.contains { matches($0, keys: ["title", "category"]) } || amenities.contains { matches($0, keys: ["name", "description", "location"]) }
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
        failure = nil
        do {
            let raw = try await API.request("mobile/community", token: token)
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            notices = rows(data["notices"])
            let moreRaw = try await API.request("mobile/more", token: token)
            let more = try JSONSerialization.jsonObject(with: moreRaw) as? [String: Any] ?? [:]
            directory = rows(more["directory"])
            documents = rows(more["documents"])
            amenities = rows(more["amenities"])
        } catch is CancellationError {
        } catch { failure = error.localizedDescription }
    }
}
