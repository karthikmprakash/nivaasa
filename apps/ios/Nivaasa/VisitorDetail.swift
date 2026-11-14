import SwiftUI

// MARK: - Identity (photo → vendor logo → initials)

/// Visitor face: gate photo when captured, vendor platform logo when the visit
/// has a company, otherwise an initials avatar.
struct VisitorIdentity: View {
    let visitor: [String: Any]
    let token: String
    var size: CGFloat = 42

    @State private var image: UIImage?

    private var id: String { string(visitor, "id") }
    private var name: String { string(visitor, "name", fallback: "Visitor") }
    private var company: String { string(visitor, "company") }
    private var hasPhoto: Bool { !string(visitor, "photoUrl").isEmpty }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
                    .frame(width: size, height: size).clipShape(Circle())
            } else if hasPhoto {
                Circle().fill(NK.canvas).frame(width: size, height: size)
                    .overlay { ProgressView().scaleEffect(0.7) }
            } else if !company.isEmpty {
                PlatformLogo(name: company, size: size)
            } else {
                Text(initials(name)).font(.jakarta(13, .bold)).foregroundStyle(NK.blush700)
                    .frame(width: size, height: size).background(NK.blush100, in: Circle())
            }
        }
        .task(id: hasPhoto ? id : "static") {
            guard hasPhoto, image == nil, !id.isEmpty else { return }
            if let data = try? await API.request("visitors/\(id)/photo", token: token) {
                image = UIImage(data: data)
            }
        }
    }
}

/// Full-width gate photo for approval cards. Loads `/api/visitors/<id>/photo`
/// with the resident's bearer token (the route authorizes same-home sessions).
struct VisitorPhotoBanner: View {
    let visitor: [String: Any]
    let token: String
    @State private var image: UIImage?

    private var id: String { string(visitor, "id") }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Rectangle().fill(NK.canvas)
                    .overlay { ProgressView().scaleEffect(0.8) }
            }
        }
        .frame(height: 150)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .task(id: id) {
            guard !id.isEmpty, !string(visitor, "photoUrl").isEmpty else { return }
            if let data = try? await API.request("visitors/\(id)/photo", token: token) {
                image = UIImage(data: data)
            }
        }
        .accessibilityLabel("Visitor photo")
    }
}

// MARK: - History detail (entry & exit events)

struct VisitDetailView: View {
    let visit: [String: Any]
    let token: String
    @Environment(\.dismiss) private var dismiss

    private var status: String { string(visit, "status") }
    private var isDeliveryAtGate: Bool { status == "exited" && (visit["leaveAtGate"] as? Bool ?? false) && string(visit, "enteredAt").isEmpty }

    private var statusText: String {
        switch status {
        case "denied": return "Denied"
        case "expired": return "Expired"
        case "entered": return "Inside now"
        case "exited": return isDeliveryAtGate ? "Left at gate" : "Exited"
        default: return status.capitalized
        }
    }

    private var statusTone: NivaasaBadge.Tone {
        switch status {
        case "denied": return .danger
        case "entered": return .pink
        case "exited": return isDeliveryAtGate ? .amber : .mint
        default: return .neutral
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: "Visit details", subtitle: string(visit, "type").replacingOccurrences(of: "_", with: " ").capitalized, close: { dismiss() })
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    NivaasaCard {
                        HStack(spacing: 12) {
                            VisitorIdentity(visitor: visit, token: token, size: 52)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(string(visit, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                let company = string(visit, "company")
                                let purpose = string(visit, "purpose", fallback: string(visit, "type").replacingOccurrences(of: "_", with: " ").capitalized)
                                Text(company.isEmpty ? purpose : "\(company) · \(purpose)").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Spacer(minLength: 0)
                            NivaasaBadge(text: statusText, tone: statusTone)
                        }
                    }
                    NivaasaCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Entry & exit").font(.nivaasaSection).foregroundStyle(NK.ink)
                            Divider()
                            eventRow(icon: "door.left.hand.open", label: "Entered", value: string(visit, "enteredAt"), empty: "Not entered")
                            eventRow(icon: "arrow.right.circle", label: "Exited", value: string(visit, "exitedAt"), empty: status == "entered" ? "Still inside" : "—")
                            let vehicle = string(visit, "vehicleNo")
                            if !vehicle.isEmpty {
                                eventRow(icon: "car", label: "Vehicle", value: nil, empty: "—", plain: vehicle)
                            }
                            if !string(visit, "code").isEmpty {
                                eventRow(icon: "key", label: "Entry code", value: nil, empty: "—", plain: string(visit, "code"))
                            }
                            eventRow(icon: "clock", label: "Requested", value: string(visit, "createdAt"), empty: "—")
                        }
                    }
                    if let notes = visit["notes"] as? String, !notes.isEmpty {
                        NivaasaCard {
                            Text("Notes").font(.nivaasaSection).foregroundStyle(NK.ink)
                            Text(notes).font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                        }
                    }
                }
                .padding(16)
            }
        }
        .background(AppWash())
        .accessibilityIdentifier("visit-detail")
    }

    private func eventRow(icon: String, label: String, value: String?, empty: String, plain: String? = nil) -> some View {
        HStack(spacing: 10) {
            NivaasaIcon(name: icon, size: 16).foregroundStyle(NK.brand600)
                .frame(width: 30, height: 30).background(NK.brand50, in: RoundedRectangle(cornerRadius: 9))
            VStack(alignment: .leading, spacing: 1) {
                Text(label).font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                if let plain {
                    Text(plain).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                } else if let value, nivaasaDate(value) != nil {
                    Text("\(shortDate(value)) · \(shortTime(value))").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                } else {
                    Text(empty).font(.nivaasaBody).foregroundStyle(NK.muted)
                }
            }
        }
    }
}

