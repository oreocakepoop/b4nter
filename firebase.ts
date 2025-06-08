
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/database';
import 'firebase/compat/storage';

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyDhiNZwE-0JJxO1UWUr0u7iFtGyPeIBsoA",
  authDomain: "campusbox-24ebf.firebaseapp.com",
  databaseURL: "https://campusbox-24ebf-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "campusbox-24ebf",
  storageBucket: "campusbox-24ebf.appspot.com", // Corrected: .appspot.com is typical for storageBucket
  messagingSenderId: "186891490937",
  appId: "1:186891490937:web:91d1e4702e367737c1e6a8",
  measurementId: "G-EB5GTJVQ1R"
};

// Initialize Firebase
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.info("Firebase initialized successfully with hardcoded config.");
  } catch (error) {
    console.error("Firebase initialization failed with hardcoded config:", error);
    // Note: The app might not function correctly if this fails.
    // The App.tsx error display for missing env vars will be removed.
    // Other errors might still break the app.
  }
} else {
  console.info("Firebase app already initialized.");
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const db_rtdb = firebase.database();
export const storage = firebase.storage();

export default firebase; // Export the firebase namespace itself for type usage
