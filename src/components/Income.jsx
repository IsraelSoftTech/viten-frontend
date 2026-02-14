import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaDownload } from 'react-icons/fa';
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
    unit_price: '', // This will be inventory unit price (read-only)
    selling_price: '', // This will be the actual selling price
    total_price: '',
    customer_signature: '',
    electronic_signature: '',
    client_name: '',
    client_phone: ''
  });

  useEffect(() => {
    fetchIncome();
    fetchInventory();
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
      description: '',
      client_name: '',
      client_phone: ''
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
      unit_price: inventoryItem ? inventoryItem.unit_price : '', // Purchase price from inventory
      selling_price: record.unit_price || '', // In existing records, unit_price is the selling price
      total_price: record.total_price || '',
      customer_signature: record.customer_signature || '',
      electronic_signature: record.electronic_signature || '',
      client_name: record.client_name || '',
      client_phone: record.client_phone || ''
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
      description: '',
      client_name: '',
      client_phone: ''
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
      unit_price: parseFloat(formData.selling_price) || 0, // Store selling price as unit_price
      customer_signature: formData.customer_signature,
      electronic_signature: formData.electronic_signature,
      client_name: formData.client_name,
      client_phone: formData.client_phone
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
          setSuccessMessage('Sales record created successfully! Receipt generated.');
          
          // Generate receipt
          try {
            const configResponse = await configurationAPI.getConfiguration();
            const appName = configResponse.success && configResponse.configuration 
              ? configResponse.configuration.app_name 
              : 'Shop Accountant';
            const logoUrl = configResponse.success && configResponse.configuration 
              ? configResponse.configuration.logo_url 
              : null;
            const location = configResponse.success && configResponse.configuration 
              ? configResponse.configuration.location 
              : null;
            const items = configResponse.success && configResponse.configuration 
              ? configResponse.configuration.items || []
              : [];
            
            // Get the created record
            const createdRecord = response.income || {
              id: response.income?.id || Date.now(),
              date: submitData.date,
              name: submitData.name,
              pcs: submitData.pcs,
              unit_price: submitData.unit_price,
              total_price: submitData.pcs * submitData.unit_price,
              customer_signature: submitData.customer_signature || '',
              electronic_signature: submitData.electronic_signature || '',
              client_name: submitData.client_name || '',
              client_phone: submitData.client_phone || ''
            };
            
            generateReceipt(createdRecord, 'sale', appName, logoUrl, location, items);
          } catch (receiptError) {
            console.error('Error generating receipt:', receiptError);
            // Don't fail the operation if receipt generation fails
          }
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

  const handleDownloadReceipt = async (record) => {
    try {
      const configResponse = await configurationAPI.getConfiguration();
      const appName = configResponse.success && configResponse.configuration 
        ? configResponse.configuration.app_name 
        : 'Shop Accountant';
      const logoUrl = configResponse.success && configResponse.configuration 
        ? configResponse.configuration.logo_url 
        : null;
      const location = configResponse.success && configResponse.configuration 
        ? configResponse.configuration.location 
        : null;
      const items = configResponse.success && configResponse.configuration 
        ? configResponse.configuration.items || []
        : [];
      
      generateReceipt(record, 'sale', appName, logoUrl, location, items);
    } catch (error) {
      console.error('Error generating receipt:', error);
      setError('Failed to generate receipt. Please try again.');
    }
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
                  <label htmlFor="customer_signature">Customer Signature</label>
                  <input
                    type="text"
                    id="customer_signature"
                    value={formData.customer_signature}
                    onChange={(e) => handleInputChange('customer_signature', e.target.value)}
                    placeholder="Enter customer signature (optional)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="electronic_signature">Electronic Signature</label>
                  <input
                    type="text"
                    id="electronic_signature"
                    value={formData.electronic_signature}
                    onChange={(e) => handleInputChange('electronic_signature', e.target.value)}
                    placeholder="Enter electronic signature (optional)"
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
              {incomeRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-records">
                    No sales records found. Click "New" to add one.
                  </td>
                </tr>
              ) : (
                incomeRecords.map((record) => (
                  <tr key={record.id}>
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
