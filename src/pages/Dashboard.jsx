import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import YearCalendar from '../components/YearCalendar';
import QuickEntryModal from '../components/QuickEntryModal';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './Dashboard.css';
import { getBirthYear } from '../utils/dateUtils';
import { getCategoryColor } from '../utils/colorUtils';
import { decodeCategory, decodeEntry } from '../utils/firestoreObfuscation';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryDate, setEntryDate] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(null);

  const birthYear = getBirthYear(userProfile?.birthdate);
  const minYear = birthYear || 1900;
  const maxYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, [currentUser, currentYear]);

  async function loadData() {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Load categories
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('userId', '==', currentUser.uid)
      );
      const categoriesSnap = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnap.docs.map(doc => decodeCategory({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
      if (!selectedFilter && categoriesData.length > 0) {
        setSelectedFilter(categoriesData[0].id);
      }

      // Load entries for current year
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      const entriesQuery = query(
        collection(db, 'entries'),
        where('userId', '==', currentUser.uid)
      );
      const entriesSnap = await getDocs(entriesQuery);
      const allEntries = entriesSnap.docs.map(doc => decodeEntry({
        id: doc.id,
        ...doc.data()
      }));
      // Filter entries for the current year
      const yearEntries = allEntries.filter(
        entry => entry.date >= startDate && entry.date <= endDate
      );
      // Deduplicate: if multiple documents exist for the same date and categoryId, keep the latest
      const entryMap = new Map();
      yearEntries.forEach(entry => {
        if (!entry.date || !entry.categoryId) return;
        const key = `${entry.date}_${entry.categoryId}`;
        const existing = entryMap.get(key);
        if (!existing || (entry.updatedAt && (!existing.updatedAt || entry.updatedAt > existing.updatedAt))) {
          entryMap.set(key, entry);
        }
      });
      setEntries(Array.from(entryMap.values()));

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function changeYear(delta) {
    const newYear = currentYear + delta;
    if (newYear >= minYear && newYear <= maxYear) {
      setCurrentYear(newYear);
    }
  }

  function changeDate(delta) {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + delta);
    const newDate = date.toISOString().split('T')[0];
    setSelectedDate(newDate);
  }

  /**
   * Called by QuickEntryModal after a successful save.
   * Updates the local entries state immediately so the calendar pixel
   * reflects the new colour without requiring a full page reload.
   *
   * @param {object|null} savedEntry  – the saved entry data, or null if cleared
   */
  function handleEntrySaved(savedEntry) {
    if (!savedEntry) {
      // Entry was cleared — remove it from local state
      setEntries(prev =>
        prev.filter(
          e => !(e.date === selectedDate && e.categoryId === selectedFilter)
        )
      );
      return;
    }

    // Upsert: replace existing entry for this date+category or add a new one
    const entryId = `${currentUser.uid}_${savedEntry.date}_${savedEntry.categoryId}`;
    setEntries(prev => {
      const without = prev.filter(
        e => !(e.date === savedEntry.date && e.categoryId === savedEntry.categoryId)
      );
      return [...without, { id: entryId, ...savedEntry }];
    });
  }

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const todayDateObj = new Date();
  const isToday = selectedDateObj.toDateString() === todayDateObj.toDateString();

  // Filter entries based on selected filter (category)
  const filteredEntries = selectedFilter
    ? entries.filter(entry => entry.categoryId === selectedFilter)
    : entries;

  // The currently active category object
  const selectedCategory = categories.find(c => c.id === selectedFilter);

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading"></div>
          <p>Loading your journal...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard">
        {userProfile?.name && (
          <div className="dashboard-greeting">
            <span>Welcome back, {userProfile.name}</span>
            <div className="year-control">
              <button className="year-nav-btn" onClick={() => changeYear(-1)} disabled={currentYear <= minYear} aria-label="Previous year">‹</button>
              <h2 className="current-year">{currentYear}</h2>
              <button className="year-nav-btn" onClick={() => changeYear(1)} disabled={currentYear >= maxYear} aria-label="Next year">›</button>
            </div>
          </div>
        )}
        
        <div className="date-header">
          <div className="date-control">
            <button className="date-nav-btn" onClick={() => changeDate(-1)} aria-label="Previous date">‹</button>
            <time className="displayed-date" dateTime={selectedDate}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </time>
            <button className="date-nav-btn" onClick={() => changeDate(1)} aria-label="Next date">›</button>
          </div>

          {/* Enter Data button — only shown when a category is active */}
          {selectedFilter && (
            <button
              className="enter-data-btn"
              onClick={() => setEntryDate(selectedDate)}
              aria-label="Enter data for selected date"
            >
              Enter Data
            </button>
          )}
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Welcome to Pixel Journal</h3>
            <p>Start by creating your first category to track what matters to you.</p>
            <button onClick={() => navigate('/categories')} className="btn btn-primary">
              Create your first category
            </button>
          </div>
        ) : (
          <>
            <h3 className="section-label">Categories</h3>
            <div className="category-filters">
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`filter-pill ${selectedFilter === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(category.id)}
                  style={{
                    backgroundColor: category.color,
                    borderColor: selectedFilter === category.id ? 'white' : category.color,
                    borderWidth: selectedFilter === category.id ? '1.5px' : '1px',
                    color: 'black'
                  }}
                >
                  <span className="filter-pill-emoji">{category.emoji || '●'}</span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Year-in-pixels calendar */}
            <YearCalendar
              year={currentYear}
              categories={categories}
              entries={filteredEntries}
              selectedDate={selectedDate}
              onDateClick={(date) => setSelectedDate(date)}
            />
            {(() => {
              const activeCategory = categories.find(category => category.id === selectedFilter);
              const savedEntry = entries.find(
                entry => entry.date === selectedDate && entry.categoryId === selectedFilter
              );
              return activeCategory?.subcategories?.length > 0 && (
                <div className="dashboard-subcategories">
                  <span className="subcategories-label">Subcategories</span>
                  {activeCategory.subcategories.map((subcategory, index) => (
                    <span
                      key={`${subcategory.name}-${index}`}
                      className={`dashboard-subcategory ${savedEntry?.subcategoryIndex === index ? 'saved' : ''}`}
                      style={savedEntry?.subcategoryIndex === index ? {
                        borderColor: 'rgba(255, 255, 255, 0.55)',
                        boxShadow: '0 0 2px rgba(255, 255, 255, 0.35)'
                      } : undefined}
                    >
                      {subcategory.name}
                      <span
                        className="dashboard-subcategory-swatch"
                        style={{ backgroundColor: getCategoryColor(activeCategory, index) }}
                        aria-hidden="true"
                      />
                    </span>
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {/* QuickEntryModal: tied to selectedDate + selectedCategory */}
        {entryDate && selectedCategory && (
          <QuickEntryModal
            date={entryDate}
            userId={currentUser.uid}
            category={selectedCategory}
            onClose={() => setEntryDate(null)}
            onSave={(savedEntry) => {
              handleEntrySaved(savedEntry);
              setEntryDate(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
