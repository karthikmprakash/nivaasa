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
    @State private var type = "guest"
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

    private var multipleDays: Bool { type == "guest" || (type == "cab" && daily) }

    var body: some View {
        NavigationStack {
            Form {
                if let result {
                    Section("Ready to share") {
                        Text(result).font(.largeTitle.monospacedDigit().bold())
                            .accessibilityIdentifier("entry-code")
                            .textSelection(.enabled)
                        ShareLink(item: "Your Nivaasa entry code is \(result). Show it at the gate.")
                    }
                } else {
                    Section("Who’s coming?") {
                        Picker("Visitor type", selection: $type) {
                            ForEach(["guest", "delivery", "cab", "vendor"], id: \.self) {
                                Text($0.capitalized).tag($0)
                            }
                        }
                        if type == "guest" {
                            TextField("Guest name", text: $name).textContentType(.name)
                            TextField("Phone number (optional)", text: $phone).keyboardType(.phonePad)
                        } else {
                            TextField("Company or platform (optional)", text: $company)
                            Text("Security will collect their details at the gate.").font(.footnote)
                        }
                        if type == "cab" { Toggle("Daily pickup", isOn: $daily) }
                        if type == "delivery" { Toggle("Allow leave at gate", isOn: $hold) }
                    }
                    Section(multipleDays ? "Validity window" : "Visit date") {
                        DatePicker(multipleDays ? "Valid from" : "Date", selection: $from,
                                   in: communityCalendar.startOfDay(for: .now)..., displayedComponents: .date)
                            .onChange(of: from) { _, newDate in
                                let latest = communityCalendar.date(byAdding: .day, value: 29, to: newDate) ?? newDate
                                to = min(max(to, newDate), latest)
                            }
                        if multipleDays {
                            DatePicker("Valid through", selection: $to, in: from...max(from, communityCalendar.date(byAdding: .day, value: 29, to: from) ?? from),
                                       displayedComponents: .date)
                            Menu("Date presets") {
                                Button("Today") { preset(offset: 0, length: 1) }
                                Button("Tomorrow") { preset(offset: 1, length: 1) }
                                Button("Next 7 days") { preset(offset: 0, length: 7) }
                            }
                        }
                    }
                    Section("Gate instructions") {
                        TextField("Notes (optional)", text: $notes, axis: .vertical)
                    }
                    if let error { Text(error).foregroundStyle(.red) }
                    Button(busy ? "Creating…" : "Create pass") { Task { await create() } }
                        .disabled(busy || (type == "guest" && name.trimmingCharacters(in: .whitespaces).isEmpty))
                }
            }
            .environment(\.timeZone, communityCalendar.timeZone)
            .navigationTitle("Visitor pass")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(result == nil ? "Close" : "Done") { dismiss() }.disabled(busy) } }
            .interactiveDismissDisabled(busy)
        }
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
                "type": type, "name": type == "guest" ? name : "", "phone": type == "guest" ? phone : "",
                "company": type == "guest" ? "" : company, "notes": notes,
                "validFrom": dateKey(from), "validTo": dateKey(multipleDays ? to : from),
                "recurringCab": type == "cab" && daily, "leaveAtGate": type == "delivery" && hold
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
        NavigationStack {
            Form {
                if let result { Label(result, systemImage: "checkmark.circle.fill").foregroundStyle(.green) }
                else {
                    Section("Entry code") {
                        TextField("6-digit code", text: $code).keyboardType(.numberPad)
                            .onChange(of: code) { _, value in
                                code = String(value.filter { $0.isASCII && $0.isNumber }.prefix(6))
                                matches = []
                                pass = nil
                                error = nil
                            }
                            .disabled(busy)
                            .accessibilityIdentifier("lookup-code")
                        Button("Find pass") { Task { await lookup() } }.disabled(code.count != 6 || busy)
                    }
                    if matches.count > 1 {
                        Section("Choose the visitor’s home") {
                            ForEach(matches) { match in Button("Home \(match.unit) · \(match.name)") { pass = match } }
                        }
                    }
                    if let pass {
                        Section("Confirm arrival") {
                            LabeledContent(pass.name, value: "Home \(pass.unit)")
                            if let notes = pass.notes, !notes.isEmpty { Text(notes) }
                            if pass.type != "guest" {
                                TextField("Visitor name", text: $name)
                                TextField("Phone number", text: $phone).keyboardType(.phonePad)
                            }
                            if pass.type == "cab" { TextField("Cab registration", text: $plate).textInputAutocapitalization(.characters) }
                            Button(pass.leaveAtGate == true ? "Record parcel at gate" : "Record arrival") {
                                Task { await record(pass) }
                            }
                            .disabled(busy || (pass.type != "guest" && (name.trimmingCharacters(in: .whitespaces).isEmpty || phone.trimmingCharacters(in: .whitespaces).isEmpty))
                                || (pass.type == "cab" && plate.trimmingCharacters(in: .whitespaces).isEmpty))
                        }
                    }
                    if busy { ProgressView() }
                    if let error { Text(error).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Verify pass")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(result == nil ? "Close" : "Done") { dismiss() }.disabled(busy) } }
            .interactiveDismissDisabled(busy)
        }
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
