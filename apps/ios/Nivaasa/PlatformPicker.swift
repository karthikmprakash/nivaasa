import SwiftUI

enum VisitorPassType: String, CaseIterable, Identifiable {
    case guest
    case delivery
    case cab
    case vendor
    case dailyHelp = "daily_help"

    var id: String { rawValue }
    var title: String {
        switch self {
        case .guest: "Guest"
        case .delivery: "Delivery"
        case .cab: "Cab"
        case .vendor: "Vendor"
        case .dailyHelp: "Daily help"
        }
    }
    var subtitle: String {
        switch self {
        case .guest: "Friends & family"
        case .delivery: "Food & parcels"
        case .cab: "Pickup & drop-off"
        case .vendor: "Repairs & services"
        case .dailyHelp: "Works at your home"
        }
    }
    var icon: String {
        switch self {
        case .guest: "person.2"
        case .delivery: "shippingbox"
        case .cab: "car"
        case .vendor: "wrench.and.screwdriver"
        case .dailyHelp: "sparkles"
        }
    }
    var tint: Color {
        switch self {
        case .guest: NK.brand600
        case .delivery: NK.blush500
        case .cab: NK.mint600
        case .vendor: NK.amberInk
        case .dailyHelp: Color(hex: 0x6A54C8)
        }
    }
    var softTint: Color {
        switch self {
        case .guest: NK.brand50
        case .delivery: NK.blush50
        case .cab: NK.mint50
        case .vendor: NK.amberSoft
        case .dailyHelp: Color(hex: 0xF2EFFC)
        }
    }
}

struct VisitorPlatform: Identifiable {
    let name: String
    let key: String
    let category: String
    var id: String { key }
    static let delivery: [VisitorPlatform] = [
        .init(name: "Swiggy", key: "swiggy", category: "Food"),
        .init(name: "Zomato", key: "zomato", category: "Food"),
        .init(name: "Instamart", key: "instamart", category: "Groceries"),
        .init(name: "Blinkit", key: "blinkit", category: "Groceries"),
        .init(name: "Zepto", key: "zepto", category: "Groceries"),
        .init(name: "bigbasket", key: "bigbasket", category: "Groceries"),
        .init(name: "Amazon", key: "amazon", category: "Shopping"),
        .init(name: "Flipkart", key: "flipkart", category: "Shopping"),
        .init(name: "Meesho", key: "meesho", category: "Shopping"),
        .init(name: "Myntra", key: "myntra", category: "Shopping"),
        .init(name: "Delhivery", key: "delhivery", category: "Courier"),
        .init(name: "Blue Dart", key: "bluedart", category: "Courier"),
        .init(name: "DTDC", key: "dtdc", category: "Courier"),
    ]
    static let cabs: [VisitorPlatform] = [
        .init(name: "Uber", key: "uber", category: "Cab & auto"),
        .init(name: "Ola", key: "ola", category: "Cab & auto"),
        .init(name: "Rapido", key: "rapido", category: "Cab & auto"),
        .init(name: "Namma Yatri", key: "nammayatri", category: "Cab & auto"),
    ]
    static let all = delivery + cabs
}

struct PlatformLogo: View {
    let name: String
    var size: CGFloat = 42

    var body: some View {
        Group {
            if let platform = VisitorPlatform.all.first(where: { $0.name == name }) {
                Image("Platform-" + platform.key).resizable().scaledToFit().padding(size * 0.16)
            } else {
                NivaasaIcon(name: "building.2", size: size * 0.48).foregroundStyle(NK.muted)
            }
        }
        .frame(width: size, height: size)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
        .overlay { RoundedRectangle(cornerRadius: 11, style: .continuous).strokeBorder(NK.line) }
        .accessibilityHidden(true)
    }
}

struct VisitorPlatformPicker: View {
    let type: VisitorPassType
    @Binding var selection: String
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var custom = ""
    @State private var adding = false

