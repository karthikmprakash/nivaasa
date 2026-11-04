import XCTest

final class RoleTests: XCTestCase {
    func testResidentOpensVisitors() {
        let app = signIn(as: "resident")
        XCTAssertFalse(app.buttons["destination-manage"].exists)
        XCTAssertFalse(app.buttons["destination-gate"].exists)
        XCTAssertTrue(app.staticTexts["At your gate"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["Pre-approve a visitor"].exists)
        app.buttons["quick-visitors"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["group-passes"].waitForExistence(timeout: 15))
    }

    func testManagerOpensOverview() {
        let app = signIn(as: "admin")
        XCTAssertTrue(app.buttons["destination-gate"].exists)
        openPrimary(app)
        XCTAssertTrue(app.staticTexts["Open requests"].waitForExistence(timeout: 15))
    }

    func testGuardOpensGateQueue() {
        let app = signIn(as: "guard")
        XCTAssertFalse(app.buttons["destination-manage"].exists)
        openPrimary(app)
        XCTAssertTrue(app.descendants(matching: .any)["group-queue"].waitForExistence(timeout: 15))
    }

    func testHomeShowsLiveGateActions() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["NIVAASA_ISOLATED"] == "1",
                          "Run with an isolated test backend on port 3101.")
        let app = signIn(as: "resident", isolated: true)
        let approve = app.buttons["Approve"].firstMatch
        XCTAssertTrue(approve.waitForExistence(timeout: 15))
        approve.tap()
        XCTAssertTrue(app.staticTexts["Visitor approved"].waitForExistence(timeout: 15))
    }

    func testGuestPassAtGate() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["NIVAASA_ISOLATED"] == "1",
                          "Run with an isolated test backend on port 3101.")
        let resident = signIn(as: "resident", isolated: true)
        resident.buttons["Pre-approve a visitor"].tap()
        let name = resident.textFields["Guest name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10))
        name.tap()
        name.typeText("Native test guest")
        resident.swipeUp()
        resident.buttons["Create pass"].tap()
        let issued = resident.staticTexts["entry-code"]
        XCTAssertTrue(issued.waitForExistence(timeout: 15))
        let code = issued.label
        XCTAssertEqual(code.count, 6)
        resident.terminate()

        let guardApp = signIn(as: "guard", isolated: true)
        openPrimary(guardApp)
        guardApp.buttons["visitor-action"].tap()
        let lookup = guardApp.textFields["lookup-code"]
        XCTAssertTrue(lookup.waitForExistence(timeout: 10))
        lookup.tap()
        lookup.typeText(code)
        guardApp.buttons["Find pass"].tap()
        let record = guardApp.buttons["Record arrival"]
        XCTAssertTrue(record.waitForExistence(timeout: 15))
        record.tap()
        XCTAssertTrue(guardApp.staticTexts["Native test guest checked in."].waitForExistence(timeout: 15))
    }

    private func openPrimary(_ app: XCUIApplication) {
        let button = app.buttons["primary-destination"]
        XCTAssertTrue(button.waitForExistence(timeout: 10))
        button.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }

    private func signIn(as role: String, isolated: Bool = false) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments.append("--ui-testing")
        if isolated { app.launchArguments.append("--isolated-api") }
        app.launch()
        let email = app.textFields["email"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap()
        email.typeText(role + "@nivaasa.app")
        let password = app.secureTextFields["password"]
        password.tap()
        password.typeText("demo1234\n")
        let signedIn = role == "resident" ? app.buttons["Pre-approve a visitor"] : app.navigationBars["Community"]
        XCTAssertTrue(signedIn.waitForExistence(timeout: 15))
        let notNow = app.buttons["Not Now"]
        if notNow.waitForExistence(timeout: 3) {
            notNow.tap()
            XCTAssertTrue(notNow.waitForNonExistence(timeout: 5))
        }
        let capture = XCTAttachment(screenshot: app.screenshot())
        capture.name = role + "-community"
        capture.lifetime = .keepAlways
        add(capture)
        return app
    }
}
