# FamilyGuard - Parental Control & Family Safety Monitoring (Consent-Based)

This project includes:
1. Android child app (Java, Android Studio)
2. Node.js + Express backend (MongoDB)
3. Parent web dashboard (HTML/CSS/JavaScript)

---

## Full Project Structure

```text
familyguard-system/
├── ARCHITECTURE.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── README.md
│   └── src/
│       ├── config/db.js
│       ├── middleware/{parentAuth.js,deviceAuth.js}
│       ├── models/*.js
│       ├── routes/{auth.routes.js,device.routes.js,parent.routes.js}
│       ├── socket/index.js
│       └── server.js
├── web-dashboard/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── android-app/
    ├── build.gradle
    ├── settings.gradle
    └── app/
        ├── build.gradle
        └── src/main/
            ├── AndroidManifest.xml
            ├── java/com/familyguard/child/
            │   ├── MainActivity.java
            │   ├── admin/FamilyDeviceAdminReceiver.java
            │   ├── api/{ApiClient.java,ApiService.java,Payloads.java}
            │   ├── collectors/DataCollectorManager.java
            │   ├── services/{MonitoringService.java,NotificationCaptureService.java}
            │   ├── storage/LocalStore.java
            │   └── workers/SyncWorker.java
            ├── res/layout/activity_main.xml
            └── res/xml/device_admin_receiver.xml
```

---

## Backend Setup (Node.js + MongoDB)

1. Open terminal in `familyguard-system/backend`
2. Create env file:
   - `cp .env.example .env`
3. Set secure values in `.env`:
   - `PORT=8002`
   - `MONGO_URI=mongodb://localhost:27017/familyguard`
   - `JWT_SECRET=<strong-random-secret>`
   - `CORS_ORIGIN=<dashboard-origin>`
   - `PAIRING_CODE=<family-pairing-code>`
4. Install dependencies:
   - `npm install`
5. Start server:
   - `npm run dev`

### Core API Endpoints
- Parent auth: `POST /api/auth/register`, `POST /api/auth/login`
- Child enrollment: `POST /api/device/enroll`
- Child data sync: `/api/device/location`, `/screen-time`, `/app-usage`, `/installed-apps`, `/contacts`, `/sms`, `/activity`, `/notifications`
- Parent dashboard: `/api/parent/devices`, `/api/parent/devices/:id/overview`, `/reports/daily`
- Remote lock: `POST /api/parent/devices/:id/lock`

---

## Web Dashboard Setup (HTML/CSS/JS)

1. Open `familyguard-system/web-dashboard`
2. Serve static files (example):
   - `python -m http.server 5500`
3. Open `http://localhost:5500`
4. In the login/register screen, enter **Backend API Base URL** (for local: `http://localhost:8002`)

Features included:
- Parent register/login
- Device list and overview
- Live location + real-time Socket.IO updates
- Screen time and top apps
- Installed apps, activity logs, notification logs
- Daily reports
- Remote lock command

---

## Android App Setup (Java, Android Studio)

1. Open `familyguard-system/android-app` in Android Studio (Giraffe+)
2. Sync Gradle
3. Run on Android 11/12/13/14 device
4. In app:
   - Enter backend API base URL
   - Enter parent ID and pairing code
   - Confirm consent
   - Enroll device
   - Start monitoring

### Android policy compliance notes
- Consent confirmation is required before enrollment
- Foreground service notification indicates active monitoring
- Notification access is explicit (Android settings)
- Device lock requires device admin enabled by user/device-owner

---

## Real-time data sync flow

1. Android app sends telemetry via secure API headers (`x-device-token`)
2. Backend writes to MongoDB and emits Socket.IO events
3. Parent dashboard receives events and refreshes visible widgets
