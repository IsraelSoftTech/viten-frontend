import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaDollarSign,
  FaDatabase,
  FaCog,
  FaExclamationTriangle,
  FaSave,
  FaEdit,
  FaUpload,
  FaImage,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaCircle,
  FaDownload,
  FaFileUpload,
  FaInfoCircle
} from 'react-icons/fa';
import { stockDeficiencyAPI, configurationAPI, currencyAPI, backupAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import SuccessMessage from './SuccessMessage';
import './Settings.css';

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('currencies');

  useEffect(() => {
    // Extract sub-route from path
    const path = location.pathname;
    if (path.includes('/currencies')) {
      setActiveTab('currencies');
    } else if (path.includes('/backup')) {
      setActiveTab('backup');
    } else if (path.includes('/configuration')) {
      setActiveTab('configuration');
    } else if (path.includes('/stock-deficiency')) {
      setActiveTab('stock-deficiency');
    } else {
      // Default to currencies if no sub-route
      setActiveTab('currencies');
      navigate('/settings/currencies', { replace: true });
    }
  }, [location.pathname, navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'currencies':
        return <CurrenciesContent />;
      case 'backup':
        return <BackupContent />;
      case 'configuration':
        return <ConfigurationContent />;
      case 'stock-deficiency':
        return <StockDeficiencyContent />;
      default:
        return <CurrenciesContent />;
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      <div className="settings-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

// Sub-components
const CurrenciesContent = () => {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    conversion_rate_to_fcfa: ''
  });

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await currencyAPI.getAllCurrencies();
      if (response.success) {
        setCurrencies(response.currencies || []);
      } else {
        setError(response.message || 'Failed to fetch currencies');
      }
    } catch (error) {
      setError('An error occurred while fetching currencies');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdd = () => {
    setFormData({ code: '', name: '', symbol: '', conversion_rate_to_fcfa: '' });
    setEditingId(null);
    setShowAddForm(true);
    setError('');
  };

  const handleEdit = (currency) => {
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol || '',
      conversion_rate_to_fcfa: currency.conversion_rate_to_fcfa
    });
    setEditingId(currency.id);
    setShowAddForm(true);
    setError('');
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ code: '', name: '', symbol: '', conversion_rate_to_fcfa: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.code || !formData.name || !formData.conversion_rate_to_fcfa) {
      setError('Please fill in all required fields');
      return;
    }

    const rate = parseFloat(formData.conversion_rate_to_fcfa);
    if (isNaN(rate) || rate <= 0) {
      setError('Conversion rate must be a positive number');
      return;
    }

    try {
      let response;
      if (editingId) {
        response = await currencyAPI.updateCurrency(editingId, {
          code: formData.code,
          name: formData.name,
          symbol: formData.symbol,
          conversion_rate_to_fcfa: rate
        });
      } else {
        response = await currencyAPI.createCurrency({
          code: formData.code,
          name: formData.name,
          symbol: formData.symbol,
          conversion_rate_to_fcfa: rate
        });
      }

      if (response.success) {
        setSuccessMessage(editingId ? 'Currency updated successfully!' : 'Currency created successfully!');
        setShowAddForm(false);
        setEditingId(null);
        setFormData({ code: '', name: '', symbol: '', conversion_rate_to_fcfa: '' });
        fetchCurrencies();
        // Trigger currency update event
        window.dispatchEvent(new CustomEvent('currencyUpdated'));
      } else {
        setError(response.message || 'Failed to save currency');
      }
    } catch (error) {
      setError('An error occurred while saving currency');
    }
  };

  const handleSetDefault = async (id) => {
    setError('');
    try {
      const response = await currencyAPI.setDefaultCurrency(id);
      if (response.success) {
        setSuccessMessage('Default currency updated successfully!');
        fetchCurrencies();
        // Trigger currency update event
        window.dispatchEvent(new CustomEvent('currencyUpdated'));
      } else {
        setError(response.message || 'Failed to set default currency');
      }
    } catch (error) {
      setError('An error occurred while setting default currency');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete ${code}?`)) {
      return;
    }

    setError('');
    try {
      const response = await currencyAPI.deleteCurrency(id);
      if (response.success) {
        setSuccessMessage('Currency deleted successfully!');
        fetchCurrencies();
        // Trigger currency update event
        window.dispatchEvent(new CustomEvent('currencyUpdated'));
      } else {
        setError(response.message || 'Failed to delete currency');
      }
    } catch (error) {
      setError('An error occurred while deleting currency');
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="section-header">
          <FaDollarSign className="section-icon" />
          <h2 className="section-title">Currencies</h2>
        </div>
        <div className="loading-message">Loading currencies...</div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      <div className="section-header">
        <FaDollarSign className="section-icon" />
        <h2 className="section-title">Currencies</h2>
        <button className="add-currency-btn" onClick={handleAdd}>
          <FaPlus /> Add Currency
        </button>
      </div>

      <div className="currencies-info">
        <p>Manage currencies and their conversion rates to FCFA. Set a default currency to display all amounts in that currency.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showAddForm && (
        <div className="currency-form-container">
          <h3 className="form-title">{editingId ? 'Edit Currency' : 'Add New Currency'}</h3>
          <form onSubmit={handleSubmit} className="currency-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="code">Currency Code *</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., USD, EUR"
                  maxLength="3"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">Currency Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., US Dollar"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="symbol">Symbol</label>
                <input
                  type="text"
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., $, €"
                />
              </div>
              <div className="form-group">
                <label htmlFor="conversion_rate_to_fcfa">Conversion Rate to FCFA *</label>
                <input
                  type="number"
                  id="conversion_rate_to_fcfa"
                  name="conversion_rate_to_fcfa"
                  value={formData.conversion_rate_to_fcfa}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., 600 (for 1 USD = 600 FCFA)"
                  step="0.0001"
                  min="0.0001"
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="form-submit-btn">
                <FaSave /> {editingId ? 'Update' : 'Create'} Currency
              </button>
              <button type="button" onClick={handleCancel} className="form-cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="currencies-table-wrapper">
        <table className="currencies-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Symbol</th>
              <th>Rate to FCFA</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currencies.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-records">
                  No currencies found. Add your first currency.
                </td>
              </tr>
            ) : (
              currencies.map((currency) => (
                <tr key={currency.id} className={currency.is_default ? 'default-currency' : ''}>
                  <td><strong>{currency.code}</strong></td>
                  <td>{currency.name}</td>
                  <td>{currency.symbol || currency.code}</td>
                  <td>{currency.conversion_rate_to_fcfa.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                  <td>
                    <button
                      className={`status-btn ${currency.is_default ? 'default' : 'not-default'}`}
                      onClick={() => handleSetDefault(currency.id)}
                      title={currency.is_default ? 'Default Currency' : 'Set as Default'}
                    >
                      {currency.is_default ? (
                        <>
                          <FaCheckCircle /> Default
                        </>
                      ) : (
                        <>
                          <FaCircle /> Set Default
                        </>
                      )}
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(currency)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      {currency.code !== 'FCFA' && (
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(currency.id, currency.code)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BackupContent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [backupInfo, setBackupInfo] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchBackupInfo();
  }, []);

  const fetchBackupInfo = async () => {
    try {
      const response = await backupAPI.getBackupInfo();
      if (response.success) {
        setBackupInfo(response.info);
      }
    } catch (error) {
      console.error('Error fetching backup info:', error);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await backupAPI.createBackup();
      if (response.success) {
        setSuccessMessage('Backup created and downloaded successfully!');
        fetchBackupInfo();
      } else {
        setError(response.message || 'Failed to create backup');
      }
    } catch (error) {
      setError('An error occurred while creating backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setError('Please select a valid JSON backup file');
      e.target.value = '';
      return;
    }

    // Confirm restore action
    if (!window.confirm(
      'WARNING: Restoring a backup will replace ALL current data with the backup data. ' +
      'This action cannot be undone. Are you sure you want to continue?'
    )) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await backupAPI.restoreBackup(file);
      if (response.success) {
        setSuccessMessage(response.message || 'Backup restored successfully! Please refresh the page.');
        fetchBackupInfo();
        // Trigger a page reload after 2 seconds to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(response.message || 'Failed to restore backup');
      }
    } catch (error) {
      setError('An error occurred while restoring backup');
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="settings-section">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      <div className="section-header">
        <FaDatabase className="section-icon" />
        <h2 className="section-title">Backup & Restore</h2>
      </div>

      <div className="backup-info-section">
        <div className="backup-info-card">
          <FaInfoCircle className="info-icon" />
          <div className="backup-info-content">
            <h3>How Backup Works</h3>
            <p>
              Create a backup file containing all your data (users, sales, expenses, inventory, currencies, etc.). 
              This file can be saved and used to restore your data on a new installation.
            </p>
            <ul className="backup-features">
              <li>✓ All database records are exported to a JSON file</li>
              <li>✓ Backup file can be saved anywhere on your computer</li>
              <li>✓ Restore works even after uninstalling and reinstalling the app</li>
              <li>✓ All tables and data are preserved</li>
            </ul>
          </div>
        </div>
      </div>

      {backupInfo && (
        <div className="backup-stats">
          <h3>Current Data Summary</h3>
          <div className="backup-stats-grid">
            {backupInfo.tables.map((table) => (
              <div key={table.name} className="backup-stat-item">
                <span className="stat-label">{table.name}</span>
                <span className="stat-value">{table.recordCount} records</span>
              </div>
            ))}
            <div className="backup-stat-item total">
              <span className="stat-label">Total Records</span>
              <span className="stat-value">{backupInfo.totalRecords}</span>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="backup-actions">
        <div className="backup-action-card">
          <div className="backup-action-header">
            <FaDownload className="action-icon" />
            <h3>Create Backup</h3>
          </div>
          <p className="backup-action-description">
            Download a complete backup of all your data. Save this file in a safe location.
          </p>
          <button
            className="backup-action-btn create"
            onClick={handleCreateBackup}
            disabled={loading}
          >
            {loading ? 'Creating Backup...' : 'Download Backup'}
          </button>
        </div>

        <div className="backup-action-card">
          <div className="backup-action-header">
            <FaFileUpload className="action-icon" />
            <h3>Restore Backup</h3>
          </div>
          <p className="backup-action-description">
            Upload a previously saved backup file to restore all your data.
          </p>
          <label htmlFor="restore-file-input" className="backup-action-btn restore">
            <input
              type="file"
              id="restore-file-input"
              accept=".json"
              onChange={handleRestoreBackup}
              disabled={restoring}
              style={{ display: 'none' }}
            />
            {restoring ? 'Restoring...' : 'Upload & Restore'}
          </label>
        </div>
      </div>

      <div className="backup-warning">
        <FaInfoCircle className="warning-icon" />
        <div>
          <strong>Important:</strong>
          <ul>
            <li>Always create a backup before restoring to avoid data loss</li>
            <li>Restoring will replace ALL current data with the backup data</li>
            <li>Make sure the backup file is from this application</li>
            <li>Keep your backup files in a safe location</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const ConfigurationContent = () => {
  const [appName, setAppName] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [location, setLocation] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await configurationAPI.getConfiguration();
      if (response.success) {
        setAppName(response.configuration.app_name || 'Shop Accountant');
        if (response.configuration.logo_url) {
          setLogoUrl(`http://localhost:5000${response.configuration.logo_url}`);
        } else {
          // Use default logo
          setLogoUrl(null);
        }
        setLocation(response.configuration.location || '');
        setItems(response.configuration.items || []);
      } else {
        setError(response.message || 'Failed to fetch configuration');
      }
    } catch (error) {
      setError('An error occurred while fetching configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAppNameChange = (e) => {
    setAppName(e.target.value);
  };

  const handleAppNameSave = async () => {
    if (!appName.trim()) {
      setError('App name cannot be empty');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await configurationAPI.updateAppName(appName.trim());
      if (response.success) {
        setSuccessMessage('App name updated successfully!');
        // Update TopBar by triggering a custom event
        window.dispatchEvent(new CustomEvent('configUpdated'));
      } else {
        setError(response.message || 'Failed to update app name');
      }
    } catch (error) {
      setError('An error occurred while updating app name');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
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
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    const fileInput = document.getElementById('logo-input');
    const file = fileInput?.files[0];
    
    if (!file) {
      setError('Please select a logo image');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await configurationAPI.uploadLogo(file);
      if (response.success) {
        setSuccessMessage('Logo uploaded successfully!');
        setLogoUrl(`http://localhost:5000${response.logo_url}`);
        setLogoPreview(null);
        fileInput.value = '';
        // Update TopBar by triggering a custom event
        window.dispatchEvent(new CustomEvent('configUpdated'));
      } else {
        setError(response.message || 'Failed to upload logo');
      }
    } catch (error) {
      setError('An error occurred while uploading logo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="section-header">
          <FaCog className="section-icon" />
          <h2 className="section-title">Configuration</h2>
        </div>
        <div className="loading-message">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      <div className="section-header">
        <FaCog className="section-icon" />
        <h2 className="section-title">Configuration</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* App Name Section */}
      <div className="config-section">
        <h3 className="config-section-title">App Name</h3>
        <p className="config-section-description">Change the application name displayed in the header</p>
        <div className="config-input-group">
          <input
            type="text"
            value={appName}
            onChange={handleAppNameChange}
            className="config-input"
            placeholder="Enter app name"
            disabled={saving}
          />
          <button
            onClick={handleAppNameSave}
            className="config-save-btn"
            disabled={saving || !appName.trim()}
          >
            <FaSave /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Logo Section */}
      <div className="config-section">
        <h3 className="config-section-title">App Logo</h3>
        <p className="config-section-description">Upload a logo image to replace the default logo</p>
        
        <div className="logo-preview-section">
          <div className="logo-preview-container">
            <div className="logo-preview-label">Current Logo:</div>
            <div className="logo-preview-box">
              {logoUrl ? (
                <img src={logoUrl} alt="Current Logo" className="logo-preview-image" />
              ) : (
                <div className="logo-preview-placeholder">
                  <FaImage className="logo-placeholder-icon" />
                  <span>Default Logo</span>
                </div>
              )}
            </div>
          </div>

          {logoPreview && (
            <div className="logo-preview-container">
              <div className="logo-preview-label">New Logo Preview:</div>
              <div className="logo-preview-box">
                <img src={logoPreview} alt="Logo Preview" className="logo-preview-image" />
              </div>
            </div>
          )}
        </div>

        <div className="logo-upload-section">
          <label htmlFor="logo-input" className="logo-upload-label">
            <FaUpload /> Select Logo Image
          </label>
          <input
            type="file"
            id="logo-input"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleLogoSelect}
            className="logo-input"
            disabled={saving}
          />
          {logoPreview && (
            <button
              onClick={handleLogoUpload}
              className="config-save-btn"
              disabled={saving}
            >
              <FaUpload /> {saving ? 'Uploading...' : 'Upload Logo'}
            </button>
          )}
        </div>
        <p className="config-hint">Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB</p>
      </div>

      {/* Location Section */}
      <div className="config-section">
        <h3 className="config-section-title">Company Location</h3>
        <p className="config-section-description">Enter the location/address of your company</p>
        <div className="config-input-group">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="config-input"
            placeholder="Enter company location/address"
            disabled={saving}
          />
          <button
            onClick={async () => {
              setSaving(true);
              setError('');
              try {
                const response = await configurationAPI.updateLocation(location.trim());
                if (response.success) {
                  setSuccessMessage('Location updated successfully!');
                } else {
                  setError(response.message || 'Failed to update location');
                }
              } catch (error) {
                setError('An error occurred while updating location');
              } finally {
                setSaving(false);
              }
            }}
            className="config-save-btn"
            disabled={saving}
          >
            <FaSave /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Items/Services Section */}
      <div className="config-section">
        <h3 className="config-section-title">Items/Services Sold</h3>
        <p className="config-section-description">Add up to 7 items or services that your shop sells (these will appear on receipts)</p>
        <div className="items-list-container">
          {items.map((item, index) => (
            <div key={index} className="item-input-row">
              <span className="item-number">{index + 1})</span>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index] = e.target.value;
                  setItems(newItems);
                }}
                className="item-input"
                placeholder={`Item/Service ${index + 1}`}
                disabled={saving}
              />
              <button
                onClick={() => {
                  const newItems = items.filter((_, i) => i !== index);
                  setItems(newItems);
                }}
                className="item-delete-btn"
                disabled={saving}
                title="Remove item"
              >
                <FaTrash />
              </button>
            </div>
          ))}
          {items.length < 7 && (
            <button
              onClick={() => setItems([...items, ''])}
              className="add-item-btn"
              disabled={saving}
            >
              <FaPlus /> Add Item/Service
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={async () => {
                const validItems = items.filter(item => item.trim() !== '');
                if (validItems.length === 0) {
                  setError('Please add at least one item/service');
                  return;
                }
                setSaving(true);
                setError('');
                try {
                  const response = await configurationAPI.updateItems(validItems);
                  if (response.success) {
                    setSuccessMessage('Items/Services updated successfully!');
                    setItems(validItems);
                  } else {
                    setError(response.message || 'Failed to update items');
                  }
                } catch (error) {
                  setError('An error occurred while updating items');
                } finally {
                  setSaving(false);
                }
              }}
              className="config-save-btn"
              disabled={saving}
            >
              <FaSave /> {saving ? 'Saving...' : 'Save Items/Services'}
            </button>
          )}
        </div>
        {items.length === 0 && (
          <p className="config-hint">Click "Add Item/Service" to start adding items</p>
        )}
      </div>
    </div>
  );
};