    private var catalog: [VisitorPlatform] { type == .cab ? VisitorPlatform.cabs : VisitorPlatform.delivery }
    private var platforms: [VisitorPlatform] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return catalog.filter { term.isEmpty || ($0.name + " " + $0.category).localizedCaseInsensitiveContains(term) }
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(
                title: type == .cab ? "Choose cab service" : "Choose delivery platform",
                subtitle: "Choose a provider or add another by name.",
                closeIdentifier: "platform-picker-close",
                close: { dismiss() }
            )
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 8) {
                        NivaasaIcon(name: "magnifyingglass").foregroundStyle(NK.muted)
                        TextField("Search name or category", text: $query)
                            .font(.nivaasaBody).foregroundStyle(NK.ink)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                            .accessibilityIdentifier("platform-search")
                    }
                    .padding(.horizontal, 12).frame(height: 48)
                    .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                    .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.lineStrong) }

                    if adding {
                        NivaasaCard {
                            Text("Add another platform").font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                            NivaasaInput(label: "Platform or company name", text: $custom, placeholder: "e.g. Local grocery store")
                                .onChange(of: custom) { _, value in custom = String(value.prefix(100)) }
                            HStack(spacing: 8) {
                                OutlineButton(title: "Cancel") { adding = false }
                                PrimaryButton(title: "Use this platform", disabled: custom.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) {
                                    choose(custom.trimmingCharacters(in: .whitespacesAndNewlines))
                                }
                            }
                        }
                    } else {
                        OutlineButton(title: "Add another platform", icon: "plus") {
                            custom = query.isEmpty && !catalog.contains(where: { $0.name == selection }) ? selection : query
                            adding = true
                        }
                    }

                    if !selection.isEmpty {
                        NivaasaTextButton(title: "Clear selection") { choose("") }
                    }

                    HStack {
                        Text(catalog.first?.category ?? "Platforms").font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
                        Spacer()
                        Text("\(platforms.count)").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    }

                    if platforms.isEmpty && !adding {
                        EmptyPanel(icon: "building.2", title: "No matching platforms", detail: "Try a shorter search, or add the provider by name.")
                    }

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 155), alignment: .top)], spacing: 10) {
                        ForEach(platforms) { platform in
                            Button { choose(platform.name) } label: {
                                HStack(spacing: 10) {
                                    PlatformLogo(name: platform.name, size: 40)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(platform.name).font(.nivaasaBodySemibold).foregroundStyle(NK.ink).lineLimit(1)
                                        Text(platform.category).font(.nivaasaCaption).foregroundStyle(NK.muted).lineLimit(1)
                                    }
                                    Spacer(minLength: 0)
                                    if selection == platform.name {
                                        NivaasaIcon(name: "checkmark.circle.fill", size: 18).foregroundStyle(NK.brand600)
                                    }
                                }
                                .padding(10)
                                .frame(maxWidth: .infinity, minHeight: 62, alignment: .leading)
                                .background(selection == platform.name ? NK.brand50 : NK.surface, in: RoundedRectangle(cornerRadius: 12))
                                .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(selection == platform.name ? NK.brand600 : NK.line) }
                            }
                            .buttonStyle(NivaasaPressStyle())
                            .accessibilityLabel(platform.name)
                            .accessibilityIdentifier("platform-" + platform.key)
                            .accessibilityAddTraits(selection == platform.name ? .isSelected : [])
                        }
                    }
                }
                .padding(20)
            }
        }
        .background(AppWash())
    }

    private func choose(_ value: String) {
        selection = value
        dismiss()
    }
}

struct VisitorTypeCards: View {
    @Binding var selection: VisitorPassType

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Who are you expecting?").font(.nivaasaSection).foregroundStyle(NK.ink)
                Text("Choose the kind of visit. The guard sees this before anyone reaches your door.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                ForEach([VisitorPassType.guest, .delivery, .cab, .vendor]) { type in
                    card(type)
                }
            }
            card(.dailyHelp)
        }
    }

    private func card(_ type: VisitorPassType) -> some View {
        let active = selection == type
        return Button { selection = type } label: {
            HStack(spacing: 11) {
                NivaasaIcon(name: type.icon, size: 21)
                    .foregroundStyle(active ? .white : type.tint)
                    .frame(width: 42, height: 42)
                    .background(active ? type.tint : type.softTint, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(type.title).font(.nivaasaBodySemibold).foregroundStyle(active ? NK.brand700 : NK.ink)
                    Text(type.subtitle).font(.nivaasaCaption).foregroundStyle(active ? NK.brand700.opacity(0.72) : NK.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                if active {
                    NivaasaIcon(name: "checkmark.circle.fill", size: 18).foregroundStyle(NK.brand600)
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, minHeight: 66, alignment: .leading)
            .background(active ? NK.brand50 : NK.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(active ? NK.brand500 : NK.line, lineWidth: active ? 1.5 : 1) }
            .contentShape(Rectangle())
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityLabel(type.title)
        .accessibilityIdentifier("visitor-type-" + type.rawValue)
        .accessibilityAddTraits(active ? .isSelected : [])
    }
}
