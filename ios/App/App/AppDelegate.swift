import UIKit
import Capacitor
import CarPlay
import WebKit

// MARK: - CarPlay Message Handler
class CarPlayMessageHandler: NSObject, WKScriptMessageHandler {
    static let shared = CarPlayMessageHandler()
    
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: String],
              let key = body["key"],
              let value = body["value"]
        else { return }
        UserDefaults.standard.set(value, forKey: key)
        UserDefaults.standard.synchronize()
        print("[CarPlay] saved \(key) to UserDefaults")
    }
}

// MARK: - App Delegate
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.registerCarPlayBridge()
        }
        return true
    }
    
    func registerCarPlayBridge() {
        guard let webView = findWebView() else { return }
        webView.configuration.userContentController.add(
            CarPlayMessageHandler.shared,
            name: "carplayBridge"
        )
        print("[CarPlay] bridge registered")
    }
    
    func findWebView() -> WKWebView? {
        guard let window = UIApplication.shared.windows.first,
              let rootVC = window.rootViewController else { return nil }
        return findWebViewInView(rootVC.view)
    }
    
    func findWebViewInView(_ view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView { return webView }
        for subview in view.subviews {
            if let found = findWebViewInView(subview) { return found }
        }
        return nil
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        if connectingSceneSession.role == UISceneSession.Role.carTemplateApplication {
            let config = UISceneConfiguration(name: "CarPlay Configuration", sessionRole: connectingSceneSession.role)
            config.delegateClass = CarPlaySceneDelegate.self
            return config
        }
        let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