// MARK: - Dedicated invite page (personal / guest passes)

struct InviteDetailView: View {
    let pass: [String: Any]
    let token: String
    let host: VisitorPassHost
    let societyAddress: String
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var showQR = false

    private var code: String { string(pass, "code") }
    private var isGuest: Bool { string(pass, "type") == "guest" }
    private var phone: String { string(pass, "phone") }

    private var inviteURL: URL? {
        var base = API.publicBase
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--isolated-api") { base = "http://localhost:3101" }
        #endif
        guard !code.isEmpty, !base.isEmpty else { return nil }
        return URL(string: base + "/invite/" + code)
    }

    private var mapsURL: URL? {
        guard !societyAddress.isEmpty else { return nil }
        return URL(string: "https://www.google.com/maps/dir/?api=1&destination=" + societyAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)
    }

    private var smsURL: URL? {
        let digits = phone.filter { $0.isNumber || $0 == "+" }
        guard !digits.isEmpty else { return nil }
        return URL(string: "sms:" + digits)
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: "Invite details", subtitle: host.community + (host.unit.isEmpty ? "" : " · Home " + host.unit), close: { dismiss() })
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    NivaasaCard(tinted: true) {
                        HStack(spacing: 12) {
                            VisitorIdentity(visitor: pass, token: token, size: 56)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(string(pass, "name")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                                Text(string(pass, "purpose", fallback: "Guest invite")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                            }
                            Spacer(minLength: 0)
                            NivaasaBadge(text: string(pass, "status").capitalized, tone: .mint)
                        }
                    }
                    NivaasaCard {
                        Text("ENTRY CODE").font(.nivaasaEyebrow).foregroundStyle(NK.muted)
                        Text(code).font(.jakarta(40, .bold)).tracking(4).foregroundStyle(NK.ink).monospacedDigit()
                        NivaasaCopyButton(value: code, label: "Copy entry code")
                        Divider()
                        HStack {
                            Text("Valid").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            Spacer()
                            Text(passValidity(pass)).font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                        }
                        if isGuest {
                            Text("Personal invites allow multiple entries within this window — your guest can come and go until the pass ends.")
                                .font(.nivaasaCaption).foregroundStyle(NK.mint600)
                        }
                    }
                    if !string(pass, "enteredAt").isEmpty || !string(pass, "exitedAt").isEmpty {
                        NivaasaCard {
                            Text("Last visit").font(.nivaasaSection).foregroundStyle(NK.ink)
                            Divider()
                            if !string(pass, "enteredAt").isEmpty {
                                Text("Entered \(shortDate(pass["enteredAt"] as? String)) · \(shortTime(pass["enteredAt"] as? String))")
                                    .font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                            }
                            if !string(pass, "exitedAt").isEmpty {
                                Text("Exited \(shortDate(pass["exitedAt"] as? String)) · \(shortTime(pass["exitedAt"] as? String))")
                                    .font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                            } else if string(pass, "status") == "entered" {
                                Text("Currently inside").font(.nivaasaCaptionMedium).foregroundStyle(NK.mint600)
                            }
                        }
                    }
                    if let url = inviteURL {
                        ShareLink(item: url, subject: Text("Your Nivaasa invite"), message: Text("You're invited to \(host.community). Entry code \(code). Open for directions and details.")) {
                            HStack(spacing: 8) {
                                NivaasaIcon(name: "rectangle.portrait.and.arrow.right", size: 16)
                                Text("Share invite page").font(.nivaasaBodySemibold)
                            }
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .foregroundStyle(.white)
                            .background(NK.brand600, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
                        }
                        .buttonStyle(NivaasaPressStyle())
                        .simultaneousGesture(TapGesture().onEnded { Haptics.shared.play(.tap) })
                        Text("Opens a guest page with the entry code, photo and one-tap directions and messaging.")
                            .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }
                    if let mapsURL {
                        PrimaryButton(title: "Get directions to the apartment", icon: "map") {
                            Haptics.shared.play(.tap)
                            openURL(mapsURL)
                        }
                    }
                    if let smsURL {
                        OutlineButton(title: "Message guest", icon: "message") {
                            Haptics.shared.play(.tap)
                            openURL(smsURL)
                        }
                    }
                    if AccessPassCode(id: string(pass, "id"), code: code) != nil {
                        OutlineButton(title: "Show QR pass", icon: "qrcode.viewfinder") {
                            showQR = true
                            Haptics.shared.play(.selection)
                        }
                    }
                }
                .padding(16)
            }
        }
        .background(AppWash())
        .sheet(isPresented: $showQR) {
            if let qr = AccessPassCode(id: string(pass, "id"), code: code) {
                AccessPassPreview(artwork: VisitorPassArtwork(
                    pass: qr,
                    host: host.recordedCreator(string(pass, "creatorName")),
                    visitor: string(pass, "name"),
                    type: string(pass, "type").replacingOccurrences(of: "_", with: " ").capitalized,
                    from: nivaasaDate(pass["validFrom"] as? String),
                    to: nivaasaDate(pass["validTo"] as? String),
                    daily: pass["recurringCab"] as? Bool ?? false,
                    leaveAtGate: pass["leaveAtGate"] as? Bool ?? false
                ))
            }
        }
        .accessibilityIdentifier("invite-detail")
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
}
