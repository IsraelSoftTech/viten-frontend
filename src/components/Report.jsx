import React, { useState, useEffect } from 'react';
import { FaFileDownload, FaCalendarAlt, FaChartLine, FaShoppingCart, FaMoneyBillWave, FaCreditCard, FaExclamationTriangle, FaCheckCircle, FaBriefcase, FaCalendarDay, FaBox } from 'react-icons/fa';
import { purchasesAPI, incomeAPI, debtAPI, expensesAPI, currencyAPI, configurationAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import jsPDF from 'jspdf';
import './Report.css';

const Report = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  const [currencyMode, setCurrencyMode] = useState('single'); // 'single' or 'all'
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [defaultCurrency, setDefaultCurrency] = useState(null);
  const [appName, setAppName] = useState('Shop Accountant');

  // Report data
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [debts, setDebts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // Daily report data
  const [dailySales, setDailySales] = useState([]);
  const [dailyDebts, setDailyDebts] = useState([]);
  const [dailySalesTotal, setDailySalesTotal] = useState(0);
  const [dailyGainLoss, setDailyGainLoss] = useState(0);
  const [dailyDebtsOwed, setDailyDebtsOwed] = useState(0);
  const [dailyMostSoldItems, setDailyMostSoldItems] = useState([]);
  const [dailyLeastSoldItems, setDailyLeastSoldItems] = useState([]);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'executive', or 'stocks'
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [stocksData, setStocksData] = useState([]);

  useEffect(() => {
    fetchCurrencies();
    fetchDefaultCurrencyData();
    fetchConfiguration();
  }, []);

  useEffect(() => {
    if (defaultCurrency) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, defaultCurrency]);

  useEffect(() => {
    if (defaultCurrency && inventory.length > 0) {
      generateDailyReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyDate, defaultCurrency, inventory]);

  useEffect(() => {
    if (activeTab === 'stocks') {
      fetchStocksData();
    }
  }, [activeTab]);

  const fetchCurrencies = async () => {
    try {
      const response = await currencyAPI.getAllCurrencies();
      if (response.success && response.currencies) {
        setCurrencies(response.currencies);
        // Set default currency as selected
        const defaultCurr = response.currencies.find(c => c.is_default) || response.currencies[0];
        setSelectedCurrency(defaultCurr);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const fetchDefaultCurrencyData = async () => {
    const currency = await fetchDefaultCurrency();
    setDefaultCurrency(currency);
  };

  const fetchConfiguration = async () => {
    try {
      const response = await configurationAPI.getConfiguration();
      if (response.success && response.configuration) {
        setAppName(response.configuration.app_name || 'Shop Accountant');
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const [purchasesRes, incomeRes, debtsRes, expensesRes] = await Promise.all([
        purchasesAPI.getAllPurchases(),
        incomeAPI.getAllIncome(),
        debtAPI.getAllDebts(),
        expensesAPI.getAllExpenses()
      ]);

      // Set inventory
      if (purchasesRes.success) {
        setInventory(purchasesRes.purchases || []);
      }

      // Filter sales by date range
      if (incomeRes.success) {
        const filteredSales = (incomeRes.income || []).filter(record => {
          const recordDate = new Date(record.date);
          const start = new Date(dateRange.startDate);
          const end = new Date(dateRange.endDate);
          return recordDate >= start && recordDate <= end;
        });
        setSales(filteredSales);
      }

      // Filter debts by date range
      if (debtsRes.success) {
        const filteredDebts = (debtsRes.debts || []).filter(record => {
          const recordDate = new Date(record.date);
          const start = new Date(dateRange.startDate);
          const end = new Date(dateRange.endDate);
          return recordDate >= start && recordDate <= end;
        });
        setDebts(filteredDebts);
      }

      // Filter expenses by date range
      if (expensesRes.success) {
        const filteredExpenses = (expensesRes.expenses || []).filter(record => {
          const recordDate = new Date(record.date);
          const start = new Date(dateRange.startDate);
          const end = new Date(dateRange.endDate);
          return recordDate >= start && recordDate <= end;
        });
        setExpenses(filteredExpenses);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStocksData = async () => {
    try {
      const response = await purchasesAPI.getAllPurchases();
      if (response.success && response.purchases) {
        // Process inventory items to show current stock
        const stocks = response.purchases.map(item => ({
          id: item.id,
          name: item.name,
          pcsLeft: parseInt(item.available_stock) || 0,
          unitPrice: parseFloat(item.unit_price) || 0,
          totalPrice: (parseFloat(item.unit_price) || 0) * (parseInt(item.available_stock) || 0)
        }));
        setStocksData(stocks);
      }
    } catch (error) {
      console.error('Error fetching stocks data:', error);
    }
  };

  const generateDailyReport = async () => {
    try {
      // Fetch all data
      const [purchasesRes, incomeRes, debtsRes] = await Promise.all([
        purchasesAPI.getAllPurchases(),
        incomeAPI.getAllIncome(),
        debtAPI.getAllDebts()
      ]);

      // Set inventory first
      let currentInventory = [];
      if (purchasesRes.success) {
        currentInventory = purchasesRes.purchases || [];
        setInventory(currentInventory);
      }

      // Filter sales by selected date
      if (incomeRes.success) {
        const filteredSales = (incomeRes.income || []).filter(record => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          return recordDate === dailyDate;
        });
        setDailySales(filteredSales);
        
        // Calculate totals
        const total = filteredSales.reduce((sum, record) => sum + (parseFloat(record.total_price) || 0), 0);
        setDailySalesTotal(total);
        
        // Calculate gain/loss using current inventory
        let totalGainLoss = 0;
        filteredSales.forEach(sale => {
          const inventoryItem = currentInventory.find(inv => inv.name === sale.name);
          const costPrice = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
          const pcs = parseInt(sale.pcs) || 0;
          const totalCost = costPrice * pcs;
          const totalSale = parseFloat(sale.total_price) || 0;
          totalGainLoss += (totalSale - totalCost);
        });
        setDailyGainLoss(totalGainLoss);
        
        // Most/Least sold items - normalize item names to avoid duplicates
        const itemSalesCount = {};
        filteredSales.forEach(record => {
          // Normalize item name: trim whitespace to avoid duplicates from spacing issues
          const normalizedName = (record.name || '').trim();
          if (!normalizedName) return; // Skip records with empty names
          
          if (!itemSalesCount[normalizedName]) {
            itemSalesCount[normalizedName] = { name: normalizedName, count: 0, total: 0 };
          }
          itemSalesCount[normalizedName].count += parseInt(record.pcs) || 0;
          // Calculate revenue: use total_price if available, otherwise calculate from unit_price * pcs
          const totalPrice = parseFloat(record.total_price) || 0;
          const calculatedTotal = (parseFloat(record.unit_price) || 0) * (parseInt(record.pcs) || 0);
          // Use total_price if it exists and is valid, otherwise use calculated value
          itemSalesCount[normalizedName].total += totalPrice > 0 ? totalPrice : calculatedTotal;
        });
        const items = Object.values(itemSalesCount);
        // Sort by count descending for most sold
        const sortedByCount = [...items].sort((a, b) => b.count - a.count);
        // Get top 10 for most sold items
        const mostSold = sortedByCount.slice(0, 10);
        // Get bottom 10 for least sold, but exclude items already in most sold
        const leastSold = sortedByCount
          .slice(-10)
          .filter(item => !mostSold.some(mostItem => mostItem.name === item.name))
          .sort((a, b) => a.count - b.count);
        setDailyMostSoldItems(mostSold);
        setDailyLeastSoldItems(leastSold);
      }

      // Filter debts by selected date
      if (debtsRes.success) {
        const filteredDebts = (debtsRes.debts || []).filter(record => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          return recordDate === dailyDate;
        });
        setDailyDebts(filteredDebts);
        
        // Calculate total owed
        const totalOwed = filteredDebts.reduce((sum, record) => sum + (parseFloat(record.balance_owed) || 0), 0);
        setDailyDebtsOwed(totalOwed);
      }
    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  };

  // Calculate totals
  const inventoryTotal = inventory.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
  const salesTotal = sales.reduce((sum, record) => sum + (parseFloat(record.total_price) || 0), 0);
  const debtsTotal = debts.reduce((sum, record) => sum + (parseFloat(record.total_price) || 0), 0);
  const debtsPaid = debts.reduce((sum, record) => sum + (parseFloat(record.amount_payable_now) || 0), 0);
  const expensesTotal = expenses.reduce((sum, record) => sum + (parseFloat(record.amount) || 0), 0);

  // Calculate gain/loss
  const totalRevenue = salesTotal + debtsPaid;
  const totalCosts = expensesTotal;
  const gainLoss = totalRevenue - totalCosts;

  // Most sold items - normalize item names to avoid duplicates
  const itemSalesCount = {};
  sales.forEach(record => {
    // Normalize item name: trim whitespace to avoid duplicates from spacing issues
    const normalizedName = (record.name || '').trim();
    if (!normalizedName) return; // Skip records with empty names
    
    if (!itemSalesCount[normalizedName]) {
      itemSalesCount[normalizedName] = { name: normalizedName, count: 0, total: 0 };
    }
    itemSalesCount[normalizedName].count += parseInt(record.pcs) || 0;
    // Calculate revenue: use total_price if available, otherwise calculate from unit_price * pcs
    const totalPrice = parseFloat(record.total_price) || 0;
    const calculatedTotal = (parseFloat(record.unit_price) || 0) * (parseInt(record.pcs) || 0);
    // Use total_price if it exists and is valid, otherwise use calculated value
    itemSalesCount[normalizedName].total += totalPrice > 0 ? totalPrice : calculatedTotal;
  });
  const mostSoldItems = Object.values(itemSalesCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Low sales items (items with sales < 5 pieces in the period)
  const lowSalesItems = Object.values(itemSalesCount)
    .filter(item => item.count < 5)
    .sort((a, b) => a.count - b.count);

  // Helper to convert amount from FCFA to a specific currency
  const convertFromFCFAHelper = (amount, currency) => {
    if (!currency || currency.code === 'FCFA') return amount;
    const rate = parseFloat(currency.conversion_rate_to_fcfa) || 1;
    return amount / rate;
  };

  // Format currency helper
  const formatCurrencyAmount = (amount, currency = null) => {
    if (currencyMode === 'all') {
      // Show in 3 currencies (FCFA, USD, EUR if available)
      const fcfaAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
      const fcfa = `FCFA ${fcfaAmount}`;
      
      const usdCurrency = currencies.find(c => c.code === 'USD');
      const eurCurrency = currencies.find(c => c.code === 'EUR');
      
      let result = fcfa;
      if (usdCurrency) {
        const usdAmount = convertFromFCFAHelper(amount, usdCurrency);
        result += ` / USD ${usdAmount.toFixed(2)}`;
      }
      if (eurCurrency) {
        const eurAmount = convertFromFCFAHelper(amount, eurCurrency);
        result += ` / EUR ${eurAmount.toFixed(2)}`;
      }
      return result;
    } else {
      const curr = currency || selectedCurrency || defaultCurrency;
      if (curr && curr.code !== 'FCFA') {
        const converted = convertFromFCFAHelper(amount, curr);
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(converted);
        return `${curr.symbol || curr.code} ${formatted}`;
      }
      return formatCurrencyUtil(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName} ${day}/${month}/${year}`;
  };

  const handleGeneratePDF = () => {
    generateExecutiveReportPDF();
  };

  const handleGenerateDailyPDF = () => {
    generateDailyReportPDF();
  };

  const handleGenerateStocksPDF = () => {
    generateStocksReportPDF();
  };

  const generateExecutiveReportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210; // A4 portrait width in mm
    const pageHeight = 297; // A4 portrait height in mm
    const margin = 10;
    const startX = margin;
    let currentY = margin;
    const maxPageHeight = pageHeight - margin - 15; // Leave space for footer
    const tableWidth = pageWidth - (margin * 2); // Consistent table width for all tables

    // Helper function for PDF date formatting - returns "Wednesday 05/02/2025"
    const formatDateForPDF = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[date.getDay()];
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${dayName} ${day}/${month}/${year}`;
    };

    // Calculate gain/loss per item
    const calculateGainLoss = () => {
      const itemProfitLoss = {};
      
      // Process sales
      sales.forEach(sale => {
        const itemName = sale.name;
        const inventoryItem = inventory.find(inv => inv.name === itemName);
        const costPrice = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
        const sellingPrice = parseFloat(sale.unit_price) || 0;
        const pcsSold = parseInt(sale.pcs) || 0;
        const totalCost = costPrice * pcsSold;
        const totalRevenue = sellingPrice * pcsSold;
        const profitLoss = totalRevenue - totalCost;

        if (!itemProfitLoss[itemName]) {
          itemProfitLoss[itemName] = {
            name: itemName,
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            pcsSold: 0,
            totalCost: 0,
            totalRevenue: 0,
            profitLoss: 0
          };
        }
        
        itemProfitLoss[itemName].pcsSold += pcsSold;
        itemProfitLoss[itemName].totalCost += totalCost;
        itemProfitLoss[itemName].totalRevenue += totalRevenue;
        itemProfitLoss[itemName].profitLoss += profitLoss;
      });

      // Process debts
      debts.forEach(debt => {
        const itemName = debt.name;
        const inventoryItem = inventory.find(inv => inv.name === itemName);
        const costPrice = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
        const sellingPrice = parseFloat(debt.unit_price) || 0;
        const pcsSold = parseInt(debt.pcs) || 0;
        const totalCost = costPrice * pcsSold;
        const totalRevenue = sellingPrice * pcsSold;
        const profitLoss = totalRevenue - totalCost;

        if (!itemProfitLoss[itemName]) {
          itemProfitLoss[itemName] = {
            name: itemName,
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            pcsSold: 0,
            totalCost: 0,
            totalRevenue: 0,
            profitLoss: 0
          };
        }
        
        itemProfitLoss[itemName].pcsSold += pcsSold;
        itemProfitLoss[itemName].totalCost += totalCost;
        itemProfitLoss[itemName].totalRevenue += totalRevenue;
        itemProfitLoss[itemName].profitLoss += profitLoss;
      });

      return Object.values(itemProfitLoss);
    };

    const gainLossData = calculateGainLoss();

    // Header function to be called on each page
    const drawHeader = () => {
      const headerHeight = 22; // Increased to accommodate multi-line dates
      doc.setFillColor(173, 216, 230); // Light blue (lighter)
      doc.rect(startX, currentY, pageWidth - (margin * 2), headerHeight, 'F');
      
      // Professional accent bar (lighter blue)
      doc.setFillColor(135, 206, 235); // Skyblue (lighter accent)
      doc.rect(startX, currentY, pageWidth - (margin * 2), 2.5, 'F');
      
      // Decorative accent (professional grey)
      doc.setFillColor(128, 128, 128); // Professional grey
      doc.rect(startX + pageWidth - (margin * 2) - 35, currentY, 35, headerHeight, 'F');

    // App Name / Company Name (dark text on light blue)
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(appName.toUpperCase(), startX + 6, currentY + 7);

    // Report Title (dark text)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('EXECUTIVE REPORT', startX + 6, currentY + 13);

    // Date Range (Top Right - white text on grey accent, bold)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Period:', startX + pageWidth - (margin * 2) - 33, currentY + 7);
    doc.setFontSize(6);
    // Split date range across multiple lines to prevent cutting
    const startDateText = formatDateForPDF(dateRange.startDate);
    const endDateText = formatDateForPDF(dateRange.endDate);
    doc.text(startDateText, startX + pageWidth - (margin * 2) - 33, currentY + 10);
    doc.text(endDateText, startX + pageWidth - (margin * 2) - 33, currentY + 13);
    doc.text(`Generated:`, startX + pageWidth - (margin * 2) - 33, currentY + 16);
      doc.text(formatDateForPDF(new Date().toISOString()), startX + pageWidth - (margin * 2) - 33, currentY + 19);

      currentY += 25; // Increased to match new header height
    };

    // Draw header on first page
    drawHeader();

    // Helper function to format currency for PDF
    const formatCurrencyForPDF = (amount) => {
      if (currencyMode === 'all') {
        const fcfaAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
        let result = `FCFA ${fcfaAmount}`;
        
        const usdCurrency = currencies.find(c => c.code === 'USD');
        const eurCurrency = currencies.find(c => c.code === 'EUR');
        
        if (usdCurrency) {
          const usdAmount = convertFromFCFAHelper(amount, usdCurrency);
          result += ` / USD ${usdAmount.toFixed(2)}`;
        }
        if (eurCurrency) {
          const eurAmount = convertFromFCFAHelper(amount, eurCurrency);
          result += ` / EUR ${eurAmount.toFixed(2)}`;
        }
        return result;
      } else {
        const curr = selectedCurrency || defaultCurrency;
        if (curr && curr.code !== 'FCFA') {
          const converted = convertFromFCFAHelper(amount, curr);
          const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(converted);
          return `${curr.symbol || curr.code} ${formatted}`;
        }
        return `FCFA ${new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount)}`;
      }
    };

    // Helper function to check if new page is needed
    const checkPageBreak = (requiredHeight) => {
      if (currentY + requiredHeight > maxPageHeight) {
        // Add footer to current page
        const footerY = pageHeight - margin - 10;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(startX, footerY, pageWidth - margin, footerY);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
        
        // Add new page and redraw header
        doc.addPage();
        currentY = margin;
        drawHeader();
        return true;
      }
      return false;
    };

    // Helper function to draw table with optional color for last row and page break management
    const drawTable = (headers, rows, startX, startY, colWidths, title = null, highlightLastRow = false, highlightColor = null) => {
      let y = startY;
      const rowHeight = 5;
      const titleHeight = title ? 5 : 0;
      const headerHeight = 5;
      const estimatedTableHeight = titleHeight + headerHeight + (rows.length * rowHeight);
      
      // Calculate proportional column widths to fit the consistent table width
      const totalColWidths = colWidths.reduce((a, b) => a + b, 0);
      const proportionalColWidths = colWidths.map(width => (width / totalColWidths) * tableWidth);
      
      // Check if we need a new page before starting the table
      if (y !== margin && checkPageBreak(estimatedTableHeight + 5)) {
        y = currentY;
      }
      
      if (title) {
        // Section title
        doc.setFillColor(173, 216, 230); // Light blue (lighter)
        doc.rect(startX, y, tableWidth, 5, 'F');
        doc.setTextColor(50, 50, 50); // Dark text on light background
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, startX + 2, y + 3.5);
        y += 5;
      }

      // Table header
      doc.setFillColor(173, 216, 230); // Light blue (lighter)
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
      doc.setTextColor(50, 50, 50); // Dark text on light background
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      // Draw header borders
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(startX, y, tableWidth, rowHeight);
      
      let x = startX;
      headers.forEach((header, index) => {
        if (index > 0) {
          doc.line(x, y, x, y + rowHeight);
        }
        doc.text(header, x + 1, y + 3.5);
        x += proportionalColWidths[index];
      });
      y += rowHeight;

      // Table rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      rows.forEach((row, rowIndex) => {
        // Check page break before each row
        if (y + rowHeight > maxPageHeight) {
          // Add footer to current page
          const footerY = pageHeight - margin - 10;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(startX, footerY, pageWidth - margin, footerY);
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'italic');
          doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
          
          // Draw header again on new page
          doc.addPage();
          currentY = margin;
          drawHeader();
          y = currentY;
          
          // Redraw title if exists
          if (title) {
            doc.setFillColor(135, 206, 235);
            doc.rect(startX, y, tableWidth, 5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(title + ' (continued)', startX + 2, y + 3.5);
            y += 5;
          }
          
          // Redraw header
          doc.setFillColor(70, 130, 180);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(startX, y, tableWidth, rowHeight);
          
          x = startX;
          headers.forEach((header, index) => {
            if (index > 0) {
              doc.line(x, y, x, y + rowHeight);
            }
            doc.text(header, x + 1, y + 3.5);
            x += colWidths[index];
          });
          y += rowHeight;
        }
        
        const isLastRow = rowIndex === rows.length - 1;
        const isHighlighted = highlightLastRow && isLastRow;
        
        // Row background
        if (isHighlighted && highlightColor) {
          doc.setFillColor(200, 220, 240); // Lighter blue for totals
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(50, 50, 50);
        } else if (rowIndex % 2 === 0 && !isHighlighted) {
          doc.setFillColor(252, 252, 252); // Very light grey
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(50, 50, 50);
        } else if (!isHighlighted) {
          doc.setTextColor(50, 50, 50);
        }
        
        // Draw borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.rect(startX, y, tableWidth, rowHeight);
        
        x = startX;
        row.forEach((cell, colIndex) => {
          // Vertical borders
          if (colIndex > 0) {
            doc.line(x, y, x, y + rowHeight);
          }
          
          const cellText = doc.splitTextToSize(String(cell || ''), proportionalColWidths[colIndex] - 2);
          doc.text(cellText[0] || '', x + 1, y + 3.5);
          x += proportionalColWidths[colIndex];
        });
        y += rowHeight;
      });

      currentY = y;
      return y;
    };

    // Inventory Table
    const inventoryColWidths = [40, 15, 22, 23]; // Proportional widths that sum to 100
    const inventoryHeaders = ['Item Name', 'Pcs', 'Unit Price', 'Total Value'];
    const inventoryRows = inventory.map(item => [
      (item.name || 'N/A').substring(0, 25),
      String(item.pcs || 0),
      formatCurrencyForPDF(parseFloat(item.unit_price) || 0),
      formatCurrencyForPDF(parseFloat(item.total_amount) || 0)
    ]);
    inventoryRows.push(['TOTAL', '', '', formatCurrencyForPDF(inventoryTotal)]);
    
    currentY = drawTable(
      inventoryHeaders,
      inventoryRows,
      startX,
      currentY,
      inventoryColWidths,
      'INVENTORY',
      true,
      { r: 200, g: 220, b: 240 }
    ) + 5;

    // Sales Table
    const salesColWidths = [25, 25, 15, 18, 17]; // Proportional widths that sum to 100 (increased Date column)
    const salesHeaders = ['Date', 'Item', 'Pcs', 'Unit Selling Price', 'Total'];
    const salesRows = sales.map(sale => [
      formatDateForPDF(sale.date),
      (sale.name || 'N/A').substring(0, 18),
      String(sale.pcs || 0),
      formatCurrencyForPDF(parseFloat(sale.unit_price) || 0),
      formatCurrencyForPDF(parseFloat(sale.total_price) || 0)
    ]);
    salesRows.push(['TOTAL', '', '', '', formatCurrencyForPDF(salesTotal)]);
    
    currentY = drawTable(
      salesHeaders,
      salesRows,
      startX,
      currentY,
      salesColWidths,
      'SALES',
      true,
      { r: 200, g: 220, b: 240 }
    ) + 5;

    // Debts Table
    const debtsColWidths = [22, 20, 12, 15, 15, 16]; // Proportional widths that sum to 100 (increased Date column)
    const debtsHeaders = ['Date', 'Item', 'Pcs', 'Total', 'Paid', 'Owed'];
    const debtsRows = debts.map(debt => [
      formatDateForPDF(debt.date),
      (debt.name || 'N/A').substring(0, 18),
      String(debt.pcs || 0),
      formatCurrencyForPDF(parseFloat(debt.total_price) || 0),
      formatCurrencyForPDF(parseFloat(debt.amount_payable_now) || 0),
      formatCurrencyForPDF(parseFloat(debt.balance_owed) || 0)
    ]);
    const totalDebtsOwed = debtsTotal - debtsPaid;
    debtsRows.push(['TOTAL', '', '', formatCurrencyForPDF(debtsTotal), formatCurrencyForPDF(debtsPaid), formatCurrencyForPDF(totalDebtsOwed)]);
    
    currentY = drawTable(
      debtsHeaders,
      debtsRows,
      startX,
      currentY,
      debtsColWidths,
      'DEBTS',
      true,
      { r: 200, g: 220, b: 240 }
    ) + 5;

    // Expenses Table
    const expensesColWidths = [25, 18, 37, 20]; // Proportional widths that sum to 100 (increased Date column)
    const expensesHeaders = ['Date', 'Category', 'Description', 'Amount'];
    const expensesRows = expenses.map(exp => [
      formatDateForPDF(exp.date),
      (exp.category || 'N/A').substring(0, 15),
      (exp.description || 'N/A').substring(0, 28),
      formatCurrencyForPDF(parseFloat(exp.amount) || 0)
    ]);
    expensesRows.push(['TOTAL', '', '', formatCurrencyForPDF(expensesTotal)]);
    
    currentY = drawTable(
      expensesHeaders,
      expensesRows,
      startX,
      currentY,
      expensesColWidths,
      'EXPENSES',
      true,
      { r: 200, g: 220, b: 240 }
    ) + 5;

    // Summary Table
    const summaryColWidths = [60, 40]; // Proportional widths that sum to 100
    const summaryHeaders = ['Head', 'Amount'];
    const overallTotal = inventoryTotal + salesTotal + totalDebtsOwed + expensesTotal;
    
    // Calculate total gain/loss from gainLossData
    const totalGainLoss = gainLossData.reduce((sum, item) => sum + (item.profitLoss || 0), 0);
    
    const summaryRows = [
      ['Total Inventory', formatCurrencyForPDF(inventoryTotal)],
      ['Total Sales', formatCurrencyForPDF(salesTotal)],
      ['Total Debts Owed', formatCurrencyForPDF(totalDebtsOwed)],
      ['Total Expenses', formatCurrencyForPDF(expensesTotal)],
      ['Total Gain/Loss', formatCurrencyForPDF(totalGainLoss)],
      ['Overall Total', formatCurrencyForPDF(overallTotal)]
    ];
    
    currentY = drawTable(
      summaryHeaders,
      summaryRows,
      startX,
      currentY,
      summaryColWidths,
      'SUMMARY',
      true,
      { r: 200, g: 220, b: 240 }
    ) + 5;

    // Gain/Loss Table
    const gainLossColWidths = [30, 18, 12, 18, 22]; // Proportional widths that sum to 100
    const gainLossHeaders = ['Item Name', 'Unit Cost Price', 'Pcs Sold', 'Unit Selling Price', 'Net Gain/Loss'];
    const gainLossRows = gainLossData.map(item => {
      const profitLoss = item.profitLoss;
      return [
        (item.name || 'N/A').substring(0, 22),
        formatCurrencyForPDF(item.costPrice),
        String(item.pcsSold),
        formatCurrencyForPDF(item.sellingPrice),
        formatCurrencyForPDF(profitLoss)
      ];
    });
    
    // Calculate proportional column widths for gain/loss table
    const totalGainLossColWidths = gainLossColWidths.reduce((a, b) => a + b, 0);
    const proportionalGainLossColWidths = gainLossColWidths.map(width => (width / totalGainLossColWidths) * tableWidth);
    
    // Draw gain/loss table with color coding
    let gainLossY = currentY;
    const rowHeight = 5;
    
    // Check page break
    if (checkPageBreak(5 + 5 + (gainLossRows.length * rowHeight) + 5)) {
      gainLossY = currentY;
    }
    
    // Title
    doc.setFillColor(173, 216, 230); // Light blue (lighter)
    doc.rect(startX, gainLossY, tableWidth, 5, 'F');
    doc.setTextColor(50, 50, 50); // Dark text on light background
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GAIN/LOSS ANALYSIS', startX + 2, gainLossY + 3.5);
    gainLossY += 5;
    
    // Header
    doc.setFillColor(173, 216, 230); // Light blue (lighter)
    doc.rect(startX, gainLossY, tableWidth, rowHeight, 'F');
    doc.setTextColor(50, 50, 50); // Dark text on light background
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.rect(startX, gainLossY, tableWidth, rowHeight);
    
    let x = startX;
    gainLossHeaders.forEach((header, index) => {
      if (index > 0) doc.line(x, gainLossY, x, gainLossY + rowHeight);
      doc.text(header, x + 1, gainLossY + 3.5);
      x += proportionalGainLossColWidths[index];
    });
    gainLossY += rowHeight;
    
    // Rows with color coding
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    gainLossRows.forEach((row, rowIndex) => {
      // Check page break
      if (gainLossY + rowHeight > maxPageHeight) {
        // Add footer to current page
        const footerY = pageHeight - margin - 10;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(startX, footerY, pageWidth - margin, footerY);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
        
        // Draw header again on new page
        doc.addPage();
        currentY = margin;
        drawHeader();
        gainLossY = currentY;
        
        // Redraw title
        doc.setFillColor(173, 216, 230); // Light blue (lighter)
        doc.rect(startX, gainLossY, tableWidth, 5, 'F');
        doc.setTextColor(50, 50, 50); // Dark text on light background
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('GAIN/LOSS ANALYSIS (continued)', startX + 2, gainLossY + 3.5);
        gainLossY += 5;
        
        // Redraw header
        doc.setFillColor(173, 216, 230); // Light blue (lighter)
        doc.rect(startX, gainLossY, tableWidth, rowHeight, 'F');
        doc.setTextColor(50, 50, 50); // Dark text on light background
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.rect(startX, gainLossY, tableWidth, rowHeight);
        
        x = startX;
        gainLossHeaders.forEach((header, index) => {
          if (index > 0) doc.line(x, gainLossY, x, gainLossY + rowHeight);
          doc.text(header, x + 1, gainLossY + 3.5);
          x += proportionalGainLossColWidths[index];
        });
        gainLossY += rowHeight;
      }
      
      const item = gainLossData[rowIndex];
      const isLoss = item.profitLoss < 0;
      
      // Row background
      if (rowIndex % 2 === 0) {
        doc.setFillColor(252, 252, 252); // Very light grey
        doc.rect(startX, gainLossY, tableWidth, rowHeight, 'F');
      }
      
      // Draw borders
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(startX, gainLossY, tableWidth, rowHeight);
      
      x = startX;
      row.forEach((cell, colIndex) => {
        // Color code the last column (gain/loss)
        if (colIndex === 4) {
          doc.setTextColor(isLoss ? 244 : 76, isLoss ? 67 : 175, isLoss ? 54 : 80);
        } else {
          doc.setTextColor(50, 50, 50);
        }
        
        // Ensure text fits within cell boundaries - clip to prevent overflow
        const maxCellWidth = Math.max(1, proportionalGainLossColWidths[colIndex] - 2);
        const cellText = doc.splitTextToSize(String(cell || ''), maxCellWidth);
        // Only render the first line to prevent overflow into next column
        if (cellText && cellText.length > 0) {
          doc.text(cellText[0], x + 1, gainLossY + 3.5);
        }
        
        // Draw vertical border at the END of this column (before moving to next)
        if (colIndex < row.length - 1) {
          x += proportionalGainLossColWidths[colIndex];
          doc.line(x, gainLossY, x, gainLossY + rowHeight);
        } else {
          x += proportionalGainLossColWidths[colIndex];
        }
      });
      gainLossY += rowHeight;
    });
    
    // Update currentY to be right after the gain/loss table
    currentY = gainLossY + 5;

    // Most Sold Items - simple text format (comes right after Gain/Loss table)
    if (mostSoldItems.length > 0) {
      // Check page break
      if (checkPageBreak(20)) {
        currentY = margin;
        drawHeader();
      }
      
      // Title (no background highlight)
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MOST SOLD ITEMS', startX + 2, currentY + 3.5);
      currentY += 7;
      
      // Items as text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      
      mostSoldItems.slice(0, 10).forEach((item) => {
        // Format: "Item Name: X Pcs (AmountFCFA)"
        const itemName = (item.name || 'N/A').trim();
        const pcs = item.count || 0;
        // Format currency - extract just the FCFA number and add FCFA at the end
        const amount = item.total || 0;
        const formattedAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
        const formattedText = `${itemName}: ${pcs} Pcs (${formattedAmount}FCFA)`;
        
        // Check page break before each item
        if (currentY + 5 > maxPageHeight) {
          doc.addPage();
          currentY = margin;
          drawHeader();
          currentY += 7;
        }
        
        doc.text(formattedText, startX + 2, currentY);
        currentY += 5;
      });
      
      currentY += 3;
    }

    // Least sold items (sorted by count ascending) - simple text format
    // Get all items, exclude those already in mostSoldItems, then get bottom 10
    const allItems = Object.values(itemSalesCount);
    const mostSoldItemNames = new Set(mostSoldItems.map(item => item.name));
    const leastSoldItems = allItems
      .filter(item => !mostSoldItemNames.has(item.name))
      .sort((a, b) => a.count - b.count)
      .slice(0, 10);
    if (leastSoldItems.length > 0) {
      // Check page break
      if (checkPageBreak(20)) {
        currentY = margin;
        drawHeader();
      }
      
      // Title (no background highlight)
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('LEAST SOLD ITEMS', startX + 2, currentY + 3.5);
      currentY += 7;
      
      // Items as text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      
      leastSoldItems.forEach((item) => {
        // Format: "Item Name: X Pcs (AmountFCFA)"
        const itemName = (item.name || 'N/A').trim();
        const pcs = item.count || 0;
        // Format currency - extract just the FCFA number and add FCFA at the end
        const amount = item.total || 0;
        const formattedAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
        const formattedText = `${itemName}: ${pcs} Pcs (${formattedAmount}FCFA)`;
        
        // Check page break before each item
        if (currentY + 5 > maxPageHeight) {
          doc.addPage();
          currentY = margin;
          drawHeader();
          currentY += 7;
        }
        
        doc.text(formattedText, startX + 2, currentY);
        currentY += 5;
      });
      
      currentY += 3;
    }

    // Footer
    const footerY = pageHeight - margin - 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(startX, footerY, pageWidth - margin, footerY);
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });

    // Generate filename
    const filename = `${appName.replace(/\s+/g, '-')}-Executive-Report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;

    // Save the PDF
    doc.save(filename);
  };

  const generateDailyReportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210; // A4 portrait width in mm
    const pageHeight = 297; // A4 portrait height in mm
    const margin = 10;
    const startX = margin;
    let currentY = margin;
    const maxPageHeight = pageHeight - margin - 15;
    const tableWidth = pageWidth - (margin * 2);

    // Helper function for PDF date formatting - returns "Wednesday 05/02/2025"
    const formatDateForPDF = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[date.getDay()];
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${dayName} ${day}/${month}/${year}`;
    };

    // Helper to convert amount from FCFA to a specific currency
    const convertFromFCFAHelperPDF = (amount, currency) => {
      if (!currency || currency.code === 'FCFA') return amount;
      const rate = parseFloat(currency.conversion_rate_to_fcfa) || 1;
      return amount / rate;
    };

    // Helper function to format currency for PDF
    const formatCurrencyForPDF = (amount) => {
      if (currencyMode === 'all') {
        const fcfaAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
        let result = `FCFA ${fcfaAmount}`;
        
        const usdCurrency = currencies.find(c => c.code === 'USD');
        const eurCurrency = currencies.find(c => c.code === 'EUR');
        
        if (usdCurrency) {
          const usdAmount = convertFromFCFAHelperPDF(amount, usdCurrency);
          result += ` / USD ${usdAmount.toFixed(2)}`;
        }
        if (eurCurrency) {
          const eurAmount = convertFromFCFAHelperPDF(amount, eurCurrency);
          result += ` / EUR ${eurAmount.toFixed(2)}`;
        }
        return result;
      } else {
        const curr = selectedCurrency || defaultCurrency;
        if (curr && curr.code !== 'FCFA') {
          const converted = convertFromFCFAHelperPDF(amount, curr);
          const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(converted);
          return `${curr.symbol || curr.code} ${formatted}`;
        }
        return `FCFA ${new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount)}`;
      }
    };

    // Helper function to check if new page is needed
    const checkPageBreak = (requiredHeight) => {
      if (currentY + requiredHeight > maxPageHeight) {
        const footerY = pageHeight - margin - 10;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(startX, footerY, pageWidth - margin, footerY);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
        doc.addPage();
        currentY = margin;
        drawHeader();
        return true;
      }
      return false;
    };

    // Helper function to draw table
    const drawTable = (headers, rows, startX, startY, colWidths, title = null, highlightLastRow = false, highlightColor = null) => {
      let y = startY;
      const rowHeight = 5;
      const totalColWidths = colWidths.reduce((a, b) => a + b, 0);
      const proportionalColWidths = colWidths.map(width => (width / totalColWidths) * tableWidth);
      const estimatedTableHeight = (title ? 5 : 0) + 5 + (rows.length * rowHeight);
      
      if (y !== margin && checkPageBreak(estimatedTableHeight + 5)) {
        y = currentY;
      }
      
      if (title) {
        doc.setFillColor(173, 216, 230);
        doc.rect(startX, y, tableWidth, 5, 'F');
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, startX + 2, y + 3.5);
        y += 5;
      }

      doc.setFillColor(173, 216, 230);
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(startX, y, tableWidth, rowHeight);
      
      let x = startX;
      headers.forEach((header, index) => {
        doc.text(header, x + 1, y + 3.5);
        
        // Draw vertical border at the END of this column (before moving to next)
        if (index < headers.length - 1) {
          x += proportionalColWidths[index];
          doc.line(x, y, x, y + rowHeight);
        } else {
          x += proportionalColWidths[index];
        }
      });
      y += rowHeight;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      rows.forEach((row, rowIndex) => {
        if (y + rowHeight > maxPageHeight) {
          const footerY = pageHeight - margin - 10;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(startX, footerY, pageWidth - margin, footerY);
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'italic');
          doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
          doc.addPage();
          currentY = margin;
          drawHeader();
          y = currentY;
          
          if (title) {
            doc.setFillColor(173, 216, 230);
            doc.rect(startX, y, tableWidth, 5, 'F');
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(title + ' (continued)', startX + 2, y + 3.5);
            y += 5;
          }
          
          doc.setFillColor(173, 216, 230);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(startX, y, tableWidth, rowHeight);
          
          x = startX;
          headers.forEach((header, index) => {
            if (index > 0) doc.line(x, y, x, y + rowHeight);
            doc.text(header, x + 1, y + 3.5);
            x += proportionalColWidths[index];
          });
          y += rowHeight;
        }
        
        const isLastRow = rowIndex === rows.length - 1;
        const isHighlighted = highlightLastRow && isLastRow;
        
        if (isHighlighted && highlightColor) {
          doc.setFillColor(highlightColor.r, highlightColor.g, highlightColor.b);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(50, 50, 50);
        } else if (rowIndex % 2 === 0 && !isHighlighted) {
          doc.setFillColor(252, 252, 252);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(50, 50, 50);
        } else if (!isHighlighted) {
          doc.setTextColor(50, 50, 50);
        }
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.rect(startX, y, tableWidth, rowHeight);
        
        x = startX;
        row.forEach((cell, colIndex) => {
          // Ensure text fits within cell boundaries - clip to prevent overflow
          const maxCellWidth = Math.max(1, proportionalColWidths[colIndex] - 2);
          const cellValue = String(cell || '').trim();
          const cellText = doc.splitTextToSize(cellValue, maxCellWidth);
          // Only render the first line to prevent overflow into next column
          if (cellText && cellText.length > 0) {
            // Ensure we don't render empty strings or just whitespace
            const textToRender = cellText[0].trim();
            if (textToRender) {
              doc.text(textToRender, x + 1, y + 3.5);
            }
          }
          
          // Draw vertical border at the END of this column (before moving to next)
          if (colIndex < row.length - 1) {
            x += proportionalColWidths[colIndex];
            doc.line(x, y, x, y + rowHeight);
          } else {
            x += proportionalColWidths[colIndex];
          }
        });
        y += rowHeight;
      });

      currentY = y;
      return y;
    };

    // Header function
    const drawHeader = () => {
      const headerHeight = 22; // Increased to accommodate multi-line dates
      doc.setFillColor(173, 216, 230);
      doc.rect(startX, currentY, pageWidth - (margin * 2), headerHeight, 'F');
      doc.setFillColor(135, 206, 235);
      doc.rect(startX, currentY, pageWidth - (margin * 2), 2.5, 'F');
      doc.setFillColor(128, 128, 128);
      doc.rect(startX + pageWidth - (margin * 2) - 35, currentY, 35, headerHeight, 'F');

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(appName.toUpperCase(), startX + 6, currentY + 7);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('DAILY REPORT', startX + 6, currentY + 13);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Date:', startX + pageWidth - (margin * 2) - 33, currentY + 7);
      doc.setFontSize(6);
      // Split date across multiple lines to prevent cutting
      const dateText = formatDateForPDF(dailyDate);
      doc.text(dateText, startX + pageWidth - (margin * 2) - 33, currentY + 10);
      doc.text(`Generated:`, startX + pageWidth - (margin * 2) - 33, currentY + 13);
      doc.text(formatDateForPDF(new Date().toISOString()), startX + pageWidth - (margin * 2) - 33, currentY + 16);
      currentY += 25; // Increased to match new header height
    };

    drawHeader();

    // Sales Table
    const salesColWidths = [25, 12, 18, 18, 15, 12];
    const salesHeaders = ['Item Name', 'Pcs', 'Unit Cost Price', 'Unit Selling Price', 'Total Sale', 'Gain/Loss'];
    const salesRows = dailySales.map(sale => {
      const inventoryItem = inventory.find(inv => inv.name === sale.name);
      const costPrice = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
      const sellingPrice = parseFloat(sale.unit_price) || 0;
      const pcs = parseInt(sale.pcs) || 0;
      const totalSale = parseFloat(sale.total_price) || 0;
      const gainLoss = totalSale - (costPrice * pcs);
      return [
        (sale.name || 'N/A').substring(0, 20),
        String(pcs),
        formatCurrencyForPDF(costPrice),
        formatCurrencyForPDF(sellingPrice),
        formatCurrencyForPDF(totalSale),
        formatCurrencyForPDF(gainLoss)
      ];
    });
    salesRows.push(['TOTAL', '', '', '', formatCurrencyForPDF(dailySalesTotal), formatCurrencyForPDF(dailyGainLoss)]);
    
    currentY = drawTable(
      salesHeaders,
      salesRows,
      startX,
      currentY,
      salesColWidths,
      'SALES',
      true,
      { r: 200, g: 220, b: 240 }
    ) + 5;

    // Debts Table
    const debtsColWidths = [25, 12, 18, 18, 15, 12];
    const debtsHeaders = ['Item Name', 'Pcs', 'Unit Cost Price', 'Unit Selling Price', 'Amount Paid', 'Amount Owed'];
    const debtsRows = dailyDebts.map(debt => {
      const inventoryItem = inventory.find(inv => inv.name === debt.name);
      const costPrice = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
      const sellingPrice = parseFloat(debt.unit_price) || 0;
      return [
        (debt.name || 'N/A').substring(0, 20),
        String(debt.pcs || 0),
        formatCurrencyForPDF(costPrice),
        formatCurrencyForPDF(sellingPrice),
        formatCurrencyForPDF(parseFloat(debt.amount_payable_now) || 0),
        formatCurrencyForPDF(parseFloat(debt.balance_owed) || 0)
      ];
    });
    debtsRows.push(['TOTAL', '', '', '', '', formatCurrencyForPDF(dailyDebtsOwed)]);
    
    currentY = drawTable(
      debtsHeaders,
      debtsRows,
      startX,
      currentY,
      debtsColWidths,
      'DEBTS',
      true,
      { r: 200, g: 220, b: 240 }
    ) + 5;

    // Most Sold Items - simple text format
    if (dailyMostSoldItems.length > 0) {
      // Check page break
      if (checkPageBreak(20)) {
        currentY = margin;
        drawHeader();
      }
      
      // Title (no background highlight)
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MOST SOLD ITEMS', startX + 2, currentY + 3.5);
      currentY += 7;
      
      // Items as text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      
      dailyMostSoldItems.forEach((item) => {
        // Format: "Item Name: X Pcs (AmountFCFA)"
        const itemName = (item.name || 'N/A').trim();
        const pcs = item.count || 0;
        // Format currency - extract just the FCFA number and add FCFA at the end
        const amount = item.total || 0;
        const formattedAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
        const formattedText = `${itemName}: ${pcs} Pcs (${formattedAmount}FCFA)`;
        
        // Check page break before each item
        if (currentY + 5 > maxPageHeight) {
          doc.addPage();
          currentY = margin;
          drawHeader();
          currentY += 7;
        }
        
        doc.text(formattedText, startX + 2, currentY);
        currentY += 5;
      });
      
      currentY += 3;
    }

    // Least Sold Items - simple text format
    if (dailyLeastSoldItems.length > 0) {
      // Check page break
      if (checkPageBreak(20)) {
        currentY = margin;
        drawHeader();
      }
      
      // Title (no background highlight)
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('LEAST SOLD ITEMS', startX + 2, currentY + 3.5);
      currentY += 7;
      
      // Items as text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      
      dailyLeastSoldItems.forEach((item) => {
        // Format: "Item Name: X Pcs (AmountFCFA)"
        const itemName = (item.name || 'N/A').trim();
        const pcs = item.count || 0;
        // Format currency - extract just the FCFA number and add FCFA at the end
        const amount = item.total || 0;
        const formattedAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
        const formattedText = `${itemName}: ${pcs} Pcs (${formattedAmount}FCFA)`;
        
        // Check page break before each item
        if (currentY + 5 > maxPageHeight) {
          doc.addPage();
          currentY = margin;
          drawHeader();
          currentY += 7;
        }
        
        doc.text(formattedText, startX + 2, currentY);
        currentY += 5;
      });
      
      currentY += 3;
    }

    // Footer
    const footerY = pageHeight - margin - 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(startX, footerY, pageWidth - margin, footerY);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });

    const filename = `${appName.replace(/\s+/g, '-')}-Daily-Report-${dailyDate}.pdf`;
    doc.save(filename);
  };

  const generateStocksReportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210; // A4 portrait width in mm
    const pageHeight = 297; // A4 portrait height in mm
    const margin = 10;
    const startX = margin;
    let currentY = margin;
    const maxPageHeight = pageHeight - margin - 15;
    const tableWidth = pageWidth - (margin * 2);

    // Helper function for PDF date formatting - returns "Wednesday 05/02/2025"
    const formatDateForPDF = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[date.getDay()];
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${dayName} ${day}/${month}/${year}`;
    };

    // Helper to convert amount from FCFA to a specific currency
    const convertFromFCFAHelperPDF = (amount, currency) => {
      if (!currency || currency.code === 'FCFA') return amount;
      const rate = parseFloat(currency.conversion_rate_to_fcfa) || 1;
      return amount / rate;
    };

    // Helper function to format currency for PDF
    const formatCurrencyForPDF = (amount) => {
      if (currencyMode === 'all') {
        const fcfaAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
        let result = `FCFA ${fcfaAmount}`;
        
        const usdCurrency = currencies.find(c => c.code === 'USD');
        const eurCurrency = currencies.find(c => c.code === 'EUR');
        
        if (usdCurrency) {
          const usdAmount = convertFromFCFAHelperPDF(amount, usdCurrency);
          result += ` / USD ${usdAmount.toFixed(2)}`;
        }
        if (eurCurrency) {
          const eurAmount = convertFromFCFAHelperPDF(amount, eurCurrency);
          result += ` / EUR ${eurAmount.toFixed(2)}`;
        }
        return result;
      } else {
        const curr = selectedCurrency || defaultCurrency;
        if (curr && curr.code !== 'FCFA') {
          const converted = convertFromFCFAHelperPDF(amount, curr);
          const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(converted);
          return `${curr.symbol || curr.code} ${formatted}`;
        }
        return `FCFA ${new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount)}`;
      }
    };

    // Header function
    const drawHeader = () => {
      const headerHeight = 22; // Increased to accommodate multi-line dates
      doc.setFillColor(173, 216, 230);
      doc.rect(startX, currentY, pageWidth - (margin * 2), headerHeight, 'F');
      doc.setFillColor(135, 206, 235);
      doc.rect(startX, currentY, pageWidth - (margin * 2), 2.5, 'F');
      doc.setFillColor(128, 128, 128);
      doc.rect(startX + pageWidth - (margin * 2) - 35, currentY, 35, headerHeight, 'F');

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(appName.toUpperCase(), startX + 6, currentY + 7);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('STOCKS REPORT', startX + 6, currentY + 13);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Generated:', startX + pageWidth - (margin * 2) - 33, currentY + 7);
      doc.setFontSize(6);
      doc.text(formatDateForPDF(new Date().toISOString()), startX + pageWidth - (margin * 2) - 33, currentY + 11);
      currentY += 22;
    };

    drawHeader();

    // Helper function to check if new page is needed
    const checkPageBreak = (requiredHeight) => {
      if (currentY + requiredHeight > maxPageHeight) {
        const footerY = pageHeight - margin - 10;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(startX, footerY, pageWidth - margin, footerY);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
        doc.addPage();
        currentY = margin;
        drawHeader();
        return true;
      }
      return false;
    };

    // Helper function to draw table
    const drawTable = (headers, rows, startX, startY, colWidths, title = null, highlightLastRow = false) => {
      let y = startY;
      const rowHeight = 5;
      const totalColWidths = colWidths.reduce((a, b) => a + b, 0);
      const proportionalColWidths = colWidths.map(width => (width / totalColWidths) * tableWidth);
      const estimatedTableHeight = (title ? 5 : 0) + 5 + (rows.length * rowHeight);
      
      if (y !== margin && checkPageBreak(estimatedTableHeight + 5)) {
        y = currentY;
      }
      
      if (title) {
        doc.setFillColor(173, 216, 230);
        doc.rect(startX, y, tableWidth, 5, 'F');
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, startX + 2, y + 3.5);
        y += 5;
      }

      doc.setFillColor(173, 216, 230);
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(startX, y, tableWidth, rowHeight);
      
      let x = startX;
      headers.forEach((header, index) => {
        doc.text(header, x + 1, y + 3.5);
        
        if (index < headers.length - 1) {
          x += proportionalColWidths[index];
          doc.line(x, y, x, y + rowHeight);
        } else {
          x += proportionalColWidths[index];
        }
      });
      y += rowHeight;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      rows.forEach((row, rowIndex) => {
        if (y + rowHeight > maxPageHeight) {
          const footerY = pageHeight - margin - 10;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(startX, footerY, pageWidth - margin, footerY);
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'italic');
          doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
          doc.addPage();
          currentY = margin;
          drawHeader();
          y = currentY;
          
          if (title) {
            doc.setFillColor(173, 216, 230);
            doc.rect(startX, y, tableWidth, 5, 'F');
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(title + ' (continued)', startX + 2, y + 3.5);
            y += 5;
          }
          
          doc.setFillColor(173, 216, 230);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(startX, y, tableWidth, rowHeight);
          
          x = startX;
          headers.forEach((header, index) => {
            if (index > 0) doc.line(x, y, x, y + rowHeight);
            doc.text(header, x + 1, y + 3.5);
            x += proportionalColWidths[index];
          });
          y += rowHeight;
        }
        
        const isLastRow = rowIndex === rows.length - 1;
        const isHighlighted = highlightLastRow && isLastRow;
        
        if (isHighlighted) {
          doc.setFillColor(200, 220, 240);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(50, 50, 50);
        } else if (rowIndex % 2 === 0 && !isHighlighted) {
          doc.setFillColor(252, 252, 252);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(50, 50, 50);
        } else if (!isHighlighted) {
          doc.setTextColor(50, 50, 50);
        }
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.rect(startX, y, tableWidth, rowHeight);
        
        x = startX;
        row.forEach((cell, colIndex) => {
          const maxCellWidth = Math.max(1, proportionalColWidths[colIndex] - 2);
          const cellValue = String(cell || '').trim();
          const cellText = doc.splitTextToSize(cellValue, maxCellWidth);
          if (cellText && cellText.length > 0) {
            const textToRender = cellText[0].trim();
            if (textToRender) {
              doc.text(textToRender, x + 1, y + 3.5);
            }
          }
          
          if (colIndex < row.length - 1) {
            x += proportionalColWidths[colIndex];
            doc.line(x, y, x, y + rowHeight);
          } else {
            x += proportionalColWidths[colIndex];
          }
        });
        y += rowHeight;
      });

      currentY = y;
      return y;
    };

    // Stocks Table
    const stocksColWidths = [15, 40, 15, 15, 15];
    const stocksHeaders = ['#', 'Item Name', 'Pcs Left', 'Unit Price', 'Total Price'];
    const stocksRows = stocksData.map((item, index) => [
      String(index + 1),
      (item.name || 'N/A').substring(0, 30),
      String(item.pcsLeft),
      formatCurrencyForPDF(item.unitPrice),
      formatCurrencyForPDF(item.totalPrice)
    ]);
    
    const grandTotal = stocksData.reduce((sum, item) => sum + item.totalPrice, 0);
    stocksRows.push(['', 'GRAND TOTAL', '', '', formatCurrencyForPDF(grandTotal)]);
    
    currentY = drawTable(
      stocksHeaders,
      stocksRows,
      startX,
      currentY,
      stocksColWidths,
      'INVENTORY STOCK REPORT',
      true
    ) + 5;

    // Footer
    const footerY = pageHeight - margin - 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(startX, footerY, pageWidth - margin, footerY);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });

    const filename = `${appName.replace(/\s+/g, '-')}-Stocks-Report-${formatDateForPDF(new Date().toISOString())}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="report-container">
      <div className="report-header">
        <h1 className="report-title">Reports</h1>
      </div>

      {/* Tabs */}
      <div className="report-tabs">
        <button
          className={`tab-button ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <FaCalendarDay className="tab-icon" />
          Daily
        </button>
        <button
          className={`tab-button ${activeTab === 'executive' ? 'active' : ''}`}
          onClick={() => setActiveTab('executive')}
        >
          <FaBriefcase className="tab-icon" />
          Executive
        </button>
        <button
          className={`tab-button ${activeTab === 'stocks' ? 'active' : ''}`}
          onClick={() => setActiveTab('stocks')}
        >
          <FaBox className="tab-icon" />
          Stocks Report
        </button>
      </div>

      {/* Executive Tab Content */}
      {activeTab === 'executive' && (
        <>
          <div className="tab-header">
            <h2 className="tab-title">Executive Report</h2>
            <button className="generate-pdf-btn" onClick={handleGeneratePDF}>
              <FaFileDownload className="btn-icon" />
              Generate PDF
            </button>
          </div>

      {/* Controls */}
      <div className="report-controls">
        <div className="control-group">
          <label>
            <FaCalendarAlt className="control-icon" />
            Date Range
          </label>
          <div className="date-range-inputs">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="date-input"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="date-input"
            />
          </div>
        </div>

        <div className="control-group">
          <label>
            <FaMoneyBillWave className="control-icon" />
            Currency Display
          </label>
          <div className="currency-controls">
            <label className="radio-label">
              <input
                type="radio"
                value="single"
                checked={currencyMode === 'single'}
                onChange={(e) => setCurrencyMode(e.target.value)}
              />
              Single Currency
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="all"
                checked={currencyMode === 'all'}
                onChange={(e) => setCurrencyMode(e.target.value)}
              />
              All Currencies
            </label>
            {currencyMode === 'single' && (
              <select
                value={selectedCurrency?.id || ''}
                onChange={(e) => {
                  const curr = currencies.find(c => c.id === parseInt(e.target.value));
                  setSelectedCurrency(curr);
                }}
                className="currency-select"
              >
                {currencies.map(curr => (
                  <option key={curr.id} value={curr.id}>
                    {curr.name} ({curr.symbol || curr.code})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-message">Generating report...</div>
      ) : (
        <div className="report-content">
          {/* Inventory Summary */}
          <section className="report-section">
            <h2 className="section-title">
              <FaShoppingCart className="section-icon" />
              Inventory Summary
            </h2>
            <div className="summary-card">
              <div className="summary-header">
                <span className="summary-label">Total Inventory Value</span>
                <span className="summary-value">{formatCurrencyAmount(inventoryTotal)}</span>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Pieces</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-data">No inventory items found</td>
                    </tr>
                  ) : (
                    inventory.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>{item.name}</td>
                        <td>{item.pcs || 0}</td>
                        <td>{formatCurrencyAmount(parseFloat(item.unit_price) || 0)}</td>
                        <td className="total-cell">{formatCurrencyAmount(parseFloat(item.total_amount) || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sales Summary */}
          <section className="report-section">
            <h2 className="section-title">
              <FaChartLine className="section-icon" />
              Sales Summary ({formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)})
            </h2>
            <div className="summary-card">
              <div className="summary-header">
                <span className="summary-label">Total Sales</span>
                <span className="summary-value sales-value">{formatCurrencyAmount(salesTotal)}</span>
              </div>
              <div className="summary-detail">Number of Sales: {sales.length}</div>
            </div>
          </section>

          {/* Debts Summary */}
          <section className="report-section">
            <h2 className="section-title">
              <FaCreditCard className="section-icon" />
              Debts Summary ({formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)})
            </h2>
            <div className="summary-card">
              <div className="summary-header">
                <span className="summary-label">Total Debt Amount</span>
                <span className="summary-value">{formatCurrencyAmount(debtsTotal)}</span>
              </div>
              <div className="summary-header">
                <span className="summary-label">Amount Paid</span>
                <span className="summary-value">{formatCurrencyAmount(debtsPaid)}</span>
              </div>
              <div className="summary-header">
                <span className="summary-label">Outstanding Balance</span>
                <span className="summary-value debt-value">{formatCurrencyAmount(debtsTotal - debtsPaid)}</span>
              </div>
              <div className="summary-detail">Number of Debt Records: {debts.length}</div>
            </div>
          </section>

          {/* Expenses Summary */}
          <section className="report-section">
            <h2 className="section-title">
              <FaMoneyBillWave className="section-icon" />
              Expenses Summary ({formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)})
            </h2>
            <div className="summary-card">
              <div className="summary-header">
                <span className="summary-label">Total Expenses</span>
                <span className="summary-value expense-value">{formatCurrencyAmount(expensesTotal)}</span>
              </div>
              <div className="summary-detail">Number of Expenses: {expenses.length}</div>
            </div>
            <div className="table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-data">No expenses found in this period</td>
                    </tr>
                  ) : (
                    expenses.map((expense, index) => (
                      <tr key={expense.id || index}>
                        <td>{formatDate(expense.date)}</td>
                        <td>{expense.category || 'N/A'}</td>
                        <td>{expense.description || 'N/A'}</td>
                        <td className="total-cell">{formatCurrencyAmount(parseFloat(expense.amount) || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Gain/Loss */}
          <section className="report-section">
            <h2 className="section-title">
              {gainLoss >= 0 ? (
                <FaCheckCircle className="section-icon gain-icon" />
              ) : (
                <FaExclamationTriangle className="section-icon loss-icon" />
              )}
              Financial Summary
            </h2>
            <div className={`summary-card ${gainLoss >= 0 ? 'gain-card' : 'loss-card'}`}>
              <div className="summary-header">
                <span className="summary-label">Total Revenue (Sales + Debts Paid)</span>
                <span className="summary-value">{formatCurrencyAmount(totalRevenue)}</span>
              </div>
              <div className="summary-header">
                <span className="summary-label">Total Costs (Expenses)</span>
                <span className="summary-value">{formatCurrencyAmount(expensesTotal)}</span>
              </div>
              <div className="summary-header highlight">
                <span className="summary-label">Net {gainLoss >= 0 ? 'Gain' : 'Loss'}</span>
                <span className={`summary-value ${gainLoss >= 0 ? 'gain-value' : 'loss-value'}`}>
                  {formatCurrencyAmount(Math.abs(gainLoss))}
                </span>
              </div>
            </div>
          </section>

          {/* Most Sold Items */}
          <section className="report-section">
            <h2 className="section-title">
              <FaChartLine className="section-icon" />
              Most Sold Items
            </h2>
            <div className="table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Item Name</th>
                    <th>Pieces Sold</th>
                    <th>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {mostSoldItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-data">No sales data available</td>
                    </tr>
                  ) : (
                    mostSoldItems.map((item, index) => (
                      <tr key={index}>
                        <td className="rank-cell">{index + 1}</td>
                        <td>{item.name}</td>
                        <td>{item.count}</td>
                        <td className="total-cell">{formatCurrencyAmount(item.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Low Sales Items */}
          {lowSalesItems.length > 0 && (
            <section className="report-section">
              <h2 className="section-title">
                <FaExclamationTriangle className="section-icon warning-icon" />
                Items with Low Sales (&lt; 5 pieces)
              </h2>
              <div className="table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Pieces Sold</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowSalesItems.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td className="warning-cell">{item.count}</td>
                        <td className="total-cell">{formatCurrencyAmount(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
        </>
      )}

      {/* Daily Tab Content */}
      {activeTab === 'daily' && (
        <>
          <div className="tab-header">
            <h2 className="tab-title">Daily Report</h2>
            <button className="generate-pdf-btn" onClick={handleGenerateDailyPDF}>
              <FaFileDownload className="btn-icon" />
              Generate PDF
            </button>
          </div>

          <div className="report-controls">
            <div className="control-group">
              <label>
                <FaCalendarAlt className="control-icon" />
                Select Date
              </label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="date-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-message">Generating report...</div>
          ) : (
            <div className="report-content">
              {/* Daily Sales Summary */}
              <section className="report-section">
                <h2 className="section-title">
                  <FaChartLine className="section-icon" />
                  Sales Summary for {formatDate(dailyDate)}
                </h2>
                <div className="summary-card">
                  <div className="summary-header">
                    <span className="summary-label">Total Sales</span>
                    <span className="summary-value sales-value">{formatCurrencyAmount(dailySalesTotal)}</span>
                  </div>
                  <div className="summary-header">
                    <span className="summary-label">Total Gain/Loss</span>
                    <span className={`summary-value ${dailyGainLoss >= 0 ? 'gain-value' : 'loss-value'}`}>
                      {formatCurrencyAmount(Math.abs(dailyGainLoss))}
                    </span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Pcs</th>
                        <th>Unit Cost Price</th>
                        <th>Unit Selling Price</th>
                        <th>Total Sale</th>
                        <th>Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySales.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="no-data">No sales found for this date</td>
                        </tr>
                      ) : (
                        dailySales.map((sale, index) => {
                          const inventoryItem = inventory.find(inv => inv.name === sale.name);
                          const costPrice = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
                          const sellingPrice = parseFloat(sale.unit_price) || 0;
                          const pcs = parseInt(sale.pcs) || 0;
                          const totalCost = costPrice * pcs;
                          const totalSale = parseFloat(sale.total_price) || 0;
                          const gainLoss = totalSale - totalCost;
                          return (
                            <tr key={sale.id || index}>
                              <td>{sale.name}</td>
                              <td>{pcs}</td>
                              <td>{formatCurrencyAmount(costPrice)}</td>
                              <td>{formatCurrencyAmount(sellingPrice)}</td>
                              <td className="total-cell">{formatCurrencyAmount(totalSale)}</td>
                              <td className={gainLoss >= 0 ? 'gain-cell' : 'loss-cell'}>
                                {formatCurrencyAmount(gainLoss)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Daily Debts Summary */}
              <section className="report-section">
                <h2 className="section-title">
                  <FaCreditCard className="section-icon" />
                  Debts Summary for {formatDate(dailyDate)}
                </h2>
                <div className="summary-card">
                  <div className="summary-header">
                    <span className="summary-label">Total Amount Owed</span>
                    <span className="summary-value debt-value">{formatCurrencyAmount(dailyDebtsOwed)}</span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Pcs</th>
                        <th>Unit Cost Price</th>
                        <th>Unit Selling Price</th>
                        <th>Amount Paid</th>
                        <th>Amount Owed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyDebts.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="no-data">No debts found for this date</td>
                        </tr>
                      ) : (
                        dailyDebts.map((debt, index) => {
                          const inventoryItem = inventory.find(inv => inv.name === debt.name);
                          const costPrice = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
                          const sellingPrice = parseFloat(debt.unit_price) || 0;
                          return (
                            <tr key={debt.id || index}>
                              <td>{debt.name}</td>
                              <td>{debt.pcs || 0}</td>
                              <td>{formatCurrencyAmount(costPrice)}</td>
                              <td>{formatCurrencyAmount(sellingPrice)}</td>
                              <td>{formatCurrencyAmount(parseFloat(debt.amount_payable_now) || 0)}</td>
                              <td className="debt-value">{formatCurrencyAmount(parseFloat(debt.balance_owed) || 0)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Most Sold Items for the Day */}
              {dailyMostSoldItems.length > 0 && (
                <section className="report-section">
                  <h2 className="section-title">
                    <FaChartLine className="section-icon" />
                    Most Sold Items
                  </h2>
                  <div className="table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Item Name</th>
                          <th>Pcs Sold</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyMostSoldItems.map((item, index) => (
                          <tr key={index}>
                            <td className="rank-cell">{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.count}</td>
                            <td className="total-cell">{formatCurrencyAmount(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Least Sold Items for the Day */}
              {dailyLeastSoldItems.length > 0 && (
                <section className="report-section">
                  <h2 className="section-title">
                    <FaExclamationTriangle className="section-icon warning-icon" />
                    Least Sold Items
                  </h2>
                  <div className="table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Item Name</th>
                          <th>Pcs Sold</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyLeastSoldItems.map((item, index) => (
                          <tr key={index}>
                            <td className="rank-cell">{index + 1}</td>
                            <td>{item.name}</td>
                            <td className="warning-cell">{item.count}</td>
                            <td className="total-cell">{formatCurrencyAmount(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* Stocks Report Tab Content */}
      {activeTab === 'stocks' && (
        <>
          <div className="tab-header">
            <h2 className="tab-title">Stocks Report</h2>
            <button className="generate-pdf-btn" onClick={handleGenerateStocksPDF}>
              <FaFileDownload className="btn-icon" />
              Generate PDF
            </button>
          </div>

          {loading ? (
            <div className="loading-message">Loading stocks data...</div>
          ) : (
            <div className="report-content">
              <section className="report-section">
                <h2 className="section-title">
                  <FaBox className="section-icon" />
                  Inventory Stock Report
                </h2>
                <div className="table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th>Pcs Left</th>
                        <th>Unit Price</th>
                        <th>Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stocksData.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="no-data">No inventory items found</td>
                        </tr>
                      ) : (
                        stocksData.map((item, index) => (
                          <tr key={item.id || index}>
                            <td className="rank-cell">{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.pcsLeft}</td>
                            <td>{formatCurrencyAmount(item.unitPrice)}</td>
                            <td className="total-cell">{formatCurrencyAmount(item.totalPrice)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {stocksData.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700, padding: '16px' }}>
                            Grand Total:
                          </td>
                          <td className="total-cell" style={{ fontWeight: 700, padding: '16px' }}>
                            {formatCurrencyAmount(
                              stocksData.reduce((sum, item) => sum + item.totalPrice, 0)
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Report;
