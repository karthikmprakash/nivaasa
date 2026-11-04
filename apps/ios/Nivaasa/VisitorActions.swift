import SwiftUI

private var communityCalendar: Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "Asia/Kolkata") ?? .current
    return calendar
}

private func dateKey(_ date: Date) -> String {
    let parts = communityCalendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
}

struct CreatePass: View {
    @Environment(\.dismiss) private var dismiss
    let token: String
    @State private var type = "Guest"
    @State private var name = ""
    @State private var phone = ""
    @State private var company = ""
    @State private var notes = ""
    @State private var from = communityCalendar.startOfDay(for: .now)
    @State private var to = communityCalendar.startOfDay(for: .now)
    @State private var daily = false
    @State private var hold = false
    @State private var result: String?
    @State private var error: String?
    @State private var busy = false

    private var multipleDays: Bool { type == "Guest" || (type == "Cab" && daily) }
    private var maxDay: Date { communityCalendar.date(byAdding: .day, value: 29, to: communityCalendar.startOfDay(for: .now)) ?? .now }
    private var toRange: ClosedRange<Date> { from...max(from, min(maxDay, communityCalendar.date(byAdding: .day, value: 29, to: from) ?? maxDay)) }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: result == nil ? "Visitor pass" : "Ready to share", subtitle: result == nil ? "The guard will see this pass at the gate." : "Share the code with your visitor.", close: { dismiss() })
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let result {
                        NivaasaFeedback(text: "Pass created and active.", tone: .mint)
                        NivaasaCard(tinted: true) {
                            Text("Entry code").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                            Text(result).font(.jakarta(46, .bold)).tracking(4).foregroundStyle(NK.ink).monospacedDigit()
                                .frame(maxWidth: .infinity, alignment: .center)
                                .accessibilityIdentifier("entry-code")
                            NivaasaCopyButton(value: result, label: "Copy entry code")
                        }
                        PrimaryButton(title: "Done", icon: "checkmark") { dismiss() }
                    } else {
                        NivaasaChips(label: "Who’s coming?", options: ["Guest", "Delivery", "Cab", "Vendor"], selection: $type)
                        NivaasaCard {
                            if type == "Guest" {
                                NivaasaInput(label: "Guest name", text: $name, placeholder: "Full name", capitalization: .words)
                                NivaasaInput(label: "Phone number", text: $phone, placeholder: "Optional", keyboard: .phonePad)
                            } else {
                                NivaasaInput(label: "Company or platform", text: $company, placeholder: "Optional", capitalization: .words)
                                Text("Security will collect their details at the gate.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                        }
                        if type == "Cab" {
                            NivaasaToggleRow(label: "Daily pickup", isOn: $daily, help: "Use the same window each day.")
                        }
                        if type == "Delivery" {
                            NivaasaToggleRow(label: "Allow leave at gate", isOn: $hold, help: "The guard can keep the parcel safely.")
                        }
                        NivaasaCard {
                            Text(multipleDays ? "Validity window" : "Visit date").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            NivaasaDateField(label: multipleDays ? "Valid from" : "Date", date: $from, range: communityCalendar.startOfDay(for: .now)...maxDay)
                                .onChange(of: from) { _, newValue in
                                    if to < newValue { to = newValue }
                                    if to > maxDay { to = maxDay }
                                }
                            if multipleDays {
                                NivaasaDateField(label: "Valid through", date: $to, range: toRange)
                                HStack(spacing: 7) {
                                    presetChip("Today", offset: 0, length: 1)
                                    presetChip("Tomorrow", offset: 1, length: 1)
                                    presetChip("Next 7 days", offset: 0, length: 7)
                                }
                            }
                        }
                        NivaasaTextArea(label: "Gate instructions", text: $notes, placeholder: "Anything the guard should know (optional)")
                        if let error { NivaasaFeedback(text: error, tone: .danger) }
                        PrimaryButton(title: busy ? "Creating…" : "Create pass", icon: "checkmark", disabled: busy || (type == "Guest" && name.trimmingCharacters(in: .whitespaces).isEmpty)) {
                            Task { await create() }
                        }
                    }
                }
                .padding(20)
            }
        }
        .background(AppWash())
        .interactiveDismissDisabled(busy)
    }

    private func presetChip(_ title: String, offset: Int, length: Int) -> some View {
        Button {
            preset(offset: offset, length: length)
        } label: {
            Text(title)
                .font(.nivaasaCaptionMedium)
                .foregroundStyle(NK.inkSoft)
                .padding(.horizontal, 11)
                .frame(minHeight: 34)
                .background(NK.canvas, in: Capsule())
                .overlay { Capsule().strokeBorder(NK.line, lineWidth: 1) }
        }
        .buttonStyle(NivaasaPressStyle())
    }

    private func preset(offset: Int, length: Int) {
        let today = communityCalendar.startOfDay(for: .now)
        from = communityCalendar.date(byAdding: .day, value: offset, to: today) ?? today
        to = communityCalendar.date(byAdding: .day, value: length - 1, to: from) ?? from
    }

    private func create() async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let data = try await API.request("mobile/preapprove", token: token, body: [
                "type": type.lowercased(), "name": type == "Guest" ? name : "", "phone": type == "Guest" ? phone : "",
                "company": type == "Guest" ? "" : company, "notes": notes,
                "validFrom": dateKey(from), "validTo": dateKey(multipleDays ? to : from),
                "recurringCab": type == "Cab" && daily, "leaveAtGate": type == "Delivery" && hold
            ])
            struct Created: Decodable { let code: String }
            result = try JSONDecoder().decode(Created.self, from: data).code
        } catch { self.error = error.localizedDescription }
    }
}

