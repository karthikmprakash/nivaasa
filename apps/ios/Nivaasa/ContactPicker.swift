import UIKit
import Contacts
import ContactsUI

enum ContactAccess {
    /// Returns true when the picker can be shown right away.
    static func ensureAuthorized() async -> Bool {
        let store = CNContactStore()
        switch CNContactStore.authorizationStatus(for: .contacts) {
        case .authorized, .limited:
            return true
        case .notDetermined:
            return (try? await store.requestAccess(for: .contacts)) ?? false
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }
}

/// Presents the system contact picker from a dedicated container controller.
/// CNContactPickerViewController dismisses itself on selection by forwarding up
/// the presentation chain; presenting it from its own container keeps that
/// dismissal local so the underlying form sheet is never closed.
enum ContactPickerPresenter {
    static func present(onSelect: @escaping @MainActor (CNContact) -> Void, onCancel: @escaping @MainActor () -> Void = {}) {
        guard let top = topViewController() else { return }
        let container = Container()
        container.onSelect = onSelect
        container.onCancel = onCancel
        top.present(container, animated: true)
    }

    private static func topViewController() -> UIViewController? {
        guard let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }),
            let window = scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first
        else { return nil }
        var top = window.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }

    private final class Container: UIViewController, CNContactPickerDelegate {
        var onSelect: (@MainActor (CNContact) -> Void)?
        var onCancel: (@MainActor () -> Void)?

        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            guard presentedViewController == nil else { return }
            let picker = CNContactPickerViewController()
            picker.delegate = self
            picker.displayedPropertyKeys = [
                CNContactGivenNameKey as String,
                CNContactFamilyNameKey as String,
                CNContactPhoneNumbersKey as String,
            ]
            present(picker, animated: true)
        }

        func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
            onSelect?(contact)
            // Close only this container (and the picker); the presenting form stays.
            presentingViewController?.dismiss(animated: true)
        }

        func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
            onCancel?()
            presentingViewController?.dismiss(animated: true)
        }
    }
}
