import XCTest

final class PlatformPickerTests: XCTestCase {
    func testProviderSelectionAndCustomCompany() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        let email = app.textFields["email"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap()
        email.typeText("resident@nivaasa.app")
        let password = app.secureTextFields["password"]
        password.tap()
        password.typeText("demo1234\n")
        let create = app.buttons["Pre-approve a visitor"]
        XCTAssertTrue(create.waitForExistence(timeout: 20))
        create.tap()
        let cab = app.buttons["Cab"]
        XCTAssertTrue(cab.waitForExistence(timeout: 10))
        cab.tap()
        app.buttons["platform-choice"].tap()
        XCTAssertTrue(app.buttons["Uber"].waitForExistence(timeout: 10))
        capture(app, "cab-platform-picker")
        app.buttons["Uber"].tap()
        XCTAssertTrue(app.buttons["platform-choice"].label.contains("Uber"))
        app.buttons["Delivery"].tap()
        XCTAssertFalse(app.buttons["platform-choice"].label.contains("Uber"))
        app.buttons["platform-choice"].tap()
        let search = app.textFields["platform-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap()
        search.typeText("Zomato")
        XCTAssertTrue(app.buttons["Zomato"].exists)
        app.buttons["Zomato"].tap()
        XCTAssertTrue(app.buttons["platform-choice"].label.contains("Zomato"))
        app.buttons["platform-choice"].tap()
        app.buttons["Add another platform"].tap()
        let custom = app.textFields["Platform or company name"]
        XCTAssertTrue(custom.waitForExistence(timeout: 10))
        custom.tap()
        custom.typeText("Corner grocery")
        app.buttons["Use this platform"].tap()
        XCTAssertTrue(app.buttons["platform-choice"].label.contains("Corner grocery"))
        app.buttons["Cab"].tap()
        XCTAssertTrue(app.buttons["platform-choice"].label.contains("Uber"))
        capture(app, "cab-pass-selected")
        app.buttons["platform-choice"].tap()
        app.buttons["Clear selection"].tap()
        XCTAssertTrue(app.buttons["platform-choice"].label.contains("Select platform"))
        app.buttons["Guest"].tap()
        XCTAssertTrue(app.textFields["Guest name"].exists)
        XCTAssertFalse(app.buttons["platform-choice"].exists)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
