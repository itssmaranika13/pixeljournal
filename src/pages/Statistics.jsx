import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getCategoryColor } from '../utils/colorUtils';
import { decodeCategory, decodeEntry } from '../utils/firestoreObfuscation';
import './Statistics.css';

export default function Statistics() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [currentUser, selectedYear]);

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

      // Load entries for selected year
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      const entriesQuery = query(
        collection(db, 'entries'),
        where('userId', '==', currentUser.uid)
      );
      const entriesSnap = await getDocs(entriesQuery);
      const allEntries = entriesSnap.docs.map(doc => decodeEntry({
        id: doc.id,
        ...doc.data()
      }));
      // Filter entries for the selected year
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

  function getCategoryStats() {
    const stats = categories.map(category => {
      const categoryEntries = entries.filter(e => e.categoryId === category.id);
      const count = categoryEntries.length;

      // Count subcategories
      const subcategoryStats = category.subcategories?.map((sub, index) => ({
        name: sub.name,
        chartName: String(index + 1),
        count: categoryEntries.filter(e => e.subcategoryIndex === index).length,
        color: getCategoryColor(category, index)
      })) || [];

      // Entries without a valid subcategory still belong to this existing category.
      const categorizedEntryCount = subcategoryStats.reduce((total, subcategory) => total + subcategory.count, 0);
      const uncategorizedCount = count - categorizedEntryCount;
      if (uncategorizedCount > 0) {
        subcategoryStats.push({
          name: category.name,
          chartName: String(subcategoryStats.length + 1),
          count: uncategorizedCount,
          color: category.color || '#6b7280'
        });
      }

      return {
        category,
        count,
        subcategoryStats,
        pieSubcategoryStats: subcategoryStats.filter(subcategory => subcategory.count > 0)
      };
    });

    return stats.filter(s => s.count > 0); // Only show categories with entries
  }

  const categoryStats = getCategoryStats();

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading"></div>
          <p>Loading statistics...</p>
        </div>
      </Layout>
    );
  }

  if (categories.length === 0) {
    return (
      <Layout>
        <div className="statistics-page">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No categories yet</h3>
            <p>Create categories to start tracking and analyzing your journal.</p>
            <button onClick={() => navigate('/categories')} className="btn btn-primary">
              Create your first category
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="statistics-page">
        <div className="page-header">
          <h1>Statistics & Analysis</h1>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="year-select"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {categoryStats.length === 0 ? (
          <div className="stats-container">
            <div className="category-stat-card empty-chart-card">
              <div className="stat-card-header">
                <div className="stat-card-title">
                  <span
                    className="category-color-indicator"
                    style={{ backgroundColor: '#6b7280' }}
                  ></span>
                  <h2>Your statistics will appear here</h2>
                </div>
                <div className="stat-card-count">
                  0 entries in {selectedYear}
                </div>
              </div>

              <div className="chart-section">
                <h3>Distribution</h3>
                <div className="charts-row">
                  <div className="chart-container empty-chart">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[{ name: 'No data', count: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3c4250" />
                        <XAxis dataKey="name" stroke="#9aa0a6" style={{ fontSize: '0.85rem' }} />
                        <YAxis stroke="#9aa0a6" style={{ fontSize: '0.85rem' }} />
                        <Bar dataKey="count" fill="#3a3f4a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="chart-overlay">
                      <p>Start adding journal entries to see statistics</p>
                    </div>
                  </div>

                  <div className="chart-container empty-chart">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[{ name: 'No data', value: 1 }]}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#3a3f4a"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="chart-overlay">
                      <p>Your distribution will appear here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="stats-container">
            {categoryStats.map(({ category, count, subcategoryStats, pieSubcategoryStats }) => (
              <div key={category.id} className="category-stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-title">
                    <span
                      className="category-color-indicator"
                      style={{ backgroundColor: category.color || '#6b7280' }}
                    ></span>
                    <h2>{category.name}</h2>
                  </div>
                  <div className="stat-card-count">
                    {count} {count === 1 ? 'entry' : 'entries'} in {selectedYear}
                  </div>
                </div>

                {subcategoryStats.length > 0 && (
                  <>
                    <div className="chart-section">
                      <h3>Distribution</h3>
                      <div className="charts-row">
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={subcategoryStats}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#3c4250" />
                              <XAxis
                                dataKey="chartName"
                                stroke="#9aa0a6"
                                style={{ fontSize: '0.85rem' }}
                              />
                              <YAxis stroke="#9aa0a6" style={{ fontSize: '0.85rem' }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#2d3442',
                                  border: '1px solid #3c4250',
                                  borderRadius: '6px',
                                  color: '#e8eaed'
                                }}
                              />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {subcategoryStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={pieSubcategoryStats}
                                dataKey="count"
                                nameKey="chartName"
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                label={({ payload, percent, x, y, textAnchor }) => (
                                  <text x={x} y={y} textAnchor={textAnchor} fill="white" style={{ fontSize: '0.75rem' }}>
                                    {payload.name}: {(percent * 100).toFixed(0)}%
                                  </text>
                                )}
                                labelLine={{ stroke: '#9aa0a6' }}
                              >
                                {pieSubcategoryStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                              </Pie>
                              <circle cx="50%" cy="50%" r={85} fill="none" stroke="white" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#2d3442',
                                  border: '1px solid #3c4250',
                                  borderRadius: '6px',
                                  color: '#e8eaed'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="legend-section">
                      <h3>Legend</h3>
                      <div className="legend-grid">
                        {subcategoryStats.map((sub, index) => (
                          <div key={index} className="legend-item">
                            <span
                              className="legend-color"
                              style={{ backgroundColor: sub.color }}
                            ></span>
                            <span className="legend-name">{sub.name}</span>
                            <span className="legend-value">
                              {sub.count} ({((sub.count / count) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
