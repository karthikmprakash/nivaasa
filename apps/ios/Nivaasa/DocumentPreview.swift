import SwiftUI
import PDFKit

struct DocumentSelection: Identifiable {
    let path: String
    let title: String
    var id: String { path }
}

/// Document content uses the platform renderer; chrome and recovery belong to Nivaasa.
struct DocumentPreview: View {
    let document: DocumentSelection
    let token: String
    @Environment(\.dismiss) private var dismiss
    @State private var content: Data?
    @State private var failure: String?

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: document.title, close: { dismiss() })
            if let content {
                if content.starts(with: Data("%PDF".utf8)) {
                    PDFContent(data: content)
                } else if let text = String(data: content, encoding: .utf8), document.path.contains("statement") {
                    ScrollView([.horizontal, .vertical]) { Text(text).font(.system(size: 13, design: .monospaced)).foregroundStyle(NK.ink).padding(20) }
                } else {
                    NivaasaFeedback(text: "The document isn't available in a supported format.", tone: .danger).padding(20)
                }
            } else if let failure {
                NivaasaFeedback(text: failure, tone: .danger).padding(20)
                OutlineButton(title: "Try again") { Task { await load() } }.padding(.horizontal, 20)
            } else { ProgressView("Loading document").tint(NK.brand600).padding(40) }
            Spacer(minLength: 0)
        }
        .background(AppWash())
        .task { await load() }
    }

    private func load() async {
        failure = nil
        var host = Bundle.main.object(forInfoDictionaryKey: "NivaasaAPIURL") as? String ?? ""
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--isolated-api") { host = "http://localhost:3101" }
        #endif
        guard let base = URL(string: host), let url = URL(string: document.path, relativeTo: base)?.absoluteURL,
              url.host == base.host, url.scheme == base.scheme, url.port == base.port,
              url.user == nil, url.password == nil, !document.path.isEmpty else {
            failure = "The document address is invalid."
            return
        }
        do {
            let configuration = URLSessionConfiguration.ephemeral
            configuration.httpCookieStorage = nil
            configuration.httpShouldSetCookies = false
            let session = URLSession(configuration: configuration, delegate: DocumentRedirectPolicy(), delegateQueue: nil)
            defer { session.finishTasksAndInvalidate() }
            var request = URLRequest(url: url, timeoutInterval: 20)
            request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
            let (data, response) = try await session.data(for: request)
            guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
                throw APIError(message: "This file is not available. Ask the community office for an updated document.")
            }
            content = data
        } catch { failure = error.localizedDescription }
    }
}

// Authenticated file endpoints must return their bytes directly. Do not forward
// a bearer token through redirects to uploads, a different origin, or a login page.
private final class DocumentRedirectPolicy: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

private struct PDFContent: UIViewRepresentable {
    let data: Data
    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.backgroundColor = UIColor(NK.canvas)
        view.document = PDFDocument(data: data)
        return view
    }
    func updateUIView(_ view: PDFView, context: Context) {}
}
