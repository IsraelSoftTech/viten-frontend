import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaCreditCard, FaShoppingCart, FaBalanceScale, FaExclamationTriangle } from 'react-icons/fa';
import { incomeAPI, expensesAPI, purchasesAPI, stockDeficiencyAPI } from '../api';
import { formatCurrency as formatCurrencyUtil, fetchDefaultCurrency } from '../utils/currency';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    totalPurchases: 0,
    netBalance: 0,
    loading: true
  });

  const [stockAlerts, setStockAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch income, expenses, and purchases records
        const [incomeResponse, expensesResponse, purchasesResponse] = await Promise.all([
          incomeAPI.getAllIncome(),
          expensesAPI.getAllExpenses(),
          purchasesAPI.getAllPurchases()
        ]);
        
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalPurchases = 0;
        
        if (incomeResponse.success) {
          const income = incomeResponse.income || [];
          totalIncome = income.reduce((sum, record) => sum + (parseFloat(record.total_price) || 0), 0);
        }
        
        if (expensesResponse.success) {
          const expenses = expensesResponse.expenses || [];
          totalExpenses = expenses.reduce((sum, record) => sum + (parseFloat(record.amount) || 0), 0);
        }
        
        if (purchasesResponse.success) {
          const purchases = purchasesResponse.purchases || [];
          totalPurchases = purchases.reduce((sum, record) => sum + (parseFloat(record.total_amount) || 0), 0);
        }
        
        // Calculate Net Balance: Total Income - (Total Expenses + Total Purchases)
        const netBalance = totalIncome - (totalExpenses + totalPurchases);
        
        setStats({
          totalExpenses: totalExpenses,
          totalIncome: totalIncome,
          totalPurchases: totalPurchases,
          netBalance: netBalance,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          totalExpenses: 0,
          totalIncome: 0,
          totalPurchases: 0,
          netBalance: 0,
          loading: false
        });
      }
    };

    fetchStats();
    fetchStockAlerts();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(() => {
      fetchStockAlerts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchStockAlerts = async () => {
    setAlertsLoading(true);
    try {
      const response = await stockDeficiencyAPI.getAlerts();
      if (response.success) {
        const alerts = response.alerts || [];
        setStockAlerts(alerts);
        if (alerts.length > 0) {
          console.log('Stock alerts found:', alerts);
        } else {
          console.log('No stock deficiency alerts - all items are well stocked or no thresholds set');
        }
      } else {
        console.error('Failed to fetch alerts:', response.message);
        setStockAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      setStockAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
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
      // Fallback while loading
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    }
    return formatCurrencyUtil(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const cards = [
    {
      title: 'Total Expenses',
      value: formatCurrency(stats.totalExpenses),
      icon: FaCreditCard,
      color: '#FF6B35',
      bgColor: '#FFF5F2'
    },
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalIncome),
      icon: FaMoneyBillWave,
      color: '#4CAF50',
      bgColor: '#F1F8F4'
    },
    {
      title: 'Total Purchases',
      value: formatCurrency(stats.totalPurchases),
      icon: FaShoppingCart,
      color: '#FF9800',
      bgColor: '#FFF8F0'
    },
    {
      title: 'Net Balance',
      value: formatCurrency(stats.netBalance),
      icon: FaBalanceScale,
      color: stats.netBalance >= 0 ? '#2196F3' : '#f44336',
      bgColor: stats.netBalance >= 0 ? '#F0F7FF' : '#FFEBEE'
    }
  ];

  const netAmount = stats.netBalance;
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Prepare pie chart data
  const pieChartData = [
    {
      label: 'Sales',
      value: stats.totalIncome,
      color: '#4CAF50',
      bgColor: '#F1F8F4'
    },
    {
      label: 'Expenses',
      value: stats.totalExpenses,
      color: '#FF6B35',
      bgColor: '#FFF5F2'
    },
    {
      label: 'Purchases',
      value: stats.totalPurchases,
      color: '#FF9800',
      bgColor: '#FFF8F0'
    }
  ].filter(item => item.value > 0); // Only show segments with values

  // Calculate total for percentage calculation
  const totalValue = pieChartData.reduce((sum, item) => sum + item.value, 0);

  // Generate pie chart segments
  const generatePieSegments = () => {
    if (totalValue === 0) return [];
    
    let currentAngle = -90; // Start from top
    const radius = 100;
    const centerX = 150;
    const centerY = 150;
    
    return pieChartData.map((item, index) => {
      const percentage = (item.value / totalValue) * 100;
      const angle = (item.value / totalValue) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // Calculate path for pie segment
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      // Calculate label position (middle of segment)
      const labelAngle = (startAngle + endAngle) / 2;
      const labelAngleRad = (labelAngle * Math.PI) / 180;
      const labelRadius = radius * 0.65;
      const labelX = centerX + labelRadius * Math.cos(labelAngleRad);
      const labelY = centerY + labelRadius * Math.sin(labelAngleRad);
      
      currentAngle = endAngle;
      
      return {
        ...item,
        pathData,
        percentage: percentage.toFixed(1),
        labelX,
        labelY,
        index
      };
    });
  };

  const pieSegments = generatePieSegments();

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>
      <div className="dashboard-cards">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="dashboard-card">
              <div className="card-icon" style={{ backgroundColor: card.bgColor, color: card.color }}>
                <Icon />
              </div>
              <div className="card-content">
                <h3 className="card-title">{card.title}</h3>
                <p className="card-value">{stats.loading ? 'Loading...' : card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Pie Chart Section */}
        <div className="graph-section">
        <h2 className="graph-title">Financial Analysis</h2>
        <div className="graph-container-with-alerts">
          <div className="pie-chart-container">
            {stats.loading ? (
              <div className="pie-chart-loading">Loading analysis...</div>
            ) : totalValue === 0 ? (
              <div className="pie-chart-empty">
                <p>No financial data available</p>
                <span>Start recording sales, expenses, and purchases to see analysis</span>
              </div>
            ) : (
              <>
                <div className="pie-chart-wrapper">
                  <svg 
                    className="pie-chart" 
                    viewBox="0 0 300 300"
                    preserveAspectRatio="xMidYMid meet"
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {pieSegments.map((segment, index) => (
                      <g key={index}>
                        <path
                          d={segment.pathData}
                          fill={segment.color}
                          stroke="#ffffff"
                          strokeWidth={hoveredSegment === index ? "4" : "3"}
                          className="pie-segment"
                          style={{
                            opacity: hoveredSegment === index ? 1 : hoveredSegment === null ? 1 : 0.6,
                            cursor: 'pointer',
                            transition: 'opacity 0.3s ease, stroke-width 0.2s ease'
                          }}
                          onMouseEnter={() => setHoveredSegment(index)}
                          filter={hoveredSegment === index ? 'url(#glow)' : 'none'}
                        />
                        {segment.percentage > 5 && (
                          <text
                            x={segment.labelX}
                            y={segment.labelY}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="14"
                            fontWeight="700"
                            className="pie-label"
                            style={{
                              opacity: hoveredSegment === index ? 1 : hoveredSegment === null ? 1 : 0.8
                            }}
                          >
                            {segment.percentage}%
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
                
                <div className="pie-chart-legend">
                  {pieSegments.map((segment, index) => (
                    <div 
                      key={index} 
                      className={`legend-item ${hoveredSegment === index ? 'highlighted' : ''}`}
                      onMouseEnter={() => setHoveredSegment(index)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
                      <div 
                        className="legend-color" 
                        style={{ backgroundColor: segment.color }}
                      ></div>
                      <div className="legend-content">
                        <div className="legend-label">{segment.label}</div>
                        <div className="legend-value">{formatCurrency(segment.value)}</div>
                        <div className="legend-percentage">{segment.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="graph-summary">
                  <div className="summary-item">
                    <div className="summary-label">Net Balance</div>
                    <div className={`summary-value ${netAmount >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(Math.abs(netAmount))}
                    </div>
                    <div className="summary-indicator">
                      {netAmount >= 0 ? '✓ Profit' : '✗ Loss'}
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Total Revenue</div>
                    <div className="summary-value">
                      {formatCurrency(stats.totalIncome)}
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Total Outflow</div>
                    <div className="summary-value">
                      {formatCurrency(stats.totalExpenses + stats.totalPurchases)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Stock Deficiency Alerts */}
          <div className="stock-alerts-panel">
            <h3 className="alerts-title">
              <FaExclamationTriangle className="alerts-icon" />
              Stock Alerts
            </h3>
            {alertsLoading ? (
              <div className="alerts-loading">Loading alerts...</div>
            ) : stockAlerts.length === 0 ? (
              <div className="no-alerts">
                <p>No stock deficiency alerts</p>
                <span className="alerts-subtitle">All items are well stocked</span>
              </div>
            ) : (
              <div className="alerts-list">
                {stockAlerts.map((alert) => (
                  <div key={alert.id} className="alert-item">
                    <div className="alert-header">
                      <FaExclamationTriangle className="alert-icon" />
                      <span className="alert-item-name">{alert.name}</span>
                    </div>
                    <div className="alert-details">
                      <div className="alert-detail-row">
                        <span className="alert-label">Pcs Sold:</span>
                        <span className="alert-value">{alert.pcs_sold || 0} pcs</span>
                      </div>
                      <div className="alert-detail-row">
                        <span className="alert-label">Pcs Available:</span>
                        <span className="alert-value deficient">{alert.available_stock || 0} pcs</span>
                      </div>
                      <div className="alert-detail-row">
                        <span className="alert-label">Threshold:</span>
                        <span className="alert-value">{alert.stock_deficiency_threshold} pcs</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
