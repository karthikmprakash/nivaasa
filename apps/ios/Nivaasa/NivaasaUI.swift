import SwiftUI

// MARK: - Tokens

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: alpha
        )
    }
}

enum NK {
    static let canvas = Color(hex: 0xF5F6F8)
    static let surface = Color.white
    static let ink = Color(hex: 0x131A2A)
    static let inkSoft = Color(hex: 0x4B566C)
    static let muted = Color(hex: 0x626E82)
    static let line = Color(hex: 0xE3E7EE)
    static let lineStrong = Color(hex: 0xCBD2DF)

    static let brand50 = Color(hex: 0xF2F5FF)
    static let brand100 = Color(hex: 0xE7EDFF)
    static let brand200 = Color(hex: 0xCFDBFF)
    static let brand500 = Color(hex: 0x4F70E8)
    static let brand600 = Color(hex: 0x3155D8)
    static let brand700 = Color(hex: 0x2643B8)
    static let brand800 = Color(hex: 0x223B94)

    static let blush50 = Color(hex: 0xFFF5F8)
    static let blush100 = Color(hex: 0xFDEAF0)
    static let blush200 = Color(hex: 0xFBD2DF)
    static let blush300 = Color(hex: 0xF6ABC4)
    static let blush400 = Color(hex: 0xEF7FA4)
    static let blush500 = Color(hex: 0xE55D8B)
    static let blush700 = Color(hex: 0xA82E5B)

    static let mint50 = Color(hex: 0xEEFAF4)
    static let mint600 = Color(hex: 0x18764E)
    static let amberSoft = Color(hex: 0xFFF6E2)
    static let amberInk = Color(hex: 0x87530E)
    static let danger = Color(hex: 0xD94A5A)
    static let dangerSoft = Color(hex: 0xFDECED)
    static let dangerInk = Color(hex: 0xC43D4D)
}

enum NKRadius {
    static let control: CGFloat = 10
    static let card: CGFloat = 16
    static let overlay: CGFloat = 20
}

extension Font {
    static func jakarta(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .bold, .heavy, .black: name = "PlusJakartaSans-Bold"
        case .semibold: name = "PlusJakartaSans-SemiBold"
        case .medium: name = "PlusJakartaSans-Medium"
        case .light, .thin, .ultraLight: name = "PlusJakartaSans-Regular"
        default: name = "PlusJakartaSans-Regular"
        }
        return .custom(name, size: size)
    }

    static let nivaasaEyebrow = jakarta(11, .bold)
    static let nivaasaCaption = jakarta(13)
    static let nivaasaCaptionMedium = jakarta(13, .medium)
    static let nivaasaBody = jakarta(15)
    static let nivaasaBodyMedium = jakarta(15, .medium)
    static let nivaasaBodySemibold = jakarta(15, .semibold)
    static let nivaasaSection = jakarta(17, .semibold)
    static let nivaasaTitle = jakarta(29, .semibold)
    static let nivaasaPageTitle = jakarta(26, .semibold)
    static let nivaasaDisplay = jakarta(42, .semibold)
}

func eyebrowStyle(_ text: String) -> some View {
    Text(text.uppercased())
        .font(.nivaasaEyebrow)
        .tracking(1.6)
        .foregroundStyle(NK.blush700)
}

// MARK: - Dates and money

private let nivaasaISO: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
}()

private let nivaasaDay: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(identifier: "Asia/Kolkata")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
}()

func nivaasaDate(_ value: String?) -> Date? {
    guard let value, !value.isEmpty else { return nil }
    if value.count == 10 { return nivaasaDay.date(from: value) }
    return nivaasaISO.date(from: value) ?? ISO8601DateFormatter().date(from: value)
}

func relativeDate(_ value: String?) -> String {
    guard let date = nivaasaDate(value) else { return "" }
    let seconds = Date().timeIntervalSince(date)
    if seconds < 90 { return "just now" }
    if seconds < 3600 { return "\(Int(seconds / 60))m ago" }
    if seconds < 86_400 { return "\(Int(seconds / 3600))h ago" }
    if seconds < 604_800 { return "\(Int(seconds / 86_400))d ago" }
    return date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "en_IN")))
}

