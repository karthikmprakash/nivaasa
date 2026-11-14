import SwiftUI

/// Uses exactly the Lucide artwork exported from the web dependency, not SF Symbols.
struct NivaasaIcon: View {
    let name: String
    var size: CGFloat = 16

    var body: some View {
        Image("Lucide-" + name)
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}
