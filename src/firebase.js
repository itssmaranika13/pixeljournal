import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// IMPORTANT: Replace these values with your actual Firebase project credentials
// To get these:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing)
// 3. Add a web app to your project
// 4. Copy the configuration object here

const firebaseConfig = {
  apiKey: "AIzaSyA4K7X0hu_QWNvRup5raTm9c3mcHjS7K54",
  authDomain: "pixel-journal-2026.firebaseapp.com",
  projectId: "pixel-journal-2026",
  storageBucket: "pixel-journal-2026.firebasestorage.app",
  messagingSenderId: "904573751205",
  appId: "1:904573751205:web:e54b0c1e222aa9d629a24c"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
// This uses email/password authentication ONLY
// No Google OAuth is configured or required
export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence
});

// Initialize Firestore Database
export const db = getFirestore(app);

export default app;
