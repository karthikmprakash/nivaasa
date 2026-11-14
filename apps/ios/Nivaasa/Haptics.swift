import CoreHaptics
import SwiftUI
import UIKit

enum HapticKind {
    case tap, selection, success, warning, error, heavy
}

/// One haptics engine for the whole app. The setting is local-only and read at
/// play time, so toggling it in Settings applies immediately.
@MainActor
final class Haptics {
    static let shared = Haptics()
    static let enabledKey = "nivaasa.haptics.enabled"

    private var engine: CHHapticEngine?
    private var supportsHaptics = false

    static var enabled: Bool {
        get { UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: enabledKey) }
    }

    func play(_ kind: HapticKind) {
        guard Haptics.enabled, !ProcessInfo.processInfo.arguments.contains("--ui-testing") else { return }
        prepareIfNeeded()
        if let engine, supportsHaptics {
            playPattern(kind, engine: engine)
        } else {
            playFallback(kind)
        }
    }

    private func prepareIfNeeded() {
        guard engine == nil else { return }
        supportsHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
        guard supportsHaptics else { return }
        do {
            let engine = try CHHapticEngine()
            engine.playsHapticsOnly = true
            try engine.start()
            self.engine = engine
        } catch {
            supportsHaptics = false
        }
    }

    private func event(intensity: Float, duration: TimeInterval, time: TimeInterval = 0) -> CHHapticEvent {
        let intensityParameter = CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity)
        return CHHapticEvent(eventType: .hapticTransient, parameters: [intensityParameter], relativeTime: time, duration: duration)
    }

    private func playPattern(_ kind: HapticKind, engine: CHHapticEngine) {
        let events: [CHHapticEvent]
        switch kind {
        case .tap: events = [event(intensity: 0.55, duration: 0.03)]
        case .selection: events = [event(intensity: 0.4, duration: 0.02)]
        case .heavy: events = [event(intensity: 1, duration: 0.08)]
        case .warning: events = [event(intensity: 0.75, duration: 0.07)]
        case .error: events = [event(intensity: 1, duration: 0.12)]
        case .success: events = [event(intensity: 0.85, duration: 0.04), event(intensity: 0.55, duration: 0.05, time: 0.07)]
        }
        do {
            let pattern = try CHHapticPattern(events: events, parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: CHHapticTimeImmediate)
        } catch {
            playFallback(kind)
        }
    }

    private func playFallback(_ kind: HapticKind) {
        switch kind {
        case .tap:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .selection:
            UISelectionFeedbackGenerator().selectionChanged()
        case .heavy:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case .warning:
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .error:
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        case .success:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }
}

enum NivaasaMotion {
    static func spring(_ reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .spring(response: 0.28, dampingFraction: 0.78)
    }

    static func quick(_ reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .easeOut(duration: 0.16)
    }

    static let pageTransition: AnyTransition = .asymmetric(
        insertion: .move(edge: .trailing).combined(with: .opacity),
        removal: .move(edge: .leading).combined(with: .opacity)
    )
}
