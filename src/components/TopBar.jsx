import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import logo from '../assets/logo.jpg';
import { configurationAPI } from '../api';
import './TopBar.css';

const TopBar = ({ onMenuToggle, sidebarOpen = false }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [appName, setAppName] = useState('Shop Accountant');
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    fetchConfiguration();
    
    // Listen for configuration updates
    const handleConfigUpdate = () => {
      fetchConfiguration();
    };
    
    window.addEventListener('configUpdated', handleConfigUpdate);
    return () => {
      window.removeEventListener('configUpdated', handleConfigUpdate);
    };
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await configurationAPI.getConfiguration();
      if (response.success) {
        setAppName(response.configuration.app_name || 'Shop Accountant');
        if (response.configuration.logo_url) {
          setLogoUrl(`http://localhost:5000${response.configuration.logo_url}`);
        } else {
          setLogoUrl(null);
        }
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName[0].toUpperCase();
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={() => onMenuToggle?.()}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <FaTimes className="menu-icon" /> : <FaBars className="menu-icon" />}
        </button>
        <img 
          src={logoUrl || logo} 
          alt={`${appName} Logo`} 
          className="topbar-logo"
          onError={(e) => {
            e.target.src = logo;
          }}
        />
        <h1 className="topbar-title">{appName}</h1>
      </div>
      <div className="topbar-right">
        <div className="user-profile">
          <div className="profile-circle">
            {getInitials(user.full_name || user.username || 'User')}
          </div>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
