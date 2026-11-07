import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCategoryColor } from '../utils/colorUtils';
import { encodeCategory, decodeCategory } from '../utils/firestoreObfuscation';
import './Categories.css';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Categories() {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  useEffect(() => {
    loadCategories();
  }, [currentUser]);

  async function loadCategories() {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'categories'),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => decodeCategory({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCategory(null);
    setShowModal(true);
  }

  function openEditModal(category) {
    setEditingCategory(category);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingCategory(null);
  }

  async function handleSave(categoryData) {
    try {
      if (editingCategory) {
        // Update existing category
        await updateDoc(doc(db, 'categories', editingCategory.id), encodeCategory(categoryData));
      } else {
        // Create new category
        await addDoc(collection(db, 'categories'), {
          ...encodeCategory(categoryData),
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
      await loadCategories();
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  }

  async function confirmDelete() {
    try {
      await deleteDoc(doc(db, 'categories', categoryToDelete));
      await loadCategories();
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  }

  function handleDelete(categoryId) {
    setCategoryToDelete(categoryId);
  }

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="categories-page">
        <div className="page-header">
          <h1>Categories</h1>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Create category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No categories yet</h3>
            <p>Create your first category to start tracking your journal.</p>
            <button onClick={openCreateModal} className="btn btn-primary">
              Create category
            </button>
          </div>
        ) : (
          <div className="categories-grid">
            {categories.map(category => (
              <div key={category.id} className="category-card">
                <div
                  className="category-color-bar"
                  style={{ backgroundColor: category.color || 'var(--default-grey)' }}
                ></div>
                <div className="category-content">
                  <h3>{category.name}</h3>
                  {category.subcategories && category.subcategories.length > 0 && (
                    <div className="subcategories-list">
                      {category.subcategories.map((sub, index) => {
                        const subColor = getCategoryColor(category, index);
                        return (
                          <span
                            key={index}
                            className="subcategory-tag"
                            style={{
                              backgroundColor: subColor + '33',
                              borderLeft: `3px solid ${subColor}`
                            }}
                          >
                            {sub.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="category-actions">
                    <button
                      onClick={() => openEditModal(category)}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <CategoryModal
            category={editingCategory}
            onSave={handleSave}
            onClose={closeModal}
          />
        )}
        {categoryToDelete && (
          <ConfirmDialog
            title="Delete category?"
            message="The category will be deleted. Existing journal entries will remain available without this category."
            onCancel={() => setCategoryToDelete(null)}
            onConfirm={confirmDelete}
          />
        )}
      </div>
    </Layout>
  );
}

function CategoryModal({ category, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    color: category?.color || '#8fb8ff',
    subcategories: category?.subcategories || []
  });
  const [newSubcategory, setNewSubcategory] = useState('');
  const [editingSubcategoryIndex, setEditingSubcategoryIndex] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a category name');
      return;
    }
    onSave(formData);
  }

  function addSubcategory() {
    if (!newSubcategory.trim()) return;
    if (formData.subcategories.length >= 10) {
      alert('Maximum 10 subcategories allowed');
      return;
    }

    setFormData({
      ...formData,
      subcategories: [
        ...formData.subcategories,
        { name: newSubcategory.trim() }
      ]
    });
    setNewSubcategory('');
  }

  function removeSubcategory(index) {
    setFormData({
      ...formData,
      subcategories: formData.subcategories.filter((_, i) => i !== index)
    });
    setEditingSubcategoryIndex(null);
  }

  function updateSubcategory(index, updates) {
    setFormData({
      ...formData,
      subcategories: formData.subcategories.map((subcategory, subcategoryIndex) =>
        subcategoryIndex === index ? { ...subcategory, ...updates } : subcategory
      )
    });
  }

  function saveSubcategoryName(index) {
    const name = formData.subcategories[index].name.trim();
    if (!name) {
      alert('Please enter a subcategory name');
      return;
    }

    const isDuplicate = formData.subcategories.some(
      (subcategory, subcategoryIndex) =>
        subcategoryIndex !== index && subcategory.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      alert('Subcategory names must be unique');
      return;
    }

    updateSubcategory(index, { name });
    setEditingSubcategoryIndex(null);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{category ? 'Edit category' : 'Create category'}</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="e.g., Mood, Exercise, Reading"
              maxLength={50}
              required
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={e => setFormData({ ...formData, color: e.target.value })}
              className="color-input"
            />
          </div>

          <div className="form-group">
            <label>Subcategories ({formData.subcategories.length}/10)</label>
            <div className="subcategory-input-row">
              <input
                type="text"
                value={newSubcategory}
                onChange={e => setNewSubcategory(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSubcategory())}
                className="input-field"
                placeholder="Add a subcategory"
                maxLength={50}
              />
              <button
                type="button"
                onClick={addSubcategory}
                className="btn btn-secondary"
                disabled={formData.subcategories.length >= 10}
              >
                Add
              </button>
            </div>

            {formData.subcategories.length > 0 && (
              <div className="subcategories-list modal-subcategories-list">
                {formData.subcategories.map((sub, index) => (
                  <div key={index} className="subcategory-item">
                    <span
                      className="subcategory-color-swatch"
                      style={{ backgroundColor: getCategoryColor(formData, index) }}
                    />
                    {editingSubcategoryIndex === index ? (
                      <input
                        type="text"
                        value={sub.name}
                        onChange={e => updateSubcategory(index, { name: e.target.value })}
                        className="input-field subcategory-name-input"
                        maxLength={50}
                        autoFocus
                      />
                    ) : (
                      <span className="subcategory-name">{sub.name}</span>
                    )}
                    <div className="subcategory-actions">
                      {editingSubcategoryIndex === index ? (
                        <button
                          type="button"
                          onClick={() => saveSubcategoryName(index)}
                          className="subcategory-icon-btn"
                          aria-label={`Save ${sub.name}`}
                          title="Save name"
                        >
                          &#10003;
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingSubcategoryIndex(index)}
                          className="subcategory-icon-btn"
                          aria-label={`Edit ${sub.name}`}
                          title="Edit name"
                        >
                          &#9998;
                        </button>
                      )}
                      <label
                        className="subcategory-icon-btn subcategory-color-control"
                        aria-label={`Assign colour to ${sub.name}`}
                        title="Assign colour"
                      >
                        <span
                          className="subcategory-color-button-swatch"
                          style={{ backgroundColor: getCategoryColor(formData, index) }}
                        />
                        <input
                          type="color"
                          value={getCategoryColor(formData, index)}
                          onChange={e => updateSubcategory(index, { color: e.target.value })}
                          className="subcategory-color-input"
                          aria-label={`Assign colour to ${sub.name}`}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSubcategory(index)}
                      className="remove-btn subcategory-icon-btn"
                      aria-label={`Delete ${sub.name}`}
                      title="Delete subcategory"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {category ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
