# iOS gate notifications

The gate alert is a remote, actionable iOS notification. It carries the visitor, apartment, purpose and a signed photo URL, and exposes **Accept**, **Reject** and **Call** actions.

## What is implemented

- APNs device registration: `POST /api/mobile/push`; revocation: `POST /api/mobile/push/unregister`.
- Persistent iOS login token in Keychain, so a background notification action can authenticate without opening the app.
- Notification category `VISITOR_AT_GATE` with actions `VISITOR_ACCEPT`, `VISITOR_REJECT`, `VISITOR_CALL`.
- Accept and Reject call the existing resident visitor-response endpoint. Call opens the visitor phone number, falling back to the gate-contact number.
- Tapping the notification opens the Visitors page.
- A Notification Service Extension (`NivaasaNotificationService`) downloads the uploaded gate photo. If no photo is available, it renders the visitor's coloured initials avatar.
- Gate entry accepts an optional camera/file photo and stores it outside `public/`. The photo is available only to the resident/security session or through a short-lived signed URL included in the APNs payload.
- APNs provider uses token-based `.p8` authentication over HTTP/2. No APNs credentials are stored in the repository.

## Account limitation

Real remote push requires a paid Apple Developer Program account with the **Push Notifications** capability. The phone currently uses a free development profile, which has no `aps-environment` entitlement. Local previews and simulator pushes work, but a free-signed phone cannot receive a remote APNs alert.

When the account is upgraded:

1. Enable Push Notifications for App ID `app.nivaasa.community` and regenerate provisioning.
2. Set `Nivaasa/Nivaasa.entitlements` as the app target's Code Signing Entitlements for device builds. It is applied to simulator builds already.
3. Create an APNs `.p8` key and configure the backend variables below.

## Backend environment

```sh
APNS_KEY_ID=...
APNS_TEAM_ID=...
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=app.nivaasa.community
PUSH_IMAGE_SECRET=<long random secret>
NEXT_PUBLIC_APP_URL=https://nivaasa.karthikmprakash.online
NIVAASA_UPLOADS_DIR=/path/to/persistent/uploads
```

`PUSH_IMAGE_SECRET` signs visitor-photo URLs for the extension. `NIVAASA_UPLOADS_DIR` must be on a persistent volume in production. If APNs is not configured, notifications and photo capture still work in-app; the push step is skipped safely.

Run the schema update before deployment:

```sh
npm run db:push
```

This adds `visitors.photo_url` and the `push_devices` table.

## Verification

Simulator notification UI and permission flow:

```sh
xcrun simctl uninstall booted app.nivaasa.community
xcodebuild test -project apps/ios/Nivaasa.xcodeproj -scheme Nivaasa \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:NivaasaUITests/NotificationTests/testGateAlertPermissionAndPreview \
  CODE_SIGNING_ALLOWED=NO
```

After permission is granted, send a realistic payload without APNs credentials:

```sh
node scripts/simulate-gate-push.cjs
```

The source uses the latest pending visitor in the local database. The simulator reproduces the banner/category payload; Apple's simulator does not reliably launch third-party Notification Service Extensions, so present the photo extension on a physical build after APNs is enabled.

Backend checks run through the disposable database:

```sh
npm run build
node scripts/test-mobile-api.cjs
```

## Security notes

- The APNs device token belongs to the signed-in account and active society. Signing into another account on the same device reassigns it.
- Responding from a notification uses the stored bearer token; it still passes the server's unit/society authorization checks.
- Accept and Reject require device authentication when the notification category is invoked.
- Gate photos are never public static files. Signed URLs expire after 15 minutes.
- APNs delivery errors never fail an entry. Invalid or unregistered tokens are revoked.
- No APNs private key, session token or signing secret may be committed or printed in logs.
