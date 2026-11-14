import CoreImage.CIFilterBuiltins
import SwiftUI
import UniformTypeIdentifiers

struct AccessPassCode: Equatable {
    let id: String
    let code: String

    init?(id: String, code: String) {
        guard UUID(uuidString: id) != nil,
              code.count == 6, code.allSatisfy({ $0.isASCII && $0.isNumber }) else { return nil }
        self.id = id
        self.code = code
    }

    init?(payload: String) {
        let parts = payload.split(separator: ":", omittingEmptySubsequences: false)
        guard parts.count == 5, parts[0] == "nivaasa", parts[1] == "access", parts[2] == "1" else { return nil }
        self.init(id: String(parts[3]), code: String(parts[4]))
    }

    var payload: String { "nivaasa:access:1:\(id):\(code)" }
}

struct VisitorPassHost: Equatable {
    let community: String
    let unit: String
    let creator: String

    init(account: Account, session: Session) {
        community = session.society.name
        unit = session.unit?.number ?? ""
        creator = account.user.name
    }

    func recordedCreator(_ name: String) -> VisitorPassHost {
        VisitorPassHost(community: community, unit: unit, creator: name.isEmpty ? "Community host" : name)
    }

    private init(community: String, unit: String, creator: String) {
        self.community = community
        self.unit = unit
        self.creator = creator
    }
}

struct VisitorPassArtwork: Equatable {
    let pass: AccessPassCode
    let host: VisitorPassHost
    let visitor: String
    let type: String
    let from: Date?
    let to: Date?
    var daily = false
    var leaveAtGate = false

    var validity: String {
        let start = from.map(formattedDate)
        let end = to.map(formattedDate)
        if let start, let end { return start == end ? start : "\(start) – \(end)" }
        if let start { return "From \(start)" }
        if let end { return "Through \(end)" }
        return "Check with your host"
    }

    var instructions: String {
        leaveAtGate
            ? "Show this QR to security at the gate when dropping off the parcel. If it won’t scan, give them the entry code."
            : "Show this QR to security when you arrive at the gate. If it won’t scan, give them the entry code."
    }

    private func formattedDate(_ date: Date) -> String {
        var style = Date.FormatStyle.dateTime.day().month(.abbreviated).year().locale(Locale(identifier: "en_IN"))
        style.timeZone = communityCalendar.timeZone
        return date.formatted(style)
    }
}

struct AccessPassPreview: View {
    let artwork: VisitorPassArtwork
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    AccessQRCard(artwork: artwork)
                    NivaasaCopyButton(value: artwork.pass.code, label: "Copy entry code")
                }
                .padding(20)
                .frame(maxWidth: 480)
                .frame(maxWidth: .infinity)
            }
            .background(AppWash())
            .navigationTitle("Visitor pass")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}

struct AccessQRCard: View {
    let artwork: VisitorPassArtwork
    @State private var export: PassImage?
    private static let context = CIContext()

    private struct PassImage: Transferable {
        let data: Data

        static var transferRepresentation: some TransferRepresentation {
            DataRepresentation(exportedContentType: .png) { image in image.data }
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            if let export, let image = UIImage(data: export.data) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 420)
                    .accessibilityLabel("Visitor pass QR code for \(artwork.visitor)")
                    .accessibilityValue("\(artwork.host.community), Home \(artwork.host.unit). Invited by \(artwork.host.creator). Valid \(artwork.validity), India Standard Time. Entry code \(artwork.pass.code). \(artwork.instructions)")
                    .accessibilityIdentifier("visitor-pass-qr")
                ShareLink(item: export, message: Text("Show this Nivaasa visitor pass at the gate."),
                          preview: SharePreview("Nivaasa visitor pass", image: Image(uiImage: image))) {
                    Label("Share QR pass", systemImage: "square.and.arrow.up")
                        .font(.nivaasaBodySemibold)
                        .frame(maxWidth: .infinity, minHeight: 48)
                }
            } else {
                Text("Entry code \(artwork.pass.code)").font(.nivaasaBodySemibold)
            }
        }
        .frame(maxWidth: .infinity)
        .task(id: artwork) { export = render() }
    }

    @MainActor private func render() -> PassImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(artwork.pass.payload.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        let bounds = output.extent.insetBy(dx: -4, dy: -4)
        let white = CIImage(color: CIColor.white).cropped(to: bounds)
        let padded = output.composited(over: white).transformed(by: CGAffineTransform(scaleX: 18, y: 18))
        guard let bitmap = Self.context.createCGImage(padded, from: padded.extent) else { return nil }
        let renderer = ImageRenderer(content: PassImageLayout(artwork: artwork, qr: UIImage(cgImage: bitmap))
            .environment(\.dynamicTypeSize, .large)
            .environment(\.colorScheme, .light))
        renderer.scale = 3
        guard let data = renderer.uiImage?.pngData() else { return nil }
        return PassImage(data: data)
    }
}

