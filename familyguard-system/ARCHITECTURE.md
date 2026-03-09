# FamilyGuard System Architecture (Consent-Based)

## 1) High-level architecture

```text
Android Child App (Java)
  ├─ Collectors: location, screen-time, app usage, installed apps, contacts, SMS, activity logs
  ├─ NotificationListenerService for notification access logs
  ├─ SyncWorker (WorkManager) for periodic secure sync + command polling
  └─ MonitoringService foreground notification (transparent monitoring)

                HTTPS + Device Token / JWT

Node.js + Express API (MongoDB)
  ├─ Parent auth (register/login, JWT)
  ├─ Device enrollment (pairing code + consent metadata)
  ├─ Data ingestion endpoints (/api/device/*)
  ├─ Parent dashboard endpoints (/api/parent/*)
  ├─ Remote lock command queue
  └─ Socket.IO real-time push to dashboard

Web Dashboard (HTML/CSS/JS)
  ├─ Parent auth UI
  ├─ Device list + overview
  ├─ Live location/status, top apps, installed apps, logs
  ├─ Daily report viewer
  └─ Remote lock action
```

## 2) Data model summary
- `ParentUser`
- `ChildDevice`
- `LocationLog`
- `ScreenTimeLog`
- `AppUsageLog`
- `InstalledAppsSnapshot`
- `ContactsSnapshot`
- `SmsSnapshot`
- `DeviceActivityLog`
- `NotificationLog`
- `RemoteCommand`

## 3) Security and compliance guardrails
- Explicit consent captured at enrollment (`consentAcceptedAt`, notice version)
- Transparent foreground service on Android
- No hidden operation mode
- JWT (parent) + device token (child)
- Helmet + CORS + API rate limiting on backend
- Works with Android 11–14 baseline permissions and device-admin lock capability
