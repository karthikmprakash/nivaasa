import SwiftUI
import UIKit

// MARK: - Inputs

struct NivaasaInput: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var secure = false
    var keyboard: UIKeyboardType = .default
    var capitalization: TextInputAutocapitalization = .sentences
    var identifier: String?

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

    init(label: String? = nil, options: [String], selection: Binding<String>) {
        self.label = label
        self.options = options
        self._selection = selection
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            if let label { Text(label).font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft) }
            FlowLayout(spacing: 7) {
                ForEach(options, id: \.self) { option in
                    let active = option == selection
                    Button { selection = option } label: {
                        Text(option.replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.nivaasaCaptionMedium)
                            .foregroundStyle(active ? .white : NK.inkSoft)
                            .padding(.horizontal, 13)
                            .frame(minHeight: 36)
                            .background(active ? NK.brand600 : NK.surface, in: Capsule())
                            .overlay { if !active { Capsule().strokeBorder(NK.line, lineWidth: 1) } }
                    }
                    .buttonStyle(.plain)
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

    var body: some View {
        Button { isOn.toggle() } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                    if let help { Text(help).font(.nivaasaCaption).foregroundStyle(NK.muted) }
                }
                Spacer()
                Capsule()
                    .fill(isOn ? NK.brand600 : NK.lineStrong)
                    .frame(width: 44, height: 26)
                    .overlay(alignment: isOn ? .trailing : .leading) {
                        Circle().fill(.white).frame(width: 22, height: 22).padding(2)
                    }
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 50)
            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous).strokeBorder(NK.line, lineWidth: 1) }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

// MARK: - Sheet chrome

struct NivaasaSheetHeader: View {
    let title: String
    var subtitle: String?
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
                Image(systemName: "xmark").font(.system(size: 14, weight: .semibold)).foregroundStyle(NK.inkSoft)
                    .frame(width: 36, height: 36).background(NK.canvas, in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 12)
    }
}

// MARK: - Dates

struct NivaasaDateField: View {
    let label: String
    @Binding var date: Date
    let range: ClosedRange<Date>
    @State private var showPicker = false

    private var days: [Date] {
        var values: [Date] = []
        var day = range.lowerBound
        while day <= range.upperBound {
            values.append(day)
            day = Calendar.current.date(byAdding: .day, value: 1, to: day) ?? day.addingTimeInterval(86_400)
        }
        return values
    }

    var body: some View {
        Button { showPicker = true } label: {
            HStack(spacing: 10) {
                Image(systemName: "calendar").font(.system(size: 16, weight: .medium)).foregroundStyle(NK.muted)
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    Text(date.formatted(.dateTime.weekday(.abbreviated).day().month(.wide).locale(Locale(identifier: "en_IN"))))
                        .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                }
                Spacer()
                Image(systemName: "chevron.down").font(.system(size: 12, weight: .semibold)).foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 54)
            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous).strokeBorder(NK.lineStrong, lineWidth: 1) }
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showPicker) {
            NivaasaDateChoice(title: label, days: days, selected: $date, close: { showPicker = false })
        }
    }
}

struct NivaasaDateChoice: View {
    let title: String
    let days: [Date]
    @Binding var selected: Date
    let close: () -> Void
    private let columns = [GridItem(.adaptive(minimum: 92), spacing: 8)]

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: title, subtitle: "Choose a day in the next 30 days.", close: close)
            ScrollView {
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(days, id: \.self) { day in
                        let active = Calendar.current.isDate(day, inSameDayAs: selected)
                        Button {
                            selected = day
                            close()
                        } label: {
                            VStack(spacing: 3) {
                                Text(day.formatted(.dateTime.weekday(.abbreviated).locale(Locale(identifier: "en_IN"))).uppercased())
                                    .font(.nivaasaEyebrow).foregroundStyle(active ? .white.opacity(0.8) : NK.muted)
                                Text(day.formatted(.dateTime.day().locale(Locale(identifier: "en_IN"))))
                                    .font(.jakarta(20, .semibold)).foregroundStyle(active ? .white : NK.ink)
                                Text(day.formatted(.dateTime.month(.abbreviated).locale(Locale(identifier: "en_IN"))))
                                    .font(.nivaasaCaption).foregroundStyle(active ? .white.opacity(0.8) : NK.muted)
                            }
                            .frame(maxWidth: .infinity, minHeight: 84)
                            .background(active ? NK.brand600 : NK.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay { if !active { RoundedRectangle(cornerRadius: 12).strokeBorder(NK.line, lineWidth: 1) } }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
        }
        .background(AppWash())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
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
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) { copied = false }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: copied ? "checkmark" : "doc.on.doc").font(.system(size: 16, weight: .semibold))
                Text(copied ? "Copied" : label).font(.nivaasaBodySemibold)
            }
            .foregroundStyle(copied ? NK.mint600 : NK.brand700)
            .frame(maxWidth: .infinity, minHeight: 46)
            .background(copied ? NK.mint50 : NK.brand50, in: RoundedRectangle(cornerRadius: NKRadius.control, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(copied ? "Copied" : label)
    }
}

struct NivaasaFeedback: View {
    let text: String
    var tone: NivaasaBadge.Tone = .mint

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 16, weight: .semibold))
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
