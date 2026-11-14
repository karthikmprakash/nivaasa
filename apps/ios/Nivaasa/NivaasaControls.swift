import SwiftUI
import UIKit

// MARK: - Interaction

struct NivaasaPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(NivaasaMotion.quick(reduceMotion), value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { Haptics.shared.play(.tap) }
            }
    }
}

struct NivaasaTextButton: View {
    let title: String
    var icon: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let icon { NivaasaIcon(name: icon, size: 16) }
                Text(title).font(.nivaasaCaptionMedium)
            }
            .foregroundStyle(NK.brand700)
            .frame(minHeight: 38)
        }
        .buttonStyle(NivaasaPressStyle())
    }
}

struct NivaasaCloseBar: View {
    let close: () -> Void

    var body: some View {
        HStack {
            Spacer()
            Button(action: close) {
                NivaasaIcon(name: "xmark", size: 20).foregroundStyle(NK.inkSoft)
                    .frame(width: 44, height: 44).background(NK.canvas, in: RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(NivaasaPressStyle())
            .accessibilityLabel("Close")
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
    }
}

// MARK: - Inputs

struct NivaasaInput: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var secure = false
    var keyboard: UIKeyboardType = .default
    var capitalization: TextInputAutocapitalization = .sentences
    var identifier: String?
    var onSubmit: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
            Group {
                if secure {
                    SecureField("", text: $text, prompt: Text(placeholder).foregroundStyle(NK.muted))
                } else {
                    TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(NK.muted))
                        .textInputAutocapitalization(capitalization)
                        .autocorrectionDisabled()
                }
            }
            .keyboardType(keyboard)
            .onSubmit { onSubmit?() }
            .font(.nivaasaBody)
            .foregroundStyle(NK.ink)
            .tint(NK.brand600)
            .padding(.horizontal, 12)
            .frame(height: 48)
            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous).strokeBorder(NK.lineStrong, lineWidth: 1) }
            .accessibilityIdentifier(identifier ?? label)
        }
    }
}

/// Six-digit OTP-style entry. Auto-submits via `onComplete` the moment the
/// sixth digit lands, so the guard never taps a separate confirm button.
struct OtpCodeField: View {
    @Binding var code: String
    var onComplete: (String) -> Void
    var identifier: String = "lookup-code"
    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<6, id: \.self) { index in
                let digit = index < code.count ? String(code[code.index(code.startIndex, offsetBy: index)]) : ""
                ZStack {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(NK.surface)
                        .overlay {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(index < code.count ? NK.brand500 : NK.lineStrong, lineWidth: index < code.count ? 1.5 : 1)
                        }
                    Text(digit)
                        .font(.jakarta(22, .bold)).foregroundStyle(NK.ink).monospacedDigit()
                }
                .frame(width: 44, height: 56)
            }
        }
        .frame(maxWidth: .infinity)
        .background {
            TextField("", text: Binding(
                get: { code },
                set: { new in
                    code = String(new.filter { $0.isASCII && $0.isNumber }.prefix(6))
                    if code.count == 6 { onComplete(code) }
                }
            ))
            .keyboardType(.numberPad)
            .focused($focused)
            .opacity(0.02)
            .accessibilityIdentifier(identifier)
            .accessibilityLabel("6-digit entry code")
        }
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
    }
}

struct NivaasaTextArea: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var minHeight: CGFloat = 96

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
            ZStack(alignment: .topLeading) {
                if text.isEmpty {
                    Text(placeholder).font(.nivaasaBody).foregroundStyle(NK.muted).padding(.horizontal, 13).padding(.vertical, 12)
                }
                TextEditor(text: $text)
                    .font(.nivaasaBody)
                    .foregroundStyle(NK.ink)
                    .tint(NK.brand600)
                    .scrollContentBackground(.hidden)
                    .padding(8)
                    .frame(minHeight: minHeight)
            }
            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous).strokeBorder(NK.lineStrong, lineWidth: 1) }
        }
    }
}

// MARK: - Choices

struct NivaasaChips: View {
    let options: [String]
    @Binding var selection: String
    var label: String?
    var icons: [String: String]
    var activeColor: Color
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(label: String? = nil, options: [String], selection: Binding<String>, icons: [String: String] = [:], activeColor: Color = NK.brand600) {
        self.label = label
        self.options = options
        self._selection = selection
        self.icons = icons
        self.activeColor = activeColor
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            if let label { Text(label).font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft) }
            FlowLayout(spacing: 7) {
                ForEach(options, id: \.self) { option in
                    let active = option == selection
                    Button {
                        guard selection != option else { return }
                        selection = option
                        Haptics.shared.play(.selection)
                    } label: {
                        HStack(spacing: 6) {
                            if let icon = icons[option] { NivaasaIcon(name: icon, size: 14) }
                            Text(option == option.lowercased() ? option.replacingOccurrences(of: "_", with: " ").capitalized : option)
                        }
                            .font(.nivaasaCaptionMedium)
                            .foregroundStyle(active ? .white : NK.inkSoft)
                            .padding(.horizontal, 13)
                            .frame(minHeight: 36)
                            .background(active ? activeColor : NK.surface, in: Capsule())
                            .overlay { if !active { Capsule().strokeBorder(NK.line, lineWidth: 1) } }
                            .animation(NivaasaMotion.spring(reduceMotion), value: active)
                    }
                    .buttonStyle(NivaasaPressStyle())
                    .accessibilityAddTraits(active ? .isSelected : [])
                }
            }
        }
    }
}

