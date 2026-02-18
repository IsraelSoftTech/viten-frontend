import React, { useState, useEffect, useCallback } from 'react';
import { FaPrint, FaCalendarAlt, FaChartLine, FaMoneyBillWave, FaCreditCard, FaExclamationTriangle, FaBriefcase, FaCalendarDay, FaBox } from 'react-icons/fa';
import { purchasesAPI, incomeAPI, debtAPI, expensesAPI, currencyAPI, configurationAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import jsPDF from 'jspdf';
import './Report.css';
import { getLocalDate, getFirstOfMonthLocal, extractYYYYMMDD } from '../utils/date';

const Report = () => {
  const [loading, setLoading] = useState(false);

  const [dateRange, setDateRange] = useState({
    startDate: getFirstOfMonthLocal(),
    endDate: getLocalDate()
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
  const [activeTab, setActiveTab] = useState('executive'); // default to Executive (clean records view)
  const [dailyDate, setDailyDate] = useState(getLocalDate()); // Today's date
  const [stocksData, setStocksData] = useState([]);
  const [showReportPrintModal, setShowReportPrintModal] = useState(false);
  const [reportPrintKind, setReportPrintKind] = useState(null); // 'executive' | 'daily' | 'stocks'

  useEffect(() => {
    fetchCurrencies();
    fetchDefaultCurrencyData();
    fetchConfiguration();
  }, []);

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

  const generateReport = useCallback(async () => {
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
  }, [dateRange]);

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

  const generateDailyReport = useCallback(async () => {
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
          const recordDate = extractYYYYMMDD(record.date);
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
          const recordDate = extractYYYYMMDD(record.date);
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
  }, [dailyDate]);

  useEffect(() => {
    if (defaultCurrency) {
      generateReport();
    }
  }, [dateRange, defaultCurrency, generateReport]);

  useEffect(() => {
    if (defaultCurrency && inventory.length > 0) {
      generateDailyReport();
    }
  }, [dailyDate, defaultCurrency, inventory, generateDailyReport]);

  useEffect(() => {
    if (activeTab === 'stocks') {
      fetchStocksData();
    }
  }, [activeTab]);

  // Calculate totals



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

  // const mostSoldItems = Object.values(itemSalesCount)
  //   .sort((a, b) => b.count - a.count)
  //   .slice(0, 10);

  // // Low sales items (items with sales < 5 pieces in the period)
  // const lowSalesItems = Object.values(itemSalesCount)
  //   .filter(item => item.count < 5)
  //   .sort((a, b) => a.count - b.count);

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

  const generateExecutiveReportPDF = (options = {}) => {
    const { printerType = 'normal', action = 'download' } = options;

    // ----- 58mm small printer: full report in small tables (B&W, no overlay) -----
    if (printerType === 'small') {
      const doc = new jsPDF({ unit: 'mm', format: [58, 297] });
      const W = 58, marginH = 3, topMargin = 5, contentW = W - marginH * 2, maxY = 290;
      let y = topMargin;
      doc.setDrawColor(0, 0, 0);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(0.2);
      const fmtDate = (d) => {
        if (!d) return 'N/A';
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
      };
      const fmt = (amount) => (amount == null || isNaN(amount) ? '0' : Math.round(amount).toLocaleString());
      const addPageIfNeeded = (need) => {
        if (y + need > maxY) {
          doc.addPage([58, 297]);
          y = topMargin;
          doc.setFontSize(5);
          doc.setFont('helvetica', 'italic');
          doc.text(appName + ' - Executive (cont.)', W / 2, y, { align: 'center' });
          y += 4;
        }
      };
      const drawSmallTable = (title, headers, rows, colWidths) => {
        addPageIfNeeded(8 + rows.length * 3);
        const rowH = 3;
        doc.setFillColor(240, 240, 240);
        doc.rect(marginH, y, contentW, 4, 'F');
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text(title, marginH + 1, y + 2.5);
        y += 4;
        doc.rect(marginH, y, contentW, rowH, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.rect(marginH, y, contentW, rowH);
        let x = marginH;
        headers.forEach((h, i) => {
          if (i > 0) doc.line(x, y, x, y + rowH);
          doc.text(String(h).substring(0, 8), x + 0.5, y + 2);
          x += colWidths[i];
        });
        y += rowH;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4);
        rows.forEach((row) => {
          addPageIfNeeded(rowH);
          doc.setDrawColor(0, 0, 0);
          doc.rect(marginH, y, contentW, rowH);
          x = marginH;
          row.forEach((cell, i) => {
            if (i > 0) doc.line(x, y, x, y + rowH);
            const txt = String(cell ?? '').substring(0, colWidths[i] < 8 ? 4 : colWidths[i] < 12 ? 8 : 14);
            doc.text(txt, x + 0.5, y + 2);
            x += colWidths[i];
          });
          y += rowH;
        });
        y += 2;
      };
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(appName.toUpperCase(), W / 2, y, { align: 'center' });
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.text('EXECUTIVE REPORT', W / 2, y, { align: 'center' });
      y += 3;
      doc.text(`${fmtDate(dateRange.startDate)} - ${fmtDate(dateRange.endDate)}`, W / 2, y, { align: 'center' });
      y += 5;
      doc.line(marginH, y, W - marginH, y);
      y += 3;

      // --- Simplified Executive: Sales, Debts, Expenses (no inventory / no gain-loss) ---
      const salesRows = sales.map(s => {
        const invItem = inventory.find(inv => inv.name === s.name);
        const unitCost = invItem ? parseFloat(invItem.unit_price) || 0 : 0;
        const unitSelling = s.unit_price ? parseFloat(s.unit_price) : ((parseFloat(s.total_price) || 0) / (parseInt(s.pcs) || 1));
        return [fmtDate(s.date).substring(0, 5), (s.name || 'N/A').substring(0, 12), String(s.pcs || 0), fmt(unitCost), fmt(unitSelling)];
      });
      if (salesRows.length === 0) salesRows.push(['-', 'No sales', '-', '-', '-']);
      drawSmallTable('SALES', ['Date', 'Item', 'Pcs', 'Cost', 'Sell'], salesRows, [10, 20, 4, 8, 16]);

      const debtsRows = debts.map(d => {
        const invItem = inventory.find(inv => inv.name === d.name);
        const unitCost = invItem ? parseFloat(invItem.unit_price) || 0 : 0;
        const unitSelling = d.unit_price ? parseFloat(d.unit_price) : ((parseFloat(d.total_price) || 0) / (parseInt(d.pcs) || 1));
        return [fmtDate(d.date).substring(0, 5), (d.name || 'N/A').substring(0, 12), String(d.pcs || 0), fmt(unitCost), fmt(unitSelling)];
      });
      if (debtsRows.length === 0) debtsRows.push(['-', 'No debts', '-', '-', '-']);
      drawSmallTable('DEBTS', ['Date', 'Item', 'Pcs', 'Cost', 'Sell'], debtsRows, [10, 20, 4, 8, 16]);

      const expRows = expenses.map(e => [fmtDate(e.date).substring(0, 5), (e.description || e.category || '-').substring(0, 12), '-', fmt(parseFloat(e.amount) || 0), '-']);
      if (expRows.length === 0) expRows.push(['-', 'No expenses', '-', '-', '-']);
      drawSmallTable('EXPENSES', ['Date', 'Item', 'Pcs', 'Cost', 'Sell'], expRows, [10, 20, 4, 8, 16]);
      addPageIfNeeded(6);
      doc.setFontSize(4);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by ' + appName, W / 2, y, { align: 'center' });
      const filename = `${appName.replace(/\s+/g, '-')}-Executive-58mm.pdf`;
      if (action === 'print') {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank', 'width=400,height=600');
        if (w) w.onload = () => setTimeout(() => w.print(), 400);
        setTimeout(() => URL.revokeObjectURL(url), 15000);
      } else doc.save(filename);
      return;
    }

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

    // Header for Executive report (used on page breaks)
    const drawHeader = () => {
      const headerHeight = 18;
      doc.setFillColor(240, 240, 240);
      doc.rect(startX, currentY, pageWidth - (margin * 2), headerHeight, 'F');
      doc.setFillColor(220, 220, 220);
      doc.rect(startX, currentY, pageWidth - (margin * 2), 2.5, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(appName.toUpperCase(), startX + 6, currentY + 7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('EXECUTIVE REPORT', startX + 6, currentY + 12);
      doc.setFontSize(7);
      doc.text(`${formatDateForPDF(dateRange.startDate)} - ${formatDateForPDF(dateRange.endDate)}`, startX + 6, currentY + 16);
      currentY += headerHeight + 2;
    };

    // Helper function to check if new page is needed
    const checkPageBreak = (requiredHeight) => {
      if (currentY + requiredHeight > maxPageHeight) {
        const footerY = pageHeight - margin - 10;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(startX, footerY, pageWidth - margin, footerY);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
        doc.addPage();
        currentY = margin;
        drawHeader();
        return true;
      }
      return false;
    };

    const drawTable = (headers, rows, startX, startY, colWidths, title = null, highlightLastRow = false, highlightColor = null) => {
      let y = startY;
      const rowHeight = 5;
      const titleHeight = title ? 5 : 0;
      const headerHeight = 5;
      const estimatedTableHeight = titleHeight + headerHeight + (rows.length * rowHeight);
      const totalColWidths = colWidths.reduce((a, b) => a + b, 0);
      const proportionalColWidths = colWidths.map(width => (width / totalColWidths) * tableWidth);
      if (y !== margin && checkPageBreak(estimatedTableHeight + 5)) {
        y = currentY;
      }
      if (title) {
        doc.setFillColor(240, 240, 240);
        doc.rect(startX, y, tableWidth, 5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, startX + 2, y + 3.5);
        y += 5;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
      doc.setTextColor(0, 0, 0);
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
        // Check page break before each row
        if (y + rowHeight > maxPageHeight) {
          // Add footer to current page
          const footerY = pageHeight - margin - 10;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(startX, footerY, pageWidth - margin, footerY);
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'italic');
          doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
          
          // Draw header again on new page
          doc.addPage();
          currentY = margin;
          drawHeader();
          y = currentY;
          
          // Redraw title if exists
          if (title) {
            doc.setFillColor(220, 220, 220);
            doc.rect(startX, y, tableWidth, 5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(title + ' (continued)', startX + 2, y + 3.5);
            y += 5;
          }
          
          // Redraw header
          doc.setFillColor(100, 100, 100);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(startX, y, tableWidth, rowHeight);
          
          x = startX;
          headers.forEach((header, index) => {
            if (index > 0) doc.line(x, y, x, y + rowHeight);
            doc.text(header, x + 1, y + 3.5);
            x += colWidths[index];
          });
          y += rowHeight;
        }
        
        const isLastRow = rowIndex === rows.length - 1;
        const isHighlighted = highlightLastRow && isLastRow;
        
        if (isHighlighted && highlightColor) {
          doc.setFillColor(highlightColor.r, highlightColor.g, highlightColor.b);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(0, 0, 0);
        } else if (rowIndex % 2 === 0 && !isHighlighted) {
          doc.setFillColor(252, 252, 252);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(0, 0, 0);
        } else if (!isHighlighted) {
          doc.setTextColor(0, 0, 0);
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

    // --- Executive print: only Sales, Debts, Expenses (mirror new UI) ---

    // Sales Table (Date | Item | Pcs | Unit cost price | Unit selling price)
    const salesColWidths = [24, 40, 10, 13, 13];
    const salesHeaders = ['Date', 'Item', 'Pcs', 'Unit cost price', 'Unit selling price'];
    const salesRows = sales.map(sale => {
      const invItem = inventory.find(inv => inv.name === sale.name);
      const unitCost = invItem ? parseFloat(invItem.unit_price) || 0 : 0;
      const unitSelling = sale.unit_price ? parseFloat(sale.unit_price) : ((parseFloat(sale.total_price) || 0) / (parseInt(sale.pcs) || 1));
      return [
        formatDateForPDF(sale.date),
        (sale.name || 'N/A').substring(0, 30),
        String(sale.pcs || 0),
        formatCurrencyForPDF(unitCost),
        formatCurrencyForPDF(unitSelling)
      ];
    });
    if (salesRows.length === 0) salesRows.push(['N/A', 'No sales in period', '-', '-', '-']);

    currentY = drawTable(
      salesHeaders,
      salesRows,
      startX,
      currentY,
      salesColWidths,
      'SALES'
    ) + 5;

    // Debts Table (same columns)
    const debtsColWidths = [24, 40, 10, 13, 13];
    const debtsHeaders = ['Date', 'Item', 'Pcs', 'Unit cost price', 'Unit selling price'];
    const debtsRows = debts.map(debt => {
      const invItem = inventory.find(inv => inv.name === debt.name);
      const unitCost = invItem ? parseFloat(invItem.unit_price) || 0 : 0;
      const unitSelling = debt.unit_price ? parseFloat(debt.unit_price) : ((parseFloat(debt.total_price) || 0) / (parseInt(debt.pcs) || 1));
      return [
        formatDateForPDF(debt.date),
        (debt.name || 'N/A').substring(0, 30),
        String(debt.pcs || 0),
        formatCurrencyForPDF(unitCost),
        formatCurrencyForPDF(unitSelling)
      ];
    });
    if (debtsRows.length === 0) debtsRows.push(['N/A', 'No debts in period', '-', '-', '-']);

    currentY = drawTable(
      debtsHeaders,
      debtsRows,
      startX,
      currentY,
      debtsColWidths,
      'DEBTS'
    ) + 5;

    // Expenses Table (Date | Item | Pcs | Unit cost price | Unit selling price)
    const expensesColWidths = [24, 40, 10, 13, 13];
    const expensesHeaders = ['Date', 'Item', 'Pcs', 'Unit cost price', 'Unit selling price'];
    const expensesRows = expenses.map(exp => [
      formatDateForPDF(exp.date),
      (exp.description || exp.category || 'Expense').substring(0, 30),
      '-',
      formatCurrencyForPDF(parseFloat(exp.amount) || 0),
      '-'
    ]);
    if (expensesRows.length === 0) expensesRows.push(['N/A', 'No expenses in period', '-', '-', '-']);

    currentY = drawTable(
      expensesHeaders,
      expensesRows,
      startX,
      currentY,
      expensesColWidths,
      'EXPENSES'
    ) + 5;

    // (no summary / no gain-loss / no most/least sold for Executive print)
    // Footer
    const footerY = pageHeight - margin - 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(startX, footerY, pageWidth - margin, footerY);
    
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });

    // Generate filename
    const filename = `${appName.replace(/\s+/g, '-')}-Executive-Report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;

    if (action === 'print') {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'width=800,height=600');
      if (w) w.onload = () => setTimeout(() => w.print(), 400);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else doc.save(filename);
  };

  const generateDailyReportPDF = (options = {}) => {
    const { printerType = 'normal', action = 'download' } = options;

    // ----- 58mm small printer: full daily report in small tables -----
    if (printerType === 'small') {
      const doc = new jsPDF({ unit: 'mm', format: [58, 297] });
      const W = 58, marginH = 3, topMargin = 5, contentW = W - marginH * 2, maxY = 290;
      let y = topMargin;
      doc.setDrawColor(0, 0, 0);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(0.2);
      const fmt = (amount) => (amount == null || isNaN(amount) ? '0' : Math.round(amount).toLocaleString());
      const addPageIfNeeded = (need) => {
        if (y + need > maxY) {
          doc.addPage([58, 297]);
          y = topMargin;
          doc.setFontSize(5);
          doc.setFont('helvetica', 'italic');
          doc.text(appName + ' - Daily (cont.)', W / 2, y, { align: 'center' });
          y += 4;
        }
      };
      const drawSmallTable = (title, headers, rows, colWidths) => {
        addPageIfNeeded(8 + rows.length * 3);
        const rowH = 3;
        doc.setFillColor(240, 240, 240);
        doc.rect(marginH, y, contentW, 4, 'F');
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text(title, marginH + 1, y + 2.5);
        y += 4;
        doc.rect(marginH, y, contentW, rowH, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.rect(marginH, y, contentW, rowH);
        let x = marginH;
        headers.forEach((h, i) => {
          if (i > 0) doc.line(x, y, x, y + rowH);
          doc.text(String(h).substring(0, 6), x + 0.5, y + 2);
          x += colWidths[i];
        });
        y += rowH;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4);
        rows.forEach((row) => {
          addPageIfNeeded(rowH);
          doc.setDrawColor(0, 0, 0);
          doc.rect(marginH, y, contentW, rowH);
          x = marginH;
          row.forEach((cell, i) => {
            if (i > 0) doc.line(x, y, x, y + rowH);
            const txt = String(cell ?? '').substring(0, colWidths[i] < 6 ? 3 : colWidths[i] < 10 ? 6 : 12);
            doc.text(txt, x + 0.5, y + 2);
            x += colWidths[i];
          });
          y += rowH;
        });
        y += 2;
      };
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(appName.toUpperCase(), W / 2, y, { align: 'center' });
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.text('DAILY REPORT', W / 2, y, { align: 'center' });
      y += 3;
      const fmtDate = (d) => {
        if (!d) return 'N/A';
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
      };
      doc.text(fmtDate(dailyDate), W / 2, y, { align: 'center' });
      y += 5;
      doc.line(marginH, y, W - marginH, y);
      y += 3;
      const salesRows = dailySales.map((sale) => {
        const invItem = inventory.find(inv => inv.name === sale.name);
        const costPrice = invItem ? parseFloat(invItem.unit_price) || 0 : 0;
        const sellPrice = parseFloat(sale.unit_price) || 0;
        const pcs = parseInt(sale.pcs) || 0;
        const totalSale = parseFloat(sale.total_price) || 0;
        const gainLoss = totalSale - costPrice * pcs;
        return [(sale.name || 'N/A').substring(0, 10), String(pcs), fmt(costPrice), fmt(sellPrice), fmt(totalSale), fmt(gainLoss)];
      });
      salesRows.push(['TOTAL', '', '', '', fmt(dailySalesTotal), fmt(dailyGainLoss)]);
      drawSmallTable('SALES', ['Item', 'Pcs', 'Cost', 'Sell', 'Total', 'G/L'], salesRows, [12, 4, 8, 8, 8, 10]);
      const debtsRows = dailyDebts.map((d) => [(d.name || 'N/A').substring(0, 10), String(d.pcs || 0), fmt(parseFloat(d.total_price)), fmt(parseFloat(d.amount_payable_now)), fmt(parseFloat(d.balance_owed))]);
      if (debtsRows.length > 0) {
        debtsRows.push(['TOTAL', '', fmt(dailyDebts.reduce((s, d) => s + (parseFloat(d.total_price) || 0), 0)), '', fmt(dailyDebtsOwed)]);
        drawSmallTable('DEBTS', ['Item', 'Pcs', 'Total', 'Paid', 'Owed'], debtsRows, [14, 4, 10, 10, 12]);
      }
      const summaryRows = [['Sales total', fmt(dailySalesTotal)], ['Gain/Loss', fmt(dailyGainLoss)], ['Debts owed', fmt(dailyDebtsOwed)]];
      drawSmallTable('SUMMARY', ['Head', 'Amount'], summaryRows, [28, 22]);
      if (dailyMostSoldItems && dailyMostSoldItems.length > 0) {
        const mostRows = dailyMostSoldItems.slice(0, 5).map((m, i) => [(i + 1) + '.', (m.name || 'N/A').substring(0, 12), String(m.count || 0)]);
        drawSmallTable('MOST SOLD', ['#', 'Item', 'Qty'], mostRows, [4, 28, 8]);
      }
      if (dailyLeastSoldItems && dailyLeastSoldItems.length > 0) {
        const leastRows = dailyLeastSoldItems.slice(0, 5).map((m, i) => [(i + 1) + '.', (m.name || 'N/A').substring(0, 12), String(m.count || 0)]);
        drawSmallTable('LEAST SOLD', ['#', 'Item', 'Qty'], leastRows, [4, 28, 8]);
      }
      addPageIfNeeded(6);
      doc.setFontSize(4);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by ' + appName, W / 2, y, { align: 'center' });
      const filename = `${appName.replace(/\s+/g, '-')}-Daily-58mm.pdf`;
      if (action === 'print') {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank', 'width=400,height=600');
        if (w) w.onload = () => setTimeout(() => w.print(), 400);
        setTimeout(() => URL.revokeObjectURL(url), 15000);
      } else doc.save(filename);
      return;
    }

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
        doc.setTextColor(100, 100, 100);
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
        doc.setFillColor(240, 240, 240);
        doc.rect(startX, y, tableWidth, 5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, startX + 2, y + 3.5);
        y += 5;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
      doc.setTextColor(0, 0, 0);
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
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'italic');
          doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
          doc.addPage();
          currentY = margin;
          drawHeader();
          y = currentY;
          
          if (title) {
            doc.setFillColor(240, 240, 240);
            doc.rect(startX, y, tableWidth, 5, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(title + ' (continued)', startX + 2, y + 3.5);
            y += 5;
          }
          
          doc.setFillColor(240, 240, 240);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(startX, y, tableWidth, rowHeight);
          
          x = startX;
          headers.forEach((header, index) => {
            if (index > 0) doc.line(x, y, x, y + rowHeight);
            doc.text(header, x + 1, y + 3.5);
            x += colWidths[index];
          });
          y += rowHeight;
        }
        
        const isLastRow = rowIndex === rows.length - 1;
        const isHighlighted = highlightLastRow && isLastRow;
        
        if (isHighlighted) {
          doc.setFillColor(200, 220, 240);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(0, 0, 0);
        } else if (rowIndex % 2 === 0 && !isHighlighted) {
          doc.setFillColor(252, 252, 252);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(0, 0, 0);
        } else if (!isHighlighted) {
          doc.setTextColor(0, 0, 0);
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

    // Header function
    const drawHeader = () => {
      const headerHeight = 22; // Increased to accommodate multi-line dates
      doc.setFillColor(240, 240, 240);
      doc.rect(startX, currentY, pageWidth - (margin * 2), headerHeight, 'F');
      doc.setFillColor(220, 220, 220);
      doc.rect(startX, currentY, pageWidth - (margin * 2), 2.5, 'F');
      doc.setFillColor(128, 128, 128);
      doc.rect(startX + pageWidth - (margin * 2) - 35, currentY, 35, headerHeight, 'F');

      doc.setTextColor(0, 0, 0);
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
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MOST SOLD ITEMS', startX + 2, currentY + 3.5);
      currentY += 7;
      
      // Items as text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
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
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('LEAST SOLD ITEMS', startX + 2, currentY + 3.5);
      currentY += 7;
      
      // Items as text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
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
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });

    const filename = `${appName.replace(/\s+/g, '-')}-Daily-Report-${dailyDate}.pdf`;
    if (action === 'print') {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'width=800,height=600');
      if (w) w.onload = () => setTimeout(() => w.print(), 400);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else doc.save(filename);
  };

  const generateStocksReportPDF = (options = {}) => {
    const { printerType = 'normal', action = 'download' } = options;

    // ----- 58mm small printer: full stocks report in small table -----
    if (printerType === 'small') {
      const doc = new jsPDF({ unit: 'mm', format: [58, 297] });
      const W = 58, marginH = 3, topMargin = 5, contentW = W - marginH * 2, maxY = 290;
      let y = topMargin;
      doc.setDrawColor(0, 0, 0);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(0.2);
      const fmt = (amount) => (amount == null || isNaN(amount) ? '0' : Math.round(amount).toLocaleString());
      const addPageIfNeeded = (need) => {
        if (y + need > maxY) {
          doc.addPage([58, 297]);
          y = topMargin;
          doc.setFontSize(5);
          doc.setFont('helvetica', 'italic');
          doc.text(appName + ' - Stocks (cont.)', W / 2, y, { align: 'center' });
          y += 4;
        }
      };
      const drawSmallTable = (title, headers, rows, colWidths) => {
        addPageIfNeeded(8 + rows.length * 3);
        const rowH = 3;
        doc.setFillColor(240, 240, 240);
        doc.rect(marginH, y, contentW, 4, 'F');
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text(title, marginH + 1, y + 2.5);
        y += 4;
        doc.rect(marginH, y, contentW, rowH, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.rect(marginH, y, contentW, rowH);
        let x = marginH;
        headers.forEach((h, i) => {
          if (i > 0) doc.line(x, y, x, y + rowH);
          doc.text(String(h).substring(0, 6), x + 0.5, y + 2);
          x += colWidths[i];
        });
        y += rowH;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4);
        rows.forEach((row) => {
          addPageIfNeeded(rowH);
          doc.setDrawColor(0, 0, 0);
          doc.rect(marginH, y, contentW, rowH);
          x = marginH;
          row.forEach((cell, i) => {
            if (i > 0) doc.line(x, y, x, y + rowH);
            const txt = String(cell ?? '').substring(0, colWidths[i] < 6 ? 4 : colWidths[i] < 10 ? 8 : 16);
            doc.text(txt, x + 0.5, y + 2);
            x += colWidths[i];
          });
          y += rowH;
        });
        y += 2;
      };
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(appName.toUpperCase(), W / 2, y, { align: 'center' });
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.text('STOCKS REPORT', W / 2, y, { align: 'center' });
      y += 3;
      const now = new Date();
      doc.text(`${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`, W / 2, y, { align: 'center' });
      y += 5;
      doc.line(marginH, y, W - marginH, y);
      y += 3;
      const totalVal = stocksData.reduce((s, item) => s + (item.totalPrice || 0), 0);
      const stocksRows = stocksData.map((item, index) => [
        String(index + 1),
        (item.name || 'N/A').substring(0, 14),
        String(item.pcsLeft ?? 0),
        fmt(item.unitPrice),
        fmt(item.totalPrice)
      ]);
      stocksRows.push(['TOTAL', '', '', '', fmt(totalVal)]);
      drawSmallTable('INVENTORY STOCK', ['#', 'Item', 'Pcs', 'Unit', 'Total'], stocksRows, [4, 18, 6, 10, 12]);
      addPageIfNeeded(6);
      doc.setFontSize(4);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by ' + appName, W / 2, y, { align: 'center' });
      const filename = `${appName.replace(/\s+/g, '-')}-Stocks-58mm.pdf`;
      if (action === 'print') {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank', 'width=400,height=600');
        if (w) w.onload = () => setTimeout(() => w.print(), 400);
        setTimeout(() => URL.revokeObjectURL(url), 15000);
      } else doc.save(filename);
      return;
    }

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
      doc.setFillColor(240, 240, 240);
      doc.rect(startX, currentY, pageWidth - (margin * 2), headerHeight, 'F');
      doc.setFillColor(220, 220, 220);
      doc.rect(startX, currentY, pageWidth - (margin * 2), 2.5, 'F');
      doc.setFillColor(128, 128, 128);
      doc.rect(startX + pageWidth - (margin * 2) - 35, currentY, 35, headerHeight, 'F');

      doc.setTextColor(0, 0, 0);
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
        doc.setTextColor(100, 100, 100);
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
        doc.setFillColor(240, 240, 240);
        doc.rect(startX, y, tableWidth, 5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, startX + 2, y + 3.5);
        y += 5;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
      doc.setTextColor(0, 0, 0);
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
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'italic');
          doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });
          doc.addPage();
          currentY = margin;
          drawHeader();
          y = currentY;
          
          if (title) {
            doc.setFillColor(240, 240, 240);
            doc.rect(startX, y, tableWidth, 5, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(title + ' (continued)', startX + 2, y + 3.5);
            y += 5;
          }
          
          doc.setFillColor(240, 240, 240);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(startX, y, tableWidth, rowHeight);
          
          x = startX;
          headers.forEach((header, index) => {
            if (index > 0) doc.line(x, y, x, y + rowHeight);
            doc.text(header, x + 1, y + 3.5);
            x += colWidths[index];
          });
          y += rowHeight;
        }
        
        const isLastRow = rowIndex === rows.length - 1;
        const isHighlighted = highlightLastRow && isLastRow;
        
        if (isHighlighted) {
          doc.setFillColor(200, 220, 240);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(0, 0, 0);
        } else if (rowIndex % 2 === 0 && !isHighlighted) {
          doc.setFillColor(252, 252, 252);
          doc.rect(startX, y, tableWidth, rowHeight, 'F');
          doc.setTextColor(0, 0, 0);
        } else if (!isHighlighted) {
          doc.setTextColor(0, 0, 0);
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
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by ' + appName, startX + (pageWidth - margin * 2) / 2, footerY + 5, { align: 'center' });

    const filename = `${appName.replace(/\s+/g, '-')}-Stocks-Report-${formatDateForPDF(new Date().toISOString())}.pdf`;
    if (action === 'print') {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'width=800,height=600');
      if (w) w.onload = () => setTimeout(() => w.print(), 400);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else doc.save(filename);
  };

  const handleOpenReportPrintModal = (kind) => {
    setReportPrintKind(kind);
    setShowReportPrintModal(true);
  };

  const handleReportPrintConfirm = (printerType) => {
    if (reportPrintKind === 'executive') generateExecutiveReportPDF({ printerType, action: 'print' });
    else if (reportPrintKind === 'daily') generateDailyReportPDF({ printerType, action: 'print' });
    else if (reportPrintKind === 'stocks') generateStocksReportPDF({ printerType, action: 'print' });
    setShowReportPrintModal(false);
    setReportPrintKind(null);
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
            <button className="generate-pdf-btn" onClick={() => handleOpenReportPrintModal('executive')}>
              <FaPrint className="btn-icon" />
              Print
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
          {/* Clean executive tables: Sales, Debts, Expenses (no gain/loss) */}

          {/* Sales */}
          <section className="report-section">
            <h2 className="section-title">
              <FaChartLine className="section-icon" />
              Sales ({formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)})
            </h2>
            <div className="table-wrapper">
              <table className="report-table simple-record-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Pcs</th>
                    <th>Unit cost price</th>
                    <th>Unit selling price</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="no-data">No sales records for the selected period</td>
                    </tr>
                  ) : (
                    sales.map((s, idx) => {
                      const inventoryItem = inventory.find(inv => inv.name === s.name);
                      const unitCost = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
                      const unitSelling = s.unit_price ? parseFloat(s.unit_price) : ((parseFloat(s.total_price) || 0) / (parseInt(s.pcs) || 1));
                      return (
                        <tr key={s.id || idx}>
                          <td>{formatDate(s.date)}</td>
                          <td>{s.name || 'N/A'}</td>
                          <td>{s.pcs || 0}</td>
                          <td className="total-cell">{formatCurrencyAmount(unitCost)}</td>
                          <td className="total-cell">{formatCurrencyAmount(unitSelling)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Debts */}
          <section className="report-section">
            <h2 className="section-title">
              <FaCreditCard className="section-icon" />
              Debts ({formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)})
            </h2>
            <div className="table-wrapper">
              <table className="report-table simple-record-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Pcs</th>
                    <th>Unit cost price</th>
                    <th>Unit selling price</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="no-data">No debt records for the selected period</td>
                    </tr>
                  ) : (
                    debts.map((d, idx) => {
                      const inventoryItem = inventory.find(inv => inv.name === d.name);
                      const unitCost = inventoryItem ? parseFloat(inventoryItem.unit_price) || 0 : 0;
                      const unitSelling = d.unit_price ? parseFloat(d.unit_price) : ((parseFloat(d.total_price) || 0) / (parseInt(d.pcs) || 1));
                      return (
                        <tr key={d.id || idx}>
                          <td>{formatDate(d.date)}</td>
                          <td>{d.name || 'N/A'}</td>
                          <td>{d.pcs || 0}</td>
                          <td className="total-cell">{formatCurrencyAmount(unitCost)}</td>
                          <td className="total-cell">{formatCurrencyAmount(unitSelling)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Expenses */}
          <section className="report-section">
            <h2 className="section-title">
              <FaMoneyBillWave className="section-icon" />
              Expenses ({formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)})
            </h2>
            <div className="table-wrapper">
              <table className="report-table simple-record-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Pcs</th>
                    <th>Unit cost price</th>
                    <th>Unit selling price</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="no-data">No expense records for the selected period</td>
                    </tr>
                  ) : (
                    expenses.map((e, idx) => (
                      <tr key={e.id || idx}>
                        <td>{formatDate(e.date)}</td>
                        <td>{e.description || e.category || 'Expense'}</td>
                        <td>-</td>
                        <td className="total-cell">{formatCurrencyAmount(parseFloat(e.amount) || 0)}</td>
                        <td className="total-cell">-</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
        </>
      )}

      {/* Daily Tab Content */}
      {activeTab === 'daily' && (
        <>
          <div className="tab-header">
            <h2 className="tab-title">Daily Report</h2>
            <button className="generate-pdf-btn" onClick={() => handleOpenReportPrintModal('daily')}>
              <FaPrint className="btn-icon" />
              Print
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
            <button className="generate-pdf-btn" onClick={() => handleOpenReportPrintModal('stocks')}>
              <FaPrint className="btn-icon" />
              Print
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

      {showReportPrintModal && (
        <div className="receipt-print-modal-overlay" onClick={() => { setShowReportPrintModal(false); setReportPrintKind(null); }}>
          <div className="receipt-print-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="receipt-print-modal-title">Select printer type</h3>
            <div className="receipt-print-options">
              <button type="button" className="receipt-print-option receipt-print-option-small" onClick={() => handleReportPrintConfirm('small')}>
                <span className="receipt-print-option-icon">🖨️</span>
                <span className="receipt-print-option-label">Small printer</span>
                <span className="receipt-print-option-desc">58mm thermal (e.g. mobile Bluetooth)</span>
              </button>
              <button type="button" className="receipt-print-option receipt-print-option-normal" onClick={() => handleReportPrintConfirm('normal')}>
                <span className="receipt-print-option-icon">🖨️</span>
                <span className="receipt-print-option-label">Normal printer</span>
                <span className="receipt-print-option-desc">A4 / Letter — Save as PDF or print</span>
              </button>
            </div>
            <button type="button" className="receipt-print-cancel" onClick={() => { setShowReportPrintModal(false); setReportPrintKind(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;
