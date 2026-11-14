import CoreImage
import XCTest

final class QRAccessTests: XCTestCase {
    func testGroupPassQRAndGuardFallback() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["NIVAASA_ISOLATED"] == "1",
                          "Run with an isolated test backend on port 3101.")
        continueAfterFailure = false
        let app = signIn("resident")
        XCTAssertTrue(app.buttons["quick-visitors"].waitForExistence(timeout: 15))
        app.buttons["quick-visitors"].tap()
        app.buttons["Invite a group"].tap()
        let names = app.textViews["group-guest-names"]
        XCTAssertTrue(names.waitForExistence(timeout: 10))
        names.tap()
        names.typeText("Native group guest A\nNative group guest B")
        let create = app.buttons["Create group passes"]
        for _ in 0..<4 where !create.isHittable { app.swipeUp() }
        create.tap()
        XCTAssertTrue(app.buttons["Open pass for Native group guest B"].waitForExistence(timeout: 15))
        app.buttons["Open pass for Native group guest A"].tap()
        let qr = app.images["visitor-pass-qr"]
        XCTAssertTrue(qr.waitForExistence(timeout: 10))
        let details = try XCTUnwrap(qr.value as? String)
        XCTAssertTrue(details.contains("Verdant Heights, Home A-402"))
        XCTAssertTrue(details.contains("Invited by Aarav Mehta"))
        XCTAssertTrue(details.contains("India Standard Time"))
        XCTAssertTrue(details.contains("Show this QR to security"))
        let image = try XCTUnwrap(CIImage(data: qr.screenshot().pngRepresentation))
        let detector = try XCTUnwrap(CIDetector(ofType: CIDetectorTypeQRCode, context: nil,
                                                options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]))
        let payload = try XCTUnwrap((detector.features(in: image).first as? CIQRCodeFeature)?.messageString)
        let fields = payload.split(separator: ":")
        XCTAssertEqual(fields.count, 5)
        XCTAssertEqual(fields.prefix(3).joined(separator: ":"), "nivaasa:access:1")
        XCTAssertNotNil(UUID(uuidString: String(fields[3])))
        let code = String(fields[4])
        XCTAssertEqual(code.count, 6)
        let proof = XCTAttachment(screenshot: app.screenshot())
        proof.name = "guest-qr-preview"
        proof.lifetime = .keepAlways
        add(proof)

        app.terminate()
        let gate = signIn("guard")
        let scanner = gate.buttons["scan-visitor-qr"]
        XCTAssertTrue(scanner.waitForExistence(timeout: 15))
        scanner.tap()
        let manual = gate.buttons["Enter code manually"].firstMatch
        XCTAssertTrue(manual.waitForExistence(timeout: 10))
        manual.tap()
        let lookup = gate.textFields["lookup-code"]
        XCTAssertTrue(lookup.waitForExistence(timeout: 5))
        lookup.tap()
        lookup.typeText(code)
        gate.buttons["Find pass"].tap()
        XCTAssertTrue(gate.staticTexts["Native group guest A"].waitForExistence(timeout: 10))
        XCTAssertFalse(gate.staticTexts["Native group guest A checked in."].exists)
        gate.buttons["Record arrival"].tap()
        XCTAssertTrue(gate.staticTexts["Native group guest A checked in."].waitForExistence(timeout: 10))
    }

    private func signIn(_ role: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--isolated-api"]
        app.launch()
        let demo = app.buttons["demo-" + role]
        XCTAssertTrue(demo.waitForExistence(timeout: 10))
        for _ in 0..<4 where !demo.isHittable { app.swipeUp() }
        demo.tap()
        return app
    }
}