struct NivaasaToggleRow: View {
    let label: String
    @Binding var isOn: Bool
    var help: String?
    var onChange: ((Bool) -> Void)? = nil
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button {
            isOn.toggle()
            Haptics.shared.play(isOn ? .success : .selection)
            onChange?(isOn)
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                    if let help { Text(help).font(.nivaasaCaption).foregroundStyle(NK.muted) }
                }
                .fixedSize(horizontal: false, vertical: true)
                Spacer()
                Capsule()
                    .fill(isOn ? NK.brand600 : NK.lineStrong)
                    .frame(width: 44, height: 26)
                    .overlay(alignment: isOn ? .trailing : .leading) {
                        Circle().fill(.white).frame(width: 22, height: 22).padding(2)
                    }
                    .animation(NivaasaMotion.spring(reduceMotion), value: isOn)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(minHeight: 50)
            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous).strokeBorder(NK.line, lineWidth: 1) }
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

// MARK: - Sheet chrome

struct NivaasaSheetHeader: View {
    let title: String
    var subtitle: String?
    var closeIdentifier: String?
    let close: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                eyebrowStyle("Nivaasa")
                Text(title).font(.nivaasaPageTitle).tracking(-0.6).foregroundStyle(NK.ink)
                if let subtitle { Text(subtitle).font(.nivaasaCaption).foregroundStyle(NK.muted) }
            }
            Spacer()
            Button(action: close) {
                NivaasaIcon(name: "xmark", size: 20).foregroundStyle(NK.inkSoft)
                    .frame(width: 44, height: 44).background(NK.canvas, in: RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(NivaasaPressStyle())
            .accessibilityLabel("Close")
            .accessibilityIdentifier(closeIdentifier ?? "sheet-close")
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 12)
    }
}

// MARK: - Dates

var communityCalendar: Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "Asia/Kolkata") ?? .current
    return calendar
}

func communityDateKey(_ date: Date) -> String {
    let parts = communityCalendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
}

struct NivaasaDateField: View {
    let label: String
    @Binding var date: Date
    let range: ClosedRange<Date>
    @State private var draft = Date()
    @State private var showPicker = false
    @Environment(\.dynamicTypeSize) private var textSize

    private var formattedDate: String {
        var style = Date.FormatStyle.dateTime.weekday(.abbreviated).day().month(.abbreviated).year()
            .locale(Locale(identifier: "en_IN"))
        style.timeZone = communityCalendar.timeZone
        return date.formatted(style)
    }

    var body: some View {
        Button {
            draft = min(max(date, range.lowerBound), range.upperBound)
            showPicker = true
        } label: {
            HStack(spacing: 10) {
                NivaasaIcon(name: "calendar").foregroundStyle(NK.muted)
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    Text(formattedDate).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                }
                Spacer(minLength: 6)
                NivaasaIcon(name: "chevron.down").foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 54)
            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
            .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.lineStrong) }
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityLabel(label)
        .accessibilityValue(formattedDate)
        .accessibilityIdentifier(label)
        .sheet(isPresented: $showPicker) {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 8) {
                        if textSize.isAccessibilitySize {
                            picker.datePickerStyle(.wheel)
                        } else {
                            picker.datePickerStyle(.graphical)
                        }
                        Text("Dates use India Standard Time.")
                            .font(.footnote).foregroundStyle(NK.muted)
                    }
                    .padding(16)
                    .frame(maxWidth: 520)
                    .frame(maxWidth: .infinity)
                }
                .background(AppWash())
                .navigationTitle(label)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showPicker = false } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            date = communityCalendar.startOfDay(for: draft)
                            showPicker = false
                        }
                    }
                }
            }
            .environment(\.calendar, communityCalendar)
            .environment(\.timeZone, communityCalendar.timeZone)
            .environment(\.locale, Locale(identifier: "en_IN"))
            .presentationDragIndicator(.visible)
        }
    }

    private var picker: some View {
        DatePicker(label, selection: $draft, in: range, displayedComponents: .date)
            .labelsHidden()
            .accessibilityIdentifier("community-calendar")
            .tint(NK.brand600)
    }
}

// MARK: - Copy and inline feedback

struct NivaasaCopyButton: View {
    let value: String
    let label: String
    @State private var copied = false

    var body: some View {
        Button {
            UIPasteboard.general.string = value
            copied = true
            Haptics.shared.play(.success)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) { copied = false }
        } label: {
            HStack(spacing: 8) {
                NivaasaIcon(name: copied ? "checkmark" : "doc.on.doc")
                Text(copied ? "Copied" : label).font(.nivaasaBodySemibold)
            }
            .foregroundStyle(copied ? NK.mint600 : NK.brand700)
            .frame(maxWidth: .infinity, minHeight: 46)
            .background(copied ? NK.mint50 : NK.brand50, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
        }
        .buttonStyle(NivaasaPressStyle())
        .accessibilityLabel(copied ? "Copied" : label)
    }
}

struct NivaasaFeedback: View {
    let text: String
    var tone: NivaasaBadge.Tone = .mint

    var body: some View {
        HStack(spacing: 8) {
            NivaasaIcon(name: tone == .danger ? "exclamationmark.shield" : "checkmark.circle")
            Text(text).font(.nivaasaCaptionMedium)
        }
        .foregroundStyle(tone == .danger ? NK.dangerInk : NK.mint600)
        .padding(.horizontal, 12).padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tone == .danger ? NK.dangerSoft : NK.mint50, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

// MARK: - Flow layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0 && x + size.width > width {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > bounds.minX && x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