func shortDate(_ value: String?, month: Bool = true) -> String {
    guard let date = nivaasaDate(value) else { return "—" }
    return month
        ? date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "en_IN")))
        : date.formatted(.dateTime.day().locale(Locale(identifier: "en_IN")))
}

func shortTime(_ value: String?) -> String {
    guard let date = nivaasaDate(value) else { return "" }
    return date.formatted(.dateTime.hour().minute().locale(Locale(identifier: "en_IN")))
}

func longDate(_ value: String?) -> String {
    guard let date = nivaasaDate(value) else { return "—" }
    return date.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "en_IN")))
}

func money(_ paise: Double) -> String {
    (paise / 100).formatted(.currency(code: "INR").precision(.fractionLength(0)).locale(Locale(identifier: "en_IN")))
}

func string(_ record: [String: Any], _ key: String, fallback: String = "") -> String {
    if let value = record[key] as? String, !value.isEmpty { return value }
    if let value = record[key] as? NSNumber { return value.stringValue }
    return fallback
}

func number(_ record: [String: Any], _ key: String) -> Double {
    if let value = record[key] as? NSNumber { return value.doubleValue }
    if let value = record[key] as? String { return Double(value) ?? 0 }
    return 0
}

func rows(_ value: Any?) -> [[String: Any]] {
    (value as? [[String: Any]]) ?? []
}

func records(_ value: Any?, key: String) -> [[String: Any]] {
    rows((value as? [String: Any])?[key])
}

func initials(_ name: String) -> String {
    name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined()
}

// MARK: - Surfaces

struct AppWash: View {
    var body: some View {
        ZStack {
            NK.canvas
            RadialGradient(colors: [NK.blush400.opacity(0.12), .clear], center: .topTrailing, startRadius: 0, endRadius: 420)
            RadialGradient(colors: [NK.brand500.opacity(0.07), .clear], center: .topLeading, startRadius: 0, endRadius: 360)
        }
        .ignoresSafeArea()
    }
}

struct NivaasaCard<Content: View>: View {
    var tinted = false
    var padding: CGFloat = 20
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(padding)
            .background {
                RoundedRectangle(cornerRadius: NKRadius.card, style: .continuous)
                    .fill(NK.surface)
                if tinted {
                    RoundedRectangle(cornerRadius: NKRadius.card, style: .continuous)
                        .fill(LinearGradient(colors: [NK.brand50, NK.surface, NK.blush50], startPoint: .topLeading, endPoint: .bottomTrailing))
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: NKRadius.card, style: .continuous)
                    .strokeBorder(tinted ? NK.blush200.opacity(0.8) : NK.line, lineWidth: 1)
            }
    }
}

struct SectionHeading: View {
    let title: String
    var action: String?
    var run: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text(title).font(.nivaasaSection).foregroundStyle(NK.ink)
            Spacer(minLength: 4)
            if let action, let run {
                Button(action: run) {
                    HStack(spacing: 2) {
                        Text(action).font(.nivaasaCaptionMedium)
                        NivaasaIcon(name: "chevron.right", size: 16)
                    }
                    .foregroundStyle(NK.brand700)
                    .frame(minHeight: 36)
                }
                .buttonStyle(NivaasaPressStyle())
            }
        }
    }
}

struct NivaasaBadge: View {
    enum Tone { case blue, pink, amber, mint, neutral, danger }
    let text: String
    var tone: Tone = .neutral
    var dot = false

    private var colors: (Color, Color) {
        switch tone {
        case .blue: (NK.brand50, NK.brand700)
        case .pink: (NK.blush100, NK.blush700)
        case .amber: (NK.amberSoft, NK.amberInk)
        case .mint: (NK.mint50, NK.mint600)
        case .danger: (NK.dangerSoft, NK.dangerInk)
        case .neutral: (NK.canvas, NK.muted)
        }
    }

