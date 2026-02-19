const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// image url
export const getFullImageUrl = (path) => {
  if (!path) return null;

  // already full URL
  if (path.startsWith('http')) return path;

  // remove /api to get server root
  const serverBase = API_BASE_URL.replace('/api', '');

  return `${serverBase}${path}`;
};

// User API endpoints
export const userAPI = {
  // Login
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },


  // Signup
  signup: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Get all users
  getAllUsers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update user
  updateUser: async (userId, userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },
};

// Income API endpoints
export const incomeAPI = {
  // Get all income records
  getAllIncome: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/income`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Get single income record
  getIncome: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/income/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Create income record
  createIncome: async (incomeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incomeData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update income record
  updateIncome: async (id, incomeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/income/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incomeData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Delete income record
  deleteIncome: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/income/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },
};

// Purchases API endpoints
export const purchasesAPI = {
  // Get all purchases records
  getAllPurchases: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/purchases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Get single purchase record
  getPurchase: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Create purchase record
  createPurchase: async (purchaseData) => {
    try {
      const isForm = purchaseData instanceof FormData;
      const response = await fetch(`${API_BASE_URL}/purchases`, {
        method: 'POST',
        headers: isForm ? {} : { 'Content-Type': 'application/json' },
        body: isForm ? purchaseData : JSON.stringify(purchaseData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Upload/update item image only (same as logo: POST with single file → saved to FTP, URL in DB)
  uploadPurchaseImage: async (id, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`${API_BASE_URL}/purchases/${id}/image`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update purchase record
  updatePurchase: async (id, purchaseData) => {
    try {
      const isForm = purchaseData instanceof FormData;
      const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
        method: 'PUT',
        headers: isForm ? {} : { 'Content-Type': 'application/json' },
        body: isForm ? purchaseData : JSON.stringify(purchaseData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Delete purchase record
  deletePurchase: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },
};

// Gain API endpoints
export const gainAPI = {
  // Get gain/loss for a date or date range
  getGain: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE_URL}/gain${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  }
};

// Expenses API endpoints
export const expensesAPI = {
  // Get all expenses records
  getAllExpenses: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Get single expense record
  getExpense: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Create expense record
  createExpense: async (expenseData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update expense record
  updateExpense: async (id, expenseData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Delete expense record
  deleteExpense: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },
};

// Goals API endpoints
export const goalsAPI = {
  getAll: async (status) => {
    try {
      const url = status ? `${API_BASE_URL}/goals?status=${encodeURIComponent(status)}` : `${API_BASE_URL}/goals`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  },
  getOne: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  },
  create: async (goalData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  },
  update: async (id, goalData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  },
  setStatus: async (id, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  },
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  },
};

// Stock Deficiency API endpoints
export const currencyAPI = {
  // Get all currencies
  getAllCurrencies: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/currencies`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Get default currency
  getDefaultCurrency: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/currencies/default`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Create currency
  createCurrency: async (currencyData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/currencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currencyData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update currency
  updateCurrency: async (id, currencyData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/currencies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currencyData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Set default currency
  setDefaultCurrency: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/currencies/${id}/set-default`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Delete currency
  deleteCurrency: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/currencies/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },
};

export const backupAPI = {
  // Create backup
  createBackup: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/backup/create`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create backup');
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'shop-accountant-backup.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return {
        success: true,
        message: 'Backup created and downloaded successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Network error. Please check if the server is running.',
      };
    }
  },

  // Restore backup
  restoreBackup: async (file) => {
    try {
      const formData = new FormData();
      formData.append('backupFile', file);

      const response = await fetch(`${API_BASE_URL}/backup/restore`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Network error. Please check if the server is running.',
      };
    }
  },

  // Get backup info
  getBackupInfo: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/backup/info`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },
};

export const configurationAPI = {
  // Get configuration
  getConfiguration: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update app name
  updateAppName: async (appName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration/app-name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ app_name: appName }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Upload logo
  uploadLogo: async (logoFile) => {
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await fetch(`${API_BASE_URL}/configuration/logo`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Delete logo
  deleteLogo: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration/logo`, {
        method: 'DELETE'
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update location
  updateLocation: async (location) => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update items/services
  updateItems: async (items) => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  updateReceiptThankYouMessage: async (message) => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration/receipt-thank-you`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_thank_you_message: message }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  },

  updateReceiptItemsReceivedMessage: async (message) => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration/receipt-items-received`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_items_received_message: message }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error. Please check if the server is running.' };
    }
  },

  // PIN settings (Goal component). Admin only can set; anyone can check status and verify.
  getGoalPinStatus: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration/pin/goal`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, hasPin: false, message: 'Network error.' };
    }
  },
  setGoalPin: async (pin, username) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (username) headers['X-User-Username'] = username;
      const response = await fetch(`${API_BASE_URL}/configuration/pin/goal`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ pin: pin === '' ? null : pin }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error.' };
    }
  },
  verifyGoalPin: async (pin) => {
    try {
      const response = await fetch(`${API_BASE_URL}/configuration/pin/verify-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, valid: false, message: 'Network error.' };
    }
  },
};

export const debtAPI = {
  // Get all debts
  getAllDebts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/debts`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Get debt by receipt number (e.g. DEBT-000001) for repay flow
  getDebtByReceipt: async (receiptNo) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debts/by-receipt/${encodeURIComponent(receiptNo)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error.' };
    }
  },

  // Get single debt
  getDebt: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debts/${id}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Create debt
  createDebt: async (debtData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(debtData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update debt
  updateDebt: async (id, debtData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(debtData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Delete debt
  deleteDebt: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debts/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },
};

export const debtRepaymentAPI = {
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/debt-repayments`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error.', repayments: [] };
    }
  },
  getOne: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debt-repayments/${id}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error.' };
    }
  },
  create: async (body) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debt-repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error.' };
    }
  },
  update: async (id, body) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debt-repayments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error.' };
    }
  },
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debt-repayments/${id}`, { method: 'DELETE' });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error.' };
    }
  },
};

export const stockDeficiencyAPI = {
  // Get stock deficiency alerts
  getAlerts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stock-deficiency/alerts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Get all inventory items with stock info
  getInventoryStock: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stock-deficiency/inventory-stock`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },

  // Update stock deficiency threshold
  updateThreshold: async (itemId, threshold) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stock-deficiency/threshold/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threshold }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check if the server is running.',
      };
    }
  },
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { status: 'ERROR', message: 'Server is not reachable' };
  }
};
