import SwiftUI
import Contacts

func validPhone(_ value: String) -> Bool {
    let digits = value.filter(\.isNumber)
    return (7...15).contains(digits.count) && value.range(of: #"^[+\d][\d\s()-]*$"#, options: .regularExpression) != nil
}

private struct CreatedPass: Decodable {
    let id: String?
    let code: String
}

struct CreatePass: View {
    @Environment(\.dismiss) private var dismiss
    let token: String
    let host: VisitorPassHost
    private var home: String { host.unit }
    @State private var type: VisitorPassType
    @State private var name = ""
    @State private var phone = ""
    @State private var companies: [VisitorPassType: String] = [:]
    @State private var notes = ""
    @State private var from: Date
    @State private var to: Date
    @State private var daily: Bool
    @State private var hold = false
    @State private var result: CreatedPass?
    @State private var error: String?
    @State private var busy = false
    @State private var showPlatforms = false
    @State private var showNotes = false
    @State private var showDailyHelp = false
    @State private var helpRegistered: String?

    init(token: String, host: VisitorPassHost, initialType: VisitorPassType = .guest, dailyPickup: Bool = false) {
        self.token = token
        self.host = host
        let today = communityCalendar.startOfDay(for: .now)
        self._type = State(initialValue: initialType)
        self._from = State(initialValue: today)
        self._to = State(initialValue: communityCalendar.date(byAdding: .day, value: dailyPickup ? 6 : 0, to: today) ?? today)
        self._daily = State(initialValue: dailyPickup)
    }

    private var company: String { companies[type] ?? "" }
    private var multipleDays: Bool { type == .guest || (type == .cab && daily) }
    private var startRange: ClosedRange<Date> { communityCalendar.startOfDay(for: .now)...Date.distantFuture }
    private var toRange: ClosedRange<Date> {
        from...(communityCalendar.date(byAdding: .day, value: 29, to: from) ?? from)
    }
    private var createTitle: String {
        if type == .cab && daily { return "Create daily pickup pass" }
        return "Create gate pass"
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(
                title: result == nil ? "Pre-approve a visitor" : "Pass ready",
                subtitle: result == nil ? "Create a gate pass\(home.isEmpty ? "" : " for Home \(home)"), or register someone who works at your home regularly." : "Share this code with your visitor for the gate.",
                closeIdentifier: "visitor-pass-close",
                close: { if !busy { dismiss() } }
            )
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if let result {
                        success(pass: result)
                    } else {
                        VisitorTypeCards(selection: Binding(get: { type }, set: { choose($0) }))
                            .disabled(busy)
                        if type == .dailyHelp {
                            dailyHelpSection
                        } else {
                            detailsSection
                            if type == .cab { frequencySection }
                            validitySection
                            if type == .delivery { deliverySection }
                            notesSection
                            if let error { NivaasaFeedback(text: error, tone: .danger) }
                            PrimaryButton(title: busy ? "Creating…" : createTitle, icon: "key", disabled: !canCreate || busy) {
                                Task { await create() }
                            }
                            Text(type == .guest ? "You’ll get a six-digit code and QR to share." : "Security verifies the code at the gate — no QR to share.")
                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 620)
                .frame(maxWidth: .infinity)
            }
        }
        .background(AppWash())
        .interactiveDismissDisabled(busy)
        .fullScreenCover(isPresented: $showPlatforms) {
            VisitorPlatformPicker(type: type, selection: Binding(
                get: { company },
                set: { companies[type] = String($0.prefix(100)) }
            ))
        }
        .fullScreenCover(isPresented: $showDailyHelp) {
            DailyHelpForm(token: token) { message in
                helpRegistered = message
                showDailyHelp = false
            }
        }
    }

    private var detailsSection: some View {
        NivaasaCard {
            VStack(alignment: .leading, spacing: 4) {
                Text(detailsTitle).font(.nivaasaSection).foregroundStyle(NK.ink)
                Text(detailsHint).font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            if type == .guest {
                NivaasaInput(label: "Guest name", text: $name, placeholder: "e.g. Rohit Sharma", capitalization: .words)
                NivaasaInput(label: "Phone number (optional)", text: $phone, placeholder: "+91…", keyboard: .phonePad)
                OutlineButton(title: "Choose from contacts", icon: "person.crop.circle", disabled: busy) {
                    Task { await pickFromContacts() }
                }
                .accessibilityIdentifier("pick-contact")
            } else {
                if type == .vendor {
                    NivaasaInput(
                        label: "Company (optional)",
                        text: Binding(get: { company }, set: { companies[type] = String($0.prefix(100)) }),
                        placeholder: "e.g. CoolCare",
                        capitalization: .words
                    )
                } else {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(type == .cab ? "Cab service (optional)" : "Delivery platform (optional)")
                            .font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                        Button { showPlatforms = true } label: {
                            HStack(spacing: 11) {
                                PlatformLogo(name: company)
                                Text(company.isEmpty ? "Select platform (optional)" : company)
                                    .font(.nivaasaBody).foregroundStyle(company.isEmpty ? NK.muted : NK.ink)
                                Spacer()
                                NivaasaIcon(name: "chevron.down").foregroundStyle(NK.muted)
                            }
                            .padding(.horizontal, 10).frame(minHeight: 54)
                            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                            .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.lineStrong) }
                        }
                        .buttonStyle(NivaasaPressStyle())
                        .accessibilityIdentifier("platform-choice")
                    }
                }
            }
        }
    }

    private var detailsTitle: String {
        switch type {
        case .guest: "Guest details"
        case .delivery: "Delivery details"
        case .cab: "Cab details"
        case .vendor: "Service details"
        case .dailyHelp: "Daily help"
        }
    }

    private var detailsHint: String {
        switch type {
        case .guest: "We’ll share a code you can send to your guest."
        case .cab: "Security will record the driver’s name, phone number, and cab registration at the gate."
        case .delivery: "Security will record the delivery partner’s details at the gate."
        case .vendor: "Security will collect their name and phone number when they arrive."
        case .dailyHelp: ""
        }
    }

    private var frequencySection: some View {
        NivaasaCard {
            VStack(alignment: .leading, spacing: 4) {
                Text("Pickup frequency").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                Text("One visit, or the same code for a regular pickup.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 8) { frequencyOptions }
                VStack(spacing: 8) { frequencyOptions }
            }
        }
    }

    @ViewBuilder private var frequencyOptions: some View {
        frequencyOption("One visit", detail: "Single pickup", selected: !daily) { setDaily(false) }
        frequencyOption("Daily pickup", detail: "One per day", selected: daily) { setDaily(true) }
    }

    private func setDaily(_ enabled: Bool) {
        guard enabled != daily else { return }
        daily = enabled
        to = enabled ? (communityCalendar.date(byAdding: .day, value: 6, to: from) ?? from) : from
    }

    private func frequencyOption(_ title: String, detail: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(title).font(.nivaasaBodySemibold).foregroundStyle(selected ? NK.brand700 : NK.ink)
                    Spacer(minLength: 0)
                    if selected { NivaasaIcon(name: "checkmark.circle.fill", size: 17).foregroundStyle(NK.brand600) }
                }
                Text(detail).font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            .padding(12).frame(maxWidth: .infinity, minHeight: 66, alignment: .leading)
            .background(selected ? NK.brand50 : NK.surface, in: RoundedRectangle(cornerRadius: 11))
            .overlay { RoundedRectangle(cornerRadius: 11).strokeBorder(selected ? NK.brand500 : NK.line) }
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityLabel(title)
        .accessibilityHint(detail)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private var validitySection: some View {
        NivaasaCard {
            VStack(alignment: .leading, spacing: 4) {
                Text(multipleDays ? "Pass validity" : "Visit window").font(.nivaasaSection).foregroundStyle(NK.ink)
                Text(type == .cab && daily ? "One pickup per day. Share the same code with the driver."
                     : multipleDays ? "Your guest can enter and re-enter on any date within this window."
                     : "Valid for 1 hour from creation. No QR pass needed — security verifies at the gate.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            if multipleDays {
                FlowLayout(spacing: 8) {
                    if type == .cab && daily {
                        presetButton("7 days", offset: 0, length: 7)
                        presetButton("14 days", offset: 0, length: 14)
                        presetButton("30 days", offset: 0, length: 30)
                    } else {
                        presetButton("Today", offset: 0, length: 1)
                        presetButton("Tomorrow", offset: 1, length: 1)
                        presetButton("Next 7 days", offset: 0, length: 7)
                    }
                }
                NivaasaDateField(label: "Valid from", date: $from, range: startRange)
                    .onChange(of: from) { _, value in
                        if !toRange.contains(to) { to = value }
                    }
                NivaasaDateField(label: "Valid to", date: $to, range: toRange)
            } else {
                HStack(spacing: 10) {
                    NivaasaIcon(name: "clock", size: 17).foregroundStyle(NK.brand600)
                        .frame(width: 34, height: 34).background(NK.brand50, in: RoundedRectangle(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("1 hour from now").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                        Text("The gate records the \(type == .cab ? "driver" : type == .delivery ? "delivery partner" : "vendor") and checks this pass — nothing to share.")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                }
                .padding(12)
                .background(NK.canvas, in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func presetButton(_ title: String, offset: Int, length: Int) -> some View {
        let start = communityCalendar.date(byAdding: .day, value: offset, to: communityCalendar.startOfDay(for: .now)) ?? .now
        let end = communityCalendar.date(byAdding: .day, value: length - 1, to: start) ?? start
        let active = communityCalendar.isDate(from, inSameDayAs: start)
            && (!multipleDays || communityCalendar.isDate(to, inSameDayAs: end))
        return Button { preset(offset: offset, length: length) } label: {
            Text(title)
                .font(.nivaasaCaptionMedium)
                .foregroundStyle(active ? NK.brand700 : NK.inkSoft)
                .padding(.horizontal, 11).frame(minHeight: 44)
                .background(active ? NK.brand50 : NK.canvas, in: RoundedRectangle(cornerRadius: 9))
                .overlay { RoundedRectangle(cornerRadius: 9).strokeBorder(active ? NK.brand500 : NK.line) }
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityAddTraits(active ? .isSelected : [])
    }

    private var deliverySection: some View {
        NivaasaToggleRow(
            label: "Leave the parcel at the gate",
            isOn: $hold,
            help: "Security will keep it safely and send you a pickup code."
        )
    }

    private var notesSection: some View {
        NivaasaCard(padding: 0) {
            Button { withAnimation(.easeOut(duration: 0.16)) { showNotes.toggle() } } label: {
                HStack {
                    NivaasaIcon(name: "message").foregroundStyle(NK.muted)
                    Text("Notes for security").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                    Text("(optional)").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    Spacer()
                    NivaasaIcon(name: showNotes ? "chevron.down" : "chevron.right").foregroundStyle(NK.muted)
                }
                .padding(16)
                .contentShape(Rectangle())
            }
            .buttonStyle(NivaasaPressStyle())
            if showNotes {
                Divider().padding(.horizontal, 16)
                NivaasaTextArea(label: "Gate instructions", text: $notes, placeholder: "e.g. Use the main gate", minHeight: 84)
                    .onChange(of: notes) { _, value in notes = String(value.prefix(300)) }
                    .padding(16)
            }
        }
    }

    private var dailyHelpSection: some View {
        NivaasaCard(tinted: true) {
            HStack(spacing: 12) {
                NivaasaIcon(name: "sparkles", size: 22).foregroundStyle(Color(hex: 0x6A54C8))
                    .frame(width: 44, height: 44).background(.white, in: RoundedRectangle(cornerRadius: 12))
                VStack(alignment: .leading, spacing: 3) {
                    Text("Register daily help").font(.nivaasaSection).foregroundStyle(NK.ink)
                    Text("Housekeeper, cook, driver or nanny").font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
            }
            Text("Add someone who works at your home regularly. Once security verifies their profile, they give their phone number at the gate to check in and out each day.")
                .font(.nivaasaBody).foregroundStyle(NK.inkSoft)
            if let helpRegistered {
                NivaasaFeedback(text: helpRegistered)
            }
            PrimaryButton(title: "Register daily help", icon: "plus") { showDailyHelp = true }
            Text("You can see attendance and leave a private review in My home.")
                .font(.nivaasaCaption).foregroundStyle(NK.muted)
        }
    }

    private func success(pass: CreatedPass) -> some View {
        let code = pass.code
        return VStack(alignment: .leading, spacing: 16) {
            NivaasaFeedback(text: type == .cab && daily ? "Daily cab pass ready." : "Pass ready for \(type == .guest ? name : type.title.lowercased()).")
            NivaasaCard(tinted: true) {
                Text("Entry code").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                Text(code).font(.jakarta(46, .bold)).tracking(5).foregroundStyle(NK.ink).monospacedDigit()
                    .frame(maxWidth: .infinity, alignment: .center)
                    .accessibilityIdentifier("entry-code")
                NivaasaCopyButton(value: code, label: "Copy entry code")
                Divider()
                HStack {
                    Text("Valid").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    Spacer()
                    Text(validityLabel).font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                }
            }
            if type == .guest {
                if let id = pass.id, let qr = AccessPassCode(id: id, code: code) {
                    AccessQRCard(artwork: VisitorPassArtwork(
                        pass: qr, host: host, visitor: name.trimmingCharacters(in: .whitespacesAndNewlines),
                        type: type.title, from: from, to: multipleDays ? to : from,
                        daily: false, leaveAtGate: false
                    ))
                } else {
                    ShareLink(item: "Your Nivaasa entry code is \(code). Show it at the gate.") {
                        HStack(spacing: 8) {
                            NivaasaIcon(name: "arrow.right")
                            Text("Share visitor pass").font(.nivaasaBodySemibold)
                        }
                        .foregroundStyle(NK.brand700)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                        .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.lineStrong) }
                    }
                }
            } else {
                NivaasaCard {
                    HStack(spacing: 10) {
                        NivaasaIcon(name: "clock", size: 17).foregroundStyle(NK.brand600)
                            .frame(width: 34, height: 34).background(NK.brand50, in: RoundedRectangle(cornerRadius: 10))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("No QR pass needed").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            Text("Valid for 1 hour. Security records the visitor at the gate and verifies against this code — nothing to share.")
                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                        }
                    }
                }
            }
            PrimaryButton(title: "Done", icon: "checkmark") { dismiss() }
            Button {
                result = nil
                error = nil
                name = ""
                phone = ""
                notes = ""
                showNotes = false
                daily = false
                hold = false
                preset(offset: 0, length: 1)
            } label: {
                Text("Create another pass").font(.nivaasaBodyMedium).foregroundStyle(NK.brand700)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(NivaasaPressStyle())
        }
    }

    private var validityLabel: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IN")
        formatter.timeZone = TimeZone(identifier: "Asia/Kolkata")
        formatter.dateFormat = "d MMM"
        if multipleDays && !communityCalendar.isDate(from, inSameDayAs: to) {
            return formatter.string(from: from) + " – " + formatter.string(from: to)
        }
        return formatter.string(from: from)
    }

    private var canCreate: Bool {
        if type == .guest && name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return false }
        return !busy
    }

    private func choose(_ next: VisitorPassType) {
        guard next != type else { return }
        type = next
        error = nil
        notes = ""
        daily = false
        hold = false
        preset(offset: 0, length: 1)
    }

    private func preset(offset: Int, length: Int) {
        let today = communityCalendar.startOfDay(for: .now)
        from = communityCalendar.date(byAdding: .day, value: offset, to: today) ?? today
        to = communityCalendar.date(byAdding: .day, value: length - 1, to: from) ?? from
    }

    private func pickFromContacts() async {
        guard await ContactAccess.ensureAuthorized() else {
            error = "Contacts access is off. Enable it in Settings → Nivaasa to pick a guest from your address book."
            Haptics.shared.play(.warning)
            return
        }
        // Capture the state bindings so the escaping callback writes to the real
        // @State storage instead of a copied view struct.
        let nameBinding = $name
        let phoneBinding = $phone
        let errorBinding = $error
        ContactPickerPresenter.present { contact in
            let fullName = [contact.givenName, contact.familyName].filter { !$0.isEmpty }.joined(separator: " ")
            if !fullName.isEmpty { nameBinding.wrappedValue = fullName }
            if let raw = contact.phoneNumbers.first?.value.stringValue {
                let cleaned = raw.replacingOccurrences(of: " ", with: "").replacingOccurrences(of: "-", with: "")
                if !cleaned.isEmpty { phoneBinding.wrappedValue = cleaned }
            }
            errorBinding.wrappedValue = nil
            Haptics.shared.play(.success)
        }
    }

    private func create() async {
        guard !busy, canCreate else { return }
        let guestPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        if type == .guest && !guestPhone.isEmpty && !validPhone(guestPhone) {
            error = "Enter a valid phone number."
            Haptics.shared.play(.warning)
            return
        }
        busy = true
        error = nil
        defer { busy = false }
        do {
            let data = try await API.request("mobile/preapprove", token: token, body: [
                "type": type.rawValue,
                "name": type == .guest ? name.trimmingCharacters(in: .whitespacesAndNewlines) : "",
                "phone": type == .guest ? guestPhone : "",
                "company": type == .guest ? "" : company.trimmingCharacters(in: .whitespacesAndNewlines),
                "notes": String(notes.trimmingCharacters(in: .whitespacesAndNewlines).prefix(300)),
                "validFrom": communityDateKey(from), "validTo": communityDateKey(multipleDays ? to : from),
                "recurringCab": type == .cab && daily, "leaveAtGate": type == .delivery && hold,
            ])
            result = try JSONDecoder().decode(CreatedPass.self, from: data)
            Haptics.shared.play(.success)
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}

struct DailyHelpForm: View {
    let token: String
    let done: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var role = "House help"
    @State private var phone = ""
    @State private var shift = ""
    @State private var monthlyRate = ""
    @State private var busy = false
    @State private var error: String?
    @State private var saved = false

    private var rate: Double? {
        if monthlyRate.trimmingCharacters(in: .whitespaces).isEmpty { return nil }
        return Double(monthlyRate)
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(
                title: saved ? "Daily help registered" : "Register daily help",
                subtitle: saved ? nil : "Security verifies their identity before attendance is recorded.",
                closeIdentifier: "daily-help-close",
                close: { if !busy { dismiss() } }
            )
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if saved {
                        NivaasaFeedback(text: "\(name) added. The security team will verify their ID at the gate.")
                        PrimaryButton(title: "Done", icon: "checkmark") {
                            done("\(name) registered. Security verification is pending.")
                            dismiss()
                        }
                    } else {
                        NivaasaCard {
                            NivaasaInput(label: "Name", text: $name, placeholder: "Sunita Devi", capitalization: .words)
                                .onChange(of: name) { _, value in name = String(value.prefix(80)) }
                            NivaasaChips(label: "Role", options: ["House help", "Cook", "Driver", "Nanny", "Gardener", "Other"], selection: $role)
                            NivaasaInput(label: "Phone number", text: $phone, placeholder: "+91…", keyboard: .phonePad)
                            Text("Ask for their permission before sharing their number.")
                                .font(.nivaasaCaption).foregroundStyle(NK.muted)
                            NivaasaInput(label: "Working hours (optional)", text: $shift, placeholder: "8 AM – 11 AM")
                            NivaasaInput(label: "Monthly pay (₹, optional)", text: $monthlyRate, placeholder: "6000", keyboard: .numberPad)
                        }
                        if let error { NivaasaFeedback(text: error, tone: .danger) }
                        PrimaryButton(
                            title: busy ? "Registering…" : "Register daily help",
                            icon: "checkmark",
                            disabled: busy || name.trimmingCharacters(in: .whitespaces).isEmpty || !validPhone(phone)
                        ) { Task { await submit() } }
                    }
                }.padding(20)
            }
        }
        .background(AppWash())
        .interactiveDismissDisabled(busy)
    }

    private func submit() async {
        guard !busy else { return }
        busy = true
        error = nil
        defer { busy = false }
        do {
            var body: [String: Any] = [
                "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
                "role": role,
                "phone": phone.trimmingCharacters(in: .whitespacesAndNewlines),
            ]
            if !shift.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { body["shift"] = shift }
            if let rate { body["monthlyRate"] = rate }
            _ = try await API.request("mobile/daily-help", token: token, body: body)
            saved = true
            Haptics.shared.play(.success)
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
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
    struct Search: Decodable { let passes: [Match] }
    struct Arrival: Decodable { let status: String; let name: String }
    @Environment(\.dismiss) private var dismiss
    let token: String
    @State private var scanning: Bool
    @State private var verifiedCode: String?
    @State private var code = ""
    @State private var matches: [Match] = []
    @State private var pass: Match?
    @State private var name = ""
    @State private var phone = ""
    @State private var plate = ""
    @State private var error: String?
    @State private var result: String?
    @State private var busy = false

    init(token: String, startWithCamera: Bool = true) {
        self.token = token
        _scanning = State(initialValue: startWithCamera)
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: result != nil ? "Arrival recorded" : scanning ? "Scan visitor QR" : "Verify pass",
                               subtitle: nil, close: { if !busy { dismiss() } })
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let result {
                        NivaasaFeedback(text: result, tone: .mint)
                        PrimaryButton(title: "Scan next pass", icon: "qrcode.viewfinder") {
                            resetReview()
                            code = ""
                            self.result = nil
                            scanning = true
                        }
                        OutlineButton(title: "Done") { dismiss() }
                    } else if scanning {
                        GateQRScanner { scanned in
                            scanning = false
                            Task { await lookup(code: scanned.code, passId: scanned.id) }
                        }
                        OutlineButton(title: "Enter code manually") { scanning = false }
                    } else {
                        OutlineButton(title: "Scan visitor QR", icon: "qrcode.viewfinder") {
                            resetReview()
                            scanning = true
                        }.disabled(busy)
                        if verifiedCode == nil {
                            NivaasaCard {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("Entry code").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                                    Text("Enter the six-digit code — it checks automatically as you type.")
                                        .font(.nivaasaCaption).foregroundStyle(NK.muted)
                                    OtpCodeField(code: $code) { full in
                                        resetReview()
                                        Task { await lookup(code: full) }
                                    }
                                    .onChange(of: code) { _, _ in
                                        if code.count < 6 { resetReview() }
                                    }
                                }
                            }.disabled(busy)
                        } else {
                            NivaasaTextButton(title: "Enter a different code", icon: "key") {
                                code = ""
                                resetReview()
                            }.disabled(busy)
                        }
                        if let error { NivaasaFeedback(text: error, tone: .danger) }
                        if matches.count > 1 {
                            NivaasaCard {
                                Text("Choose the visitor’s home").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                ForEach(matches) { match in
                                    Button { pass = match } label: {
                                        HStack {
                                            Text("Home \(match.unit) · \(match.name)").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                                            Spacer()
                                            NivaasaIcon(name: "chevron.right").foregroundStyle(NK.muted)
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
                        if busy {
                            ProgressView(pass == nil ? "Checking pass…" : "Recording arrival…")
                                .tint(NK.brand600).frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(20)
            }
        }
        .background(AppWash())
        .interactiveDismissDisabled(busy)
    }

    private func resetReview() {
        matches = []
        pass = nil
        verifiedCode = nil
        name = ""
        phone = ""
        plate = ""
        error = nil
    }

    private func lookup(code: String, passId: String? = nil) async {
        guard !busy else { return }
        busy = true
        resetReview()
        defer { busy = false }
        do {
            var body = ["code": code]
            if let passId { body["passId"] = passId }
            let data = try await API.request("gate/pass", token: token, body: body)
            matches = try JSONDecoder().decode(Search.self, from: data).passes
            if !matches.isEmpty { verifiedCode = code }
            if matches.count == 1 { pass = matches.first }
            if matches.isEmpty { error = "No active pass matches this code." }
        } catch { self.error = error.localizedDescription }
    }

    private func record(_ match: Match) async {
        guard !busy, let verifiedCode else { return }
        busy = true
        error = nil
        error = nil
        defer { busy = false }
        do {
            let data = try await API.request("gate/entry", token: token, body: [
                "type": match.type, "unitId": match.unitId, "code": verifiedCode, "passId": match.id,
                "name": name, "phone": phone, "vehicleNo": plate
            ])
            let arrival = try JSONDecoder().decode(Arrival.self, from: data)
            result = arrival.status == "left_at_gate" ? "Parcel recorded at the gate." : "\(arrival.name) checked in."
        } catch { self.error = error.localizedDescription }
    }
}
