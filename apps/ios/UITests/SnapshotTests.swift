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
        XCTAssertTrue(app.descendants(matching: .any)["all-services"].waitForExistence(timeout: 15))
        capture(app, "resident-more")
    }

    func testVisitorPassControls() {
        let app = XCUIApplication()
        app.launchArguments.append("--ui-testing")
        app.launch()
        let email = app.textFields["email"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap()
        email.typeText("resident@nivaasa.app")
        capture(app, "login-filled")
        let password = app.secureTextFields["password"]
        password.tap()
        password.typeText("demo1234\n")
        XCTAssertTrue(app.buttons["Pre-approve a visitor"].waitForExistence(timeout: 20))
        app.buttons["Pre-approve a visitor"].tap()
        XCTAssertTrue(app.staticTexts["Who are you expecting?"].waitForExistence(timeout: 10))
        capture(app, "resident-pass")
        XCTAssertTrue(app.buttons["visitor-type-guest"].exists)
        XCTAssertTrue(app.buttons["Create gate pass"].exists)
        let start = app.buttons["Valid from"].firstMatch
        let original = start.value as? String
        start.tap()
        XCTAssertTrue(app.staticTexts["Dates use India Standard Time."].waitForExistence(timeout: 10))
        capture(app, "resident-date-picker")
        app.buttons["Cancel"].tap()
        XCTAssertEqual(start.value as? String, original)
        app.buttons["Tomorrow"].tap()
        XCTAssertNotEqual(start.value as? String, original)
        start.tap()
        XCTAssertTrue(app.buttons["Done"].waitForExistence(timeout: 5))
        app.buttons["Done"].tap()
        XCTAssertNotEqual(start.value as? String, original)
        for _ in 0..<3 where !app.buttons["visitor-type-delivery"].isHittable { app.swipeDown() }
        app.buttons["visitor-type-delivery"].tap()
        XCTAssertTrue(app.staticTexts["1 hour from now"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["Date"].exists)
        XCTAssertFalse(app.buttons["Valid to"].exists)
        capture(app, "resident-pass-delivery")
        app.buttons["visitor-type-cab"].tap()
        XCTAssertTrue(app.staticTexts["1 hour from now"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["Date"].exists)
        XCTAssertFalse(app.buttons["Valid to"].exists)
        let daily = app.buttons["Daily pickup"]
        for _ in 0..<3 where !daily.isHittable { app.swipeUp() }
        daily.tap()
        XCTAssertTrue(app.buttons["Valid to"].exists)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