    var body: some View {
        HStack(spacing: 5) {
            if dot { Circle().fill(colors.1).frame(width: 5, height: 5) }
            Text(text).font(.nivaasaCaptionMedium)
        }
        .foregroundStyle(colors.1)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(colors.0, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
    }
}

struct PrimaryButton: View {
    let title: String
    var icon: String? = nil
    var disabled = false
    let run: () -> Void

    var body: some View {
        Button(action: run) {
            HStack(spacing: 8) {
                if let icon { NivaasaIcon(name: icon, size: 16) }
                Text(title).font(.nivaasaBodySemibold)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .foregroundStyle(.white)
            .background(NK.brand600, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
        }
        .buttonStyle(NivaasaPressStyle())
        .disabled(disabled)
        .opacity(disabled ? 0.55 : 1)
    }
}

struct SoftButton: View {
    let title: String
    var icon: String? = nil
    var disabled = false
    let run: () -> Void

    var body: some View {
        Button(action: run) {
            HStack(spacing: 8) {
                if let icon { NivaasaIcon(name: icon, size: 16) }
                Text(title).font(.nivaasaBodySemibold)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .foregroundStyle(NK.dangerInk)
            .background(NK.dangerSoft, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
        }
        .buttonStyle(NivaasaPressStyle())
        .disabled(disabled)
        .opacity(disabled ? 0.55 : 1)
    }
}

struct OutlineButton: View {
    let title: String
    var icon: String? = nil
    var disabled = false
    let run: () -> Void

    var body: some View {
        Button(action: run) {
            HStack(spacing: 8) {
                if let icon { NivaasaIcon(name: icon, size: 16) }
                Text(title).font(.nivaasaBodySemibold)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .foregroundStyle(NK.inkSoft)
            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous).strokeBorder(NK.lineStrong, lineWidth: 1) }
        }
        .buttonStyle(NivaasaPressStyle())
        .disabled(disabled)
        .opacity(disabled ? 0.55 : 1)
    }
}

struct NivaasaAvatar: View {
    let name: String
    var color: Color = NK.brand600
    var size: CGFloat = 40

    private func readableForeground(_ color: Color) -> Color {
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        UIColor(color).getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        let luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        return luminance > 0.62 ? NK.ink : .white
    }

    var body: some View {
        Text(initials(name))
            .font(.jakarta(size * 0.3, .bold))
            .foregroundStyle(readableForeground(color))
            .frame(width: size, height: size)
            .background(color, in: Circle())
    }
}

struct StatCard: View {
    let label: String
    let value: String
    var hint: String?
    var tone: Tone = .neutral
    var icon: String?

    enum Tone { case neutral, blue, pink, green, amber }

    private var background: AnyShapeStyle {
        switch tone {
        case .pink: AnyShapeStyle(LinearGradient(colors: [NK.blush50, NK.surface, NK.brand50.opacity(0.5)], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .blue: AnyShapeStyle(NK.brand50.opacity(0.6))
        case .green: AnyShapeStyle(NK.mint50.opacity(0.4))
        case .amber: AnyShapeStyle(NK.amberSoft.opacity(0.6))
        default: AnyShapeStyle(NK.surface)
        }
    }
    private var border: Color {
        switch tone {
        case .blue: NK.brand100
        case .pink: NK.blush200
        case .green: NK.mint600.opacity(0.15)
        case .amber: NK.amberInk.opacity(0.15)
        case .neutral: NK.line
        }
    }
    private var iconColor: Color {
        switch tone {
        case .blue: NK.brand500
        case .pink: NK.blush500
        case .green: NK.mint600
        case .amber: NK.amberInk
        case .neutral: NK.muted
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                Text(label).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                Spacer(minLength: 4)
                if let icon { NivaasaIcon(name: icon).foregroundStyle(iconColor) }
            }
            Text(value).font(.jakarta(24, .semibold)).tracking(-0.72).foregroundStyle(NK.ink).monospacedDigit()
            if let hint { Text(hint).font(.nivaasaCaption).foregroundStyle(NK.inkSoft).lineLimit(2) }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay { RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(border, lineWidth: 1) }
        .overlay(alignment: .topTrailing) {
            if tone == .pink {
                Circle().fill(NK.blush200.opacity(0.55)).frame(width: 72, height: 72).blur(radius: 22).offset(x: 12, y: -18)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct QuickActionTile: View {
    let title: String
    let icon: String
    let run: () -> Void

    var body: some View {
        Button(action: run) {
            HStack(spacing: 8) {
                NivaasaIcon(name: icon, size: 18).foregroundStyle(NK.muted)
                Text(title).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft).fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .background(NK.canvas, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
        }
        .buttonStyle(NivaasaPressStyle())
    }
}

// MARK: - Gate entry helpers

/// Color-coded type badge used across gate screens (cab / delivery / guest …).
func typeBadge(_ type: String) -> NivaasaBadge {
    let label = type.replacingOccurrences(of: "_", with: " ").capitalized
    switch type {
    case "delivery": return NivaasaBadge(text: label, tone: .blue)
    case "cab": return NivaasaBadge(text: label, tone: .amber)
    case "vendor": return NivaasaBadge(text: label, tone: .mint)
    case "guest": return NivaasaBadge(text: label, tone: .pink)
    default: return NivaasaBadge(text: label, tone: .neutral)
    }
}

/// Live "Xh Ym inside" timer that re-renders on a timeline.
struct ElapsedSince: View {
    let from: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 30)) { context in
            Text(elapsedLabel(from, context.date))
                .font(.nivaasaCaptionMedium)
                .foregroundStyle(NK.mint600)
        }
    }

    private func elapsedLabel(_ from: Date, _ now: Date) -> String {
        let seconds = max(0, Int(now.timeIntervalSince(from)))
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        if hours > 0 { return "\(hours)h \(minutes)m inside" }
        if minutes > 0 { return "\(minutes)m inside" }
        return "\(seconds)s inside"
    }
}

// MARK: - Icon tiles

/// Lucide icon key for a helpdesk category.
func categoryIcon(_ category: String) -> String {
    switch category.lowercased() {
    case "plumbing": return "droplets"
    case "electrical": return "lightbulb"
    case "lifts": return "arrow.up.down"
    case "housekeeping": return "sparkles"
    case "security": return "shield.check"
    case "parking": return "package"
    case "common areas": return "dumbbell"
    case "intercom": return "lock"
    case "internet": return "wifi"
    default: return "wrench.and.screwdriver"
    }
}

/// Deterministic soft tint per name, so each amenity/category gets a stable color.
func iconTint(_ name: String) -> (bg: Color, fg: Color) {
    let palette: [(Color, Color)] = [
        (NK.brand50, NK.brand600),
        (NK.blush100, NK.blush700),
        (NK.mint50, NK.mint600),
        (Color(hex: 0xFFF4E0), NK.amberInk),
        (Color(hex: 0xF3EFFF), Color(hex: 0x6A54C8)),
    ]
    let hash = name.unicodeScalars.reduce(0) { $0 &+ Int($1.value) }
    return palette[abs(hash) % palette.count]
}

/// Logo-style tile: tinted icon tile + label (+ optional badge). Used for
/// amenity grids and helpdesk quick categories instead of big per-item cards.
struct IconTile: View {
    let icon: String
    let title: String
    var subtitle: String?
    var badge: String?
    var badgeTone: NivaasaBadge.Tone = .neutral
    var tintedBy: String? = nil
    var identifier: String? = nil
    let action: () -> Void

    var body: some View {
        let tint = iconTint(tintedBy ?? title)
        Button(action: action) {
            VStack(spacing: 7) {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(tint.bg)
                    .frame(width: 62, height: 62)
                    .overlay {
                        NivaasaIcon(name: icon, size: 30).foregroundStyle(tint.fg)
                    }
                Text(title)
                    .font(.jakarta(11.5, .semibold)).foregroundStyle(NK.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(minHeight: 28)
                if let subtitle {
                    Text(subtitle).font(.jakarta(10, .medium)).foregroundStyle(NK.muted).lineLimit(1)
                }
                if let badge {
                    NivaasaBadge(text: badge, tone: badgeTone).scaleEffect(0.9)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .padding(.horizontal, 4)
            .background(NK.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(NK.line) }
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityIdentifier(identifier ?? "icon-tile-" + title.lowercased().replacingOccurrences(of: " ", with: "-"))
    }
}

// MARK: - Toasts

struct ToastItem: Identifiable, Equatable {
    enum Tone { case success, error, info }
    let id = UUID()
    let message: String
    let tone: Tone

    init(_ message: String, _ tone: Tone = .info) {
        self.message = message
        self.tone = tone
    }
}

/// Top banner toast: green check for success, red shield for failure.
/// Slides down, auto-dismisses, and respects Reduce Motion.
struct ToastOverlay: ViewModifier {
    @Binding var toast: ToastItem?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        ZStack(alignment: .top) {
            content
            if let toast {
                HStack(spacing: 10) {
                    NivaasaIcon(name: toast.tone == .success ? "checkmark.circle.fill" : toast.tone == .error ? "exclamationmark.shield" : "bell", size: 18)
                        .foregroundStyle(toast.tone == .success ? NK.mint600 : toast.tone == .error ? NK.danger : NK.brand600)
                    Text(toast.message).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                        .lineLimit(2)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 48)
                .background(NK.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(toast.tone == .success ? NK.mint600.opacity(0.45) : toast.tone == .error ? NK.danger.opacity(0.45) : NK.line, lineWidth: 1)
                }
                .shadow(color: NK.ink.opacity(0.14), radius: 16, y: 8)
                .padding(.top, 72)
                .padding(.horizontal, 16)
                .transition(.move(edge: .top).combined(with: .opacity))
                .id(toast.id)
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.8) {
                        withAnimation(NivaasaMotion.spring(reduceMotion)) { self.toast = nil }
                    }
                }
            }
        }
        .animation(NivaasaMotion.spring(reduceMotion), value: toast?.id)
    }
}

extension View {
    func nivaasaToast(_ toast: Binding<ToastItem?>) -> some View {
        modifier(ToastOverlay(toast: toast))
    }
}

/// Single horizontal row of circular icon actions with optional count badges.
struct IconActionRow: View {
    struct Item: Identifiable {
        let id = UUID()
        let title: String
        let icon: String
        var count: Int?
        let run: () -> Void

        init(title: String, icon: String, count: Int? = nil, run: @escaping () -> Void) {
            self.title = title
            self.icon = icon
            self.count = count
            self.run = run
        }
    }

    let items: [Item]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(items) { item in
                    Button(action: item.run) {
                        VStack(spacing: 6) {
                            ZStack(alignment: .topTrailing) {
                                Circle()
                                    .fill(NK.brand50)
                                    .frame(width: 46, height: 46)
                                    .overlay {
                                        NivaasaIcon(name: item.icon, size: 20).foregroundStyle(NK.brand600)
                                    }
                                if let count = item.count, count > 0 {
                                    Text("\(count)")
                                        .font(.jakarta(10, .bold)).foregroundStyle(.white)
                                        .padding(.horizontal, 5).padding(.vertical, 2)
                                        .background(NK.blush500, in: Capsule())
                                        .offset(x: 7, y: -7)
                                }
                            }
                            Text(item.title)
                                .font(.jakarta(10.5, .medium)).foregroundStyle(NK.inkSoft)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                        .frame(width: 78)
                    }
                    .buttonStyle(NivaasaPressStyle())
                    .accessibilityIdentifier("action-" + item.title.lowercased().replacingOccurrences(of: " ", with: "-"))
                }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 2)
        }
    }
}

struct EmptyPanel: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        NivaasaCard {
            HStack(spacing: 12) {
                NivaasaIcon(name: icon, size: 24).foregroundStyle(NK.mint600)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    Text(detail).font(.nivaasaCaption).foregroundStyle(NK.muted)
                }
            }
        }
    }
}

struct TabStrip: View {
    let tabs: [String]
    @Binding var selection: String
    var counts: [String: Int] = [:]
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var tabSpace

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 20) {
                ForEach(tabs, id: \.self) { tab in
                    let active = tab == selection
                    Button {
                        guard selection != tab else { return }
                        selection = tab
                        Haptics.shared.play(.selection)
                    } label: {
                        HStack(spacing: 8) {
                            Text(tab).font(.nivaasaBodyMedium)
                            if let count = counts[tab] {
                                Text("\(count)").font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                                    .padding(.horizontal, 6).background(NK.canvas, in: RoundedRectangle(cornerRadius: 6))
                            }
                        }
                        .foregroundStyle(active ? NK.brand700 : NK.muted)
                        .padding(.horizontal, 4)
                        .frame(minHeight: 48)
                        .overlay(alignment: .bottom) {
                            if active {
                                Rectangle().fill(NK.brand600).frame(height: 2)
                                    .matchedGeometryEffect(id: "tab-underline", in: tabSpace)
                            }
                        }
                        .animation(NivaasaMotion.spring(reduceMotion), value: active)
                    }
                    .buttonStyle(NivaasaPressStyle())
                    .accessibilityIdentifier("section-" + tab)
                    .accessibilityAddTraits(active ? .isSelected : [])
                }
            }
        }
        .overlay(alignment: .bottom) { Rectangle().fill(NK.line).frame(height: 1).allowsHitTesting(false) }
    }
}

struct ProgressLine: View {
    let value: Double
    var tone: Color = NK.brand500

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(NK.canvas)
                Capsule().fill(tone).frame(width: max(0, min(1, value)) * proxy.size.width)
            }
        }
        .frame(height: 6)
    }
}

