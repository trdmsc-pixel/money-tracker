# Android APK Build Instructions — Ledger

This guide explains how to compile **Ledger** into an installable Android APK file with native SMS reading permissions (`RECEIVE_SMS` and `READ_SMS`) and local notifications.

---

## 1. Prerequisites
- **Node.js** v18+ & npm
- **Android Studio** (with Android SDK platform tools)
- Java 17 / 21

---

## 2. One-Command Build Script

Run the following commands in the `money tracker` directory:

```bash
# 1. Build the production web bundle
npm run build

# 2. Add Capacitor Android platform (if not already added)
npx cap add android

# 3. Copy web assets to Android project
npx cap sync android
```

---

## 3. Configure Android SMS & Notification Permissions

Open `android/app/src/main/AndroidManifest.xml` and ensure the following permissions are present inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

---

## 4. Compile the APK

### Method A: Via Android Studio (Recommended)
1. Run:
   ```bash
   npx cap open android
   ```
2. In Android Studio, go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. The generated APK will be located at:
   `android/app/build/outputs/apk/debug/app-debug.apk`
4. Transfer this `.apk` to your Android phone via WhatsApp, USB, or Google Drive and install it.

### Method B: Via Command Line (Fast)
```bash
cd android && ./gradlew assembleDebug
```
The APK is ready at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 5. Web / PWA Alternative ("Add to Home Screen")

If you prefer not to build with Android Studio, open your deployed Vercel URL on Chrome on Android:
1. Tap the three dots menu (⋮)
2. Tap **"Add to Home screen"** or **"Install app"**
3. Ledger will install as an app with full-screen experience and daily notifications.
