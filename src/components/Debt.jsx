import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaDownload } from 'react-icons/fa';
import { debtAPI, purchasesAPI, configurationAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import { generateReceipt } from '../utils/receiptGenerator';
import SuccessMessage from './SuccessMessage';
import './Debt.css';

const Debt = () => {
  const [debtRecords, setDebtRecords] = useState([]);
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
    amount_payable_now: '',
    balance_owed: '',
    customer_signature: '',
    electronic_signature: '',
    client_name: '',
    client_phone: ''
  });

  useEffect(() => {
    fetchDebts();
    fetchInventory();
  }, []);

  useEffect(() => {
    // Auto-calculate total price based on selling price and pieces
    // Calculate whenever pcs or selling_price changes
    if (formData.pcs === '' || formData.selling_price === '') {
      setFormData(prev => ({ ...prev, total_price: '', balance_owed: '' }));
      return;
    }
    const pcs = parseFloat(formData.pcs) || 0;
    const sellingPrice = parseFloat(formData.selling_price) || 0;
    const total = pcs * sellingPrice;
    setFormData(prev => ({ ...prev, total_price: total }));
  }, [formData.pcs, formData.selling_price]);

  useEffect(() => {
    // Auto-calculate balance owed when total_price or amount_payable_now changes
    if (formData.total_price === '' || formData.amount_payable_now === '') {
      setFormData(prev => ({ ...prev, balance_owed: '' }));
      return;
    }
    const totalPrice = parseFloat(formData.total_price) || 0;
    const amountPayable = parseFloat(formData.amount_payable_now) || 0;
    const balance = totalPrice - amountPayable;
    setFormData(prev => ({ ...prev, balance_owed: balance }));
  }, [formData.total_price, formData.amount_payable_now]);

  const fetchDebts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await debtAPI.getAllDebts();
      if (response.success) {
        setDebtRecords(response.debts || []);
      } else {
        setError(response.message || 'Failed to fetch debt records');
      }
    } catch (error) {
      setError('An error occurred while fetching debt records');
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
      amount_payable_now: '',
      balance_owed: '',
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
      unit_price: inventoryItem ? inventoryItem.unit_price : '',
      selling_price: record.unit_price || '',
      total_price: record.total_price || '',
      amount_payable_now: record.amount_payable_now || '',
      balance_owed: record.balance_owed || '',
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
      amount_payable_now: '',
      balance_owed: '',
      description: '',
      client_name: '',
      client_phone: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.date || !formData.name || !formData.pcs || !formData.selling_price || formData.amount_payable_now === '') {
      setError('Please fill in all required fields (Date, Item Name, Pcs, Unit Selling Price, Amount Payable Now)');
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

    const totalPrice = parseFloat(formData.total_price) || 0;
    const amountPayable = parseFloat(formData.amount_payable_now) || 0;
    const balanceOwed = totalPrice - amountPayable;

    // Prepare data
    const submitData = {
      date: formData.date,
      name: formData.name,
      pcs: parseInt(formData.pcs) || 0,
      unit_price: parseFloat(formData.selling_price) || 0,
      total_price: totalPrice,
      amount_payable_now: amountPayable,
      balance_owed: balanceOwed,
      customer_signature: formData.customer_signature,
      electronic_signature: formData.electronic_signature,
      client_name: formData.client_name,
      client_phone: formData.client_phone
    };

    try {
      let response;
      if (editingId) {
        response = await debtAPI.updateDebt(editingId, submitData);
        if (response.success) {
          setSuccessMessage('Debt record updated successfully!');
        }
      } else {
        response = await debtAPI.createDebt(submitData);
        if (response.success) {
          setSuccessMessage('Debt record created successfully! Receipt generated.');
          
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
            const createdRecord = response.debt || {
              id: response.debt?.id || Date.now(),
              date: submitData.date,
              name: submitData.name,
              pcs: submitData.pcs,
              unit_price: submitData.selling_price,
              total_price: submitData.total_price,
              amount_payable_now: submitData.amount_payable_now,
              balance_owed: submitData.total_price - submitData.amount_payable_now,
              customer_signature: submitData.customer_signature || '',
              electronic_signature: submitData.electronic_signature || '',
              client_name: submitData.client_name || '',
              client_phone: submitData.client_phone || ''
            };
            
            generateReceipt(createdRecord, 'debt', appName, logoUrl, location, items);
          } catch (receiptError) {
            console.error('Error generating receipt:', receiptError);
            // Don't fail the operation if receipt generation fails
          }
        }
      }

      if (response.success) {
        handleCancel();
        fetchDebts();
      } else {
        setError(response.message || 'Failed to save debt record');
      }
    } catch (error) {
      setError('An error occurred while saving debt record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this debt record?')) {
      return;
    }

    setError('');
    try {
      const response = await debtAPI.deleteDebt(id);
      if (response.success) {
        setSuccessMessage('Debt record deleted successfully!');
        fetchDebts();
      } else {
        setError(response.message || 'Failed to delete debt record');
      }
    } catch (error) {
      setError('An error occurred while deleting debt record');
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
      
      generateReceipt(record, 'debt', appName, logoUrl, location, items);
    } catch (error) {
      console.error('Error generating receipt:', error);
      setError('Failed to generate receipt. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
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
    <div className="debt-container">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      
      <div className="debt-header">
        <h1 className="debt-title">Debts Management</h1>
        <button className="new-debt-btn" onClick={handleNewClick}>
          <FaPlus className="btn-icon" />
          New
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="debt-form-overlay">
          <div className="debt-form-container">
            <div className="form-header">
              <h2>{editingId ? 'Edit Debt Record' : 'New Debt Record'}</h2>
              <button className="close-btn" onClick={handleCancel}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="debt-form">
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
                  <label htmlFor="pcs">Pieces *</label>
                  <input
                    type="number"
                    id="pcs"
                    min="1"
                    value={formData.pcs}
                    onChange={(e) => handleInputChange('pcs', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="unit_price">Purchase Price</label>
                  <input
                    type="number"
                    id="unit_price"
                    value={formData.unit_price}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="selling_price">Unit Selling Price *</label>
                  <input
                    type="number"
                    id="selling_price"
                    min="0"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => handleInputChange('selling_price', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="total_price">Total Price</label>
                  <input
                    type="number"
                    id="total_price"
                    value={formData.total_price}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="amount_payable_now">Amount Payable Now *</label>
                  <input
                    type="number"
                    id="amount_payable_now"
                    min="0"
                    step="0.01"
                    value={formData.amount_payable_now}
                    onChange={(e) => handleInputChange('amount_payable_now', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="balance_owed">Balance Owed</label>
                  <input
                    type="number"
                    id="balance_owed"
                    value={formData.balance_owed}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
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
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="client_phone">Client Phone</label>
                  <input
                    type="text"
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => handleInputChange('client_phone', e.target.value)}
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

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  <FaSave /> {editingId ? 'Update' : 'Create'} Debt
                </button>
                <button type="button" onClick={handleCancel} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="debt-table-container">
          {loading ? (
            <div className="loading-message">Loading debt records...</div>
          ) : debtRecords.length === 0 ? (
            <div className="no-records">No debt records found. Click "New" to create one.</div>
          ) : (
            <table className="debt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item Name</th>
                  <th>Pcs</th>
                  <th>Unit Selling Price</th>
                  <th>Total Price</th>
                  <th>Amount Payable Now</th>
                  <th>Balance Owed</th>
                  <th>Client Name</th>
                  <th>Client Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {debtRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.name}</td>
                    <td>{record.pcs}</td>
                    <td>{formatCurrency(record.unit_price)}</td>
                    <td className="total-price-cell">{formatCurrency(record.total_price)}</td>
                    <td>{formatCurrency(record.amount_payable_now)}</td>
                    <td className={record.balance_owed > 0 ? 'balance-owed-cell' : ''}>
                      {formatCurrency(record.balance_owed)}
                    </td>
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Debt;
