import XCTest

/// These checks deliberately use the same page labels and menu entry points as mobile web.
/// Captures supplement assertions; they are not themselves proof of pixel equality.
final class WebParityTests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testResidentPagesAndAllThreeMenus() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        XCTAssertTrue(app.buttons["demo-resident"].waitForExistence(timeout: 10))
        capture(app, "01-login")
        app.buttons["demo-resident"].tap()
        XCTAssertTrue(app.buttons["Pre-approve a visitor"].waitForExistence(timeout: 20))
        capture(app, "02-home")

        app.buttons["Account menu"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["account-dropdown"].waitForExistence(timeout: 5))
        capture(app, "03-account-menu")
        XCTAssertTrue(app.buttons["destination-settings"].exists)
        XCTAssertFalse(app.staticTexts["Navigation"].exists, "Account must not open the navigation page")
        app.buttons["destination-settings"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["native-page-settings"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Save profile"].waitForExistence(timeout: 10))
        capture(app, "04-settings")
        app.swipeUp()
        capture(app, "settings-profile")
        app.swipeUp()
        capture(app, "settings-preferences")

        app.buttons["Open navigation"].tap()
        XCTAssertTrue(app.buttons["destination-directory"].waitForExistence(timeout: 5))
        capture(app, "05-navigation-drawer")
        app.buttons["destination-directory"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["native-page-directory"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Residents"].waitForExistence(timeout: 8))
        capture(app, "06-directory")

        let pages = [("documents", "Documents"), ("amenities", "Amenities"), ("helpdesk", "Helpdesk"), ("household", "My home"), ("deliveries", "Deliveries"), ("emergency", "Emergency")]
        for (key, title) in pages {
            app.buttons["quick-more"].tap()
            let grid = app.descendants(matching: .any)["all-services"]
            XCTAssertTrue(grid.waitForExistence(timeout: 5))
            if key == "documents" { capture(app, "07-all-services") }
            let target = app.buttons["service-" + key]
            if !target.isHittable { app.swipeUp() }
            XCTAssertTrue(target.waitForExistence(timeout: 5), title)
            target.tap()
            XCTAssertTrue(app.descendants(matching: .any)["native-page-" + key].waitForExistence(timeout: 8), title)
            assertShell(app)
            capture(app, "page-" + key)
            if key == "helpdesk" {
                app.buttons["action-plumbing"].tap()
                XCTAssertTrue(app.buttons["Submit request"].waitForExistence(timeout: 8))
                capture(app, "form-helpdesk")
                app.buttons["Close"].tap()
            }
            app.swipeUp()
            capture(app, "lower-" + key)
            if key == "amenities" {
                let tile = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'amenity-'")).firstMatch
                XCTAssertTrue(tile.waitForExistence(timeout: 10))
                for _ in 0..<6 where !tile.isHittable { app.swipeUp() }
                XCTAssertTrue(tile.isHittable)
                tile.tap()
                XCTAssertTrue(app.buttons["Confirm booking"].waitForExistence(timeout: 10))
                capture(app, "form-amenity-booking")
                app.buttons["Close"].tap()
            }
        }

        app.buttons["quick-community"].tap()
        XCTAssertTrue(app.buttons["Start a discussion"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["section-All updates"].exists)
        capture(app, "08-community-all")
        app.buttons["Start a discussion"].tap()
        XCTAssertTrue(app.buttons["Post discussion"].waitForExistence(timeout: 8))
        capture(app, "form-discussion")
        app.buttons["Close"].tap()
        for tab in ["Notices", "Discussions", "Polls", "Events"] {
            let target = app.buttons["section-" + tab]
            if !target.isHittable { app.swipeLeft() }
            target.tap()
            capture(app, "community-" + tab.lowercased())
        }

        app.buttons["quick-visitors"].tap()
        XCTAssertTrue(app.buttons["Pre-approve"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Active passes"].exists)
        XCTAssertTrue(app.buttons["section-Pre-approved"].exists)
        capture(app, "09-visitors")
        app.buttons["Pre-approve"].tap()
        XCTAssertTrue(app.staticTexts["Who are you expecting?"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["visitor-type-guest"].exists)
        XCTAssertTrue(app.buttons["visitor-type-delivery"].exists)
        XCTAssertTrue(app.buttons["visitor-type-cab"].exists)
        XCTAssertTrue(app.buttons["visitor-type-vendor"].exists)
        XCTAssertTrue(app.buttons["visitor-type-daily_help"].exists)
        capture(app, "form-visitor-pass")
        app.buttons["visitor-type-cab"].tap()
        XCTAssertTrue(app.buttons["platform-choice"].waitForExistence(timeout: 5))
        app.buttons["platform-choice"].tap()
        XCTAssertTrue(app.staticTexts["Choose cab service"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["platform-uber"].exists)
        XCTAssertTrue(app.buttons["platform-ola"].exists)
        XCTAssertTrue(app.buttons["platform-rapido"].exists)
        capture(app, "form-platform-picker")
        app.buttons["platform-uber"].tap()
        XCTAssertTrue(app.buttons["Create gate pass"].waitForExistence(timeout: 5))
        capture(app, "form-cab-pass")
        app.buttons["visitor-type-daily_help"].tap()
        XCTAssertTrue(app.buttons["Register daily help"].waitForExistence(timeout: 5))
        capture(app, "form-daily-help-entry")
        app.buttons["Register daily help"].tap()
        XCTAssertTrue(app.buttons["Register daily help"].waitForExistence(timeout: 5))
        capture(app, "form-daily-help")
        app.buttons["daily-help-close"].tap()
        XCTAssertTrue(app.buttons["visitor-pass-close"].waitForExistence(timeout: 5))
        app.buttons["visitor-pass-close"].tap()
        let preApproved = app.buttons["section-Pre-approved"]
        if preApproved.isHittable { preApproved.tap() }
        capture(app, "visitors-passes")
        app.buttons["quick-pay"].tap()
        XCTAssertTrue(app.buttons["Statement"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["section-Verifications"].waitForExistence(timeout: 10))
        capture(app, "10-payments")
        let pay = app.buttons["Pay overdue"].firstMatch
        for _ in 0..<3 where !pay.isHittable { app.swipeUp() }
        XCTAssertTrue(pay.isHittable, "The seeded resident has a payable invoice")
        pay.tap()
        XCTAssertTrue(app.buttons["Confirm demo payment"].waitForExistence(timeout: 8))
        capture(app, "form-payment")
        app.buttons["Close"].tap()
        app.swipeUp()
        capture(app, "payments-summary-details")

        app.buttons["Search community"].tap()
        XCTAssertTrue(app.textFields["search"].waitForExistence(timeout: 8))
        assertShell(app)
        capture(app, "11-search")
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Notifications'")).firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Your updates"].waitForExistence(timeout: 8) || app.staticTexts["YOUR UPDATES"].exists)
        assertShell(app)
        XCTAssertTrue(app.buttons["Preferences"].exists)
        capture(app, "12-notifications")
    }

    private func assertShell(_ app: XCUIApplication) {
        XCTAssertTrue(app.buttons["Open navigation"].isHittable, "Normal pages must retain the header")
        XCTAssertTrue(app.buttons["quick-home"].isHittable, "Normal pages must retain quick navigation")
        XCTAssertFalse(app.buttons["Close"].isHittable, "Normal pages are not dismissable sheets")
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
