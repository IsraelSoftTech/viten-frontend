import React, { useState, useEffect } from 'react';
import { FaEllipsisV } from 'react-icons/fa';
import logo from '../assets/logo.jpg';
import { configurationAPI } from '../api';
import './TopBar.css';

const TopBar = ({ onMenuToggle }) => {
  const [appName, setAppName] = useState('Shop Accountant');
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    fetchConfiguration();
    
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
          const url = response.configuration.logo_url;
          setLogoUrl(url.startsWith('http') ? url : `${window.location.origin}${url}`);
        } else {
          setLogoUrl(null);
        }
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
    }
  };

  return (
    <header className="topbar-whatsapp">
      <h1 className="topbar-app-name">{appName}</h1>
      <div className="topbar-right-icons">
        <img 
          src={logoUrl || logo} 
          alt={`${appName} Logo`} 
          className="topbar-logo-icon"
          onError={(e) => {
            e.target.src = logo;
          }}
        />
        <button
          type="button"
          className="topbar-menu-dots"
          onClick={() => onMenuToggle?.()}
          aria-label="Open menu"
        >
          <FaEllipsisV className="dots-icon" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
