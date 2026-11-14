import SwiftUI

/// Thumbnails of ticket photo attachments, loaded with the session token.
struct AttachmentRow: View {
    let ticketID: String
    let names: [String]
    let token: String
    @State private var images: [String: UIImage] = [:]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(names, id: \.self) { name in
                    Group {
                        if let image = images[name] {
                            Image(uiImage: image).resizable().scaledToFill()
                        } else {
                            Rectangle().fill(NK.canvas).overlay { ProgressView().scaleEffect(0.6) }
                        }
                    }
                    .frame(width: 72, height: 72)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .task(id: name) {
                        if let data = try? await API.request("mobile/helpdesk/attachment?ticket=\(ticketID)&name=\(name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name)", token: token) {
                            images[name] = UIImage(data: data)
                        }
                    }
                }
            }
        }
    }
}

struct TicketDetail: View {
    let token: String
    let ticketID: String
    var onChange: () -> Void
    @State private var snapshot: Snapshot?
    @State private var loadError: String?
    @State private var actionError: String?
    @State private var confirmation: String?
    @State private var loading = false
    @State private var submitting = false
    @State private var draft = ""
    @State private var showReply = false
    @State private var feedback = ""
    @State private var rating = 0
    @State private var reopen = false
    @State private var reason = ""

    private struct Snapshot: Decodable {
        struct Ticket: Decodable {
            let subject: String
            let description: String
            let category: String
            let priority: String
            let status: String
            let assignee: String?
            let slaDueAt: String?
            let createdAt: String
            let updatedAt: String
            let resolvedAt: String?
            let rating: Int?
            let feedback: String?
            let attachments: [String]?
            var finished: Bool { status == "resolved" || status == "closed" }
        }

        struct Comment: Decodable, Identifiable {
            let id: String
            let author: String
            let body: String
            let createdAt: String
        }

        let ticket: Ticket
        let comments: [Comment]
    }