// MARK: - App chrome

struct NivaasaTopBar: View {
    let unread: Int
    let userName: String
    let onMenu: () -> Void
    let onSearch: () -> Void
    let onNotifications: () -> Void
    let onAccount: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button(action: onMenu) {
                NivaasaIcon(name: "line.3.horizontal", size: 20).frame(width: 44, height: 44)
            }
            .accessibilityLabel("Open navigation")
            .buttonStyle(NivaasaPressStyle())
            Image("NivaasaMark").resizable().frame(width: 28, height: 28).accessibilityLabel("Nivaasa")
            Spacer(minLength: 0)
            Button(action: onSearch) {
                NivaasaIcon(name: "magnifyingglass", size: 18).frame(width: 44, height: 44)
            }
            .accessibilityLabel("Search community")
            .buttonStyle(NivaasaPressStyle())
            Button(action: onNotifications) {
                ZStack(alignment: .topTrailing) {
                    NivaasaIcon(name: "bell", size: 20).frame(width: 44, height: 44)
                    if unread > 0 {
                        Text(unread > 9 ? "9+" : "\(unread)")
                            .font(.jakarta(10, .bold)).foregroundStyle(.white)
                            .padding(.horizontal, 5).frame(minWidth: 16, minHeight: 16)
                            .background(NK.brand600, in: Capsule()).overlay { Capsule().strokeBorder(.white, lineWidth: 1.5) }
                            .offset(x: -2, y: 2)
                    }
                }
            }
            .accessibilityLabel(unread > 0 ? "Notifications, \(unread) unread" : "Notifications")
            .buttonStyle(NivaasaPressStyle())
            Button(action: onAccount) { NivaasaAvatar(name: userName, color: NK.brand600, size: 32).frame(minWidth: 44, minHeight: 44) }
                .accessibilityLabel("Account menu")
                .buttonStyle(NivaasaPressStyle())
        }
        .foregroundStyle(NK.inkSoft)
        .padding(.horizontal, 16)
        .frame(height: 64)
        .background(NK.surface)
        .overlay(alignment: .bottom) { Rectangle().fill(NK.line).frame(height: 1) }
    }
}