struct VerifyPass: View {
    struct Match: Decodable, Identifiable {
        let id: String
        let unitId: String
        let name: String
        let type: String
        let unit: String
        let notes: String?
        let leaveAtGate: Bool?
    }
    private struct Search: Decodable { let passes: [Match] }
    private struct Arrival: Decodable { let status: String; let name: String }
    @Environment(\.dismiss) private var dismiss
    let token: String
    @State private var code = ""
    @State private var matches: [Match] = []
    @State private var pass: Match?
    @State private var name = ""
    @State private var phone = ""
    @State private var plate = ""
    @State private var error: String?
    @State private var result: String?
    @State private var busy = false

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: result == nil ? "Verify pass" : "Arrival recorded", subtitle: result == nil ? "Look up a six-digit entry code." : nil, close: { dismiss() })
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let result {
                        NivaasaFeedback(text: result, tone: .mint)
                        PrimaryButton(title: "Done", icon: "checkmark") { dismiss() }
                    } else {
                        NivaasaCard {
                            NivaasaInput(label: "6-digit entry code", text: $code, placeholder: "000000", keyboard: .numberPad, identifier: "lookup-code")
                                .onChange(of: code) { _, value in
                                    code = String(value.filter { $0.isASCII && $0.isNumber }.prefix(6))
                                    matches = []
                                    pass = nil
                                    error = nil
                                }
                            PrimaryButton(title: busy ? "Finding…" : "Find pass", icon: "magnifyingglass", disabled: code.count != 6 || busy) {
                                Task { await lookup() }
                            }
                        }
                        if matches.count > 1 {
                            NivaasaCard {
                                Text("Choose the visitor’s home").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                ForEach(matches) { match in
                                    Button { pass = match } label: {
                                        HStack {
                                            Text("Home \(match.unit) · \(match.name)").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                                            Spacer()
                                            Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(NK.muted)
                                        }
                                        .padding(.horizontal, 12).frame(minHeight: 46)
                                        .background(NK.canvas, in: RoundedRectangle(cornerRadius: NKRadius.control))
                                    }
                                    .buttonStyle(NivaasaPressStyle())
                                }
                            }
                        }
                        if let pass {
                            NivaasaCard {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(pass.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                        Text("Home \(pass.unit)").font(.nivaasaCaption).foregroundStyle(NK.muted)
                                    }
                                    Spacer()
                                    NivaasaBadge(text: pass.type.replacingOccurrences(of: "_", with: " ").capitalized, tone: .pink)
                                }
                                if let notes = pass.notes, !notes.isEmpty { Text(notes).font(.nivaasaCaption).foregroundStyle(NK.muted) }
                                if pass.type != "guest" {
                                    NivaasaInput(label: "Visitor name", text: $name, placeholder: "Full name", capitalization: .words)
                                    NivaasaInput(label: "Phone number", text: $phone, placeholder: "Phone", keyboard: .phonePad)
                                }
                                if pass.type == "cab" {
                                    NivaasaInput(label: "Cab registration", text: $plate, placeholder: "KA 01 AB 1234", capitalization: .characters)
                                }
                                PrimaryButton(title: pass.leaveAtGate == true ? "Record parcel at gate" : "Record arrival", icon: "checkmark", disabled: busy || (pass.type != "guest" && (name.trimmingCharacters(in: .whitespaces).isEmpty || phone.trimmingCharacters(in: .whitespaces).isEmpty)) || (pass.type == "cab" && plate.trimmingCharacters(in: .whitespaces).isEmpty)) {
                                    Task { await record(pass) }
                                }
                            }
                        }
                        if busy { ProgressView().tint(NK.brand600).frame(maxWidth: .infinity) }
                        if let error { NivaasaFeedback(text: error, tone: .danger) }
                    }
                }
                .padding(20)
            }
        }
        .background(AppWash())
        .interactiveDismissDisabled(busy)
    }

    private func lookup() async {
        busy = true
        error = nil
        pass = nil
        matches = []
        defer { busy = false }
        do {
            let data = try await API.request("gate/search?q=" + code, token: token)
            matches = try JSONDecoder().decode(Search.self, from: data).passes
            if matches.count == 1 { pass = matches.first }
            if matches.isEmpty { error = "No active pass matches this code." }
        } catch { self.error = error.localizedDescription }
    }

    private func record(_ match: Match) async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let data = try await API.request("gate/entry", token: token, body: [
                "type": match.type, "unitId": match.unitId, "code": code,
                "name": name, "phone": phone, "vehicleNo": plate
            ])
            let arrival = try JSONDecoder().decode(Arrival.self, from: data)
            result = arrival.status == "left_at_gate" ? "Parcel recorded at the gate." : "\(arrival.name) checked in."
        } catch { self.error = error.localizedDescription }
    }
}
