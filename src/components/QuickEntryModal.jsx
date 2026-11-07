import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCategoryColor } from '../utils/colorUtils';
import { decodeEntry, encodeEntry } from '../utils/firestoreObfuscation';
import './QuickEntryModal.css';

/**
 * QuickEntryModal — opens for a specific date + category.
 * Stores entries with the key  userId_date_categoryId
 * so each category has its own independent entry per date.
 */
export default function QuickEntryModal({ date, userId, category, onClose, onSave }) {
  const [selectedSubcategoryIndex, setSelectedSubcategoryIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    loadEntry();
  }, [date, userId, category?.id]);

  async function loadEntry() {
    if (!category) return;
    try {
      setLoading(true);
      // Primary entry key: userId_date_categoryId (category-isolated)
      const entryId = `${userId}_${date}_${category.id}`;
      const entryRef = doc(db, 'entries', entryId);
      const entryDoc = await getDoc(entryRef);

      if (entryDoc.exists()) {
        const data = decodeEntry(entryDoc.data());
        setSelectedSubcategoryIndex(data.subcategoryIndex ?? null);
      } else {
        // Fallback: check legacy entry document (userId_date) if it belonged to this category
        const legacyRef = doc(db, 'entries', `${userId}_${date}`);
        const legacyDoc = await getDoc(legacyRef);
        const legacyEntry = legacyDoc.exists() ? decodeEntry(legacyDoc.data()) : null;
        if (legacyEntry && legacyEntry.categoryId === category.id) {
          setSelectedSubcategoryIndex(legacyEntry.subcategoryIndex ?? null);
        } else {
          setSelectedSubcategoryIndex(null);
        }
      }
    } catch (error) {
      console.error('Error loading entry:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!category || selectedSubcategoryIndex === null) return;

    try {
      setSaving(true);
      const entryId = `${userId}_${date}_${category.id}`;
      const entryData = {
        userId,
        date,
        categoryId: category.id,
        subcategoryIndex: selectedSubcategoryIndex,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'entries', entryId), encodeEntry(entryData), { merge: true });

      // Clean up legacy document if it existed for this date
      try {
        const legacyRef = doc(db, 'entries', `${userId}_${date}`);
        const legacyDoc = await getDoc(legacyRef);
        const legacyEntry = legacyDoc.exists() ? decodeEntry(legacyDoc.data()) : null;
        if (legacyEntry && legacyEntry.categoryId === category.id) {
          await deleteDoc(legacyRef);
        }
      } catch (err) {
        // Ignore legacy cleanup errors
      }

      onSave(entryData);
      onClose();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    try {
      setSaving(true);
      const entryId = `${userId}_${date}_${category.id}`;
      await deleteDoc(doc(db, 'entries', entryId));
      try {
        const legacyRef = doc(db, 'entries', `${userId}_${date}`);
        const legacyDoc = await getDoc(legacyRef);
        const legacyEntry = legacyDoc.exists() ? decodeEntry(legacyDoc.data()) : null;
        if (legacyEntry && legacyEntry.categoryId === category.id) {
          await deleteDoc(legacyRef);
        }
      } catch (err) {
        // Ignore legacy cleanup errors
      }
      onSave(null); // signal that entry was cleared
      onClose();
    } catch (error) {
      console.error('Error clearing entry:', error);
      alert('Failed to clear entry');
    } finally {
      setSaving(false);
    }
  }

  const hasSubcategories = category?.subcategories?.length > 0;

  return (
    <div className="qem-overlay" onClick={onClose}>
      <div className="qem-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="qem-header">
          <div>
            <h2 className="qem-title">Enter Data</h2>
            <p className="qem-date">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="qem-close" aria-label="Close">×</button>
        </div>

        {/* Category badge */}
        <div className="qem-category-badge">
          <span
            className="qem-category-dot"
            style={{ backgroundColor: category?.color || 'var(--default-grey)' }}
          />
          <span className="qem-category-name">{category?.name}</span>
        </div>

        {/* Body */}
        <div className="qem-body">
          {loading ? (
            <div className="qem-loading">
              <div className="loading" />
            </div>
          ) : !hasSubcategories ? (
            <p className="qem-no-sub">This category has no subcategories. Add subcategories in the Categories page first.</p>
          ) : (
            <>
              <p className="qem-sub-label">Select a subcategory</p>
              <div className="qem-subcategory-grid">
                {category.subcategories.map((sub, index) => {
                  const isSelected = selectedSubcategoryIndex === index;
                  const subColor = getCategoryColor(category, index);
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`qem-sub-option ${isSelected ? 'selected' : ''}`}
                      style={{
                        borderColor: isSelected ? subColor : 'transparent',
                        backgroundColor: isSelected ? subColor + '22' : 'transparent',
                      }}
                      onClick={() =>
                        setSelectedSubcategoryIndex(isSelected ? null : index)
                      }
                    >
                      <span
                        className="qem-sub-dot"
                        style={{ backgroundColor: subColor }}
                      />
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="qem-footer">
          <div className="qem-footer-left">
            {selectedSubcategoryIndex !== null && (
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-danger"
                disabled={saving}
              >
                Clear
              </button>
            )}
          </div>
          <div className="qem-footer-right">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
              disabled={saving || !hasSubcategories || selectedSubcategoryIndex === null}
            >
              {saving ? <span className="loading" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
