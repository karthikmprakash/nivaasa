import XCTest

final class ResidentManagementTests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testDailyHelpShowsAttendanceAndPrivateReviews() throws {
        let app = try signIn()
        open("household", in: app)
        let person = app.buttons.containing(.staticText, identifier: "Sunita Devi").firstMatch
        reveal(person, in: app)
        person.tap()
        XCTAssertTrue(app.staticTexts["Attendance"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Last 14 days"].exists)
        XCTAssertTrue(app.staticTexts["Verified"].exists)
        let reviews = app.staticTexts["Private household reviews"]
        reveal(reviews, in: app)
        XCTAssertTrue(reviews.isHittable)
    }

    @MainActor
    func testCancelBookingFromMyBookings() async throws {
        try requireIsolatedBackend()
        let bookingID = try await createUpcomingBooking()
        let app = try signIn()
        open("amenities", in: app)
        let bookings = app.buttons["My bookings"]
        reveal(bookings, in: app)
        bookings.tap()
        let action = app.buttons["cancel-booking-" + bookingID]
        reveal(action, in: app)
        action.tap()
        XCTAssertTrue(app.buttons["Keep booking"].waitForExistence(timeout: 5))
        app.buttons["Keep booking"].tap()
        XCTAssertTrue(action.isHittable)
        action.tap()
        let confirmation = app.alerts["Cancel this booking?"].buttons["Cancel booking"]
        XCTAssertTrue(confirmation.waitForExistence(timeout: 5))
        confirmation.tap()
        XCTAssertTrue(app.staticTexts["Booking cancelled."].waitForExistence(timeout: 10))
    }

    private func requireIsolatedBackend() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["NIVAASA_ISOLATED"] == "1",
                          "Run with an isolated test backend on port 3101.")
    }

    private func createUpcomingBooking() async throws -> String {
        let login = try await fixtureRequest("auth/login", body: ["email": "resident@nivaasa.app", "password": "demo1234"])
        let token = try XCTUnwrap(login["token"] as? String)
        let services = try await fixtureRequest("mobile/more", token: token)
        let amenities = try XCTUnwrap(services["amenities"] as? [[String: Any]])
        let amenity = try XCTUnwrap(amenities.first { ($0["price"] as? Int) == 0 })
        let id = try XCTUnwrap(amenity["id"] as? String)
        let time = try XCTUnwrap(amenity["openTime"] as? String)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Asia/Kolkata")
        formatter.dateFormat = "yyyy-MM-dd"
        let date = formatter.string(from: Date().addingTimeInterval(Double(Int.random(in: 10...99)) * 86_400))
        let booking = try await fixtureRequest("amenities/book", token: token, body: ["amenityId": id, "date": date, "startTime": time])
        return try XCTUnwrap(booking["bookingId"] as? String)
    }

    private func fixtureRequest(_ path: String, token: String? = nil, body: [String: String]? = nil) async throws -> [String: Any] {
        let url = try XCTUnwrap(URL(string: "http://localhost:3101/api/" + path))
        var request = URLRequest(url: url)
        if let token { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        if let body {
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let http = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertTrue((200..<300).contains(http.statusCode), "Fixture request failed for " + path)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private func signIn() throws -> XCUIApplication {
        try requireIsolatedBackend()
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--isolated-api"]
        app.launch()
        XCTAssertTrue(app.buttons["demo-resident"].waitForExistence(timeout: 10))
        app.buttons["demo-resident"].tap()
        XCTAssertTrue(app.buttons["Pre-approve a visitor"].waitForExistence(timeout: 20))
        return app
    }

    private func open(_ page: String, in app: XCUIApplication) {
        app.buttons["quick-more"].tap()
        let service = app.buttons["service-" + page]
        XCTAssertTrue(service.waitForExistence(timeout: 5))
        reveal(service, in: app)
        service.tap()
    }

    private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<8 where !element.isHittable { app.swipeUp() }
        XCTAssertTrue(element.isHittable)
    }
}