const StockDeficiencyContent = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [thresholdValue, setThresholdValue] = useState('');

  useEffect(() => {
    fetchInventoryStock();
  }, []);

  const fetchInventoryStock = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await stockDeficiencyAPI.getInventoryStock();
      if (response.success) {
        setInventoryItems(response.items || []);
      } else {
        setError(response.message || 'Failed to fetch inventory stock');
      }
    } catch (error) {
      setError('An error occurred while fetching inventory stock');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setThresholdValue(item.stock_deficiency_threshold || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setThresholdValue('');
  };

  const handleSave = async (itemId) => {
    setError('');
    
    if (thresholdValue === '' || parseInt(thresholdValue) < 0) {
      setError('Please enter a valid threshold (0 or greater)');
      return;
    }

    try {
      const response = await stockDeficiencyAPI.updateThreshold(itemId, parseInt(thresholdValue));
      if (response.success) {
        setSuccessMessage('Stock deficiency threshold updated successfully!');
        setEditingId(null);
        setThresholdValue('');
        fetchInventoryStock();
      } else {
        setError(response.message || 'Failed to update threshold');
      }
    } catch (error) {
      setError('An error occurred while updating threshold');
    }
  };

  const getStockStatus = (availableStock, threshold) => {
    if (threshold === 0 || threshold === null) return 'normal';
    if (availableStock <= threshold) return 'deficient';
    if (availableStock <= threshold * 1.5) return 'warning';
    return 'normal';
  };

  const [defaultCurrency, setDefaultCurrency] = useState(null);

  useEffect(() => {
    const loadCurrency = async () => {
      const currency = await fetchDefaultCurrency();
      setDefaultCurrency(currency);
    };
    loadCurrency();

    const handleCurrencyUpdate = async () => {
      const currency = await fetchDefaultCurrency();
      setDefaultCurrency(currency);
    };
    window.addEventListener('currencyUpdated', handleCurrencyUpdate);
    return () => {
      window.removeEventListener('currencyUpdated', handleCurrencyUpdate);
    };
  }, []);

  const formatCurrency = (amount) => {
    if (!defaultCurrency) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    }
    return formatCurrencyUtil(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="settings-section">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      <div className="section-header">
        <FaExclamationTriangle className="section-icon" />
        <h2 className="section-title">Stock Deficiency</h2>
      </div>
      
      <div className="stock-deficiency-info">
        <p>Set alert thresholds for inventory items. You'll be notified on the Dashboard when stock falls below the threshold.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-message">Loading inventory items...</div>
      ) : (
        <div className="stock-deficiency-table-wrapper">
          <table className="stock-deficiency-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Total Purchased</th>
                <th>Pcs Sold</th>
                <th>Available Stock</th>
                <th>Alert Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-records">
                    No inventory items found. Add items in Inventory first.
                  </td>
                </tr>
              ) : (
                inventoryItems.map((item) => {
                  const status = getStockStatus(item.available_stock, item.stock_deficiency_threshold);
                  const isEditing = editingId === item.id;
                  
                  return (
                    <tr key={item.id} className={status === 'deficient' ? 'deficient-row' : ''}>
                      <td>{item.name}</td>
                      <td>{item.pcs}</td>
                      <td>{item.pcs_sold || 0}</td>
                      <td className={status === 'deficient' ? 'deficient-stock' : ''}>
                        {item.available_stock || 0}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={thresholdValue}
                            onChange={(e) => setThresholdValue(e.target.value)}
                            className="threshold-input"
                            placeholder="Enter threshold"
                          />
                        ) : (
                          <span>{item.stock_deficiency_threshold || 'Not set'}</span>
                        )}
                      </td>
                      <td>
                        {status === 'deficient' && (
                          <span className="status-badge deficient">Low Stock</span>
                        )}
                        {status === 'warning' && (
                          <span className="status-badge warning">Warning</span>
                        )}
                        {status === 'normal' && item.stock_deficiency_threshold > 0 && (
                          <span className="status-badge normal">Normal</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="action-buttons">
                            <button
                              className="action-btn save-btn"
                              onClick={() => handleSave(item.id)}
                              title="Save"
                            >
                              <FaSave />
                            </button>
                            <button
                              className="action-btn cancel-btn"
                              onClick={handleCancel}
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit(item)}
                            title="Set Threshold"
                          >
                            <FaEdit />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Settings;
