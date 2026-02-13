import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaThLarge, 
  FaMoneyBillWave, 
  FaShoppingCart,
  FaCreditCard, 
  FaChartBar, 
  FaCog, 
  FaUsers,
  FaFileInvoiceDollar,
  FaChevronDown,
  FaChevronUp,
  FaDollarSign,
  FaDatabase,
  FaSlidersH,
  FaExclamationTriangle
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsExpanded, setSettingsExpanded] = useState(
    location.pathname.startsWith('/settings')
  );

  const menuItems = [
    { path: '/dashboard', icon: FaThLarge, label: 'Dashboard' },
    { path: '/purchases', icon: FaShoppingCart, label: 'Inventory' },
    { path: '/income', icon: FaMoneyBillWave, label: 'Sales' },
    { path: '/debts', icon: FaFileInvoiceDollar, label: 'Debts' },
    { path: '/expenses', icon: FaCreditCard, label: 'Expenses' },
    { path: '/report', icon: FaChartBar, label: 'Report' },
    { path: '/users', icon: FaUsers, label: 'Users' },
  ];

  const settingsSubMenus = [
    { path: '/settings/currencies', label: 'Currencies', icon: FaDollarSign },
    { path: '/settings/backup', label: 'Backup', icon: FaDatabase },
    { path: '/settings/configuration', label: 'Configuration', icon: FaSlidersH },
    { path: '/settings/stock-deficiency', label: 'Stock Deficiency', icon: FaExclamationTriangle },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
        
        {/* Settings with dropdown */}
        <div className="settings-menu-wrapper">
          <div
            className={`nav-item settings-main ${location.pathname.startsWith('/settings') ? 'active' : ''}`}
            onClick={() => {
              setSettingsExpanded(!settingsExpanded);
              if (!settingsExpanded) {
                navigate('/settings/currencies');
              }
            }}
          >
            <FaCog className="nav-icon" />
            <span className="nav-label">Settings</span>
            {settingsExpanded ? (
              <FaChevronUp className="dropdown-icon" />
            ) : (
              <FaChevronDown className="dropdown-icon" />
            )}
          </div>
          
          {settingsExpanded && (
            <div className="settings-submenu">
              {settingsSubMenus.map((subItem) => {
                const SubIcon = subItem.icon;
                return (
                  <NavLink
                    key={subItem.path}
                    to={subItem.path}
                    className={({ isActive }) => 
                      `nav-item submenu-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <SubIcon className="nav-icon submenu-icon" />
                    <span className="nav-label">{subItem.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
