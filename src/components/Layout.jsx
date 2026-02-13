import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './Layout.css';

const SIDEBAR_BREAKPOINT = 992;

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= SIDEBAR_BREAKPOINT) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout-container">
      <TopBar onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="layout-content">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div className={`sidebar-backdrop ${sidebarOpen ? 'sidebar-backdrop--open' : ''}`} aria-hidden="true" onClick={closeSidebar} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
