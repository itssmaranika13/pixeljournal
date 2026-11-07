import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatBirthdate, parseBirthdateInput } from '../utils/dateUtils';
import './Account.css';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  decodeCategory,
  decodeEntry,
  decodeUserProfile,
  encodeCategory,
  encodeEntry,
  encodeUserProfile
} from '../utils/firestoreObfuscation';
import { decodeBackup, encodeBackup } from '../utils/backupCodec';

export default function Account() {
  const { currentUser, userProfile, changePassword, changeEmail, reloadCurrentUser, updateUserProfile } = useAuth();
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false);
  const [showPasswordCurrentPassword, setShowPasswordCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [backupMessage, setBackupMessage] = useState({ type: '', text: '' });
  const [backupLoading, setBackupLoading] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(userProfile?.name || currentUser?.displayName || '');
    setBirthdate(formatBirthdate(userProfile?.birthdate));
  }, [userProfile, currentUser]);

  async function handleProfileSave(e) {
    e.preventDefault();
    const normalizedBirthdate = parseBirthdateInput(birthdate);
    if (!name.trim() || !normalizedBirthdate) {
      return setProfileMessage({ type: 'error', text: 'Enter a valid name and birthdate in DD/MM/YYYY format' });
    }

    try {
      setLoading(true);
      await updateUserProfile({ name: name.trim(), birthdate: normalizedBirthdate });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileMessage({ type: 'error', text: `Profile update failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailChange(e) {
    e.preventDefault();
    if (!newEmail || !emailCurrentPassword) {
      return setEmailMessage({ type: 'error', text: 'Enter your new email and current password' });
    }

    try {
      setLoading(true);
      await changeEmail(newEmail, emailCurrentPassword);
      setNewEmail('');
      setEmailCurrentPassword('');
      setEmailMessage({ type: 'success', text: 'Verification email sent. Verify the new address before your email changes.' });
    } catch (error) {
      console.error('Error changing email:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setEmailMessage({ type: 'error', text: 'Current password is incorrect' });
      } else if (error.code === 'auth/requires-recent-login') {
        setEmailMessage({ type: 'error', text: 'Please sign in again before changing your email' });
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailMessage({ type: 'error', text: 'That email is already in use' });
      } else if (error.code === 'auth/invalid-email') {
        setEmailMessage({ type: 'error', text: 'Invalid new email address' });
      } else {
        setEmailMessage({ type: 'error', text: `Email update failed (${error.code || 'unknown-error'}): ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function refreshEmailState() {
      reloadCurrentUser().catch(error => {
        console.error('Error refreshing authenticated user:', error);
      });
    }

    window.addEventListener('focus', refreshEmailState);
    document.addEventListener('visibilitychange', refreshEmailState);
    return () => {
      window.removeEventListener('focus', refreshEmailState);
      document.removeEventListener('visibilitychange', refreshEmailState);
    };
  }, [reloadCurrentUser]);

  async function handlePasswordChange(e) {
    e.preventDefault();

    if (!passwordCurrentPassword) {
      return setPasswordMessage({ type: 'error', text: 'Enter your current password' });
    }
    if (newPassword.length < 8) {
      return setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
    }

    if (newPassword !== confirmPassword) {
      return setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
    }

    try {
      setLoading(true);
      setPasswordMessage({ type: '', text: '' });
      await changePassword(newPassword, passwordCurrentPassword);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
      setPasswordCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPasswordMessage({ type: 'error', text: 'Current password is incorrect' });
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordMessage({ type: 'error', text: 'Please sign in again before changing your password' });
      } else {
        setPasswordMessage({ type: 'error', text: `Password update failed (${error.code || 'unknown-error'}): ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData() {
    try {
      setBackupLoading(true);
      setBackupMessage({ type: '', text: '' });

      // Fetch all user data
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('userId', '==', currentUser.uid)
      );
      const entriesQuery = query(
        collection(db, 'entries'),
        where('userId', '==', currentUser.uid)
      );

      let categoriesSnap;
      let entriesSnap;
      try {
        [categoriesSnap, entriesSnap] = await Promise.all([
          getDocs(categoriesQuery),
          getDocs(entriesQuery)
        ]);
      } catch (error) {
        throw new Error(`Export Firestore read failed: ${error.message}`);
      }

      const categories = categoriesSnap.docs.map(categoryDoc => ({
        ...decodeCategory(categoryDoc.data()),
        id: categoryDoc.id
      }));

      const entries = entriesSnap.docs.map(entryDoc => ({
        ...decodeEntry(entryDoc.data()),
        id: entryDoc.id
      }));

      const categoriesById = new Map(categories.map(category => [category.id, category]));
      const orphanedEntries = entries.filter(entry => !entry.categoryId || !categoriesById.has(entry.categoryId));
      const validEntries = entries.filter(entry => !orphanedEntries.includes(entry));

      const invalidSubcategoryEntries = validEntries.filter(entry => {
        if (entry.subcategoryIndex === null || entry.subcategoryIndex === undefined) return false;
        const category = categoriesById.get(entry.categoryId);
        return !Number.isInteger(entry.subcategoryIndex) ||
          !Array.isArray(category.subcategories) ||
          entry.subcategoryIndex < 0 ||
          entry.subcategoryIndex >= category.subcategories.length;
      });
      if (invalidSubcategoryEntries.length > 0) {
        throw new Error(
          `Export integrity validation failed: ${invalidSubcategoryEntries.length} entry(s) reference invalid subcategory indexes`
        );
      }

      let backupJson;
      try {
        const backup = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          user: {
            ...userProfile,
            email: currentUser.email
          },
          categories,
          entries: validEntries,
          orphanedEntries
        };
        backupJson = JSON.stringify(backup, null, 2);
      } catch (error) {
        throw new Error(`Export JSON serialization failed: ${error.message}`);
      }

      let blob;
      try {
        blob = new Blob([encodeBackup(backupJson)], { type: 'text/plain;charset=utf-8' });
      } catch (error) {
        throw new Error(`Export file creation failed: ${error.message}`);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pixel-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupMessage({ type: 'success', text: 'Backup exported successfully' });
    } catch (error) {
      console.error('Error exporting data:', error);
      setBackupMessage({ type: 'error', text: error.message || 'Export failed' });
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleImportData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        setBackupLoading(true);
        setBackupMessage({ type: '', text: '' });

        let text;
        try {
          text = await file.text();
        } catch (error) {
          throw new Error(`Import file read failed: ${error.message}`);
        }

        let backup;
        try {
          backup = JSON.parse(decodeBackup(text));
        } catch (error) {
          throw new Error(`Import backup decoding/parsing failed: ${error.message}`);
        }

        if (!backup || !backup.version || !Array.isArray(backup.categories) || !Array.isArray(backup.entries)) {
          throw new Error('Import validation failed: backup must contain a version, categories array, and entries array');
        }

        let decodedCategories;
        let decodedEntries;
        let decodedOrphanedEntries;
        try {
          const categoryIds = new Set();
          decodedCategories = backup.categories.map(category => {
            const decodedCategory = decodeCategory({ ...category });
            if (!decodedCategory.id) {
              throw new Error('Backup category is missing its document ID');
            }
            categoryIds.add(decodedCategory.id);
            return decodedCategory;
          });

          decodedEntries = backup.entries.map(entry => {
            const decodedEntry = decodeEntry({ ...entry });
            if (!decodedEntry.id) {
              throw new Error('Backup entry is missing its document ID');
            }
            return decodedEntry;
          });

          decodedOrphanedEntries = (backup.orphanedEntries || []).map(entry => {
            const decodedEntry = decodeEntry({ ...entry });
            if (!decodedEntry.id) {
              throw new Error('Backup orphaned entry is missing its document ID');
            }
            return decodedEntry;
          });

          const orphanedCategoryIds = decodedEntries
            .map(entry => entry.categoryId)
            .filter(categoryId => categoryId && !categoryIds.has(categoryId));
          if (orphanedCategoryIds.length > 0) {
            throw new Error(`Backup validation found entries referencing missing categories: ${[...new Set(orphanedCategoryIds)].join(', ')}`);
          }
        } catch (error) {
          throw new Error(`Import validation/decoding failed: ${error.message}`);
        }

        let existingDataDetected = false;
        try {
          const existingCategoriesQuery = query(
            collection(db, 'categories'),
            where('userId', '==', currentUser.uid)
          );
          const existingEntriesQuery = query(
            collection(db, 'entries'),
            where('userId', '==', currentUser.uid)
          );
          const [existingCategories, existingEntries] = await Promise.all([
            getDocs(existingCategoriesQuery),
            getDocs(existingEntriesQuery)
          ]);
          const existingCategoryIds = new Set(existingCategories.docs.map(existingDoc => existingDoc.id));
          const existingEntryIds = new Set(existingEntries.docs.map(existingDoc => existingDoc.id));
          existingDataDetected = decodedCategories.some(category => existingCategoryIds.has(category.id)) ||
            [...decodedEntries, ...decodedOrphanedEntries].some(entry => existingEntryIds.has(entry.id));
        } catch (error) {
          throw new Error(`Import existing-data check failed: ${error.message}`);
        }

        setPendingImport({ backup, decodedCategories, decodedEntries, decodedOrphanedEntries, existingDataDetected });

      } catch (error) {
        console.error('Error importing data:', error);
        setBackupMessage({ type: 'error', text: error.message || 'Import failed' });
      } finally {
        setBackupLoading(false);
      }
    };

    input.click();
  }

  async function confirmImport() {
    if (!pendingImport) return;

    const { backup, decodedCategories, decodedEntries, decodedOrphanedEntries } = pendingImport;
    setPendingImport(null);
    setBackupLoading(true);
    setBackupMessage({ type: '', text: '' });

    try {
      try {
        await Promise.all(decodedCategories.map(category => {
          const categoryData = encodeCategory({ ...category });
          categoryData.userId = currentUser.uid;
          delete categoryData.id;
          return setDoc(doc(db, 'categories', category.id), categoryData);
        }));
      } catch (error) {
        throw new Error(`Import category restore failed: ${error.message}`);
      }

      try {
        await Promise.all([...decodedEntries, ...decodedOrphanedEntries].map(entry => {
          const entryData = encodeEntry({ ...entry });
          entryData.userId = currentUser.uid;
          delete entryData.id;
          return setDoc(doc(db, 'entries', entry.id), entryData);
        }));
      } catch (error) {
        throw new Error(`Import entry restore failed: ${error.message}`);
      }

      try {
        const importedProfile = decodeUserProfile({ ...(backup.user || {}) });
        delete importedProfile.uid;
        delete importedProfile.email;
        if (Object.keys(importedProfile).length > 0) {
          await setDoc(doc(db, 'users', currentUser.uid), encodeUserProfile({
            ...importedProfile,
            email: currentUser.email
          }));
        }
      } catch (error) {
        throw new Error(`Import profile restore failed: ${error.message}`);
      }

      setBackupMessage({
        type: 'success',
        text: `Import completed: ${decodedCategories.length} categories and ${decodedEntries.length + decodedOrphanedEntries.length} entries restored.`
      });
    } catch (error) {
      console.error('Error importing data:', error);
      setBackupMessage({ type: 'error', text: error.message || 'Import failed' });
    } finally {
      setBackupLoading(false);
    }
  }

  return (
    <Layout>
      <div className="account-page">
        <h1>Account Settings</h1>

        <div className="account-section card">
          <h2>Profile</h2>
          <form onSubmit={handleProfileSave} className="password-form">
            {profileMessage.text && (
              <div className={`message ${profileMessage.type}`}>
                {profileMessage.text}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="account-name">Name</label>
              <input id="account-name" value={name} onChange={e => setName(e.target.value)} className="input-field" disabled={loading} required />
            </div>
            <div className="form-group">
              <label htmlFor="account-birthdate">Birthdate</label>
              <input id="account-birthdate" value={birthdate} onChange={e => setBirthdate(e.target.value)} className="input-field" placeholder="DD/MM/YYYY" disabled={loading} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>Save profile</button>
          </form>
        </div>

        <div className="account-section card">
          <h2>Account Information</h2>
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{currentUser?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Birthdate</span>
            <span className="info-value">
              {formatBirthdate(userProfile?.birthdate) || 'Not set'}
            </span>
          </div>
        </div>

        <div className="account-section card">
          <h2>Change Email</h2>
          <form onSubmit={handleEmailChange} className="password-form">
            {emailMessage.text && (
              <div className={`message ${emailMessage.type}`}>
                {emailMessage.text}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="new-email">New email</label>
              <input id="new-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="input-field" disabled={loading} required />
            </div>
            <div className="form-group">
              <label htmlFor="email-password">Current password</label>
              <div className="password-input-wrapper">
                <input id="email-password" type={showEmailCurrentPassword ? 'text' : 'password'} value={emailCurrentPassword} onChange={e => setEmailCurrentPassword(e.target.value)} className="input-field" disabled={loading} required />
                <button type="button" className="password-toggle-icon" onClick={() => setShowEmailCurrentPassword(!showEmailCurrentPassword)} aria-label={showEmailCurrentPassword ? 'Hide password' : 'Show password'}>
                  {showEmailCurrentPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>Update email</button>
          </form>
        </div>

        <div className="account-section card">
          <h2>Change Password</h2>
          <form onSubmit={handlePasswordChange} className="password-form">
            {passwordMessage.text && (
              <div className={`message ${passwordMessage.type}`}>
                {passwordMessage.text}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password-current">Current password</label>
              <div className="password-input-wrapper">
                <input id="password-current" type={showPasswordCurrentPassword ? 'text' : 'password'} value={passwordCurrentPassword} onChange={e => setPasswordCurrentPassword(e.target.value)} className="input-field" disabled={loading} required />
                <button type="button" className="password-toggle-icon" onClick={() => setShowPasswordCurrentPassword(!showPasswordCurrentPassword)} aria-label={showPasswordCurrentPassword ? 'Hide password' : 'Show password'}>
                  {showPasswordCurrentPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password-new">New password</label>
              <div className="password-input-wrapper">
                <input id="password-new" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" placeholder="At least 8 characters" disabled={loading} />
                <button type="button" className="password-toggle-icon" onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password-confirm">Confirm new password</label>
              <div className="password-input-wrapper">
                <input id="password-confirm" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" placeholder="Re-enter password" disabled={loading} />
                <button type="button" className="password-toggle-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loading"></span> : 'Update password'}
            </button>
          </form>
        </div>

        <div className="account-section card">
          <h2>Data Management</h2>
          <p className="section-description">
            Export your journal data as a backup or import from a previous backup.
          </p>
            {backupMessage.text && (
              <div className={`message ${backupMessage.type}`}>
                {backupMessage.text}
              </div>
            )}
          <div className="action-buttons">
            <button onClick={handleExportData} className="btn btn-secondary" disabled={backupLoading}>
              Export backup
            </button>
            <button onClick={handleImportData} className="btn btn-secondary" disabled={backupLoading}>
              Import backup
            </button>
          </div>
        </div>
      </div>
      {pendingImport && (
        <ConfirmDialog
          title="Overwrite existing data?"
          message={`${pendingImport.existingDataDetected ? 'Existing records with matching IDs were found and will be replaced. ' : ''}This backup contains ${pendingImport.decodedCategories.length} categories and ${pendingImport.decodedEntries.length + pendingImport.decodedOrphanedEntries.length} entries. Continue?`}
          onCancel={() => setPendingImport(null)}
          onConfirm={confirmImport}
          confirmLabel="Overwrite"
        />
      )}
    </Layout>
  );
}
