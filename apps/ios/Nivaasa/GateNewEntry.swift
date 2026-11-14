import SwiftUI
import UIKit
import PhotosUI

// MARK: - Camera / photo library picker

struct CameraPicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        picker.allowsEditing = true
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            parent.image = (info[.editedImage] as? UIImage) ?? (info[.originalImage] as? UIImage)
            parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}

// MARK: - On-demand gate entry: a 3-step flow (photo → home & type → details)

struct GateNewEntry: View {
    let token: String
    let units: [[String: Any]]
    let onDone: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var step = 1
    @State private var photo: UIImage?
    @State private var showCamera = false
    @State private var unitQuery = ""
    @State private var unitId = ""
    @State private var unitLabel = ""
    @State private var type = "delivery"
    @State private var name = ""
    @State private var phone = ""
    @State private var company = ""
    @State private var purpose = ""
    @State private var vehicleNo = ""
    @State private var showPlatforms = false
    @State private var busy = false
    @State private var error: String?

    private var unitMatches: [[String: Any]] {
        let q = unitQuery.trimmingCharacters(in: .whitespaces).lowercased()
        let list = units.sorted { string($0, "number") < string($1, "number") }
        if q.isEmpty { return Array(list.prefix(8)) }
        return Array(list.filter { string($0, "number").lowercased().contains(q) }.prefix(8))
    }

