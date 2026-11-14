import SwiftUI

struct DailyHelpDetail: View {
    let token: String
    let staffID: String
    @Environment(\.dismiss) private var dismiss
    @State private var snapshot: Snapshot?
    @State private var loadError: String?
    @State private var reviewError: String?
    @State private var editing = false
    @State private var saving = false
    @State private var saved = false
    @State private var score = 0
    @State private var draft = ""

    private struct Snapshot: Decodable {
        struct Person: Decodable {
            let name: String
            let role: String
            let shift: String?
            let verified: Bool
        }
        struct Attendance: Decodable, Identifiable {
            let id: String
            let date: String
            let checkInAt: String?
            let checkOutAt: String?
        }
        struct Review: Decodable, Identifiable {
            let id: String
            let author: String
            let rating: Int
            let review: String?
            let yours: Bool
        }
        let person: Person
        let attendance: [Attendance]
        let reviews: [Review]
    }

    private var path: String { "mobile/daily-help/" + staffID }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let loadError {
                        NivaasaFeedback(text: loadError, tone: .danger)
                        OutlineButton(title: "Try again") { Task { await load() } }
                    }
                    if saved { NivaasaFeedback(text: "Private review saved.") }
                    if let snapshot {
                        NivaasaCard {
                            Text(snapshot.person.name).font(.title2.weight(.semibold)).foregroundStyle(NK.ink)
                                .accessibilityAddTraits(.isHeader)
                            Text(snapshot.person.role + (snapshot.person.shift.map { " · " + $0 } ?? ""))
                                .font(.body).foregroundStyle(NK.muted)
                            NivaasaBadge(text: snapshot.person.verified ? "Verified" : "Verification pending",
                                         tone: snapshot.person.verified ? .mint : .amber)
                        }
                        attendance(snapshot.attendance)
                        reviews(snapshot)
                    } else if loadError == nil {
                        ProgressView("Loading daily help").frame(maxWidth: .infinity).padding()
                    }
                }
                .padding(16)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(AppWash())
            .navigationTitle("Daily help")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task { await load() }
            .refreshable { await load() }
            .sheet(isPresented: $editing) { reviewSheet }
        }
    }

    private func attendance(_ rows: [Snapshot.Attendance]) -> some View {
        NivaasaCard {
            Text("Attendance").font(.headline).accessibilityAddTraits(.isHeader)
            Text("Last 14 days").font(.subheadline).foregroundStyle(NK.muted)
            if rows.isEmpty { Text("Attendance will appear after the first check-in.").font(.body).foregroundStyle(NK.muted) }
            ForEach(rows) { visit in
                Divider()
                Text(shortDate(visit.date)).font(.subheadline.weight(.semibold))
                Text("In \(time(visit.checkInAt)) · Out \(time(visit.checkOutAt))")
                    .font(.subheadline).foregroundStyle(NK.muted)
            }
        }
    }

    private func reviews(_ snapshot: Snapshot) -> some View {
        NivaasaCard {
            Text("Private household reviews").font(.headline).accessibilityAddTraits(.isHeader)
            if snapshot.reviews.isEmpty { Text("No household reviews yet.").font(.body).foregroundStyle(NK.muted) }
            ForEach(snapshot.reviews) { item in
                Divider()
                Text("\(item.yours ? "You" : item.author) · \(item.rating) out of 5").font(.subheadline.weight(.semibold))
                if let text = item.review { Text(text).font(.body).foregroundStyle(NK.inkSoft) }
            }
            if snapshot.person.verified {
                let mine = snapshot.reviews.first(where: \.yours)
                OutlineButton(title: mine == nil ? "Write a review" : "Edit your review") {
                    score = mine?.rating ?? 0
                    draft = mine?.review ?? ""
                    reviewError = nil
                    editing = true
                }
            } else {
                Text("You can write a review after security verifies this person.").font(.subheadline).foregroundStyle(NK.muted)
            }
        }
    }

    private var reviewSheet: some View {
        NavigationStack {
            Form {
                Picker("Rating", selection: $score) {
                    Text("Choose 1–5 stars").tag(0)
                    ForEach(1...5, id: \.self) { value in Text("\(value) out of 5").tag(value) }
                }
                NivaasaTextArea(label: "Review (optional)", text: $draft, minHeight: 100)
                if draft.count > 500 { Text("Keep your review within 500 characters.").foregroundStyle(NK.dangerInk) }
                if let reviewError { NivaasaFeedback(text: reviewError, tone: .danger) }
            }
            .navigationTitle("Private review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { editing = false }.disabled(saving) }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(saving || score == 0 || draft.count > 500)
                }
            }
        }
        .interactiveDismissDisabled(saving)
    }

    private func time(_ value: String?) -> String {
        guard let date = nivaasaDate(value) else { return "—" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IN")
        formatter.timeZone = TimeZone(identifier: "Asia/Kolkata")
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    private func load() async {
        loadError = nil
        do {
            let data = try await API.request(path, token: token)
            snapshot = try JSONDecoder().decode(Snapshot.self, from: data)
        } catch is CancellationError {
        } catch { loadError = error.localizedDescription }
    }

    private func save() async {
        guard !saving else { return }
        saving = true
        reviewError = nil
        defer { saving = false }
        do {
            _ = try await API.request(path, token: token, body: ["rating": score, "review": draft])
            editing = false
            saved = true
            await load()
        } catch { reviewError = error.localizedDescription }
    }
}
