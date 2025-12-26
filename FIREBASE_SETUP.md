# ⚡️ Setting Up Firebase for BFHS Portal

To make the Leaderboard, Cloud Sync, and Multi-device features work, you need your own Firebase project.

## 1. Create a Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name it (e.g., `bfhs-student-portal`) and disable Google Analytics (optional).
4. Click **"Create project"**.

## 2. Enable Authentication
1. In your project dashboard, click **Build > Authentication**.
2. Click **"Get started"**.
3. Select **Google** from the Sign-in method list.
4. Click **Enable**.
5. Set the "Project support email" and click **Save**.

## 3. Create the Database
1. Go to **Build > Firestore Database**.
2. Click **"Create database"**.
3. Choose a location (e.g., `nam5 (us-central)`).
4. **IMPORTANT:** Start in **Test mode** (for now) or **Production mode**.
5. Click **Create**.

## 4. Set Security Rules
1. In the Firestore Database tab, click **Rules**.
2. Replace everything with these rules to allow signed-in users to save their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /memory_notes/{noteId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Allow reading the leaderboard (public profiles)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
  }
}
```
3. Click **Publish**.

## 5. Connect to the App
1. Click the **Gear icon** (Project settings) next to "Project Overview" in the left sidebar.
2. Scroll down to **"Your apps"** and click the **Web (</>)** icon.
3. Register the app (e.g., "BFHS Web").
4. You will see a `firebaseConfig` object.
5. Open `services/firebase.ts` in this project.
6. **Replace** the existing `firebaseConfig` values with your new keys:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

## 6. Restart
Run `npm run dev` again. You can now sign in, and your stats will save to the cloud!
