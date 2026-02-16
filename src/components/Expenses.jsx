import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import { expensesAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import SuccessMessage from './SuccessMessage';
import './Expenses.css';
import { getLocalDate } from '../utils/date';

const Expenses = () => {
  const [expenseRecords, setExpenseRecords] = useState([]);
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
    amount: '',
    description: ''
  });



  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    // Listen for search result selection
    const handleSearchResult = (event) => {
      const result = event.detail;
      if (result.type === 'Expense') {
        setHighlightedId(result.id);
        setTimeout(() => {
          const element = document.getElementById(`expense-row-${result.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    };

    window.addEventListener('searchResultSelected', handleSearchResult);
    return () => window.removeEventListener('searchResultSelected', handleSearchResult);
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await expensesAPI.getAllExpenses();
      if (response.success) {
        setExpenseRecords(response.expenses || []);
      } else {
        setError(response.message || 'Failed to fetch expense records');
      }
    } catch (error) {
      setError('An error occurred while fetching expense records');
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
      amount: '',
      description: ''
    });
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setShowForm(true);
    setFormData({
      date: record.date,
      name: record.name,
      amount: record.amount || '',
      description: record.description || ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      date: '',
      name: '',
      amount: '',
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.date || !formData.name || !formData.amount) {
      setError('Please fill in all required fields (Date, Name, Amount)');
      return;
    }

    // Prepare data with proper number conversion
    const submitData = {
      date: formData.date,
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      description: formData.description
    };

    try {
      let response;
      if (editingId) {
        response = await expensesAPI.updateExpense(editingId, submitData);
        if (response.success) {
          setSuccessMessage('Expense record updated successfully!');
        }
      } else {
        response = await expensesAPI.createExpense(submitData);
        if (response.success) {
          setSuccessMessage('Expense record created successfully!');
        }
      }

      if (response.success) {
        handleCancel();
        fetchExpenses();
      } else {
        setError(response.message || 'Failed to save expense record');
      }
    } catch (error) {
      setError('An error occurred while saving expense record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) {
      return;
    }

    setError('');
    try {
      const response = await expensesAPI.deleteExpense(id);
      if (response.success) {
        setSuccessMessage('Expense record deleted successfully!');
        fetchExpenses();
      } else {
        setError(response.message || 'Failed to delete expense record');
      }
    } catch (error) {
      setError('An error occurred while deleting expense record');
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
    let records = [...expenseRecords];

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
          return (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
        case 'amount-desc':
          return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
        default:
          return 0;
      }
    });

    return records;
  };

  return (
    <div className="expenses-container">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      
      <div className="expenses-header">
        <h1 className="expenses-title">Expenses Management</h1>
        <button className="new-expense-btn" onClick={handleNewClick}>
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
        <div className="expenses-form-overlay">
          <div className="expenses-form-container">
            <div className="form-header">
              <h2>{editingId ? 'Edit Expense Record' : 'New Expense Record'}</h2>
              <button className="close-btn" onClick={handleCancel}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="expenses-form">
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
                    placeholder="Enter expense name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="amount">Amount (XAF) *</label>
                <input
                  type="number"
                  id="amount"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                  required
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
        <div className="loading-message">Loading expense records...</div>
      ) : (
        <div className="expenses-table-wrapper">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getDisplayedRecords().length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-records">
                    No expense records found. Click "New" to add one.
                  </td>
                </tr>
              ) : (
                getDisplayedRecords().map((record) => (
                  <tr 
                    key={record.id}
                    id={`expense-row-${record.id}`}
                    className={`expense-row ${highlightedId === record.id ? 'highlighted' : ''}`}
                  >
                    <td>{formatDate(record.date)}</td>
                    <td>{record.name}</td>
                    <td className="amount-cell">{formatCurrency(record.amount)}</td>
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

export default Expenses;