    private var canSubmit: Bool {
        !unitId.isEmpty && !busy
            && !name.trimmingCharacters(in: .whitespaces).isEmpty
            && (type == "guest" || validPhone(phone))
            && (type != "cab" || !vehicleNo.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    private var stepTitle: String {
        switch step {
        case 1: return "Visitor photo"
        case 2: return "Home & visit type"
        default: return "Details & request"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: "New arrival", subtitle: "Step \(step) of 3 · \(stepTitle)", close: { if !busy { dismiss() } })
            // Step indicator
            HStack(spacing: 8) {
                ForEach(1...3, id: \.self) { index in
                    HStack(spacing: 6) {
                        ZStack {
                            Circle().fill(index < step ? NK.mint600 : index == step ? NK.brand600 : NK.lineStrong)
                                .frame(width: 24, height: 24)
                            if index < step {
                                NivaasaIcon(name: "checkmark", size: 13).foregroundStyle(.white)
                            } else {
                                Text("\(index)").font(.jakarta(11, .bold)).foregroundStyle(index == step ? .white : NK.muted)
                            }
                        }
                        if index < 3 { Rectangle().fill(index < step ? NK.mint600 : NK.line).frame(height: 2).frame(width: 28) }
                    }
                }
                Spacer()
                Text(stepTitle).font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
            }
            .padding(.horizontal, 20).padding(.top, 12)
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    switch step {
                    case 1: photoStep
                    case 2: homeStep
                    default: detailsStep
                    }
                    if let error { NivaasaFeedback(text: error, tone: .danger) }
                    HStack(spacing: 10) {
                        if step > 1 {
                            OutlineButton(title: "Back", icon: "arrow.left") {
                                error = nil
                                step -= 1
                                Haptics.shared.play(.selection)
                            }
                        }
                        if step < 3 {
                            PrimaryButton(title: "Next", icon: "arrow.right", disabled: step == 2 && unitId.isEmpty) {
                                error = nil
                                step += 1
                                Haptics.shared.play(.selection)
                            }
                        } else {
                            PrimaryButton(title: busy ? "Sending…" : "Request approval", icon: "paperplane", disabled: !canSubmit) {
                                Task { await submit() }
                            }
                        }
                    }
                }
                .padding(20)
            }
        }
        .background(AppWash())
        .interactiveDismissDisabled(busy)
        .sheet(isPresented: $showCamera) { CameraPicker(image: $photo) }
        .fullScreenCover(isPresented: $showPlatforms) {
            VisitorPlatformPicker(type: type == "cab" ? .cab : .delivery, selection: Binding(get: { company }, set: { company = String($0.prefix(100)) }))
        }
        .accessibilityIdentifier("gate-new-entry")
    }

    // Step 1 — photo
    private var photoStep: some View {
        NivaasaCard {
            VStack(spacing: 14) {
                if let photo {
                    Image(uiImage: photo).resizable().scaledToFill()
                        .frame(height: 180).clipShape(RoundedRectangle(cornerRadius: 14))
                } else {
                    NivaasaIcon(name: "camera", size: 34).foregroundStyle(NK.brand600)
                        .frame(height: 180)
                        .frame(maxWidth: .infinity)
                        .background(NK.brand50, in: RoundedRectangle(cornerRadius: 14))
                }
                Text(photo == nil ? "Take a photo of the visitor" : "Photo captured")
                    .font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                Text("The resident sees this photo in their approval alert — it is not shown to other residents.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
                    .multilineTextAlignment(.center)
                HStack(spacing: 10) {
                    OutlineButton(title: "Retake", icon: "camera", disabled: photo == nil) { showCamera = true }
                    PrimaryButton(title: photo == nil ? "Take photo" : "Change photo", icon: "camera") { showCamera = true }
                }
            }
        }
    }

    // Step 2 — flat number + type
    private var homeStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            NivaasaCard {
                Text("Which home?").font(.nivaasaSection).foregroundStyle(NK.ink)
                NivaasaInput(label: "Search flat number", text: $unitQuery, placeholder: "e.g. A-402", capitalization: .never)
                if !unitId.isEmpty {
                    NivaasaBadge(text: "Selected · Home \(unitLabel)", tone: .mint)
                }
                VStack(spacing: 0) {
                    ForEach(Array(unitMatches.enumerated()), id: \.offset) { _, unit in
                        Button {
                            unitId = string(unit, "id")
                            unitLabel = string(unit, "number")
                            unitQuery = string(unit, "number")
                            Haptics.shared.play(.selection)
                        } label: {
                            HStack {
                                Text("Home \(string(unit, "number"))").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                                Spacer()
                                if unitId == string(unit, "id") { NivaasaIcon(name: "checkmark.circle.fill", size: 16).foregroundStyle(NK.brand600) }
                            }
                            .padding(.horizontal, 12).frame(minHeight: 42)
                            .contentShape(Rectangle())
                        }.buttonStyle(NivaasaPressStyle())
                        Divider().padding(.leading, 12)
                    }
                }
            }
            NivaasaCard {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Who is at the gate?").font(.nivaasaSection).foregroundStyle(NK.ink)
                    typeMenu
                }
            }
        }
    }

    private static let typeOptions: [(value: String, label: String, icon: String)] = [
        ("delivery", "Delivery", "shippingbox"),
        ("cab", "Cab", "car"),
        ("vendor", "Vendor / service", "wrench.and.screwdriver"),
        ("guest", "Guest", "person.crop.circle"),
        ("other", "Other visitor", "ellipsis.circle"),
    ]

    @State private var typeMenuOpen = false

    private var typeMenu: some View {
        VStack(spacing: 0) {
            Button {
                withAnimation(NivaasaMotion.spring(false)) { typeMenuOpen.toggle() }
                Haptics.shared.play(.selection)
            } label: {
                HStack(spacing: 11) {
                    if type == "delivery" || type == "cab", !company.isEmpty {
                        PlatformLogo(name: company, size: 34)
                    } else {
                        let icon = GateNewEntry.typeOptions.first { $0.value == type }?.icon ?? "ellipsis.circle"
                        NivaasaIcon(name: icon, size: 18).foregroundStyle(NK.brand600)
                            .frame(width: 34, height: 34).background(NK.brand50, in: RoundedRectangle(cornerRadius: 9))
                    }
                    Text(GateNewEntry.typeOptions.first { $0.value == type }?.label ?? type)
                        .font(.nivaasaBodyMedium).foregroundStyle(NK.ink)
                    Spacer()
                    NivaasaIcon(name: typeMenuOpen ? "chevron.down" : "chevron.right").foregroundStyle(NK.muted)
                }
                .padding(.horizontal, 12).frame(minHeight: 52)
                .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.lineStrong) }
            }
            .buttonStyle(NivaasaPressStyle())
            .accessibilityIdentifier("type-menu")
            if typeMenuOpen {
                VStack(spacing: 0) {
                    ForEach(GateNewEntry.typeOptions, id: \.value) { option in
                        Button {
                            type = option.value
                            typeMenuOpen = false
                            Haptics.shared.play(.selection)
                        } label: {
                            HStack(spacing: 11) {
                                NivaasaIcon(name: option.icon, size: 17).foregroundStyle(type == option.value ? NK.brand700 : NK.muted)
                                    .frame(width: 34, height: 34).background(type == option.value ? NK.brand50 : NK.canvas, in: RoundedRectangle(cornerRadius: 9))
                                Text(option.label).font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                                Spacer()
                                if type == option.value { NivaasaIcon(name: "checkmark.circle.fill", size: 16).foregroundStyle(NK.brand600) }
                            }
                            .padding(.horizontal, 12).frame(minHeight: 46)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(NivaasaPressStyle())
                        Divider().padding(.leading, 12)
                    }
                }
                .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.line) }
                .padding(.top, 6)
                .transition(.opacity.combined(with: .scale(scale: 0.98, anchor: .top)))
            }
        }
    }

    // Step 3 — details
    private var detailsStep: some View {
        NivaasaCard {
            VStack(alignment: .leading, spacing: 10) {
                NivaasaInput(label: type == "cab" ? "Driver name" : "Visitor name", text: $name, placeholder: "Full name", capitalization: .words)
                NivaasaInput(label: "Phone number", text: $phone, placeholder: "+91…", keyboard: .phonePad)
                if type == "delivery" || type == "cab" {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(type == "cab" ? "Cab service" : "Delivery platform").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                        Button { showPlatforms = true } label: {
                            HStack(spacing: 11) {
                                PlatformLogo(name: company)
                                Text(company.isEmpty ? "Select platform (or type below)" : company)
                                    .font(.nivaasaBody).foregroundStyle(company.isEmpty ? NK.muted : NK.ink)
                                Spacer()
                                NivaasaIcon(name: "chevron.down").foregroundStyle(NK.muted)
                            }
                            .padding(.horizontal, 10).frame(minHeight: 54)
                            .background(NK.surface, in: RoundedRectangle(cornerRadius: NKRadius.control))
                            .overlay { RoundedRectangle(cornerRadius: NKRadius.control).strokeBorder(NK.lineStrong) }
                        }.buttonStyle(NivaasaPressStyle())
                        NivaasaInput(label: "Or type company", text: $company, placeholder: "e.g. Blinkit", capitalization: .words)
                    }
                } else if type == "vendor" {
                    NivaasaInput(label: "Company", text: $company, placeholder: "e.g. CoolCare", capitalization: .words)
                }
                if type == "cab" {
                    NivaasaInput(label: "Cab registration", text: $vehicleNo, placeholder: "KA 01 AB 1234", capitalization: .characters)
                }
                NivaasaInput(label: "Purpose (optional)", text: $purpose, placeholder: "e.g. Parcel drop")
                if let photo {
                    HStack(spacing: 8) {
                        Image(uiImage: photo).resizable().scaledToFill().frame(width: 40, height: 40).clipShape(RoundedRectangle(cornerRadius: 9))
                        Text("Photo attached · Home \(unitLabel) · \(type)").font(.nivaasaCaptionMedium).foregroundStyle(NK.inkSoft)
                    }
                }
                Text("The resident gets a gate alert with the photo and can Approve, Deny or Call from the notification.")
                    .font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
        }
    }

    private func submit() async {
        guard canSubmit else { return }
        busy = true
        error = nil
        defer { busy = false }
        var fields: [String: String] = [
            "type": type,
            "unitId": unitId,
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "phone": phone.trimmingCharacters(in: .whitespacesAndNewlines),
            "company": company.trimmingCharacters(in: .whitespacesAndNewlines),
            "purpose": purpose.trimmingCharacters(in: .whitespacesAndNewlines),
        ]
        if type == "cab" { fields["vehicleNo"] = vehicleNo.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() }
        let image = photo?.jpegData(compressionQuality: 0.8).map { (data: $0, name: "visitor.jpg", mime: "image/jpeg") }
        do {
            _ = try await API.upload("gate/entry", token: token, fields: fields, photo: image)
            Haptics.shared.play(.success)
            onDone("Approval requested — the resident has been notified.")
        } catch {
            self.error = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}
