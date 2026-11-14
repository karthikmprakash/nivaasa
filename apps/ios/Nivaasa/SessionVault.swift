import Foundation
import Security

struct StoredSession: Codable {
    let account: Account
    let session: Session
}

enum SessionVault {
    private static let service = "app.nivaasa.community.session"
    private static let account = "active"
    private static let lock = NSLock()
    private static var memory: StoredSession?

    static func load() -> StoredSession? {
        lock.lock()
        if let memory {
            lock.unlock()
            return memory
        }
        lock.unlock()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let stored = try? JSONDecoder().decode(StoredSession.self, from: data) else { return nil }
        lock.lock()
        memory = stored
        lock.unlock()
        return stored
    }

    static func save(_ stored: StoredSession) {
        lock.lock()
        memory = stored
        lock.unlock()
        guard let data = try? JSONEncoder().encode(stored) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let update: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
        guard status == errSecItemNotFound else { return }
        var insert = query
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(insert as CFDictionary, nil)
    }

    static func clear() {
        lock.lock()
        memory = nil
        lock.unlock()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