struct NivaasaBottomBar: View {
    let selection: String
    let unread: Int
    let onSelect: (String) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var tabSpace

    private let items: [(String, String, String)] = [
        ("Home", "house", "Home"),
        ("Community", "newspaper", "Community"),
        ("Visitors", "person.crop.circle.badge.checkmark", "Visitors"),
        ("Pay", "wallet.bifold", "Pay"),
        ("More", "line.3.horizontal", "More"),
    ]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(items, id: \.0) { title, icon, label in
                let active = selection == title
                Button {
                    // "More" opens the services menu even when already on a More page.
                    guard title == "More" || selection != title else { return }
                    onSelect(title)
                    Haptics.shared.play(.selection)
                } label: {
                    VStack(spacing: 4) {
                        ZStack(alignment: .topTrailing) {
                            NivaasaIcon(name: icon, size: 20)
                                .scaleEffect(active ? 1.08 : 1)
                        }
                        Text(label).font(.jakarta(13, active ? .semibold : .medium))
                    }
                    .frame(maxWidth: .infinity, minHeight: 64)
                    .foregroundStyle(active ? NK.brand700 : NK.muted)
                    .animation(NivaasaMotion.spring(reduceMotion), value: active)
                }
                .buttonStyle(NivaasaPressStyle())
                .accessibilityAddTraits(active ? .isSelected : [])
                .accessibilityIdentifier("quick-" + title.lowercased())
            }
        }
        .background(NK.surface)
        .overlay(alignment: .top) { Rectangle().fill(NK.line).frame(height: 1) }
    }
}

