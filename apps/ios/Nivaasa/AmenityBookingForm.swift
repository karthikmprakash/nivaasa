import SwiftUI

struct AmenitySelection: Identifiable {
    let amenity: [String: Any]
    var id: String { string(amenity, "id") }
}

struct AmenityBookingForm: View {
    let token: String
    let amenity: [String: Any]
    @Environment(\.dismiss) private var dismiss
    @State private var date = communityCalendar.startOfDay(for: .now)
    @State private var selected = ""
    @State private var guests = 0
    @State private var slots: [[String: Any]] = []
    @State private var loading = false
    @State private var busy = false
    @State private var complete = false
    @State private var failure: String?
    @State private var availabilityError: String?
    @State private var loadedDay: String?
    @State private var retry = 0

    private var day: String { communityDateKey(date) }
    private var availableSlots: [[String: Any]] { loadedDay == day ? slots : [] }
    private var hasSelection: Bool {
        !selected.isEmpty && availableSlots.contains {
            string($0, "start") == selected && ($0["available"] as? Bool == true)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: complete ? "See you there" : "Book " + string(amenity, "name"), close: { if !busy { dismiss() } })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if complete {
                        NivaasaFeedback(text: "Your booking is confirmed for \(day), \(selected).")
                        PrimaryButton(title: "My bookings", icon: "calendar") { dismiss() }
                    } else {
                        // Icon header for the amenity
                        HStack(spacing: 12) {
                            let tint = iconTint(string(amenity, "name"))
                            RoundedRectangle(cornerRadius: 14, style: .continuous).fill(tint.bg)
                                .frame(width: 52, height: 52)
                                .overlay { NivaasaIcon(name: string(amenity, "icon", fallback: "sparkles"), size: 26).foregroundStyle(tint.fg) }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(string(amenity, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text("\(string(amenity, "location")) · up to \(Int(number(amenity, "capacity"))) guests · \(number(amenity, "price") > 0 ? money(number(amenity, "price")) : "Free")")
                                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                        NivaasaDateField(label: "Date", date: $date, range: communityCalendar.startOfDay(for: .now)...Date.distantFuture)
                            .disabled(busy)
                        Text("Available slots").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        if loading { ProgressView("Checking availability").tint(NK.brand600) }
                        if let availabilityError {
                            NivaasaFeedback(text: availabilityError, tone: .danger)
                            OutlineButton(title: "Retry availability") { retry += 1 }
                        } else if !loading && loadedDay == day {
                            if availableSlots.contains(where: { $0["available"] as? Bool == true }) {
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                                    ForEach(Array(availableSlots.enumerated()), id: \.offset) { _, slot in
                                        let available = slot["available"] as? Bool ?? false
                                        let start = string(slot, "start")
                                        Button { selected = start; Haptics.shared.play(.selection) } label: {
                                            Text("\(start)–\(string(slot, "end"))").font(.nivaasaCaptionMedium)
                                                .foregroundStyle(selected == start ? .white : available ? NK.brand700 : NK.muted)
                                                .strikethrough(!available)
                                                .frame(maxWidth: .infinity, minHeight: 48)
                                                .background(selected == start ? NK.brand600 : available ? NK.brand50 : NK.canvas, in: RoundedRectangle(cornerRadius: 10))
                                                .overlay {
                                                    RoundedRectangle(cornerRadius: 10)
                                                        .strokeBorder(selected == start ? NK.brand600 : available ? NK.brand500 : NK.line, lineWidth: available || selected == start ? 1.5 : 1)
                                                }
                                        }.buttonStyle(NivaasaPressStyle()).disabled(!available || busy)
                                            .accessibilityAddTraits(selected == start ? .isSelected : [])
                                            .accessibilityLabel(available ? "\(start) to \(string(slot, "end")) available" : "\(start) to \(string(slot, "end")) booked")
                                    }
                                }
                            } else {
                                NivaasaCard(padding: 12) {
                                    HStack(spacing: 10) {
                                        NivaasaIcon(name: "calendar", size: 18).foregroundStyle(NK.muted)
                                        Text("No slots available on \(shortDate(day)). Try another date.").font(.nivaasaBody).foregroundStyle(NK.muted)
                                    }
                                }
                            }
                        }
                        HStack {
                            Text("Guests").font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                            Spacer()
                            Button { guests = max(0, guests - 1) } label: { Text("−").font(.nivaasaSection).frame(width: 44, height: 44).background(NK.canvas, in: RoundedRectangle(cornerRadius: 10)) }
                                .buttonStyle(NivaasaPressStyle()).accessibilityLabel("Fewer guests")
                            Text("\(guests)").font(.nivaasaBodySemibold).frame(minWidth: 24)
                            Button { guests = min(Int(number(amenity, "capacity")), guests + 1) } label: { Text("+").font(.nivaasaSection).frame(width: 44, height: 44).background(NK.canvas, in: RoundedRectangle(cornerRadius: 10)) }
                                .buttonStyle(NivaasaPressStyle()).accessibilityLabel("More guests")
                        }.foregroundStyle(NK.inkSoft).disabled(busy)
                        Text(string(amenity, "rules")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                        HStack { Text("Total"); Spacer(); Text(number(amenity, "price") > 0 ? money(number(amenity, "price")) : "Free") }.font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        if number(amenity, "price") > 0 { Text("Demo payment: no real money is collected.").font(.nivaasaCaption).foregroundStyle(NK.muted) }
                        if let failure { NivaasaFeedback(text: failure, tone: .danger) }
                        PrimaryButton(title: busy ? "Booking…" : "Confirm booking", disabled: !hasSelection || loading || busy) { Task { await book() } }
                    }
                }.padding(20)
            }
        }.background(AppWash())
        .task(id: "\(day)-\(retry)") {
            selected = ""
            failure = nil
            await availability(for: day)
        }
        .interactiveDismissDisabled(busy)
    }

    private func availability(for requestedDay: String) async {
        loading = true
        availabilityError = nil
        loadedDay = nil
        defer { if !Task.isCancelled && day == requestedDay { loading = false } }
        do {
            let raw = try await API.request("amenities/\(string(amenity, "id"))/availability?date=\(requestedDay)", token: token)
            try Task.checkCancellation()
            guard day == requestedDay else { return }
            let data = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            slots = rows(data["slots"])
            loadedDay = requestedDay
            if !hasSelection { selected = "" }
        } catch {
            if !Task.isCancelled && day == requestedDay { availabilityError = error.localizedDescription }
        }
    }

    private func book() async {
        guard !busy, !loading, hasSelection else { return }
        busy = true
        failure = nil
        defer { busy = false }
        let requestedDay = day
        do {
            _ = try await API.request("amenities/book", token: token, body: [
                "amenityId": string(amenity, "id"), "date": requestedDay, "startTime": selected, "guests": guests,
            ])
            complete = true
            Haptics.shared.play(.success)
        } catch {
            failure = error.localizedDescription
            Haptics.shared.play(.error)
            await availability(for: requestedDay)
        }
    }
}
