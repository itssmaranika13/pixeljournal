import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  onAuthStateChanged,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { encodeUserProfile, decodeUserProfile } from '../utils/firestoreObfuscation';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign in with email and password
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password).then(async userCredential => {
      await userCredential.user.reload();
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        const error = new Error('Please verify your email address before logging in.');
        error.code = 'auth/email-not-verified';
        throw error;
      }
      return userCredential;
    });
  }

  // Sign out
  function logout() {
    return signOut(auth);
  }

  // Send password reset email
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function resendVerificationEmail() {
    if (!auth.currentUser) {
      const error = new Error('No account is available to verify.');
      error.code = 'auth/no-current-user';
      throw error;
    }
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) return false;
    await sendEmailVerification(auth.currentUser);
    return true;
  }

  // Update password
  async function changePassword(newPassword, currentPassword) {
    if (newPassword.length < 8) {
      const error = new Error('Password must be at least 8 characters');
      error.code = 'auth/weak-password';
      throw error;
    }
    if (!currentUser || !currentPassword) {
      const error = new Error('Current password is required');
      error.code = 'auth/missing-current-password';
      throw error;
    }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }

  async function changeEmail(newEmail, password) {
    if (!currentUser) return;
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
    await verifyBeforeUpdateEmail(currentUser, newEmail);
  }

  async function reloadCurrentUser() {
    if (!auth.currentUser) return null;
    await auth.currentUser.reload();
    const refreshedUser = auth.currentUser;
    setCurrentUser(refreshedUser);
    if (refreshedUser) {
      const profileRef = doc(db, 'users', refreshedUser.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const profile = decodeUserProfile(profileSnap.data());
        if (profile.email !== refreshedUser.email) {
          await setDoc(profileRef, encodeUserProfile({ email: refreshedUser.email }), { merge: true });
          profile.email = refreshedUser.email;
        }
        setUserProfile(profile);
      }
    }
    return refreshedUser;
  }

  // Load user profile from Firestore
  async function loadUserProfile(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserProfile(decodeUserProfile(docSnap.data()));
    }
  }

  // Update user profile
  async function updateUserProfile(updates) {
    if (!currentUser) return;
    await setDoc(doc(db, 'users', currentUser.uid), encodeUserProfile(updates), { merge: true });
    setUserProfile(prev => ({ ...prev, ...updates }));
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    resetPassword,
    resendVerificationEmail,
    changePassword,
    changeEmail,
    reloadCurrentUser,
    updateUserProfile,
    loadUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
