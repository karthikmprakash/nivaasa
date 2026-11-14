import XCTest

final class TicketDetailTests: XCTestCase {
    func testResidentOpensRequestFromHomeAndReplies() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["NIVAASA_ISOLATED"] == "1",
                          "Run with an isolated test backend on port 3101.")
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--isolated-api"]
        app.launch()
        XCTAssertTrue(app.buttons["demo-resident"].waitForExistence(timeout: 10))
        app.buttons["demo-resident"].tap()
        XCTAssertTrue(app.buttons["Pre-approve a visitor"].waitForExistence(timeout: 20))
        let ticket = app.buttons.containing(.staticText, identifier: "Kitchen tap is leaking continuously").firstMatch
        for _ in 0..<10 where !ticket.isHittable { app.swipeUp() }
        XCTAssertTrue(ticket.isHittable)
        ticket.tap()
        XCTAssertTrue(app.navigationBars["Request details"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Conversation"].waitForExistence(timeout: 10))
        let capture = XCTAttachment(screenshot: app.screenshot())
        capture.name = "request-detail"
        capture.lifetime = .keepAlways
        add(capture)
        let replyButton = app.buttons["Reply to the helpdesk"]
        for _ in 0..<4 where !replyButton.isHittable { app.swipeUp() }
        XCTAssertTrue(replyButton.isHittable)
        replyButton.tap()
        let reply = app.textViews["ticket-reply"]
        for _ in 0..<4 where !reply.isHittable { app.swipeUp() }
        XCTAssertTrue(reply.isHittable)
        reply.tap()
        reply.typeText("The leak is still visible this morning.")
        let send = app.buttons["Send reply"]
        for _ in 0..<3 where !send.isHittable { app.swipeUp() }
        XCTAssertTrue(send.isHittable)
        send.tap()
        XCTAssertTrue(app.navigationBars["Request details"].waitForExistence(timeout: 10))
        for _ in 0..<4 where !app.staticTexts["Reply sent."].isHittable { app.swipeDown() }
        XCTAssertTrue(app.staticTexts["Reply sent."].exists)
        app.navigationBars["Request details"].buttons.firstMatch.tap()
        XCTAssertTrue(app.buttons["action-plumbing"].waitForExistence(timeout: 10))
    }
}
