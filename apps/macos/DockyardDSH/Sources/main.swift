import Cocoa
import Darwin
import Foundation
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var webPort = 3080
    private var window: NSWindow!
    private var webView: WKWebView!
    private var dshProcess: Process?
    private var logHandle: FileHandle?
    private var stopping = false
    private var readyURL: URL?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        createWindow()
        startDockyardRuntime()
    }

    func applicationWillTerminate(_ notification: Notification) {
        stopping = true
        stopDockyardRuntime()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func createWindow() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Dockyard DSH"
        window.minSize = NSSize(width: 900, height: 620)
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        showLoading(message: "Starting Dockyard DSH…")
    }

    private func resolveWebPort() throws -> Int {
        let environment = ProcessInfo.processInfo.environment
        let override = environment["DOCKYARD_DSH_PORT"]?.trimmingCharacters(in: .whitespacesAndNewlines)
        let requested = Int(override ?? "3080") ?? 3080
        let preferred = requested > 0 ? requested : 3080
        if portIsAvailable(preferred) { return preferred }
        if override != nil {
            throw AppError.portUnavailable(preferred)
        }
        if preferred < 65535 {
            for candidate in (preferred + 1)...min(preferred + 100, 65535) where portIsAvailable(candidate) {
                return candidate
            }
        }
        throw AppError.portUnavailable(preferred)
    }

    private func portIsAvailable(_ port: Int) -> Bool {
        guard (1...65535).contains(port) else { return false }
        let descriptor = socket(AF_INET, SOCK_STREAM, 0)
        guard descriptor >= 0 else { return false }
        defer { close(descriptor) }
        var address = sockaddr_in()
        address.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = in_port_t(port).bigEndian
        inet_pton(AF_INET, "127.0.0.1", &address.sin_addr)
        let result = withUnsafePointer(to: &address) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.bind(descriptor, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        return result == 0
    }

    private func runtimeArchitecture() -> String {
        #if arch(arm64)
        return "arm64"
        #elseif arch(x86_64)
        return "x64"
        #else
        return "unsupported"
        #endif
    }

    private func startDockyardRuntime() {
        do {
            webPort = try resolveWebPort()
            let home = try prepareUserHome()
            let resources = try resourceDirectory()
            let runtime = resources.appendingPathComponent("runtime", isDirectory: true)
            let node = runtime.appendingPathComponent("node-\(runtimeArchitecture())")
            let dshEntry = runtime
                .appendingPathComponent("dsh", isDirectory: true)
                .appendingPathComponent("node_modules", isDirectory: true)
                .appendingPathComponent("@deepseek-ai", isDirectory: true)
                .appendingPathComponent("dsh", isDirectory: true)
                .appendingPathComponent("lib", isDirectory: true)
                .appendingPathComponent("bin.js")

            guard FileManager.default.isExecutableFile(atPath: node.path) else {
                throw AppError.missingResource("Embedded Node runtime")
            }
            guard FileManager.default.fileExists(atPath: dshEntry.path) else {
                throw AppError.missingResource("Embedded DSH runtime")
            }

            let logURL = home.deletingLastPathComponent().appendingPathComponent("Logs", isDirectory: true)
                .appendingPathComponent("dockyard-dsh.log")
            try FileManager.default.createDirectory(at: logURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
            logHandle = try FileHandle(forWritingTo: logURL)
            try logHandle?.seekToEnd()

            let pipe = Pipe()
            pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
                let data = handle.availableData
                guard !data.isEmpty else { return }
                self?.appendLog(data)
            }

            let process = Process()
            process.executableURL = node
            process.arguments = [dshEntry.path, "--profile", "web", "--host", "127.0.0.1", "--port", String(webPort)]
            process.currentDirectoryURL = runtime
            var environment = ProcessInfo.processInfo.environment
            environment["DSH_HOME"] = home.path
            environment["PATH"] = [
                runtime.appendingPathComponent("bin").path,
                "/usr/bin",
                "/bin",
                "/usr/sbin",
                "/sbin"
            ].joined(separator: ":")
            environment["NODE_NO_WARNINGS"] = "1"
            process.environment = environment
            process.standardOutput = pipe
            process.standardError = pipe
            process.terminationHandler = { [weak self] process in
                DispatchQueue.main.async {
                    guard let self, !self.stopping else { return }
                    self.showError("The Dockyard DSH service stopped (exit code \(process.terminationStatus)).")
                }
            }
            dshProcess = process
            try process.run()
            pollForWebServer(attempt: 0)
        } catch {
            showError(error.localizedDescription)
        }
    }

    private func stopDockyardRuntime() {
        logHandle?.closeFile()
        logHandle = nil
        guard let process = dshProcess, process.isRunning else { return }
        process.terminate()
        let pid = process.processIdentifier
        DispatchQueue.global().asyncAfter(deadline: .now() + 3) {
            if process.isRunning { kill(pid, SIGKILL) }
        }
    }

    private func pollForWebServer(attempt: Int) {
        guard !stopping else { return }
        let url = URL(string: "http://127.0.0.1:\(webPort)/")!
        URLSession.shared.dataTask(with: url) { [weak self] _, response, error in
            DispatchQueue.main.async {
                guard let self, !self.stopping else { return }
                if let http = response as? HTTPURLResponse, (200..<500).contains(http.statusCode) {
                    self.readyURL = url
                    self.webView.load(URLRequest(url: url))
                    return
                }
                if attempt >= 120 {
                    self.showError("The local DSH Web service did not become ready. Check the log at ~/Library/Application Support/Dockyard DSH/Logs/dockyard-dsh.log.")
                    return
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.pollForWebServer(attempt: attempt + 1)
                }
            }
        }.resume()
    }

    private func prepareUserHome() throws -> URL {
        let appSupport: URL
        if let override = ProcessInfo.processInfo.environment["DOCKYARD_DSH_HOME"], !override.isEmpty {
            appSupport = URL(fileURLWithPath: override, isDirectory: true)
        } else {
            appSupport = try FileManager.default.url(
                for: .applicationSupportDirectory,
                in: .userDomainMask,
                appropriateFor: nil,
                create: true
            ).appendingPathComponent("Dockyard DSH", isDirectory: true)
        }
        let home = appSupport.appendingPathComponent("dsh-home", isDirectory: true)
        try FileManager.default.createDirectory(at: appSupport, withIntermediateDirectories: true)
        let profile = home.appendingPathComponent("profiles", isDirectory: true)
            .appendingPathComponent("web", isDirectory: true)
        let resources = try resourceDirectory()
        let bundledHome = resources.appendingPathComponent("dsh-home", isDirectory: true)
        let bundledProfile = bundledHome.appendingPathComponent("profiles", isDirectory: true)
            .appendingPathComponent("web", isDirectory: true)
        guard FileManager.default.fileExists(atPath: bundledProfile.path) else {
            throw AppError.missingResource("Bundled Web profile")
        }
        if !FileManager.default.fileExists(atPath: profile.path) {
            if FileManager.default.fileExists(atPath: home.path) {
                try FileManager.default.createDirectory(at: home.appendingPathComponent("profiles", isDirectory: true), withIntermediateDirectories: true)
                try FileManager.default.copyItem(at: bundledProfile, to: profile)
            } else {
                try FileManager.default.copyItem(at: bundledHome, to: home)
            }
        }
        try synchronizeKeychainHelper(from: bundledProfile, to: profile)
        return home
    }

    private func synchronizeKeychainHelper(from bundledProfile: URL, to profile: URL) throws {
        let relativePath = "node_modules/@dockyard-dsh/plugin/packages/dsh-plugin/dist/macos-keychain-helper.swift"
        let bundledHelper = bundledProfile.appendingPathComponent(relativePath)
        let installedHelper = profile.appendingPathComponent(relativePath)
        guard FileManager.default.fileExists(atPath: bundledHelper.path) else {
            throw AppError.missingResource("Bundled macOS Keychain helper")
        }
        try FileManager.default.createDirectory(at: installedHelper.deletingLastPathComponent(), withIntermediateDirectories: true)
        let bundledData = try Data(contentsOf: bundledHelper)
        if let installedData = try? Data(contentsOf: installedHelper), installedData == bundledData {
            return
        }
        if FileManager.default.fileExists(atPath: installedHelper.path) {
            try FileManager.default.removeItem(at: installedHelper)
        }
        try FileManager.default.copyItem(at: bundledHelper, to: installedHelper)
    }

    private func resourceDirectory() throws -> URL {
        guard let url = Bundle.main.resourceURL else {
            throw AppError.missingResource("Application resources")
        }
        return url
    }

    private func appendLog(_ data: Data) {
        try? logHandle?.write(contentsOf: data)
        if let text = String(data: data, encoding: .utf8) {
            FileHandle.standardError.write(Data("[Dockyard DSH] \(text)".utf8))
        }
    }

    private func showLoading(message: String) {
        let html = """
        <!doctype html><html><head><meta charset=\"utf-8\"><style>
        body{margin:0;background:#101010;color:#f5f5f5;font:16px -apple-system,BlinkMacSystemFont,sans-serif;display:grid;place-items:center;height:100vh}
        main{text-align:center;max-width:520px;padding:32px} .spinner{margin:0 auto 20px;width:28px;height:28px;border:3px solid #444;border-top-color:#4b6bff;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        </style></head><body><main><div class=\"spinner\"></div><div>\(message)</div></main></body></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    private func showError(_ message: String) {
        let escaped = message
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        let html = """
        <!doctype html><html><head><meta charset=\"utf-8\"><style>
        body{margin:0;background:#101010;color:#f5f5f5;font:16px -apple-system,BlinkMacSystemFont,sans-serif;display:grid;place-items:center;height:100vh}
        main{max-width:650px;padding:36px}h1{font-size:22px}p{color:#bbb;line-height:1.6}code{color:#9db0ff}
        </style></head><body><main><h1>Dockyard DSH could not start</h1><p>\(escaped)</p><p>Quit and try again, or inspect the application log in <code>~/Library/Application Support/Dockyard DSH/Logs</code>.</p></main></body></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }
}

enum AppError: LocalizedError {
    case missingResource(String)
    case portUnavailable(Int)

    var errorDescription: String? {
        switch self {
        case .missingResource(let name): return "Missing \(name) in the application bundle. Reinstall Dockyard DSH."
        case .portUnavailable(let port): return "Port \(port) is already in use. Quit the other local Web service and try again."
        }
    }
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.run()
