import CarPlay
import UIKit
import Foundation
import WebKit

// MARK: - CarPlay Lesson Model

struct CarPlayLesson {
    let id: String
    let pupilName: String
    let time: String
    let date: String
    let address: String
    let phone: String?
    let isTest: Bool
}

// MARK: - CarPlay Bridge

class CarPlayBridge: NSObject, WKScriptMessageHandler {

    static let shared = CarPlayBridge()

    private var nextLesson: CarPlayLesson?
    private var todayLessons: [CarPlayLesson] = []

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard
            let body = message.body as? [String: String],
            let key = body["key"],
            let value = body["value"]
        else {
            return
        }

        UserDefaults.standard.set(value, forKey: key)
        UserDefaults.standard.synchronize()
    }

    // MARK: - Next Lesson

    static func getNextLesson() -> CarPlayLesson? {

        guard
            let jsonString = UserDefaults.standard.string(
                forKey: "dsm_next_lesson"
            ),
            let data = jsonString.data(using: .utf8),
            let json = try? JSONSerialization.jsonObject(
                with: data
            ) as? [String: Any]
        else {
            return nil
        }

        return CarPlayLesson(
            id: json["id"] as? String ?? "",
            pupilName: json["pupilName"] as? String ?? "Pupil",
            time: json["time"] as? String ?? "",
            date: json["date"] as? String ?? "",
            address: json["address"] as? String ?? "",
            phone: json["phone"] as? String,
            isTest: json["isTest"] as? Bool ?? false
        )
    }

    // MARK: - Today's Lessons

    static func getTodayLessons() -> [CarPlayLesson] {

        guard
            let jsonString = UserDefaults.standard.string(
                forKey: "dsm_today_lessons"
            ),
            let data = jsonString.data(using: .utf8),
            let json = try? JSONSerialization.jsonObject(
                with: data
            ) as? [[String: Any]]
        else {
            return []
        }

        return json.compactMap { item in

            CarPlayLesson(
                id: item["id"] as? String ?? "",
                pupilName: item["pupilName"] as? String ?? "Pupil",
                time: item["time"] as? String ?? "",
                date: item["date"] as? String ?? "",
                address: item["address"] as? String ?? "",
                phone: item["phone"] as? String,
                isTest: item["isTest"] as? Bool ?? false
            )
        }
    }

    // MARK: - Sync From WebView

    static func syncFromWebView() {

        DispatchQueue.main.async {

            guard let webView = findWebView() else {
                return
            }

            let js = """
            (function() {
                var next = localStorage.getItem('dsm_next_lesson');
                var today = localStorage.getItem('dsm_today_lessons');

                if (next) {
                    window.webkit.messageHandlers.carplayBridge.postMessage({
                        key: 'dsm_next_lesson',
                        value: next
                    });
                }

                if (today) {
                    window.webkit.messageHandlers.carplayBridge.postMessage({
                        key: 'dsm_today_lessons',
                        value: today
                    });
                }
            })();
            """

            webView.evaluateJavaScript(
                js,
                completionHandler: nil
            )
        }
    }

    // MARK: - Find WebView

    static func findWebView() -> WKWebView? {

        guard
            let scene = UIApplication.shared.connectedScenes
                .filter({
                    $0.activationState == .foregroundActive
                })
                .compactMap({
                    $0 as? UIWindowScene
                })
                .first,
            let window = scene.windows.first(where: {
                $0.isKeyWindow
            }),
            let rootVC = window.rootViewController
        else {
            return nil
        }

        return findWebViewInView(rootVC.view)
    }

    static func findWebViewInView(
        _ view: UIView
    ) -> WKWebView? {

        if let webView = view as? WKWebView {
            return webView
        }

        for subview in view.subviews {

            if let found = findWebViewInView(subview) {
                return found
            }
        }

        return nil
    }
}

// MARK: - CarPlay Scene Delegate

