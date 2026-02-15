import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaDownload, FaPrint } from 'react-icons/fa';
import { incomeAPI, purchasesAPI, configurationAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import { generateReceipt } from '../utils/receiptGenerator';
import SuccessMessage from './SuccessMessage';
import './Income.css';

const Income = () => {
  const [incomeRecords, setIncomeRecords] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    pcs: '',
    unit_price: '',
    selling_price: '',
    total_price: '',
    client_name: '',
    client_phone: '',
    seller_name: ''
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printRecord, setPrintRecord] = useState(null);
  const [receiptOpts, setReceiptOpts] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    fetchIncome();
    fetchInventory();
  }, []);

  useEffect(() => {
    // Listen for search result selection
    const handleSearchResult = (event) => {
      const result = event.detail;
      if (result.type === 'Sale') {
        setHighlightedId(result.id);
        setTimeout(() => {
          const element = document.getElementById(`income-row-${result.id}`);
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
    // Auto-calculate total price based on selling price and pieces
    if (formData.pcs === '' || formData.selling_price === '') {
      setFormData(prev => ({ ...prev, total_price: '' }));
      return;
    }
    const pcs = parseFloat(formData.pcs) || 0;
    const sellingPrice = parseFloat(formData.selling_price) || 0;
    const total = pcs * sellingPrice;
    setFormData(prev => ({ ...prev, total_price: total }));
  }, [formData.pcs, formData.selling_price]);

  const fetchIncome = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await incomeAPI.getAllIncome();
      if (response.success) {
        setIncomeRecords(response.income || []);
      } else {
        setError(response.message || 'Failed to fetch sales records');
      }
    } catch (error) {
      setError('An error occurred while fetching sales records');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await purchasesAPI.getAllPurchases();
      if (response.success) {
        setInventoryItems(response.purchases || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleNewClick = () => {
    setShowForm(true);
    setEditingId(null);
    setSearchQuery('');
    setSelectedInventoryItem(null);
    setShowDropdown(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      name: '',
      pcs: '',
      unit_price: '',
      selling_price: '',
      total_price: '',
      client_name: '',
      client_phone: '',
      seller_name: ''
    });
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setShowForm(true);
    setSearchQuery(record.name);
    setShowDropdown(false);
    // Try to find the inventory item
    const inventoryItem = inventoryItems.find(item => item.name === record.name);
    setSelectedInventoryItem(inventoryItem || null);
    setFormData({
      date: record.date,
      name: record.name,
      pcs: record.pcs || '',
      unit_price: inventoryItem ? inventoryItem.unit_price : '',
      selling_price: record.unit_price || '',
      total_price: record.total_price || '',
      client_name: record.client_name || '',
      client_phone: record.client_phone || '',
      seller_name: record.seller_name || ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setSearchQuery('');
    setSelectedInventoryItem(null);
    setShowDropdown(false);
    setFormData({
      date: '',
      name: '',
      pcs: '',
      unit_price: '',
      selling_price: '',
      total_price: '',
      client_name: '',
      client_phone: '',
      seller_name: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.date || !formData.name || !formData.pcs || !formData.selling_price) {
      setError('Please fill in all required fields (Date, Item Name, Pcs, Selling Price)');
      return;
    }

    if (!selectedInventoryItem && !editingId) {
      setError('Please search and select an item from inventory');
      return;
    }

    if (!formData.name || formData.name.trim() === '') {
      setError('Please select an item from inventory');
      return;
    }

    // Prepare data with proper number conversion
    // Store selling_price as unit_price in the database for backward compatibility
    const submitData = {
      date: formData.date,
      name: formData.name,
      pcs: parseInt(formData.pcs) || 0,
      unit_price: parseFloat(formData.selling_price) || 0,
      client_name: formData.client_name,
      client_phone: formData.client_phone,
      seller_name: formData.seller_name
    };

    try {
      let response;
      if (editingId) {
        response = await incomeAPI.updateIncome(editingId, submitData);
        if (response.success) {
          setSuccessMessage('Sales record updated successfully!');
        }
      } else {
        response = await incomeAPI.createIncome(submitData);
        if (response.success) {
          setSuccessMessage('Sales record created successfully!');
        }
      }

      if (response.success) {
        handleCancel();
        fetchIncome();
      } else {
        setError(response.message || 'Failed to save sales record');
      }
    } catch (error) {
      setError('An error occurred while saving sales record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sales record?')) {
      return;
    }

    setError('');
    try {
      const response = await incomeAPI.deleteIncome(id);
      if (response.success) {
        setSuccessMessage('Sales record deleted successfully!');
        fetchIncome();
      } else {
        setError(response.message || 'Failed to delete sales record');
      }
    } catch (error) {
      setError('An error occurred while deleting sales record');
    }
  };

  const getReceiptOptions = async () => {
    const configResponse = await configurationAPI.getConfiguration();
    const c = configResponse.success && configResponse.configuration ? configResponse.configuration : {};
    return {
      appName: c.app_name || 'Shop Accountant',
      location: c.location || null,
      items: c.items || [],
      thank_you_message: c.receipt_thank_you_message,
      items_received_message: c.receipt_items_received_message
    };
  };

  const handleDownloadReceipt = async (record) => {
    try {
      const opts = await getReceiptOptions();
      generateReceipt(record, 'sale', {
        ...opts,
        seller_name: record.seller_name || '',
        printerType: 'normal',
        action: 'download'
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      setError('Failed to generate receipt. Please try again.');
    }
  };

  const handlePrintClick = async (record) => {
    try {
      const opts = await getReceiptOptions();
      setReceiptOpts({ ...opts, seller_name: record.seller_name || '' });
      setPrintRecord(record);
      setShowPrintModal(true);
    } catch (error) {
      console.error('Error preparing print:', error);
      setError('Failed to open print options.');
    }
  };

  const handlePrintConfirm = (printerType) => {
    if (!printRecord || !receiptOpts) return;
    generateReceipt(printRecord, 'sale', {
      ...receiptOpts,
      printerType,
      action: 'print'
    });
    setShowPrintModal(false);
    setPrintRecord(null);
    setReceiptOpts(null);
  };

  const handleInputChange = (field, value) => {
    // Allow empty strings for number fields
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInventorySearch = (query) => {
    setSearchQuery(query);
    setShowDropdown(true);
    
    if (query === '') {
      setSelectedInventoryItem(null);
      setFormData(prev => ({
        ...prev,
        name: '',
        unit_price: ''
      }));
    }
  };

  const handleNameFieldFocus = () => {
    if (!editingId) {
      setShowDropdown(true);
      // Show all items when focused if no search query
      if (!searchQuery) {
        setShowDropdown(true);
      }
    }
  };

  const handleSelectInventoryItem = (item) => {
    setSelectedInventoryItem(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
    setFormData(prev => ({
      ...prev,
      name: item.name,
      unit_price: item.unit_price || ''
    }));
  };

  const filteredInventory = searchQuery
    ? inventoryItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : inventoryItems;

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
    let records = [...incomeRecords];

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
        case 'price-asc':
          return (parseFloat(a.total_price) || 0) - (parseFloat(b.total_price) || 0);
        case 'price-desc':
          return (parseFloat(b.total_price) || 0) - (parseFloat(a.total_price) || 0);
        default:
          return 0;
      }
    });

    return records;
  };

  return (
    <div className="income-container">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      
      <div className="income-header">
        <h1 className="income-title">Sales Management</h1>
        <button className="new-income-btn" onClick={handleNewClick}>
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
            <option value="price-asc">Total Price (Low-High)</option>
            <option value="price-desc">Total Price (High-Low)</option>
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

      {showPrintModal && (
        <div className="receipt-print-modal-overlay" onClick={() => { setShowPrintModal(false); setPrintRecord(null); setReceiptOpts(null); }}>
          <div className="receipt-print-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="receipt-print-modal-title">Select printer type</h3>
            <div className="receipt-print-options">
              <button
                type="button"
                className="receipt-print-option receipt-print-option-small"
                onClick={() => handlePrintConfirm('small')}
              >
                <span className="receipt-print-option-icon">🖨️</span>
                <span className="receipt-print-option-label">Small printer</span>
                <span className="receipt-print-option-desc">58mm thermal (e.g. mobile Bluetooth)</span>
              </button>
              <button
                type="button"
                className="receipt-print-option receipt-print-option-normal"
                onClick={() => handlePrintConfirm('normal')}
              >
                <span className="receipt-print-option-icon">🖨️</span>
                <span className="receipt-print-option-label">Normal printer</span>
                <span className="receipt-print-option-desc">A4 / Letter — Save as PDF or print</span>
              </button>
            </div>
            <button type="button" className="receipt-print-cancel" onClick={() => { setShowPrintModal(false); setPrintRecord(null); setReceiptOpts(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="income-form-overlay">
          <div className="income-form-container">
            <div className="form-header">
              <h2>{editingId ? 'Edit Sales Record' : 'New Sales Record'}</h2>
              <button className="close-btn" onClick={handleCancel}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="income-form">
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
                <div className="form-group" style={{ position: 'relative' }}>
                  <label htmlFor="name">Item Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={searchQuery}
                    onChange={(e) => handleInventorySearch(e.target.value)}
                    onFocus={handleNameFieldFocus}
                    onBlur={() => {
                      // Delay closing to allow click on dropdown item
                      setTimeout(() => setShowDropdown(false), 200);
                    }}
                    placeholder={editingId ? "Item name (from inventory)" : "Search and select from inventory..."}
                    required
                    readOnly={editingId ? true : false}
                    className={editingId ? "readonly-input" : "search-input"}
                  />
                  {!editingId && showDropdown && (
                    <div className="inventory-dropdown">
                      {filteredInventory.length > 0 ? (
                        filteredInventory.map((item) => (
                          <div
                            key={item.id}
                            className="inventory-dropdown-item"
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input blur
                              handleSelectInventoryItem(item);
                            }}
                          >
                            <span className="item-name">{item.name}</span>
                            <span className="item-price">
                              {formatCurrency(item.unit_price)} (Purchase Price)
                            </span>
                          </div>
                        ))
                      ) : searchQuery ? (
                        <div className="inventory-dropdown-item no-results">
                          No inventory items found matching "{searchQuery}"
                        </div>
                      ) : (
                        <div className="inventory-dropdown-item no-results">
                          Start typing to search inventory items...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="unit_price">Purchase Price (XAF)</label>
                  <input
                    type="text"
                    id="unit_price"
                    value={formData.unit_price === '' ? '' : (typeof formData.unit_price === 'number' ? formData.unit_price.toFixed(0) : formData.unit_price)}
                    readOnly
                    className="readonly-input"
                    placeholder="Auto-filled from inventory"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="selling_price">Selling Price (XAF) *</label>
                  <input
                    type="number"
                    id="selling_price"
                    value={formData.selling_price}
                    onChange={(e) => handleInputChange('selling_price', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Enter selling price"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pcs">Pcs (Pieces) *</label>
                  <input
                    type="number"
                    id="pcs"
                    value={formData.pcs}
                    onChange={(e) => handleInputChange('pcs', e.target.value)}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="total_price">Total Price (XAF)</label>
                  <input
                    type="text"
                    id="total_price"
                    value={formData.total_price === '' ? '' : (typeof formData.total_price === 'number' ? formData.total_price.toFixed(0) : formData.total_price)}
                    readOnly
                    className="readonly-input"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="client_name">Client Name</label>
                  <input
                    type="text"
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                    placeholder="Enter client name (optional)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="client_phone">Client Phone</label>
                  <input
                    type="text"
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => handleInputChange('client_phone', e.target.value)}
                    placeholder="Enter client phone (optional)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="seller_name">Seller's name</label>
                  <input
                    type="text"
                    id="seller_name"
                    value={formData.seller_name}
                    onChange={(e) => handleInputChange('seller_name', e.target.value)}
                    placeholder="Name shown on receipt (optional)"
                  />
                </div>
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
        <div className="loading-message">Loading sales records...</div>
      ) : (
        <div className="income-table-wrapper">
          <table className="income-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Pcs</th>
                <th>Selling Price</th>
                <th>Total Price</th>
                <th>Client Name</th>
                <th>Client Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getDisplayedRecords().length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-records">
                    No sales records found. Click "New" to add one.
                  </td>
                </tr>
              ) : (
                getDisplayedRecords().map((record) => (
                  <tr 
                    key={record.id} 
                    id={`income-row-${record.id}`}
                    className={`income-row ${highlightedId === record.id ? 'highlighted' : ''}`}
                  >
                    <td>{formatDate(record.date)}</td>
                    <td>{record.name}</td>
                    <td>{record.pcs}</td>
                    <td>{formatCurrency(record.unit_price)}</td>
                    <td className="total-price-cell">{formatCurrency(record.total_price)}</td>
                    <td>{record.client_name || 'N/A'}</td>
                    <td>{record.client_phone || 'N/A'}</td>
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
                        <button
                          className="action-btn download-btn"
                          onClick={() => handleDownloadReceipt(record)}
                          title="Download Receipt"
                        >
                          <FaDownload />
                        </button>
                        <button
                          className="action-btn print-btn"
                          onClick={() => handlePrintClick(record)}
                          title="Print Receipt"
                        >
                          <FaPrint />
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
    </div>
  );
};

export default Income;
