import { currencyAPI } from '../api';

let defaultCurrency = null;
let currencyCache = null;

// Fetch and cache default currency
export const fetchDefaultCurrency = async () => {
  try {
    const response = await currencyAPI.getDefaultCurrency();
    if (response.success && response.currency) {
      defaultCurrency = response.currency;
      return defaultCurrency;
    }
  } catch (error) {
    console.error('Error fetching default currency:', error);
  }
  
  // Fallback to FCFA
  if (!defaultCurrency) {
    defaultCurrency = {
      code: 'FCFA',
      name: 'Central African CFA Franc',
      symbol: 'FCFA',
      conversion_rate_to_fcfa: 1.0
    };
  }
  
  return defaultCurrency;
};

// Get cached default currency
export const getDefaultCurrency = () => {
  return defaultCurrency || {
    code: 'FCFA',
    name: 'Central African CFA Franc',
    symbol: 'FCFA',
    conversion_rate_to_fcfa: 1.0
  };
};

// Set default currency (for updates)
export const setDefaultCurrency = (currency) => {
  defaultCurrency = currency;
};

// Convert amount from FCFA to default currency
export const convertFromFCFA = (amountInFCFA) => {
  const currency = getDefaultCurrency();
  if (currency.code === 'FCFA') {
    return amountInFCFA;
  }
  return amountInFCFA / currency.conversion_rate_to_fcfa;
};

// Convert amount to FCFA from default currency
export const convertToFCFA = (amount) => {
  const currency = getDefaultCurrency();
  if (currency.code === 'FCFA') {
    return amount;
  }
  return amount * currency.conversion_rate_to_fcfa;
};

// Format currency amount
export const formatCurrency = (amount, options = {}) => {
  const currency = getDefaultCurrency();
  const convertedAmount = convertFromFCFA(amount);
  
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    showSymbol = true
  } = options;

  // Format number
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(convertedAmount);

  // Add symbol
  if (showSymbol) {
    return `${currency.symbol || currency.code} ${formattedAmount}`;
  }
  
  return formattedAmount;
};

// Initialize currency on app load
export const initializeCurrency = async () => {
  await fetchDefaultCurrency();
  
  // Listen for currency updates
  window.addEventListener('currencyUpdated', async () => {
    await fetchDefaultCurrency();
  });
};