struct NivaasaPage<Content: View>: View {
    let title: String
    let eyebrow: String
    var description: String? = nil
    var action: AnyView? = nil
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    eyebrowStyle(eyebrow)
                    Text(title).font(.nivaasaPageTitle).foregroundStyle(NK.ink).tracking(-0.7)
                    if let description { Text(description).font(.nivaasaBody).foregroundStyle(NK.inkSoft) }
                    if let action { action.padding(.top, 6) }
                }
                content
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 24)
            .frame(maxWidth: .infinity)
        }
        .background(AppWash())
    }
}

struct NivaasaStaffBottomBar: View {
    let tabs: [String]
    let selection: String
    let onSelect: (String) -> Void
    var onScan: (() -> Void)? = nil

    private func icon(_ title: String) -> String {
        switch title {
        case "Homes": "building.2"
        case "Gate": "shield.lefthalf.filled"
        case "Billing": "wallet.bifold"
        case "Activity": "clock"
        case "Deliveries": "shippingbox"
        case "More": "line.3.horizontal"
        default: "chart.bar.xaxis"
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            let center = onScan != nil ? tabs.count / 2 : -1
            ForEach(Array(tabs.enumerated()), id: \.offset) { index, title in
                if index == center {
                    scanButton
                }
                tabButton(title)
            }
        }
        .background(NK.surface)
        .overlay(alignment: .top) { Rectangle().fill(NK.line).frame(height: 1) }
    }

