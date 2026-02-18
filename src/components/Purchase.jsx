import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import { purchasesAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import SuccessMessage from './SuccessMessage';
import './Purchase.css';
import { getLocalDate } from '../utils/date';

const Purchase = () => {
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    pcs: '',
    unit_price: '',
    total_amount: '',
    description: '',
    supplier_name: '',
    image: null,
    image_preview: ''
  });



  // Lightbox for viewing full-size item images
  const [lightboxSrc, setLightboxSrc] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setLightboxSrc(''); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    // prevent background scroll while lightbox is open
    document.body.style.overflow = lightboxSrc ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxSrc]);

  const openLightbox = (src) => setLightboxSrc(src || '');
  const closeLightbox = () => setLightboxSrc('');

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    // Listen for search result selection
    const handleSearchResult = (event) => {
      const result = event.detail;
      if (result.type === 'Inventory') {
        setHighlightedId(result.id);
        setTimeout(() => {
          const element = document.getElementById(`purchase-row-${result.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    };

    window.addEventListener('searchResultSelected', handleSearchResult);
    return () => window.removeEventListener('searchResultSelected', handleSearchResult);
  }, []);

  useEffect(() => {
    // Auto-calculate total amount
    if (formData.pcs === '' || formData.unit_price === '') {
      setFormData(prev => ({ ...prev, total_amount: '' }));
      return;
    }
    const pcs = parseFloat(formData.pcs) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    const total = pcs * unitPrice;
    setFormData(prev => ({ ...prev, total_amount: total }));
  }, [formData.pcs, formData.unit_price]);

  const fetchPurchases = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await purchasesAPI.getAllPurchases();
      if (response.success) {
        setPurchaseRecords(response.purchases || []);
      } else {
        setError(response.message || 'Failed to fetch purchase records');
      }
    } catch (error) {
      setError('An error occurred while fetching purchase records');
    } finally {
      setLoading(false);
    }
  };

  const handleNewClick = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData({
      date: getLocalDate(),
      name: '',
      pcs: '',
      unit_price: '',
      total_amount: '',
      description: '',
      supplier_name: '',
      image: null,
      image_preview: ''
    });
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setShowForm(true);
    setFormData({
      date: record.date,
      name: record.name,
      pcs: record.pcs || '',
      unit_price: record.unit_price || '',
      total_amount: record.total_amount || '',
      description: record.description || '',
      supplier_name: record.supplier_name || '',
      image: null,
      image_preview: record.image_url || ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      date: '',
      name: '',
      pcs: '',
      unit_price: '',
      total_amount: '',
      description: '',
      supplier_name: '',
      image: null,
      image_preview: ''
    });
  };

  const handleImageChange = (file) => {
    if (!file) {
      setFormData(prev => ({ ...prev, image: null, image_preview: '' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller');
      return;
    }
    const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Only JPG/PNG/GIF/WEBP images are allowed');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ ...prev, image: file, image_preview: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.date || !formData.name || !formData.pcs || !formData.unit_price) {
      setError('Please fill in all required fields (Date, Name, Pcs, Unit Price)');
      return;
    }

    // Prepare data with proper number conversion
    const submitData = {
      date: formData.date,
      name: formData.name,
      pcs: parseInt(formData.pcs) || 0,
      unit_price: parseFloat(formData.unit_price) || 0,
      description: formData.description,
      supplier_name: formData.supplier_name
    };

    try {
      let response;

      // If an image file is present, send multipart/form-data
      if (formData.image) {
        const fd = new FormData();
        fd.append('date', submitData.date);
        fd.append('name', submitData.name);
        fd.append('pcs', String(submitData.pcs));
        fd.append('unit_price', String(submitData.unit_price));
        if (submitData.description) fd.append('description', submitData.description);
        if (submitData.supplier_name) fd.append('supplier_name', submitData.supplier_name);
        fd.append('image', formData.image);

        if (editingId) {
          response = await purchasesAPI.updatePurchase(editingId, fd);
          if (response.success) setSuccessMessage('Purchase record updated successfully!');
        } else {
          response = await purchasesAPI.createPurchase(fd);
          if (response.success) setSuccessMessage('Purchase record created successfully!');
        }
      } else {
        if (editingId) {
          response = await purchasesAPI.updatePurchase(editingId, submitData);
          if (response.success) setSuccessMessage('Purchase record updated successfully!');
        } else {
          response = await purchasesAPI.createPurchase(submitData);
          if (response.success) setSuccessMessage('Purchase record created successfully!');
        }
      }

      if (response.success) {
        handleCancel();
        fetchPurchases();
      } else {
        setError(response.message || 'Failed to save purchase record');
      }
    } catch (error) {
      setError('An error occurred while saving purchase record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase record?')) {
      return;
    }

    setError('');
    try {
      const response = await purchasesAPI.deletePurchase(id);
      if (response.success) {
        setSuccessMessage('Purchase record deleted successfully!');
        fetchPurchases();
      } else {
        setError(response.message || 'Failed to delete purchase record');
      }
    } catch (error) {
      setError('An error occurred while deleting purchase record');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDisplayedRecords = () => {
    let records = [...purchaseRecords];

    // Apply date filter
    if (filterDateFrom) {
      records = records.filter(r => new Date(r.date) >= new Date(filterDateFrom));
    }
    if (filterDateTo) {
      records = records.filter(r => new Date(r.date) <= new Date(filterDateTo));
    }

    // Apply sorting
    records.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'amount-asc':
          return (parseFloat(a.total_amount) || 0) - (parseFloat(b.total_amount) || 0);
        case 'amount-desc':
          return (parseFloat(b.total_amount) || 0) - (parseFloat(a.total_amount) || 0);
        default:
          return 0;
      }
    });

    return records;
  };

  return (
    <div className="purchase-container">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      
      <div className="purchase-header">
        <h1 className="purchase-title">Purchases Management</h1>
        <button className="new-purchase-btn" onClick={handleNewClick}>
          <FaPlus className="btn-icon" />
          New
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="sort-filter-controls">
        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select id="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="amount-asc">Amount (Low-High)</option>
            <option value="amount-desc">Amount (High-Low)</option>
          </select>
        </div>
        <div className="date-filter-controls">
          <label htmlFor="filter-from">From:</label>
          <input
            type="date"
            id="filter-from"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
          <label htmlFor="filter-to">To:</label>
          <input
            type="date"
            id="filter-to"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
          {(filterDateFrom || filterDateTo) && (
            <button className="clear-filter-btn" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="purchase-form-overlay">
          <div className="purchase-form-container">
            <div className="form-header">
              <h2>{editingId ? 'Edit Purchase Record' : 'New Purchase Record'}</h2>
              <button className="close-btn" onClick={handleCancel}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="purchase-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date *</label>
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter item name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pcs">Pcs (Pieces) *</label>
                  <input
                    type="number"
                    id="pcs"
                    value={formData.pcs}
                    onChange={(e) => handleInputChange('pcs', e.target.value)}
                    min="1"
                    placeholder="Enter pieces"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="unit_price">Unit Price (XAF) *</label>
                  <input
                    type="number"
                    id="unit_price"
                    value={formData.unit_price}
                    onChange={(e) => handleInputChange('unit_price', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Enter unit price"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="total_amount">Total Amount (XAF)</label>
                  <input
                    type="text"
                    id="total_amount"
                    value={formData.total_amount === '' ? '' : (typeof formData.total_amount === 'number' ? formData.total_amount.toFixed(0) : formData.total_amount)}
                    readOnly
                    className="readonly-input"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="supplier_name">Supplier Name</label>
                <input
                  type="text"
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                  placeholder="Enter supplier name (optional)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter description (optional)"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="item_picture">Item Picture</label>
                <input
                  type="file"
                  id="item_picture"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    handleImageChange(file);
                  }}
                />
                {formData.image_preview && (
                  <img src={formData.image_preview} alt="preview" className="purchase-thumbnail-preview" />
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  <FaSave className="btn-icon" />
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-message">Loading purchase records...</div>
      ) : (
        <div className="purchase-table-wrapper">
          <table className="purchase-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Picture</th>
                <th>Name</th>
                <th>Pcs</th>
                <th>Unit Price</th>
                <th>Total Amount</th>
                <th>Supplier Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getDisplayedRecords().length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-records">
                    No purchase records found. Click "New" to add one.
                  </td>
                </tr>
              ) : (
                getDisplayedRecords().map((record) => (
                  <tr 
                    key={record.id}
                    id={`purchase-row-${record.id}`}
                    className={`purchase-row ${highlightedId === record.id ? 'highlighted' : ''}`}
                  >
                    <td>{formatDate(record.date)}</td>
                    <td>
                      {record.image_url ? (
                        <div
                          className="thumbnail-wrapper"
                          role="button"
                          tabIndex={0}
                          onClick={() => openLightbox(record.image_url)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(record.image_url); } }}
                          title="View image"
                        >
                          <img src={record.image_url} className="purchase-thumbnail" alt={record.name || 'item'} />
                        </div>
                      ) : '-'}
                    </td>
                    <td>{record.name}</td>
                    <td>{record.pcs}</td>
                    <td>{formatCurrency(record.unit_price)}</td>
                    <td className="total-amount-cell">{formatCurrency(record.total_amount)}</td>
                    <td>{record.supplier_name || 'N/A'}</td>
                    <td className="description-cell">{record.description || 'N/A'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(record)}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(record.id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Lightbox / full-image viewer */}
      {lightboxSrc && (
        <div className="image-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true">
          <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox} aria-label="Close image">
              <FaTimes />
            </button>
            <img src={lightboxSrc} alt="Item full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchase;
