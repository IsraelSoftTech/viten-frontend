import React, { useState, useEffect } from 'react';
import { FaEllipsisV, FaCamera, FaTrash, FaTimes } from 'react-icons/fa';
import { configurationAPI, getFullImageUrl } from '../api';
import SuccessMessage from './SuccessMessage';
import './TopBar.css';

const TopBar = ({ onMenuToggle }) => {
  const [appName, setAppName] = useState('Shop Accountant');
  const [logoUrl, setLogoUrl] = useState(null);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
          let url = getFullImageUrl(response.configuration.logo_url);
          const cacheBusted = url ? `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}` : null;
          setLogoUrl(cacheBusted);
        } else {
          setLogoUrl(null);
        }
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
    }
  };

  const handleLogoClick = () => {
    setShowLogoModal(true);
    setError('');
    setLogoPreview(null);
  };

  const handleLogoFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    const fileInput = document.getElementById('topbar-logo-input');
    const file = fileInput?.files[0];
    
    if (!file) {
      setError('Please select a logo image');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const response = await configurationAPI.uploadLogo(file);
      if (response.success) {
        const raw = response.logo_url || null;
        const final = getFullImageUrl(raw);
        const urlToUse = final ? `${final}${final.includes('?') ? '&' : '?'}_=${Date.now()}` : null;
        setLogoUrl(urlToUse);

        setSuccessMessage('Logo uploaded successfully!');
        setShowLogoModal(false);
        setLogoPreview(null);
        fileInput.value = '';
        window.dispatchEvent(new CustomEvent('configUpdated'));
      } else {
        setError(response.message || 'Failed to upload logo');
      }
    } catch (err) {
      setError('An error occurred while uploading logo');
      console.error('Logo upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('Remove the current logo?')) return;
    
    setUploading(true);
    setError('');
    try {
      const response = await configurationAPI.deleteLogo();
      if (response.success) {
        setLogoUrl(null);
        setSuccessMessage('Logo removed successfully!');
        setShowLogoModal(false);
        window.dispatchEvent(new CustomEvent('configUpdated'));
      } else {
        setError(response.message || 'Failed to delete logo');
      }
    } catch (error) {
      setError('An error occurred while deleting logo');
      console.error('Logo delete error:', error);
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setShowLogoModal(false);
    setLogoPreview(null);
    setError('');
  };

  return (
    <>
      {successMessage && (
        <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} />
      )}
      <header className="topbar-whatsapp">
        <h1 className="topbar-app-name">{appName}</h1>
        <div className="topbar-right-icons">
          <button
            className="topbar-logo-button"
            onClick={handleLogoClick}
            title="Click to change logo"
            aria-label="Change logo"
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${appName} Logo`} 
                className="topbar-logo-icon"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const ph = e.target.nextElementSibling;
                  if (ph) ph.classList.add('visible');
                }}
              />
            ) : null}
            <span className={`topbar-logo-placeholder ${logoUrl ? '' : 'visible'}`} aria-hidden="true">
              <FaCamera />
            </span>
            <div className="topbar-logo-overlay">
              <FaCamera className="topbar-camera-icon" />
            </div>
          </button>
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

      {/* Logo Upload Modal */}
      {showLogoModal && (
        <div className="topbar-modal-overlay" onClick={closeModal}>
          <div className="topbar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="topbar-modal-header">
              <h2>Change Logo</h2>
              <button
                className="topbar-modal-close"
                onClick={closeModal}
                disabled={uploading}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
            </div>

            <div className="topbar-modal-body">
              {error && <div className="topbar-modal-error">{error}</div>}

              {logoUrl && (
                <div className="topbar-modal-current-logo">
                  <p className="topbar-modal-label">Current Logo:</p>
                  <img src={logoUrl} alt="Current Logo" className="topbar-modal-logo-image" referrerPolicy="no-referrer" />
                </div>
              )}

              <div className="topbar-modal-upload-section">
                <label htmlFor="topbar-logo-input" className="topbar-modal-upload-label">
                  <FaCamera /> Select New Logo
                </label>
                <input
                  type="file"
                  id="topbar-logo-input"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleLogoFileSelect}
                  className="topbar-modal-file-input"
                  disabled={uploading}
                />
                {logoPreview && (
                  <div className="topbar-modal-preview">
                    <p className="topbar-modal-label">Preview:</p>
                    <img src={logoPreview} alt="Logo Preview" className="topbar-modal-logo-preview" />
                  </div>
                )}
                <p className="topbar-modal-hint">Supported: JPEG, PNG, GIF, WebP (max 5MB)</p>
              </div>
            </div>

            <div className="topbar-modal-footer">
              {logoUrl && (
                <button
                  className="topbar-modal-btn topbar-modal-delete-btn"
                  onClick={handleDeleteLogo}
                  disabled={uploading}
                >
                  <FaTrash /> Delete Logo
                </button>
              )}
              {logoPreview && (
                <button
                  className="topbar-modal-btn topbar-modal-upload-btn"
                  onClick={handleUploadLogo}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </button>
              )}
              <button
                className="topbar-modal-btn topbar-modal-cancel-btn"
                onClick={closeModal}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
