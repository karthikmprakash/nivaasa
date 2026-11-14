import XCTest

final class NotificationTests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testGateAlertPermissionAndPreview() {
        let app = XCUIApplication()
        app.launchArguments = ["--notification-test"]
        app.launch()
        XCTAssertTrue(app.buttons["demo-resident"].waitForExistence(timeout: 15))
        app.buttons["demo-resident"].tap()
        XCTAssertTrue(app.buttons["Pre-approve a visitor"].waitForExistence(timeout: 20))

        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let allow = springboard.buttons["Allow"]
        if allow.waitForExistence(timeout: 6) { allow.tap() }

        app.buttons["Account menu"].tap()
        XCTAssertTrue(app.buttons["destination-settings"].waitForExistence(timeout: 5))
        app.buttons["destination-settings"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["native-page-settings"].waitForExistence(timeout: 8))
        for _ in 0..<4 where !app.buttons["Preview gate alert"].isHittable { app.swipeUp() }
        if app.buttons["enable-gate-alerts"].exists {
            app.buttons["enable-gate-alerts"].tap()
            if allow.waitForExistence(timeout: 5) { allow.tap() }
        }
        XCTAssertTrue(app.buttons["Preview gate alert"].isHittable)
        captureScreen("notification-preferences")
        app.buttons["Preview gate alert"].tap()
        Thread.sleep(forTimeInterval: 2.5)
        captureScreen("gate-alert-preview")
        if app.staticTexts["Preview sent. Check the notification banner."].exists {
            captureScreen("gate-alert-preview-status")
        }
    }

    private func captureScreen(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
