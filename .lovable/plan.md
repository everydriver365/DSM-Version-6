# Add a real OneSignal Notification Service Extension to the iOS project

## What I verified in the project

- `@onesignal/capacitor-plugin` and `@capawesome/capacitor-badge` are both wired into `ios/App/CapApp-SPM/Package.swift`, and `OneSignal-XCFramework 5.5.5` is already resolved in `Package.resolved`.
- `ios/App/App.xcodeproj/project.pbxproj` contains exactly one target (`App`). There is no notification service extension target, no extension group, no `NotificationService.swift`, and no app-extension build configuration.
- `ios/App/App/App.entitlements` currently contains only `aps-environment` and the CarPlay entitlement. **It does not contain the App Group `group.co.uk.everydriver.app.onesignal`** — contrary to the diagnosis in the request. This matters: the OneSignal extension and app share badge/notification state through that group.
- `Info.plist` already has `remote-notification` background mode, so no change is needed there.
- There is no `xcuserdata` directory in the repo, so no stale scheme file exists to remove here (any stale scheme lives only on the local machine and is gitignored).

One honest caveat: an absolute `ios_badgeType` / `ios_badgeCount` payload sets the app icon badge without any extension. So the extension is worth adding (OneSignal recommends it for confirmed delivery, media, and badge increment handling), but the missing App Group entitlement — and any mismatch between the badge the payload carries and what the device shows — is the likelier cause of the icon never badging. The plan adds the extension as asked and fixes the entitlement gap that supports it.

## Changes

1. **New extension sources** under `ios/App/OneSignalNotificationServiceExtension/`
   - `NotificationService.swift` — the standard OneSignal 5.x implementation: subclass `UNNotificationServiceExtension`, hold `contentHandler` and `bestAttemptContent`, call `OneSignalExtension.didReceiveNotificationExtensionRequest(_:with:withContentHandler:)` in `didReceive`, and `serviceExtensionTimeWillExpire` fallback via `OneSignalExtension.serviceExtensionTimeWillExpireRequest`.
   - `Info.plist` — `NSExtension` with point `com.apple.usernotifications.service` and principal class `NotificationService`.
   - `OneSignalNotificationServiceExtension.entitlements` — `com.apple.security.application-groups` containing `group.co.uk.everydriver.app.onesignal`.

2. **`ios/App/App/App.entitlements`** — add the same `com.apple.security.application-groups` array with `group.co.uk.everydriver.app.onesignal`, keeping the existing `aps-environment` and CarPlay keys untouched.

3. **`ios/App/App.xcodeproj/project.pbxproj`** — add, by hand-editing the pbxproj:
   - a `PBXNativeTarget` `OneSignalNotificationServiceExtension` of type `com.apple.product-type.app-extension`, product `OneSignalNotificationServiceExtension.appex`;
   - Sources / Frameworks / Resources build phases for it;
   - a remote SPM package reference to `OneSignal-XCFramework` pinned to the already-resolved `5.5.5`, with the extension depending on the `OneSignalExtension` product;
   - Debug/Release build configurations: bundle id `co.uk.everydriver.app.OneSignalNotificationServiceExtension`, `DEVELOPMENT_TEAM = M6M2KJG8YT`, automatic signing, deployment target 15.0, `SKIP_INSTALL = YES`, its own `CODE_SIGN_ENTITLEMENTS` and `INFOPLIST_FILE`, matching `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` with the app;
   - an `Embed App Extensions` copy-files build phase on the `App` target plus a target dependency, so the extension ships in every build and archive.

4. **`Package.resolved`** — leave as is; the OneSignal pin already exists at 5.5.5 and Xcode will reuse it.

## Verification

- Re-grep `project.pbxproj` for `OneSignalNotificationServiceExtension`, `app-extension`, `OneSignalExtension`, and the embed phase.
- Confirm the app group string appears in both entitlements files.
- Parse the pbxproj with `plutil -lint`-equivalent validation to prove the file is still well-formed.
- Run the project typecheck/build validation, then `npx cap sync ios`.

## Manual Xcode steps that will remain

- In the Apple Developer account, add `group.co.uk.everydriver.app.onesignal` to both the app id and the new extension app id, and let Xcode regenerate provisioning profiles (Signing & Capabilities → automatic signing will prompt).
- First open of the project after the change: let Xcode resolve Swift packages so the extension links `OneSignalExtension`.
- Archive from Xcode to confirm the `.appex` is embedded and signed.
