import WebKit
import Foundation

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
