import SwiftUI

struct DiscussionComposer: View {
    let token: String
    let done: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var category = "general"
    @State private var title = ""
    @State private var bodyText = ""
    @State private var busy = false
    @State private var error: String?
    @State private var submitted = false

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: "Start a discussion", subtitle: "Keep it respectful and useful.", close: { if !busy { dismiss() } })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if submitted {
                        NivaasaFeedback(text: "Your discussion was submitted. Posts requiring moderation appear after review.")
                        PrimaryButton(title: "Back to community", icon: "arrow.right", run: done)
                    } else {
                        NivaasaInput(label: "Title", text: $title, placeholder: "What would you like to discuss?")
                        NivaasaChips(label: "Category", options: ["general", "suggestion", "question", "lost_found", "safety"], selection: $category)
                        NivaasaTextArea(label: "Your post", text: $bodyText, placeholder: "Share a question, idea or update with your neighbours.", minHeight: 160)
                        if let error { NivaasaFeedback(text: error, tone: .danger) }
                        PrimaryButton(title: busy ? "Posting…" : "Post discussion", icon: "paperplane", disabled: busy || title.trimmingCharacters(in: .whitespacesAndNewlines).count < 6 || bodyText.trimmingCharacters(in: .whitespacesAndNewlines).count < 10) {
                            Task { await submit() }
                        }
                    }
                }.padding(20)
            }
        }.background(AppWash()).interactiveDismissDisabled(busy)
    }

    private func submit() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            _ = try await API.request("mobile/discussions", token: token, body: ["title": title, "body": bodyText, "category": category])
            submitted = true
            Haptics.shared.play(.success)
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}
