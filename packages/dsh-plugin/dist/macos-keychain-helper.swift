import Darwin
import Foundation
import Security

struct Request: Decodable {
    let operation: String
    let service: String
    let account: String
    let value: String?
}

struct Response: Encodable {
    let ok: Bool
    let found: Bool?
    let value: String?
    // Only present on validation failures; nil fields are omitted from the
    // encoded JSON, so success payloads keep their previous shape.
    let error: String?

    init(ok: Bool, found: Bool?, value: String?, error: String? = nil) {
        self.ok = ok
        self.found = found
        self.value = value
        self.error = error
    }
}

func writeResponse(_ response: Response) {
    let data = try! JSONEncoder().encode(response)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}

func fail(_ status: OSStatus, _ message: String) -> Never {
    FileHandle.standardError.write(Data("\(message) (status \(status))\n".utf8))
    exit(1)
}

/// Validation failures emit a structured JSON error on stdout (same protocol
/// object as success responses, with `ok: false` and an `error` message) and
/// exit non-zero so callers can distinguish them from OSStatus failures.
func invalidRequest(_ message: String) -> Never {
    writeResponse(Response(ok: false, found: nil, value: nil, error: message))
    FileHandle.standardError.write(Data("\(message)\n".utf8))
    exit(2)
}

// Dockyard DSH credentials live in the reverse-DNS namespace published by
// packages/vault (KEYCHAIN_SERVICE = "com.dockyard-dsh.credentials"; tests use
// "com.dockyard-dsh.test-credentials*"). Accounts are opaque
// "keychain://dockyard-dsh/<sha256-hex>" references from createCredentialRef().
let serviceNamespace = "com.dockyard-dsh."
let maxServiceLength = 100
let maxAccountLength = 512
let maxValueBytes = 1_048_576

let serviceAllowedCharacters = CharacterSet(charactersIn:
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-")
let accountAllowedCharacters = CharacterSet(charactersIn:
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/._-")

func validateRequest(_ request: Request) {
    let service = request.service
    guard service.hasPrefix(serviceNamespace),
          service.count > serviceNamespace.count,
          service.count <= maxServiceLength else {
        invalidRequest("Rejected keychain service: expected a non-empty \(serviceNamespace)* name of at most \(maxServiceLength) characters")
    }
    guard service.unicodeScalars.allSatisfy({ serviceAllowedCharacters.contains($0) }) else {
        invalidRequest("Rejected keychain service: only letters, digits, '.' and '-' are allowed")
    }

    let account = request.account
    guard !account.isEmpty, account.count <= maxAccountLength else {
        invalidRequest("Rejected keychain account: length must be between 1 and \(maxAccountLength) characters")
    }
    guard account.unicodeScalars.allSatisfy({ accountAllowedCharacters.contains($0) }) else {
        invalidRequest("Rejected keychain account: only letters, digits, ':', '/', '.', '_' and '-' are allowed")
    }
}

func baseQuery(for request: Request) -> [String: Any] {
    [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: request.service,
        kSecAttrAccount as String: request.account,
    ]
}

let input = FileHandle.standardInput.readDataToEndOfFile()
let request: Request
do {
    request = try JSONDecoder().decode(Request.self, from: input)
} catch {
    fail(-1, "Invalid keychain helper request")
}

validateRequest(request)

let query = baseQuery(for: request)

switch request.operation {
case "write":
    guard let value = request.value else { fail(-1, "Missing keychain value") }
    guard value.utf8.count <= maxValueBytes else {
        invalidRequest("Rejected keychain value: exceeds \(maxValueBytes) bytes")
    }
    let valueData = Data(value.utf8)
    // Update only the value so an existing item keeps whatever protection class
    // it was created with (never weakened by a rewrite).
    let attributes: [String: Any] = [kSecValueData as String: valueData]
    var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if status == errSecItemNotFound {
        var item = query
        item[kSecValueData as String] = valueData
        // New items are explicitly pinned to a protection class instead of the
        // keychain default: readable after first unlock, but bound to this
        // device so backups never carry Dockyard provider secrets.
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        status = SecItemAdd(item as CFDictionary, nil)
    }
    guard status == errSecSuccess else { fail(status, "Keychain write failed") }
    writeResponse(Response(ok: true, found: nil, value: nil))
case "read":
    var lookup = query
    lookup[kSecReturnData as String] = true
    lookup[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(lookup as CFDictionary, &result)
    if status == errSecItemNotFound {
        writeResponse(Response(ok: true, found: false, value: nil))
    } else {
        guard status == errSecSuccess, let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            fail(status, "Keychain read failed")
        }
        writeResponse(Response(ok: true, found: true, value: value))
    }
case "delete":
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { fail(status, "Keychain delete failed") }
    writeResponse(Response(ok: true, found: nil, value: nil))
default:
    invalidRequest("Unknown keychain helper operation: \(String(request.operation.prefix(64)))")
}
