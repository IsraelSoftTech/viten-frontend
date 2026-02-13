import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Spinner from './components/Spinner';
import Login from './components/Login';
import Signup from './components/Signup';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Income from './components/Income';
import Purchase from './components/Purchase';
import Debt from './components/Debt';
import Expenses from './components/Expenses';
import Report from './components/Report';
import Goal from './components/Goal';
import Settings from './components/Settings';
import Users from './components/Users';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Spinner />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/purchases" element={<Purchase />} />
          <Route path="/income" element={<Income />} />
          <Route path="/debts" element={<Debt />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/report" element={<Report />} />
          <Route path="/goal" element={<Goal />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/currencies" element={<Settings />} />
          <Route path="/settings/backup" element={<Settings />} />
          <Route path="/settings/configuration" element={<Settings />} />
          <Route path="/settings/stock-deficiency" element={<Settings />} />
          <Route path="/users" element={<Users />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
