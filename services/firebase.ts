import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User,
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  deleteDoc,
  where
} from "firebase/firestore";
import { UserProfile, MemoryNote } from "../types";

// --- Configuration Management ---

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn("Missing Firebase configuration in environment variables.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Auth Functions ---

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    
    if (error.code === 'auth/configuration-not-found') {
        alert("Configuration Error: Google Sign-In is disabled.\n\nPlease go to the Firebase Console > Authentication > Sign-in method and enable 'Google'.");
    } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to alert
    } else if (error.code === 'auth/unauthorized-domain') {
        alert("Domain Error: This domain is not authorized.\n\nPlease go to Firebase Console > Authentication > Settings > Authorized Domains and add this website URL.");
    } else {
        alert("Sign in failed. " + (error.message || "Please try again."));
    }
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// --- User Profile Functions ---

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (e: any) {
    console.warn("Error fetching profile:", e);
    // Don't alert on fetch errors to avoid spamming the user on load
    return null;
  }
};

export const saveUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  try {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
      createdAt: data.createdAt || serverTimestamp()
    }, { merge: true });
  } catch (e: any) {
    console.error("Error saving profile:", e);
    if (e.code === 'permission-denied') {
        alert("Permission Denied: You do not have permission to save this profile.\n\nCheck Firebase Console > Firestore Database > Rules.");
    } else if (e.code === 'unavailable') {
        alert("Network Error: Could not reach the database. Please check your internet connection.");
    } else if (e.code === 'not-found' || e.message.includes("project")) {
        alert("Database Not Found: Please go to Firebase Console > Build > Firestore Database and click 'Create Database'.");
    } else {
        alert("Error saving profile: " + e.message);
    }
  }
};

// --- Memory Functions ---

export const addMemoryNote = async (uid: string, note: string, source: 'user' | 'tutor' = 'user') => {
  try {
    const notesRef = collection(db, `users/${uid}/memory_notes`);
    
    // Safety check for capping notes (Cost control)
    const q = query(notesRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    if (snapshot.size >= 50) {
      // Delete oldest
      const oldest = snapshot.docs[snapshot.docs.length - 1];
      await deleteDoc(oldest.ref);
    }

    await addDoc(notesRef, {
      note: note.slice(0, 140),
      source,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Error adding note:", e);
  }
};

export const getRecentMemoryNotes = async (uid: string, max: number = 5): Promise<MemoryNote[]> => {
  try {
    const notesRef = collection(db, `users/${uid}/memory_notes`);
    const q = query(notesRef, orderBy("createdAt", "desc"), limit(max));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MemoryNote));
  } catch (e) {
    console.error("Error fetching notes:", e);
    return [];
  }
};

export const deleteMemoryNote = async (uid: string, noteId: string) => {
  try {
    await deleteDoc(doc(db, `users/${uid}/memory_notes/${noteId}`));
  } catch (e) {
    console.error("Error deleting note:", e);
  }
};

export { auth, db };
