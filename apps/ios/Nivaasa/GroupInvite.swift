import SwiftUI

struct GroupInvite: View {
    let token: String
    let host: VisitorPassHost
    @Environment(\.dismiss) private var dismiss
    @State private var names = ""
    @State private var from = communityCalendar.startOfDay(for: .now)
    @State private var to = communityCalendar.startOfDay(for: .now)
    @State private var busy = false
    @State private var error: String?
    @State private var issued: [GuestPass] = []
    @State private var selected: GuestPass?

    private struct GuestPass: Decodable, Identifiable {
        let id: String
        let name: String
        let code: String
        var qr: AccessPassCode? { AccessPassCode(id: id, code: code) }
    }
    private struct Issued: Decodable { let passes: [GuestPass] }
    private var guestNames: [String] {
        names.components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }
    private var endRange: ClosedRange<Date> {
        from...(communityCalendar.date(byAdding: .day, value: 29, to: from) ?? from)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if issued.isEmpty {
                        Text("Create a separate, one-time pass for each guest. Everyone shares the same visit dates.")
                            .font(.body).foregroundStyle(NK.inkSoft)
                        NivaasaCard {
                            NivaasaTextArea(label: "Guest names", text: $names, placeholder: "One name per line", minHeight: 130)
                                .accessibilityIdentifier("group-guest-names")
                            Text("\(guestNames.count) of 20 guests").font(.footnote).foregroundStyle(NK.muted)
                            if guestNames.count > 20 || guestNames.contains(where: { $0.count > 80 }) {
                                Text("Enter up to 20 names, with at most 80 characters each.")
                                    .font(.footnote).foregroundStyle(NK.dangerInk)
                            }
                        }
                        NivaasaCard {
                            Text("Visit dates").font(.headline).foregroundStyle(NK.ink)
                            NivaasaDateField(label: "Valid from", date: $from, range: communityCalendar.startOfDay(for: .now)...Date.distantFuture)
                                .onChange(of: from) { _, day in if !endRange.contains(to) { to = day } }
                            NivaasaDateField(label: "Valid to", date: $to, range: endRange)
                        }
                        if let error { NivaasaFeedback(text: error, tone: .danger) }
                        PrimaryButton(title: busy ? "Creating passes…" : "Create group passes", disabled: busy || !(2...20).contains(guestNames.count) || guestNames.contains(where: { $0.count > 80 })) {
                            Task { await create() }
                        }
                    } else {
                        NivaasaFeedback(text: "\(issued.count) guest passes ready.")
                        Text("Open each pass to share its QR with that guest. You can find them again in Pre-approved.")
                            .font(.body).foregroundStyle(NK.inkSoft)
                        ForEach(issued) { guest in
                            Button { selected = guest } label: {
                                NivaasaCard {
                                    HStack {
                                        Text(guest.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                        Spacer()
                                        Image(systemName: "qrcode").foregroundStyle(NK.brand700)
                                    }.frame(minHeight: 32)
                                }
                            }.buttonStyle(NivaasaPressStyle())
                            .accessibilityLabel("Open pass for \(guest.name)")
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 620)
                .frame(maxWidth: .infinity)
            }
            .background(AppWash())
            .navigationTitle(issued.isEmpty ? "Invite a group" : "Group passes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) {
                Button(issued.isEmpty ? "Close" : "Done") { dismiss() }.disabled(busy)
            } }
            .scrollDismissesKeyboard(.interactively)
        }
        .interactiveDismissDisabled(busy)
        .sheet(item: $selected) { guest in
            if let qr = guest.qr {
                AccessPassPreview(artwork: VisitorPassArtwork(
                    pass: qr, host: host, visitor: guest.name, type: "Group guest", from: from, to: to
                ))
            }
        }
    }

    private func create() async {
        guard !busy else { return }
        busy = true
        error = nil
        defer { busy = false }
        do {
            let data = try await API.request("mobile/preapprove/group", token: token, body: [
                "names": guestNames, "validFrom": communityDateKey(from), "validTo": communityDateKey(to),
            ])
            issued = try JSONDecoder().decode(Issued.self, from: data).passes
            Haptics.shared.play(.success)
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}
