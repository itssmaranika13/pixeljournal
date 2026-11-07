import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCategoryColor } from '../utils/colorUtils';
import { decodeEntry, encodeEntry } from '../utils/firestoreObfuscation';
import './EntryModal.css';
import ConfirmDialog from './ConfirmDialog';

export default function EntryModal({ date, userId, categories, onClose, onSave }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategoryIndex, setSelectedSubcategoryIndex] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    loadEntry();
  }, [date, userId]);

  async function loadEntry() {
    try {
      setLoading(true);
      const entryId = `${userId}_${date}`;
      const entryRef = doc(db, 'entries', entryId);
      const entryDoc = await getDoc(entryRef);

      if (entryDoc.exists()) {
        const data = decodeEntry(entryDoc.data());
        setSelectedCategory(data.categoryId || null);
        setSelectedSubcategoryIndex(data.subcategoryIndex ?? null);
        setNotes(data.notes || '');
      } else {
        // No existing entry
        setSelectedCategory(null);
        setSelectedSubcategoryIndex(null);
        setNotes('');
      }
    } catch (error) {
      console.error('Error loading entry:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    try {
      setSaving(true);
      const entryId = `${userId}_${date}`;
      const entryData = {
        userId,
        date,
        categoryId: selectedCategory,
        subcategoryIndex: selectedSubcategoryIndex,
        notes: notes.trim(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'entries', entryId), encodeEntry(entryData), { merge: true });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  async function confirmClear() {
    try {
      setSaving(true);
      const entryId = `${userId}_${date}`;
      await deleteDoc(doc(db, 'entries', entryId));
      onSave();
      onClose();
    } catch (error) {
      console.error('Error clearing entry:', error);
      alert('Failed to clear entry');
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setShowClearConfirmation(true);
  }

  function handleCategorySelect(categoryId) {
    setSelectedCategory(categoryId);
    setSelectedSubcategoryIndex(null); // Reset subcategory when category changes
  }

  const selectedCategoryObj = categories.find(c => c.id === selectedCategory);
  const hasSubcategories = selectedCategoryObj?.subcategories?.length > 0;

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content entry-modal" onClick={e => e.stopPropagation()}>
          <div className="loading-container">
            <div className="loading"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content entry-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Journal Entry</h2>
            <p className="entry-date">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          {categories.length === 0 ? (
            <div className="empty-state-small">
              <p>You haven't created any categories yet.</p>
              <a href="/categories" className="btn btn-primary btn-sm">
                Create a category
              </a>
            </div>
          ) : (
            <>
              <div className="form-section">
                <label className="form-label">Select category</label>
                <div className="category-grid">
                  {categories.map(category => {
                    const isSelected = selectedCategory === category.id;
                    const color = category.color || '#6b7280';
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={`category-option ${isSelected ? 'selected' : ''}`}
                        style={{
                          borderColor: isSelected ? color : 'transparent',
                          backgroundColor: isSelected ? color + '22' : 'transparent'
                        }}
                        onClick={() => handleCategorySelect(category.id)}
                      >
                        <span
                          className="category-color-dot"
                          style={{ backgroundColor: color }}
                        ></span>
                        <span className="category-name">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasSubcategories && (
                <div className="form-section">
                  <label className="form-label">Select subcategory (optional)</label>
                  <div className="subcategory-grid">
                    {selectedCategoryObj.subcategories.map((sub, index) => {
                      const isSelected = selectedSubcategoryIndex === index;
                      const subColor = getCategoryColor(selectedCategoryObj, index);
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`subcategory-option ${isSelected ? 'selected' : ''}`}
                          style={{
                            borderColor: isSelected ? subColor : 'transparent',
                            backgroundColor: isSelected ? subColor + '22' : 'transparent'
                          }}
                          onClick={() => setSelectedSubcategoryIndex(index)}
                        >
                          <span
                            className="subcategory-color-dot"
                            style={{ backgroundColor: subColor }}
                          ></span>
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedSubcategoryIndex !== null && (
                    <button
                      type="button"
                      className="clear-selection-btn"
                      onClick={() => setSelectedSubcategoryIndex(null)}
                    >
                      Clear subcategory selection
                    </button>
                  )}
                </div>
              )}

            </>
          )}
        </div>

        {categories.length > 0 && (
          <div className="modal-footer">
            <div className="footer-left">
              {(selectedCategory || notes) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn btn-danger"
                  disabled={saving}
                >
                  Clear day
                </button>
              )}
            </div>
            <div className="footer-right">
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
                disabled={saving || !selectedCategory}
              >
                {saving ? <span className="loading"></span> : 'Save entry'}
              </button>
            </div>
          </div>
        )}
      </div>
      {showClearConfirmation && (
        <ConfirmDialog
          title="Delete journal entry?"
          message="This will permanently delete this day's entry."
          onCancel={() => setShowClearConfirmation(false)}
          onConfirm={() => {
            setShowClearConfirmation(false);
            confirmClear();
          }}
        />
      )}
    </div>
  );
}
