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
  where,
  orderBy, 
  limit, 
  getDocs,
  runTransaction,
  arrayUnion,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { UserProfile, MemoryNote, Poll, PollOption } from "../types";

// --- Configuration Management ---

const firebaseConfig = {
  apiKey: "AIzaSyDcoPcYVacPwXQuIfz9AlTMv4Edral9xwc",
  authDomain: "bfhs-internal.firebaseapp.com",
  projectId: "bfhs-internal",
  storageBucket: "bfhs-internal.firebasestorage.app",
  messagingSenderId: "743449290754",
  appId: "1:743449290754:web:fb8005bbc080d0548a1f1b",
  measurementId: "G-M5L1KKMM8Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

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

export const getLeaderboard = async (limitCount: number = 10): Promise<UserProfile[]> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("gamification.xp", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as UserProfile));
  } catch (e) {
    console.warn("Error fetching leaderboard:", e);
    return [];
  }
};

export const getTopUserInGrade = async (grade: string): Promise<UserProfile | null> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef, 
      where("grade", "==", grade), 
      orderBy("gamification.xp", "desc"), 
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { uid: doc.id, ...doc.data() } as UserProfile;
    }
    return null;
  } catch (e: any) {
    if (e.code === 'failed-precondition') {
        console.error("⚠️ MISSING INDEX: Click the link below to create it automatically:");
        console.error(e.message); // This contains the direct link
    }
    console.warn("Error fetching top grade user:", e);
    return null;
  }
};

export const getUserRankInGrade = async (grade: string, xp: number): Promise<{ rank: number, total: number } | null> => {
  try {
    const usersRef = collection(db, "users");
    
    // Count users with more XP in the same grade
    // Note: We order by DESC to share the index with getTopUserInGrade
    const qBetter = query(
      usersRef, 
      where("grade", "==", grade), 
      where("gamification.xp", ">", xp),
      orderBy("gamification.xp", "desc")
    );
    const betterSnapshot = await getDocs(qBetter);
    const rank = betterSnapshot.size + 1;

    // Count total users in grade (this might be expensive if thousands, but okay for hundreds)
    // Optimization: Store total count in a metadata document or use count() aggregation if available in this SDK version
    const qTotal = query(usersRef, where("grade", "==", grade));
    const totalSnapshot = await getDocs(qTotal);
    const total = totalSnapshot.size;

    return { rank, total };
  } catch (e: any) {
    if (e.code === 'failed-precondition') {
        console.error("⚠️ MISSING INDEX: Click the link below to create it automatically:");
        console.error(e.message); // This contains the direct link
    }
    console.warn("Error calculating rank:", e);
    throw e;
  }
};

// ============================================================================
// POLLS (THE DAILY PULSE)
// ============================================================================

export const deactivateAllPolls = async () => {
    console.log("[Polls] Deactivating all polls. Current User:", auth.currentUser?.uid);
    try {
        const pollsRef = collection(db, "polls");
        const q = query(pollsRef, where("isActive", "==", true));
        const snapshot = await getDocs(q);
        
        const updates = snapshot.docs.map(doc => setDoc(doc.ref, { isActive: false }, { merge: true }));
        await Promise.all(updates);
    } catch (e) {
        console.error("Error deactivating polls:", e);
    }
};

export const createPoll = async (question: string, options: string[]) => {
    console.log("[Polls] Creating poll. Current User:", auth.currentUser?.uid);
    if (!auth.currentUser) throw "Must be logged in to create a poll.";
    
    try {
        // 1. Deactivate old polls first
        await deactivateAllPolls();

        // 2. Create new one
        const pollRef = doc(collection(db, "polls"));
        const newPoll: any = {
            question,
            options: options.map((text, index) => ({
                id: `opt-${index}`,
                text,
                votes: 0
            })),
            createdAt: serverTimestamp(),
            isActive: true,
            totalVotes: 0,
            voters: []
        };
        await setDoc(pollRef, newPoll);
        return pollRef.id;
    } catch (e) {
        console.error("Error creating poll:", e);
        throw e;
    }
};

export const getActivePoll = async (userId?: string): Promise<Poll | null> => {
    try {
        const pollsRef = collection(db, "polls");
        const q = query(pollsRef, where("isActive", "==", true), orderBy("createdAt", "desc"), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return null;
        
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        
        const hasVoted = userId && data.voters && data.voters.includes(userId);
        
        return {
            id: docSnap.id,
            question: data.question,
            options: data.options,
            createdAt: data.createdAt,
            isActive: data.isActive,
            totalVotes: data.totalVotes,
            userVotedOptionId: hasVoted ? "voted" : null
        };
    } catch (e) {
        console.error("Error fetching poll:", e);
        return null;
    }
};

export const voteInPoll = async (pollId: string, optionId: string, userId: string) => {
    const pollRef = doc(db, "polls", pollId);

    try {
        await runTransaction(db, async (transaction) => {
            const pollDoc = await transaction.get(pollRef);
            if (!pollDoc.exists()) throw "Poll does not exist!";

            const data = pollDoc.data();
            if (data.voters && data.voters.includes(userId)) {
                throw "You have already voted in this poll.";
            }

            const newOptions = data.options.map((opt: any) => {
                if (opt.id === optionId) {
                    return { ...opt, votes: opt.votes + 1 };
                }
                return opt;
            });

            transaction.update(pollRef, {
                options: newOptions,
                totalVotes: (data.totalVotes || 0) + 1,
                voters: arrayUnion(userId)
            });
        });
    } catch (e) {
        console.error("Vote failed:", e);
        throw e;
    }
};

// ============================================================================
// VIBE CHECK (HOW ARE YOU FEELING?)
// ============================================================================

export const getVibeCheck = async (userId?: string) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const vibeRef = doc(db, "daily_vibes", today);
    
    try {
        const docSnap = await getDoc(vibeRef);
        if (!docSnap.exists()) {
            return {
                average: 50,
                count: 0,
                userVoted: false,
                userVote: null
            };
        }
        
        const data = docSnap.data();
        // Check map first, then fallback to array check for backward compat
        const userVote = userId && data.votesMap ? data.votesMap[userId] : null;
        const userVoted = userVote !== null && userVote !== undefined;
        
        const avg = data.count > 0 ? data.sum / data.count : 50;
        
        return {
            average: avg,
            count: data.count || 0,
            userVoted,
            userVote
        };
    } catch (e) {
        console.error("Error fetching vibes:", e);
        return null;
    }
};

export const submitVibeCheck = async (value: number, userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const vibeRef = doc(db, "daily_vibes", today);

    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(vibeRef);
            
            if (!docSnap.exists()) {
                // Create for today
                transaction.set(vibeRef, {
                    date: today,
                    sum: value,
                    count: 1,
                    votesMap: { [userId]: value }
                });
            } else {
                const data = docSnap.data();
                const votesMap = data.votesMap || {};
                const previousVote = votesMap[userId];
                
                let newSum = data.sum || 0;
                let newCount = data.count || 0;

                if (previousVote !== undefined) {
                    // Updating existing vote
                    newSum = newSum - previousVote + value;
                    // Count stays same
                } else {
                    // New vote
                    newSum = newSum + value;
                    newCount = newCount + 1;
                }
                
                // Update map
                votesMap[userId] = value;

                transaction.update(vibeRef, {
                    sum: newSum,
                    count: newCount,
                    votesMap: votesMap
                });
            }
        });
    } catch (e) {
        console.error("Vibe check failed:", e);
        throw e;
    }
};

export { auth, db };