    private var path: String { "mobile/helpdesk/" + ticketID }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let confirmation { NivaasaFeedback(text: confirmation) }
                if let loadError {
                    NivaasaFeedback(text: loadError, tone: .danger)
                    OutlineButton(title: "Try again") { Task { await load() } }
                }
                if let snapshot {
                    summary(snapshot.ticket)
                    conversation(snapshot)
                    if snapshot.ticket.finished { resolution(snapshot.ticket) }
                } else if loading {
                    ProgressView("Loading request").frame(maxWidth: .infinity).padding()
                }
            }
            .padding(16)
            .frame(maxWidth: 660)
            .frame(maxWidth: .infinity)
        }
        .background(AppWash())
        .navigationTitle("Request details")
        .navigationBarTitleDisplayMode(.inline)
        .scrollDismissesKeyboard(.interactively)
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showReply) { replySheet }
    }

    private func summary(_ ticket: Snapshot.Ticket) -> some View {
        NivaasaCard {
            HStack(spacing: 8) {
                NivaasaBadge(text: ticket.category, tone: .blue)
                NivaasaBadge(text: ticket.status.replacingOccurrences(of: "_", with: " ").capitalized,
                             tone: ticket.finished ? .mint : .neutral)
            }
            Text(ticket.subject)
                .font(.title2.weight(.semibold)).foregroundStyle(NK.ink).accessibilityAddTraits(.isHeader)
            Text(ticket.description).font(.body).foregroundStyle(NK.inkSoft).textSelection(.enabled)
            Divider()
            lifecycle(ticket)
            Divider()
            LabeledContent("Assigned to", value: ticket.assignee ?? "Awaiting assignment")
            LabeledContent("Priority", value: ticket.priority.capitalized)
            if !ticket.finished, let due = nivaasaDate(ticket.slaDueAt) {
                LabeledContent("Response due", value: due.formatted(date: .abbreviated, time: .shortened))
            }
            if let attachments = ticket.attachments, !attachments.isEmpty {
                Divider()
                Text("Photos").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                AttachmentRow(ticketID: ticketID, names: attachments, token: token)
            }
        }
    }

    /// Status journey: raised → assigned (name) → in progress → resolved (remarks) → rated/closed.
    private func lifecycle(_ ticket: Snapshot.Ticket) -> some View {
        let steps: [(label: String, done: Bool, detail: String)] = [
            ("Raised", true, nivaasaDate(ticket.createdAt).map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "—"),
            ("Assigned", ticket.assignee != nil || ticket.finished, ticket.assignee ?? "Unassigned"),
            ("In progress", ["assigned", "in_progress", "resolved", "closed", "reopened"].contains(ticket.status), ticket.status == "in_progress" ? "Working on it" : ""),
            ("Resolved", ticket.finished, ticket.resolvedAt.flatMap { nivaasaDate($0)?.formatted(date: .abbreviated, time: .shortened) } ?? (ticket.finished ? "—" : "")),
            ("Rated", ticket.rating != nil, ticket.rating.map { "\($0)/5" } ?? ""),
        ]
        return VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                HStack(spacing: 10) {
                    ZStack {
                        Circle().fill(step.done ? NK.mint600 : NK.lineStrong).frame(width: 22, height: 22)
                        if step.done {
                            NivaasaIcon(name: "checkmark", size: 12).foregroundStyle(.white)
                        } else {
                            Text("\(index + 1)").font(.jakarta(10, .bold)).foregroundStyle(NK.muted)
                        }
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        Text(step.label).font(.nivaasaBodyMedium).foregroundStyle(step.done ? NK.ink : NK.muted)
                        if !step.detail.isEmpty {
                            Text(step.detail).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                }
                if index < steps.count - 1 {
                    Rectangle().fill(step.done ? NK.mint600.opacity(0.5) : NK.line).frame(width: 2, height: 10).offset(x: 10)
                }
            }
        }
        .accessibilityIdentifier("ticket-lifecycle")
    }

    private func conversation(_ snapshot: Snapshot) -> some View {
        NivaasaCard {
            Text("Conversation").font(.headline).foregroundStyle(NK.ink).accessibilityAddTraits(.isHeader)
            if snapshot.comments.isEmpty {
                Text("No messages yet. Updates from the helpdesk team will appear here.")
                    .font(.subheadline).foregroundStyle(NK.muted)
            }
            ForEach(snapshot.comments) { comment in
                Divider()
                VStack(alignment: .leading, spacing: 5) {
                    Text(comment.author).font(.subheadline.weight(.semibold)).foregroundStyle(NK.ink)
                    if let date = nivaasaDate(comment.createdAt) {
                        Text(date.formatted(date: .abbreviated, time: .shortened)).font(.caption).foregroundStyle(NK.muted)
                    }
                    Text(comment.body).font(.body).foregroundStyle(NK.inkSoft).textSelection(.enabled)
                }
                .accessibilityElement(children: .combine)
            }
            if !snapshot.ticket.finished {
                Divider()
                PrimaryButton(title: "Reply to the helpdesk", icon: "paperplane") {
                    actionError = nil
                    showReply = true
                }
            }
        }
    }

    private var replySheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    NivaasaTextArea(label: "Message", text: $draft, placeholder: "Add a comment or more detail", minHeight: 120)
                        .accessibilityIdentifier("ticket-reply")
                    if draft.count > 4000 {
                        Text("Keep your reply within 4,000 characters.").font(.caption).foregroundStyle(NK.dangerInk)
                    }
                    if let actionError { NivaasaFeedback(text: actionError, tone: .danger) }
                }
                .padding(16)
            }
            .background(AppWash())
            .navigationTitle("Reply to the helpdesk")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { showReply = false }.disabled(submitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(submitting ? "Sending…" : "Send reply") {
                        submit(["action": "reply", "body": draft], message: "Reply sent.") {
                            draft = ""
                            showReply = false
                        }
                    }
                    .disabled(submitting || loading || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || draft.count > 4000)
                }
            }
        }
        .interactiveDismissDisabled(submitting)
    }

    private func resolution(_ ticket: Snapshot.Ticket) -> some View {
        NivaasaCard {
            Text(ticket.rating == nil ? "How did we do?" : "Your feedback")
                .font(.headline).foregroundStyle(NK.ink).accessibilityAddTraits(.isHeader)
            if let saved = ticket.rating {
                Text("\(saved) out of 5 stars").font(.body).foregroundStyle(NK.ink)
                if let feedback = ticket.feedback { Text(feedback).font(.body).foregroundStyle(NK.inkSoft) }
            } else {
                ViewThatFits {
                    HStack(spacing: 3) { stars }
                    VStack(alignment: .leading, spacing: 3) { stars }
                }
                NivaasaTextArea(label: "Feedback (optional)", text: $feedback, minHeight: 72)
                if feedback.count > 1000 { Text("Keep your feedback within 1,000 characters.").font(.caption).foregroundStyle(NK.dangerInk) }
                PrimaryButton(title: "Submit rating", disabled: submitting || rating == 0 || feedback.count > 1000) {
                    submit(["action": "rate", "rating": rating, "feedback": feedback], message: "Rating submitted.") {
                        feedback = ""
                        rating = 0
                    }
                }
            }
            Divider()
            if reopen {
                NivaasaTextArea(label: "What still needs attention?", text: $reason, minHeight: 80)
                if reason.count > 1000 { Text("Keep the reason within 1,000 characters.").font(.caption).foregroundStyle(NK.dangerInk) }
                PrimaryButton(title: "Confirm reopen", disabled: submitting || reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || reason.count > 1000) {
                    submit(["action": "reopen", "reason": reason], message: "Request reopened.") {
                        reason = ""
                        reopen = false
                    }
                }
                Button("Keep request closed") { reopen = false }.disabled(submitting)
            } else {
                OutlineButton(title: "Reopen request") { reopen = true }
            }
            if submitting { ProgressView("Updating request") }
            if let actionError { NivaasaFeedback(text: actionError, tone: .danger) }
        }
    }

    private var stars: some View {
        ForEach(1...5, id: \.self) { score in
            Button { rating = score } label: {
                Image(systemName: score <= rating ? "star.fill" : "star")
                    .font(.title3).foregroundStyle(NK.brand700).frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(score == 1 ? "1 star" : "\(score) stars")
            .accessibilityAddTraits(score == rating ? .isSelected : [])
            .disabled(submitting)
        }
    }

    private func load() async {
        guard !loading else { return }
        loading = true
        loadError = nil
        defer { loading = false }
        do {
            let data = try await API.request(path, token: token)
            snapshot = try JSONDecoder().decode(Snapshot.self, from: data)
        } catch is CancellationError {
        } catch { loadError = error.localizedDescription }
    }

    private func submit(_ body: [String: Any], message: String, reset: @escaping () -> Void) {
        guard !submitting, !loading else { return }
        submitting = true
        actionError = nil
        confirmation = nil
        Task {
            defer { submitting = false }
            do {
                _ = try await API.request(path, token: token, body: body)
                reset()
                confirmation = message
                await load()
                onChange()
            } catch { actionError = error.localizedDescription }
        }
    }
}
