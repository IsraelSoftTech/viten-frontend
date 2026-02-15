import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { incomeAPI, debtAPI, expensesAPI, purchasesAPI, debtRepaymentAPI } from '../api';
import './SearchBar.css';

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target) &&
          resultsRef.current && !resultsRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setSearching(false);
      return;
    }

    setShowResults(true);
    const performSearch = async () => {
      setSearching(true);
      const query = searchQuery.toLowerCase().trim();
      const results = [];

      try {
        // Search Sales
        const salesRes = await incomeAPI.getAllIncome();
        if (salesRes.success) {
          (salesRes.income || []).forEach(record => {
            const matches = 
              (record.name || '').toLowerCase().includes(query) ||
              (record.client_name || '').toLowerCase().includes(query) ||
              (record.client_phone || '').includes(query) ||
              (record.seller_name || '').toLowerCase().includes(query);
            if (matches) {
              results.push({
                type: 'Sale',
                id: record.id,
                title: record.name,
                subtitle: `Client: ${record.client_name || 'N/A'}`,
                date: record.date,
                route: '/income',
                data: record
              });
            }
          });
        }

        // Search Debts
        const debtsRes = await debtAPI.getAllDebts();
        if (debtsRes.success) {
          (debtsRes.debts || []).forEach(record => {
            const matches = 
              (record.name || '').toLowerCase().includes(query) ||
              (record.client_name || '').toLowerCase().includes(query) ||
              (record.client_phone || '').includes(query) ||
              (record.seller_name || '').toLowerCase().includes(query);
            if (matches) {
              results.push({
                type: 'Debt',
                id: record.id,
                title: record.name,
                subtitle: `Client: ${record.client_name || 'N/A'}`,
                date: record.date,
                route: '/debts',
                data: record
              });
            }
          });
        }

        // Search Expenses
        const expensesRes = await expensesAPI.getAllExpenses();
        if (expensesRes.success) {
          (expensesRes.expenses || []).forEach(record => {
            const matches = 
              (record.name || '').toLowerCase().includes(query) ||
              (record.description || '').toLowerCase().includes(query) ||
              (record.category || '').toLowerCase().includes(query);
            if (matches) {
              results.push({
                type: 'Expense',
                id: record.id,
                title: record.name,
                subtitle: record.description || record.category || '',
                date: record.date,
                route: '/expenses',
                data: record
              });
            }
          });
        }

        // Search Inventory/Purchases
        const purchasesRes = await purchasesAPI.getAllPurchases();
        if (purchasesRes.success) {
          (purchasesRes.purchases || []).forEach(record => {
            const matches = 
              (record.name || '').toLowerCase().includes(query) ||
              (record.description || '').toLowerCase().includes(query) ||
              (record.supplier_name || '').toLowerCase().includes(query);
            if (matches) {
              results.push({
                type: 'Inventory',
                id: record.id,
                title: record.name,
                subtitle: `Pcs: ${record.pcs || 0}`,
                date: record.date,
                route: '/purchases',
                data: record
              });
            }
          });
        }

        // Search Debt Repayments
        const repayRes = await debtRepaymentAPI.getAll();
        if (repayRes.success) {
          (repayRes.repayments || []).forEach(record => {
            const matches = 
              (record.item_name || '').toLowerCase().includes(query) ||
              (record.client_name || '').toLowerCase().includes(query) ||
              (record.receipt_number || '').toLowerCase().includes(query);
            if (matches) {
              results.push({
                type: 'Repayment',
                id: record.id,
                title: record.item_name || 'N/A',
                subtitle: `Receipt: ${record.receipt_number || 'N/A'}`,
                date: record.payment_date,
                route: '/debts',
                data: record
              });
            }
          });
        }

        setSearchResults(results.slice(0, 10)); // Limit to 10 results
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleResultClick = (result) => {
    setSearchQuery('');
    setShowResults(false);
    navigate(result.route);
    // Store search highlight data in sessionStorage for components to use
    sessionStorage.setItem('searchHighlight', JSON.stringify({ id: result.id, type: result.type }));
    // Trigger a custom event so components can highlight the result
    window.dispatchEvent(new CustomEvent('searchResultSelected', { detail: result }));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-bar-wrapper">
        <FaSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && searchResults.length > 0 && setShowResults(true)}
        />
        {searchQuery && (
          <button className="search-clear-btn" onClick={clearSearch} aria-label="Clear search">
            <FaTimes />
          </button>
        )}
      </div>
      {showResults && (
        <div className="search-results-dropdown" ref={resultsRef}>
          {searching ? (
            <div className="search-loading">Searching...</div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="search-results-header">Results ({searchResults.length})</div>
              {searchResults.map((result, idx) => (
                <div
                  key={`${result.type}-${result.id}-${idx}`}
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="search-result-type">{result.type}</div>
                  <div className="search-result-content">
                    <div className="search-result-title">{result.title}</div>
                    <div className="search-result-subtitle">{result.subtitle}</div>
                    <div className="search-result-date">{new Date(result.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="search-no-results">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