private struct PassImageLayout: View {
    let artwork: VisitorPassArtwork
    let qr: UIImage

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(artwork.type.uppercased()).font(.jakarta(11, .bold)).tracking(1.7).foregroundStyle(NK.blush700)
                    Text(artwork.visitor).font(.jakarta(26, .bold)).foregroundStyle(NK.ink)
                }
                VStack(alignment: .leading, spacing: 12) {
                    detail("INVITED BY", artwork.host.creator)
                    detail("VALIDITY · IST", artwork.validity)
                    Text(artwork.daily ? "One pickup per day" : "One-time entry")
                        .font(.jakarta(12, .semibold)).foregroundStyle(NK.brand700)
                        .padding(.horizontal, 9).padding(.vertical, 5)
                        .background(NK.brand100, in: Capsule())
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(NK.brand50, in: RoundedRectangle(cornerRadius: 14))

                VStack(spacing: 3) {
                    Image(uiImage: qr)
                        .interpolation(.none).resizable().scaledToFit()
                        .frame(width: 208, height: 208)
                    Text("ENTRY CODE").font(.jakarta(11, .bold)).tracking(1.8).foregroundStyle(NK.muted)
                    Text(artwork.pass.code).font(.jakarta(28, .bold).monospacedDigit()).tracking(4).foregroundStyle(NK.ink)
                }
                .frame(maxWidth: .infinity)
                .padding(.bottom, 12)
                .background(.white, in: RoundedRectangle(cornerRadius: 16))
                .overlay { RoundedRectangle(cornerRadius: 16).strokeBorder(NK.line) }

                VStack(alignment: .leading, spacing: 5) {
                    Text("At the gate").font(.jakarta(15, .bold)).foregroundStyle(NK.ink)
                    Text(artwork.instructions).font(.jakarta(13)).foregroundStyle(NK.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(NK.blush50, in: RoundedRectangle(cornerRadius: 14))
            }
            .padding(22)
        }
        .frame(width: 420)
        .background(Color.white)
        .fixedSize(horizontal: false, vertical: true)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 9) {
                Image("NivaasaMark").resizable().scaledToFit().frame(width: 28, height: 28)
                    .padding(3).background(.white, in: RoundedRectangle(cornerRadius: 8))
                Text("Nivaasa").font(.jakarta(17, .bold)).foregroundStyle(.white)
                Spacer()
                Text("VISITOR PASS").font(.jakarta(10, .bold)).tracking(1.6).foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(artwork.host.community).font(.jakarta(25, .bold)).foregroundStyle(.white)
                if !artwork.host.unit.isEmpty {
                    Text("Home " + artwork.host.unit).font(.jakarta(14, .semibold)).foregroundStyle(.white)
                }
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient(colors: [NK.brand800, NK.brand600], startPoint: .topLeading, endPoint: .bottomTrailing))
    }

    private func detail(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.jakarta(10, .bold)).tracking(1.2).foregroundStyle(NK.brand700)
            Text(value).font(.jakarta(15, .semibold)).foregroundStyle(NK.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
