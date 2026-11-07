import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export default function Layout({ children }) {
  const { logout, currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  function isActive(path) {
    return location.pathname === path;
  }

  // Get first letter of email for user badge
  const userInitial = currentUser?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <span className="logo-text">Pixel Journal</span>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>

          <div className="navigation-container">
            <nav className={`nav ${mobileMenuOpen ? 'nav-open' : ''}`}>
              <Link
                to="/dashboard"
                className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/categories"
                className={`nav-link ${isActive('/categories') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Categories
              </Link>
              <Link
                to="/statistics"
                className={`nav-link ${isActive('/statistics') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Statistics
              </Link>
              <Link
                to="/account"
                className={`nav-link ${isActive('/account') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Data
              </Link>
            </nav>
          </div>

          <div className="header-actions">
            <button className="user-badge" title="Open account" aria-label="Open account" onClick={() => navigate('/account')}>
              {userInitial}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
