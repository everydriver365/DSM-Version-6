i        let config = UISceneConfiguration(
    name: "Default Configuration",
    sessionRole: connectingSceneSession.role
)
config.delegateClass = SceneDelegate.self
return config
}
}
EOF
echo "done"
done
dsm@Kenneths-Mini DSM-Version-6 % cat ~/DSM-Version-6/ios/App/App/CarPlayMessageHandler.swift
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
dsm@Kenneths-Mini DSM-Version-6 %
