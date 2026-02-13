import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import { purchasesAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import SuccessMessage from './SuccessMessage';
import './Purchase.css';

const Purchase = () => {
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    pcs: '',
    unit_price: '',
    total_amount: '',
    description: '',
    supplier_name: ''
  });

  useEffect(() => {
    fetchPurchases();
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
      date: new Date().toISOString().split('T')[0],
      name: '',
      pcs: '',
      unit_price: '',
      total_amount: '',
      description: '',
      supplier_name: ''
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
      supplier_name: record.supplier_name || ''
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
      supplier_name: ''
    });
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
      if (editingId) {
        response = await purchasesAPI.updatePurchase(editingId, submitData);
        if (response.success) {
          setSuccessMessage('Purchase record updated successfully!');
        }
      } else {
        response = await purchasesAPI.createPurchase(submitData);
        if (response.success) {
          setSuccessMessage('Purchase record created successfully!');
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
              {purchaseRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-records">
                    No purchase records found. Click "New" to add one.
                  </td>
                </tr>
              ) : (
                purchaseRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
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
    </div>
  );
};

export default Purchase;
