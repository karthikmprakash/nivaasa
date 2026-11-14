import AVFoundation
import SwiftUI
import VisionKit

struct GateQRScanner: View {
    let onScan: (AccessPassCode) -> Void
    @State private var ready = false
    @State private var problem: String?
    @State private var unrecognized = false
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: 12) {
            if ready {
                CameraPreview(onRead: onScan, onUnrecognized: { unrecognized = true }, onFailure: { message in
                    ready = false
                    problem = message
                })
                .frame(height: 310)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .accessibilityLabel("Camera viewfinder")
                Text(unrecognized ? "That QR is not a Nivaasa visitor pass. Try another QR or enter the code manually."
                     : "Point the camera at the visitor’s Nivaasa QR pass.")
                    .font(.subheadline).foregroundStyle(NK.muted)
            } else if let problem {
                NivaasaFeedback(text: problem, tone: .danger)
                if AVCaptureDevice.authorizationStatus(for: .video) == .denied {
                    Button("Open Settings") {
                        if let settings = URL(string: UIApplication.openSettingsURLString) { openURL(settings) }
                    }
                    .frame(minHeight: 44)
                }
            } else {
                ProgressView("Starting camera").padding()
            }
        }
        .task { await prepare() }
    }

    private func prepare() async {
        guard DataScannerViewController.isSupported else {
            problem = "Scanning is unavailable on this device. Enter the six-digit code instead."
            return
        }
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        let allowed: Bool
        if status == .notDetermined {
            allowed = await AVCaptureDevice.requestAccess(for: .video)
        } else {
            allowed = status == .authorized
        }
        guard !Task.isCancelled else { return }
        guard allowed, DataScannerViewController.isAvailable else {
            problem = "Camera access is unavailable. You can enter the code manually."
            return
        }
        ready = true
    }
}

private struct CameraPreview: UIViewControllerRepresentable {
    let onRead: (AccessPassCode) -> Void
    let onUnrecognized: () -> Void
    let onFailure: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let controller = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.qr])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        controller.delegate = context.coordinator
        do { try controller.startScanning() }
        catch {
            Task { @MainActor in onFailure("The camera couldn’t start. Enter the code manually.") }
        }
        return controller
    }

    func updateUIViewController(_ controller: DataScannerViewController, context: Context) {}
    static func dismantleUIViewController(_ controller: DataScannerViewController, coordinator: Coordinator) {
        controller.stopScanning()
    }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let parent: CameraPreview
        private var handled = false
        init(parent: CameraPreview) { self.parent = parent }

        func dataScanner(_ scanner: DataScannerViewController, didAdd items: [RecognizedItem], allItems: [RecognizedItem]) {
            guard !handled else { return }
            for item in items {
                guard case .barcode(let barcode) = item, let payload = barcode.payloadStringValue else { continue }
                guard let pass = AccessPassCode(payload: payload) else {
                    parent.onUnrecognized()
                    continue
                }
                handled = true
                scanner.stopScanning()
                parent.onRead(pass)
                return
            }
        }

        func dataScanner(_ scanner: DataScannerViewController, becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable) {
            parent.onFailure("The camera became unavailable. Enter the code manually.")
        }
    }
}
