import XCTest

final class SnapshotTests: XCTestCase {
    func testResidentScreens() {
        let app = XCUIApplication()
        app.launchArguments.append("--ui-testing")
        app.launch()
        let email = app.textFields["email"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap()
        email.typeText("resident@nivaasa.app")
        let password = app.secureTextFields["password"]
        password.tap()
        password.typeText("demo1234\n")
        XCTAssertTrue(app.buttons["Pre-approve a visitor"].waitForExistence(timeout: 20))
        capture(app, "resident-home")

        app.buttons["quick-community"].tap()
        XCTAssertTrue(app.staticTexts["Community"].waitForExistence(timeout: 15))
        capture(app, "resident-community")

        app.buttons["quick-visitors"].tap()
        XCTAssertTrue(app.staticTexts["Visitors"].waitForExistence(timeout: 15))
        capture(app, "resident-visitors")

        app.buttons["quick-pay"].tap()
        XCTAssertTrue(app.staticTexts["Payments"].waitForExistence(timeout: 15))
        capture(app, "resident-payments")

        app.buttons["quick-more"].tap()
        XCTAssertTrue(app.staticTexts["More"].waitForExistence(timeout: 15))
        capture(app, "resident-more")
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
