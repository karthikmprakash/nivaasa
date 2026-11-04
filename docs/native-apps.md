# Nivaasa native apps

Nivaasa uses one iOS app and one Android app. The account's active community membership determines which sections are visible. The web API remains responsible for authorizing each request.

Both native clients now use the mobile web design system: Plus Jakarta Sans, royal blue actions, cool neutral surfaces and blush accents, with the same five-tab shell, warm eyebrows, card hierarchy and pink attention statistics. Home loads the live gate queue, dues, notices, deliveries, polls and requests; residents can approve, deny or hold deliveries at the gate from Home. Visitors supports waiting approvals, active passes, history, daily help and creating signed-in passes. Community supports notices, discussions, polls, events and native poll voting. Payments supports invoice history and the demo payment flow. More covers the profile, directory, documents, amenities, deliveries and notifications.

Guards and managers get live gate and management dashboards with the same visual system and six-digit pass verification. Authoring flows that remain web-only include billing runs, resident and staff administration, communications publishing, patrol configuration and society settings. Native sessions last until the process exits or the user signs out.

## Local setup

Start the web backend on port 3100 and use the seeded demo accounts documented in the root README.

### iOS

Requires Xcode, an iOS simulator and XcodeGen. Run from the repository root:

```sh
cd apps/ios
xcodegen generate
open Nivaasa.xcodeproj
```

Run the Nivaasa scheme on an iOS 17 or newer simulator. The Debug app uses `http://localhost:3100`. Choose Product → Test to exercise the resident, manager, and guard flows against the local demo data. To run the additional guest pass and resident approval tests, run a copy of the seeded backend on port 3101 and set `TEST_RUNNER_NIVAASA_ISOLATED=1` when invoking `xcodebuild test`. These tests write a pass, an arrival and a resident approval to the copy.

### Android

Requires JDK 17, Android SDK Platform 36, and an Android emulator. Set `JAVA_HOME` and `ANDROID_HOME` for your installation, then run:

```sh
cd apps/android
./gradlew :app:installDebug
adb shell am start -n app.nivaasa.community/.MainActivity
```

The Debug app defaults to `http://10.0.2.2:3100` for the standard Android emulator. Set `-PnivaasaApiUrl=https://your-server.example` to use another backend. The minimum supported Android version is API 26.

Release builds default to `https://nivaasa.app`. Set the deployment URL via `NIVAASA_API_URL` in the iOS build settings and `nivaasaApiUrl` in Android. Physical-device and store distribution require the usual platform signing setup.