class CarPlaySceneDelegate:
    UIResponder,
    CPTemplateApplicationSceneDelegate {

    var interfaceController: CPInterfaceController?
    var refreshTimer: Timer?

    // MARK: - Connected

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {

        self.interfaceController = interfaceController

        // Sync the latest lesson data first
        CarPlayBridge.syncFromWebView()

        showTabBar()

        refreshTimer = Timer.scheduledTimer(
            withTimeInterval: 60,
            repeats: true
        ) { [weak self] _ in

            CarPlayBridge.syncFromWebView()

            DispatchQueue.main.asyncAfter(
                deadline: .now() + 0.5
            ) {
                self?.showTabBar()
            }
        }
    }

    // MARK: - Disconnected

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {

        self.interfaceController = nil

        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    // MARK: - Main Tab Bar

    func showTabBar() {

        guard let interfaceController = interfaceController else {
            return
        }

        let home = makeHomeTemplate()
        let lessons = makeLessonsTemplate()
        let radio = makeRadioTemplate()
        let quickActions = makeQuickActionsTemplate()

        let tabBar = CPTabBarTemplate(
            templates: [
                home,
                lessons,
                radio,
                quickActions
            ]
        )

        interfaceController.setRootTemplate(
            tabBar,
            animated: false,
            completion: nil
        )
    }

    // MARK: - Home

    func makeHomeTemplate() -> CPGridTemplate {

        let lesson = CarPlayBridge.getNextLesson()

        var buttons: [CPGridButton] = []

        // Navigate

        let navigateButton = CPGridButton(
            titleVariants: ["Navigate"],
            image: UIImage(
                systemName: "map.fill"
            ) ?? UIImage()
        ) { [weak self] _ in

            guard
                let address = lesson?.address,
                !address.isEmpty
            else {
                return
            }

            self?.navigateTo(address)
        }

        buttons.append(navigateButton)

        // Call

        let callTitle =
            lesson?.pupilName
                .components(separatedBy: " ")
                .first
            ?? "Call"

        let callButton = CPGridButton(
            titleVariants: [callTitle],
            image: UIImage(
                systemName: "phone.fill"
            ) ?? UIImage()
        ) { _ in

            guard let phone = lesson?.phone else {
                return
            }

            let number = phone.filter {
                $0.isNumber
            }

            guard
                !number.isEmpty,
                let url = URL(
                    string: "tel://\(number)"
                )
            else {
                return
            }

            UIApplication.shared.open(url)
        }

        buttons.append(callButton)

        // Lessons

        let lessonsButton = CPGridButton(
            titleVariants: ["Lessons"],
            image: UIImage(
                systemName: "calendar"
            ) ?? UIImage()
        ) { [weak self] _ in

            self?.showLessonsPage()
        }

        buttons.append(lessonsButton)

        // DSM Radio

        let radioButton = CPGridButton(
            titleVariants: ["EDP Radio"],
            image: UIImage(
                systemName: "radio"
            ) ?? UIImage()
        ) { [weak self] _ in

            self?.showRadioPage()
        }

        buttons.append(radioButton)

        // Title

        let title: String

        if let lesson = lesson {

            title =
                (lesson.isTest ? "TEST" : "NEXT")
                + " - "
                + lesson.time
                + " - "
                + lesson.pupilName

        } else {

            title = "Every Driver Pro"
        }

        let template = CPGridTemplate(
            title: title,
            gridButtons: buttons
        )

        template.tabImage = UIImage(
            systemName: "house.fill"
        )

        return template
    }

    // MARK: - Lessons

    func makeLessonsTemplate() -> CPListTemplate {

        let lessons = CarPlayBridge.getTodayLessons()

        var sections: [CPListSection] = []

        if lessons.isEmpty {

            let item = CPListItem(
                text: "No lessons today",
                detailText: "Enjoy your day off!"
            )

            let section = CPListSection(
                items: [item],
                header: "Today",
                sectionIndexTitle: nil
            )

            sections.append(section)

        } else {

            let items = lessons.map {
                lesson -> CPListItem in

                let prefix =
                    lesson.isTest
                    ? "Test"
                    : "Lesson"

                let item = CPListItem(
                    text: "\(prefix) - \(lesson.pupilName)",
                    detailText:
                        "\(lesson.time) - \(lesson.address)"
                )

                item.handler = {
                    [weak self] _, completion in

                    self?.showLessonDetail(lesson)

                    completion()
                }

                return item
            }

            let lessonWord =
                lessons.count == 1
                ? "lesson"
                : "lessons"

            let header =
                "Today - \(lessons.count) \(lessonWord)"

            let section = CPListSection(
                items: items,
                header: header,
                sectionIndexTitle: nil
            )

            sections.append(section)
        }

        let template = CPListTemplate(
            title: "Lessons",
            sections: sections
        )

        template.tabImage = UIImage(
            systemName: "calendar"
        )

        return template
    }

    // MARK: - DSM Radio

    func makeRadioTemplate() -> CPListTemplate {

        let playItem = CPListItem(
            text: "EDP Radio",
            detailText: "Listen live"
        )

        playItem.handler = {
            [weak self] _, completion in

            self?.showNowPlaying()

            completion()
        }

        let infoItem = CPListItem(
            text: "EDP Radio",
            detailText: "Driving news, tips and music"
        )

        let section = CPListSection(
            items: [
                playItem,
                infoItem
            ],
            header: "EDP Radio",
            sectionIndexTitle: nil
        )

        let template = CPListTemplate(
            title: "EDP Radio",
            sections: [section]
        )

        template.tabImage = UIImage(
            systemName: "radio"
        )

        return template
    }

    // MARK: - Now Playing

    func showNowPlaying() {

        guard
            let interfaceController = interfaceController
        else {
            return
        }

        // IMPORTANT:
        // CPNowPlayingTemplate must be presented,
        // not pushed as a normal navigation template.

        interfaceController.presentTemplate(
            CPNowPlayingTemplate.shared,
            animated: true,
            completion: nil
        )
    }

    // MARK: - Quick Actions

    func makeQuickActionsTemplate() -> CPListTemplate {

        let lesson = CarPlayBridge.getNextLesson()

        var sections: [CPListSection] = []

        var lessonActions: [CPListItem] = []

        // Mark Arrived

        let arrived = CPListItem(
            text: "Mark arrived",
            detailText: "Send arrival notification"
        )

        arrived.handler = { _, completion in

            guard
                let phone = lesson?.phone,
                let name = lesson?.pupilName
                    .components(separatedBy: " ")
                    .first
            else {

                completion()
                return
            }

            let message =
                "Hi \(name), I am outside!"

            let number =
                phone.filter {
                    $0.isNumber
                }

            guard
                !number.isEmpty,
                let encodedMessage =
                    message.addingPercentEncoding(
                        withAllowedCharacters:
                            .urlQueryAllowed
                    ),
                let url = URL(
                    string:
                        "sms:\(number)?body=\(encodedMessage)"
                )
            else {

                completion()
                return
            }

            UIApplication.shared.open(url)

            completion()
        }

        lessonActions.append(arrived)

        // Running Late / Call

        if
            let phone = lesson?.phone,
            let name = lesson?.pupilName
                .components(separatedBy: " ")
                .first
        {

            let late = CPListItem(
                text: "Running late",
                detailText: "Message \(name)"
            )

            late.handler = { _, completion in

                let message =
                    "Hi \(name), running a few minutes late!"

                let number =
                    phone.filter {
                        $0.isNumber
                    }

                if
                    let encodedMessage =
                        message.addingPercentEncoding(
                            withAllowedCharacters:
                                .urlQueryAllowed
                        ),
                    let url = URL(
                        string:
                            "sms:\(number)?body=\(encodedMessage)"
                    )
                {

                    UIApplication.shared.open(url)
                }

                completion()
            }

            let call = CPListItem(
                text: "Call \(name)",
                detailText: phone
            )

            call.handler = { _, completion in

                let number =
                    phone.filter {
                        $0.isNumber
                    }

                if let url = URL(
                    string: "tel://\(number)"
                ) {

                    UIApplication.shared.open(url)
                }

                completion()
            }

            lessonActions.append(late)
            lessonActions.append(call)
        }

        // Cancel

        let cancel = CPListItem(
            text: "Cancel lesson",
            detailText: "Report cancellation"
        )

        cancel.handler = { _, completion in
            completion()
        }

        lessonActions.append(cancel)

        // No Show

        let noShow = CPListItem(
            text: "No show",
            detailText: "Pupil did not appear"
        )

        noShow.handler = { _, completion in
            completion()
        }

        lessonActions.append(noShow)

        let lessonSection = CPListSection(
            items: lessonActions,
            header: "Lesson Actions",
            sectionIndexTitle: nil
        )

        sections.append(lessonSection)

        // Navigation

        var navigationItems: [CPListItem] = []

        if
            let address = lesson?.address,
            !address.isEmpty
        {

            let navigate = CPListItem(
                text: "Navigate to lesson",
                detailText: address
            )

            navigate.handler = {
                [weak self] _, completion in

                self?.navigateTo(address)

                completion()
            }

            navigationItems.append(navigate)
        }

        let navigateHome = CPListItem(
            text: "Navigate home",
            detailText: "Open Maps"
        )

        navigateHome.handler = { _, completion in

            if let url = URL(
                string: "maps://?dirflg=d"
            ) {

                UIApplication.shared.open(url)
            }

            completion()
        }

        navigationItems.append(navigateHome)

        let navigationSection = CPListSection(
            items: navigationItems,
            header: "Navigation",
            sectionIndexTitle: nil
        )

        sections.append(navigationSection)

        let template = CPListTemplate(
            title: "Quick",
            sections: sections
        )

        template.tabImage = UIImage(
            systemName: "bolt.fill"
        )

        return template
    }

    // MARK: - Pages

    func showLessonsPage() {

        guard let interfaceController = interfaceController else {
            return
        }

        interfaceController.pushTemplate(
            makeLessonsTemplate(),
            animated: true,
            completion: nil
        )
    }

    func showRadioPage() {

        guard let interfaceController = interfaceController else {
            return
        }

        interfaceController.pushTemplate(
            makeRadioTemplate(),
            animated: true,
            completion: nil
        )
    }

    // MARK: - Lesson Detail

    func showLessonDetail(
        _ lesson: CarPlayLesson
    ) {

        var items: [CPInformationItem] = [

            CPInformationItem(
                title: "Pupil",
                detail: lesson.pupilName
            ),

            CPInformationItem(
                title: "Time",
                detail: lesson.time
            ),

            CPInformationItem(
                title: "Pickup",
                detail: lesson.address
            )
        ]

        if lesson.isTest {

            items.append(
                CPInformationItem(
                    title: "Type",
                    detail: "Driving Test"
                )
            )
        }

        if let phone = lesson.phone {

            items.append(
                CPInformationItem(
                    title: "Phone",
                    detail: phone
                )
            )
        }

        var actions: [CPTextButton] = [

            CPTextButton(
                title: "Navigate",
                textStyle: .confirm
            ) { [weak self] _ in

                self?.navigateTo(
                    lesson.address
                )
            }
        ]

        if let phone = lesson.phone {

            let callButton = CPTextButton(
                title: "Call",
                textStyle: .normal
            ) { _ in

                let number =
                    phone.filter {
                        $0.isNumber
                    }

                if let url = URL(
                    string: "tel://\(number)"
                ) {

                    UIApplication.shared.open(url)
                }
            }

            actions.append(callButton)

            let textButton = CPTextButton(
                title: "Text",
                textStyle: .normal
            ) { _ in

                let number =
                    phone.filter {
                        $0.isNumber
                    }

                if let url = URL(
                    string: "sms:\(number)"
                ) {

                    UIApplication.shared.open(url)
                }
            }

            actions.append(textButton)
        }

        let template = CPInformationTemplate(
            title: lesson.pupilName,
            layout: .leading,
            items: items,
            actions: actions
        )

        interfaceController?.pushTemplate(
            template,
            animated: true,
            completion: nil
        )
    }

    // MARK: - Navigation

    func navigateTo(
        _ address: String
    ) {

        guard
            !address.isEmpty,
            let encodedAddress =
                address.addingPercentEncoding(
                    withAllowedCharacters:
                        .urlQueryAllowed
                ),
            let url = URL(
                string:
                    "maps://?daddr=\(encodedAddress)&dirflg=d"
            )
        else {
            return
        }

        UIApplication.shared.open(url)
    }
}
