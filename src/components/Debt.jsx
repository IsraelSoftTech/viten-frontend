import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaDownload, FaPrint } from 'react-icons/fa';
import { debtAPI, debtRepaymentAPI, purchasesAPI, configurationAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import { generateReceipt } from '../utils/receiptGenerator';
import SuccessMessage from './SuccessMessage';
import './Debt.css';
import { getLocalDate } from '../utils/date';

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
  const [highlightedId, setHighlightedId] = useState(null);
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    pcs: '',
    unit_price: '',
    selling_price: '',
    total_price: '',
    amount_payable_now: '',
    balance_owed: '',
    client_name: '',
    client_phone: '',
    seller_name: ''
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printRecord, setPrintRecord] = useState(null);
  const [receiptOpts, setReceiptOpts] = useState(null);
  const [printReceiptType, setPrintReceiptType] = useState('debt'); // 'debt' | 'repayment'

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'repay'
  const [repayments, setRepayments] = useState([]);
  const [loadingRepayments, setLoadingRepayments] = useState(false);
  const [showRepayForm, setShowRepayForm] = useState(false);
  const [repayReceiptNo, setRepayReceiptNo] = useState('');
  const [repayDebtInfo, setRepayDebtInfo] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(getLocalDate());
  const [repaySellerName, setRepaySellerName] = useState('');
  const [repaySubmitting, setRepaySubmitting] = useState(false);
  const [editingRepayId, setEditingRepayId] = useState(null);
  const [repayEditAmount, setRepayEditAmount] = useState('');
  const [repayEditDate, setRepayEditDate] = useState('');
  const [repayEditSeller, setRepayEditSeller] = useState('');

  useEffect(() => {
    fetchDebts();
    fetchInventory();
  }, []);

  useEffect(() => {
    // Listen for search result selection
    const handleSearchResult = (event) => {
      const result = event.detail;
      if (result.type === 'Debt') {
        setHighlightedId(result.id);
        setTimeout(() => {
          const element = document.getElementById(`debt-row-${result.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else if (result.type === 'Repayment') {
        setActiveTab('repay');
        setHighlightedId(result.id);
        setTimeout(() => {
          const element = document.getElementById(`repay-row-${result.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    };

    window.addEventListener('searchResultSelected', handleSearchResult);
    return () => window.removeEventListener('searchResultSelected', handleSearchResult);
  }, []);

  const fetchRepayments = async () => {
    setLoadingRepayments(true);
    try {
      const res = await debtRepaymentAPI.getAll();
      if (res.success) setRepayments(res.repayments || []);
    } catch (e) {
      setError('Failed to load repayments');
    } finally {
      setLoadingRepayments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'repay') fetchRepayments();
  }, [activeTab]);

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
      date: getLocalDate(),
      name: '',
      pcs: '',
      unit_price: '',
      selling_price: '',
      total_price: '',
      amount_payable_now: '',
      balance_owed: '',
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
      amount_payable_now: record.amount_payable_now || '',
      balance_owed: record.balance_owed || '',
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
      amount_payable_now: '',
      balance_owed: '',
      client_name: '',
      client_phone: '',
      seller_name: ''
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
      client_name: formData.client_name,
      client_phone: formData.client_phone,
      seller_name: formData.seller_name
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
          setSuccessMessage('Debt record created successfully!');
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

  const getReceiptOptions = async () => {
    const configResponse = await configurationAPI.getConfiguration();
    const c = configResponse.success && configResponse.configuration ? configResponse.configuration : {};
    return {
      appName: c.app_name || 'Shop Accountant',
      logoUrl: c.logo_url || null,
      location: c.location || null,
      items: c.items || [],
      thank_you_message: c.receipt_thank_you_message,
      items_received_message: c.receipt_items_received_message
    };
  };

  const handleDownloadReceipt = async (record) => {
    try {
      const opts = await getReceiptOptions();
      generateReceipt(record, 'debt', {
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

  const handlePrintClick = async (record, type = 'debt') => {
    try {
      const opts = await getReceiptOptions();
      setReceiptOpts({ ...opts, seller_name: record.seller_name || '' });
      setPrintRecord(record);
      setPrintReceiptType(type);
      setShowPrintModal(true);
    } catch (error) {
      console.error('Error preparing print:', error);
      setError('Failed to open print options.');
    }
  };

  const handlePrintConfirm = (printerType) => {
    if (!printRecord || !receiptOpts) return;
    generateReceipt(printRecord, printReceiptType, {
      ...receiptOpts,
      printerType,
      action: 'print'
    });
    setShowPrintModal(false);
    setPrintRecord(null);
    setReceiptOpts(null);
  };

  const handleRepayFetch = async () => {
    const no = repayReceiptNo.trim().toUpperCase();
    if (!no) {
      setError('Enter debt receipt number (e.g. DEBT-000001)');
      return;
    }
    setError('');
    try {
      const res = await debtAPI.getDebtByReceipt(no);
      if (res.success) {
        setRepayDebtInfo({ debt: res.debt, payments: res.payments || [], balance_owed: res.balance_owed });
        setRepayAmount('');
      } else {
        setRepayDebtInfo(null);
        setError(res.message || 'Debt not found');
      }
    } catch (e) {
      setRepayDebtInfo(null);
      setError('Failed to fetch debt');
    }
  };

  const handleRepaySubmit = async (e) => {
    e.preventDefault();
    if (!repayDebtInfo || !repayDebtInfo.debt) return;
    const amount = parseFloat(repayAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (amount > (repayDebtInfo.balance_owed || 0)) {
      setError('Amount cannot exceed balance owed');
      return;
    }
    setError('');
    setRepaySubmitting(true);
    try {
      const res = await debtRepaymentAPI.create({
        debt_id: repayDebtInfo.debt.id,
        payment_date: repayDate,
        amount,
        seller_name: repaySellerName || undefined
      });
      if (res.success) {
        setSuccessMessage('Repayment recorded.');
        setShowRepayForm(false);
        setRepayReceiptNo('');
        setRepayDebtInfo(null);
        setRepayAmount('');
        setRepaySellerName('');
        fetchRepayments();
      } else {
        setError(res.message || 'Failed to record repayment');
      }
    } catch (e) {
      setError('Failed to record repayment');
    } finally {
      setRepaySubmitting(false);
    }
  };

  const handleRepayDownload = async (record) => {
    try {
      const opts = await getReceiptOptions();
      generateReceipt(record, 'repayment', {
        ...opts,
        seller_name: record.seller_name || '',
        printerType: 'normal',
        action: 'download'
      });
    } catch (e) {
      setError('Failed to generate receipt');
    }
  };

  const handleRepayPrint = (record) => handlePrintClick(record, 'repayment');

  const handleRepayDelete = async (id) => {
    if (!window.confirm('Delete this repayment? The debt balance will be increased by this amount.')) return;
    setError('');
    try {
      const res = await debtRepaymentAPI.delete(id);
      if (res.success) {
        setSuccessMessage('Repayment deleted.');
        fetchRepayments();
      } else setError(res.message || 'Failed to delete');
    } catch (e) {
      setError('Failed to delete repayment');
    }
  };

  const handleRepayEdit = (rec) => {
    setEditingRepayId(rec.id);
    setRepayEditAmount(String(rec.amount));
    setRepayEditDate(rec.payment_date || getLocalDate());
    setRepayEditSeller(rec.seller_name || '');
  };

  const handleRepayEditSave = async () => {
    if (!editingRepayId) return;
    const amount = parseFloat(repayEditAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setError('');
    try {
      const res = await debtRepaymentAPI.update(editingRepayId, {
        payment_date: repayEditDate,
        amount,
        seller_name: repayEditSeller !== undefined ? repayEditSeller : undefined
      });
      if (res.success) {
        setSuccessMessage('Repayment updated.');
        setEditingRepayId(null);
        fetchRepayments();
      } else setError(res.message || 'Failed to update');
    } catch (e) {
      setError('Failed to update repayment');
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

  const getDisplayedRecords = () => {
    let records = [...debtRecords];

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
    <div className="debt-container">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      
      <div className="debt-header">
        <h1 className="debt-title">Debts Management</h1>
        {activeTab === 'new' && (
          <button className="new-debt-btn" onClick={handleNewClick}>
            <FaPlus className="btn-icon" />
            New
          </button>
        )}
      </div>

      <div className="debt-tabs">
        <button
          type="button"
          className={`debt-tab ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          New debt
        </button>
        <button
          type="button"
          className={`debt-tab ${activeTab === 'repay' ? 'active' : ''}`}
          onClick={() => setActiveTab('repay')}
        >
          Debt Repay
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'new' && (
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
      )}

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

      {activeTab === 'new' && showForm && (
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
                    placeholder="Optional"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="client_phone">Client Phone</label>
                  <input
                    type="text"
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => handleInputChange('client_phone', e.target.value)}
                    placeholder="Optional"
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

      {activeTab === 'new' && !showForm && (
        <div className="debt-table-container">
          {loading ? (
            <div className="loading-message">Loading debt records...</div>
          ) : getDisplayedRecords().length === 0 ? (
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
                {getDisplayedRecords().map((record) => (
                  <tr 
                    key={record.id}
                    id={`debt-row-${record.id}`}
                    className={`debt-row ${highlightedId === record.id ? 'highlighted' : ''}`}
                  >
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'repay' && (
        <div className="debt-repay-section">
          <div className="debt-repay-header">
            <button type="button" className="new-debt-btn repay-action-btn" onClick={() => { setShowRepayForm(true); setRepayDebtInfo(null); setRepayReceiptNo(''); setRepayAmount(''); setRepayDate(getLocalDate()); setRepaySellerName(''); setError(''); }}>
              <FaPlus className="btn-icon" />
              Repay
            </button>
          </div>

          {showRepayForm && (
            <div className="debt-form-overlay">
              <div className="debt-form-container repay-form-container">
                <div className="form-header">
                  <h2>Record debt repayment</h2>
                  <button type="button" className="close-btn" onClick={() => { setShowRepayForm(false); setRepayDebtInfo(null); setRepayReceiptNo(''); setError(''); }}>
                    <FaTimes />
                  </button>
                </div>
                <div className="repay-form-body">
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Receipt Number</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={repayReceiptNo}
                          onChange={(e) => setRepayReceiptNo(e.target.value.toUpperCase())}
                          placeholder="e.g. DEBT-000001"
                          className="config-input"
                          style={{ flex: 1 }}
                        />
                        <button type="button" className="config-save-btn" onClick={handleRepayFetch}>
                          Fetch
                        </button>
                      </div>
                    </div>
                  </div>
                  {repayDebtInfo && repayDebtInfo.debt && (
                    <>
                      <div className="repay-debt-info-box">
                        <h4>Debt information</h4>
                        <p><strong>Date recorded:</strong> {formatDate(repayDebtInfo.debt.date)}</p>
                        <p><strong>Item:</strong> {repayDebtInfo.debt.name}</p>
                        <p><strong>Balance left:</strong> {formatCurrency(repayDebtInfo.balance_owed)}</p>
                        {repayDebtInfo.payments && repayDebtInfo.payments.length > 0 && (
                          <div className="repay-payments-list">
                            <strong>Amount paid (previous payments):</strong>
                            <ul>
                              {repayDebtInfo.payments.map((p, i) => (
                                <li key={i}>{formatDate(p.payment_date)} — {formatCurrency(p.amount)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <form onSubmit={handleRepaySubmit}>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Payment date *</label>
                            <input
                              type="date"
                              value={repayDate}
                              onChange={(e) => setRepayDate(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Amount payable now *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={repayAmount}
                              onChange={(e) => setRepayAmount(e.target.value)}
                              placeholder="Enter amount"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Seller's name</label>
                            <input
                              type="text"
                              value={repaySellerName}
                              onChange={(e) => setRepaySellerName(e.target.value)}
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                        <div className="form-actions">
                          <button type="button" className="cancel-btn" onClick={() => { setShowRepayForm(false); setRepayDebtInfo(null); }}>Cancel</button>
                          <button type="submit" className="submit-btn" disabled={repaySubmitting}>
                            <FaSave className="btn-icon" />
                            {repaySubmitting ? 'Recording...' : 'Record repayment'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="debt-repay-table-wrap">
            {loadingRepayments ? (
              <div className="loading-message">Loading repayments...</div>
            ) : repayments.length === 0 ? (
              <div className="no-records">No repayment records. Click &quot;Repay&quot; to record a payment against a debt.</div>
            ) : (
              <table className="debt-table">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Payment date</th>
                    <th>Debt ref</th>
                    <th>Item</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {repayments.map((rec) => (
                    <tr key={rec.id}>
                      {editingRepayId === rec.id ? (
                        <>
                          <td>{rec.receipt_number || 'REPAY-' + String(rec.id).padStart(6, '0')}</td>
                          <td><input type="date" value={repayEditDate} onChange={(e) => setRepayEditDate(e.target.value)} className="inline-edit-input" /></td>
                          <td>DEBT-{String(rec.debt_id).padStart(6, '0')}</td>
                          <td>{rec.item_name}</td>
                          <td><input type="number" min="0" step="0.01" value={repayEditAmount} onChange={(e) => setRepayEditAmount(e.target.value)} className="inline-edit-input" style={{ width: 90 }} /></td>
                          <td>
                            <button type="button" className="action-btn edit-btn" onClick={handleRepayEditSave} title="Save"><FaSave /></button>
                            <button type="button" className="action-btn delete-btn" onClick={() => setEditingRepayId(null)} title="Cancel"><FaTimes /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{rec.receipt_number || 'REPAY-' + String(rec.id).padStart(6, '0')}</td>
                          <td>{formatDate(rec.payment_date)}</td>
                          <td>DEBT-{String(rec.debt_id).padStart(6, '0')}</td>
                          <td>{rec.item_name}</td>
                          <td className="total-price-cell">{formatCurrency(rec.amount)}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn edit-btn" onClick={() => handleRepayEdit(rec)} title="Edit"><FaEdit /></button>
                              <button className="action-btn delete-btn" onClick={() => handleRepayDelete(rec.id)} title="Delete"><FaTrash /></button>
                              <button className="action-btn download-btn" onClick={() => handleRepayDownload(rec)} title="Download receipt"><FaDownload /></button>
                              <button className="action-btn print-btn" onClick={() => handleRepayPrint(rec)} title="Print receipt"><FaPrint /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Debt;