    private func tabButton(_ title: String) -> some View {
        let active = selection == title
        return Button { onSelect(title) } label: {
            VStack(spacing: 4) {
                NivaasaIcon(name: icon(title), size: 20)
                Text(title).font(.jakarta(11, active ? .semibold : .medium))
            }
            .frame(maxWidth: .infinity, minHeight: 80, alignment: .center)
            .foregroundStyle(active ? NK.brand700 : NK.muted)
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityAddTraits(active ? .isSelected : [])
        .accessibilityIdentifier("quick-" + title.lowercased())
    }

    /// Prominent center scan button: brand circle with the QR-in-scan-frame logo,
    /// vertically centered inside the footer so it never crosses the hairline.
    private var scanButton: some View {
        Button {
            Haptics.shared.play(.heavy)
            onScan?()
        } label: {
            VStack(spacing: 3) {
                Circle()
                    .fill(NK.brand600)
                    .frame(width: 54, height: 54)
                    .shadow(color: NK.brand600.opacity(0.35), radius: 10, y: 4)
                    .overlay {
                        NivaasaIcon(name: "scan.qr.code", size: 26).foregroundStyle(.white)
                    }
                Text("Scan").font(.jakarta(11, .semibold)).foregroundStyle(NK.brand700)
            }
            .frame(maxWidth: .infinity, minHeight: 80, alignment: .center)
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityIdentifier("scan-visitor-qr")
        .accessibilityLabel("Scan visitor QR pass")
        .accessibilityAddTraits(.isButton)
    }
}
