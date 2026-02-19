import React, { useEffect, useState } from 'react';
import { FaLock, FaCalendarAlt, FaPrint } from 'react-icons/fa';
import { configurationAPI, gainAPI } from '../api';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';
import './Gain.css';
import { getLocalDate, getFirstOfMonthLocal, extractYYYYMMDD } from '../utils/date';

const GAIN_PIN_SESSION_KEY = 'goalPinUnlocked'; // Use same session key as Goal

const Gain = () => {
  const [mode, setMode] = useState('daily'); // 'daily' or 'range'
  // PIN lock state
  const [pinCheckDone, setPinCheckDone] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);

  useEffect(() => {
    const checkPin = async () => {
      try {
        const res = await configurationAPI.getGoalPinStatus();
        if (res.success && res.hasPin) {
          setPinRequired(true);
          if (sessionStorage.getItem(GAIN_PIN_SESSION_KEY) === '1') {
            setPinUnlocked(true);
          }
        } else {
          setPinUnlocked(true);
        }
      } catch (e) {
        setPinUnlocked(true);
      } finally {
        setPinCheckDone(true);
      }
    };
    checkPin();
    return () => {
      sessionStorage.removeItem(GAIN_PIN_SESSION_KEY);
    };
  }, []);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    if (!pinInput.trim()) {
      setPinError('Enter PIN');
      return;
    }
    setPinVerifying(true);
    try {
      const res = await configurationAPI.verifyGoalPin(pinInput);
      if (res.success && res.valid) {
        sessionStorage.setItem(GAIN_PIN_SESSION_KEY, '1');
        setPinUnlocked(true);
        setPinInput('');
      } else {
        setPinError('Incorrect PIN');
        setPinInput('');
      }
    } catch (e) {
      setPinError('Verification failed');
    } finally {
      setPinVerifying(false);
    }
  };

  const [date, setDate] = useState(getLocalDate());
  const [startDate, setStartDate] = useState(getFirstOfMonthLocal());
  const [endDate, setEndDate] = useState(getLocalDate());
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ total_cost: 0, total_sale: 0, total_gain_loss: 0 });
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount) => {
    return formatCurrencyUtil(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const fetchGain = async () => {
    setLoading(true);
    try {
      // validate input
      if (mode === 'daily') {
        if (!date) {
          setRows([]);
          setTotals({ total_cost: 0, total_sale: 0, total_gain_loss: 0 });
          setLoading(false);
          return;
        }
      } else {
        if (!startDate || !endDate) {
          setRows([]);
          setTotals({ total_cost: 0, total_sale: 0, total_gain_loss: 0 });
          setLoading(false);
          return;
        }
        if (new Date(startDate) > new Date(endDate)) {
          setRows([]);
          setTotals({ total_cost: 0, total_sale: 0, total_gain_loss: 0 });
          setLoading(false);
          return;
        }
      }

      const params = mode === 'daily' ? { date } : { startDate, endDate };
      const resp = await gainAPI.getGain(params);
      if (resp && resp.success) {
        // normalize date strings to YYYY-MM-DD (avoid timezone-related mismatches)
        const normalized = (resp.gain || []).map(r => ({ ...r, date: extractYYYYMMDD(r.date) }));
        setRows(normalized);
        setTotals(resp.totals || { total_cost: 0, total_sale: 0, total_gain_loss: 0 });
      } else {
        setRows([]);
        setTotals({ total_cost: 0, total_sale: 0, total_gain_loss: 0 });
      }
    } catch (err) {
      console.error('Fetch gain error', err);
      setRows([]);
      setTotals({ total_cost: 0, total_sale: 0, total_gain_loss: 0 });
    } finally {
      setLoading(false);
    }
  };

  // auto-run when date / range changes
  useEffect(() => {
    if (mode === 'daily') fetchGain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, mode]);

  useEffect(() => {
    if (mode === 'range') fetchGain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, mode]);

  const [showGainPrintModal, setShowGainPrintModal] = useState(false);

  const generatePrintableHtml = (printerType = 'normal') => {
    const title = mode === 'daily' ? `Gain / Loss - ${date}` : `Gain / Loss (${startDate} → ${endDate})`;
    const isSmall = printerType === 'small';
    return `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: ${isSmall ? '6px' : '20px'}; color: #222 }
            h1 { font-size: ${isSmall ? '14px' : '18px'}; margin-bottom: 8px }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: ${isSmall ? '11px' : '12px'} }
            th, td { padding: ${isSmall ? '4px 6px' : '8px 6px'}; border: 1px solid #ddd }
            th { background: #f7f7f7; text-align: left }
            .right { text-align: right }
            .gain { color: #2e7d32; font-weight: 700 }
            .loss { color: #c62828; font-weight: 700 }
            .totals { margin-top: 8px; font-weight: 700 }
            @media print { body { -webkit-print-color-adjust: exact } }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div>Generated: ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th class="right">Pcs</th>
                <th class="right">Unit cost</th>
                <th class="right">Unit price</th>
                <th class="right">Total cost</th>
                <th class="right">Total sale</th>
                <th class="right">Gain / Loss</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${extractYYYYMMDD(r.date)}</td>
                  <td>${(r.name || '').replace(/</g, '&lt;')}</td>
                  <td class="right">${r.pcs || 0}</td>
                  <td class="right">${formatCurrency(r.cost_unit_price || 0)}</td>
                  <td class="right">${formatCurrency(r.selling_unit_price || 0)}</td>
                  <td class="right">${formatCurrency(r.total_cost || 0)}</td>
                  <td class="right">${formatCurrency(r.total_sale || 0)}</td>
                  <td class="right ${ (r.gain_loss || 0) >= 0 ? 'gain' : 'loss' }">${formatCurrency(r.gain_loss || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            Total cost: ${formatCurrency(totals.total_cost || 0)} — Total sale: ${formatCurrency(totals.total_sale || 0)} — Net: <span class="${(totals.total_gain_loss || 0) >= 0 ? 'gain' : 'loss'}">${formatCurrency(totals.total_gain_loss || 0)}</span>
          </div>
        </body>
      </html>
    `;
  };

  const handleGainPrintConfirm = (printerType = 'normal') => {
    const html = generatePrintableHtml(printerType);
    const w = window.open('', '_blank');
    if (!w) return alert('Please allow popups to print the report');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  if (!pinCheckDone) {
    return (
      <div className="gain-container">
        <div className="gain-loading">Checking access...</div>
      </div>
    );
  }

  if (pinRequired && !pinUnlocked) {
    return (
      <div className="gain-container">
        <div className="goal-pin-overlay">
          <div className="goal-pin-box">
            <div className="goal-pin-header">
              <FaLock className="goal-pin-icon" />
              <h2 className="goal-pin-title">Gain / Loss is protected</h2>
              <p className="goal-pin-desc">Enter the PIN to access Gain / Loss.</p>
            </div>
            <form onSubmit={handlePinSubmit} className="goal-pin-form">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                className="goal-pin-input"
                placeholder="Enter PIN"
                autoFocus
                autoComplete="off"
                maxLength={20}
                disabled={pinVerifying}
              />
              {pinError && <div className="goal-pin-error">{pinError}</div>}
              <button
                type="submit"
                className="goal-pin-submit"
                disabled={pinVerifying || !pinInput.trim()}
              >
                {pinVerifying ? 'Verifying...' : 'Unlock'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gain-container">
      <div className="gain-header">
        <h2 className="gain-title">Gain / Loss</h2>
        <div className="gain-controls">
          <div className="mode-switch">
            <button className={`mode-btn ${mode === 'daily' ? 'active' : ''}`} onClick={() => setMode('daily')}>Daily</button>
            <button className={`mode-btn ${mode === 'range' ? 'active' : ''}`} onClick={() => setMode('range')}>Date range</button>
          </div>

          <div className="date-inputs">
            {mode === 'daily' ? (
              <div className="control">
                <label><FaCalendarAlt /> Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="control">
                  <label>From</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="control">
                  <label>To</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </>
            )}

            <div className="actions">
              <button className="generate-btn" onClick={fetchGain} disabled={loading}>{loading ? 'Generating...' : 'Generate'}</button>
              <button className="gain-print-btn" onClick={() => setShowGainPrintModal(true)} disabled={!rows.length} title="Print gain/loss report"><FaPrint /> Print</button>
            </div>
          </div>
        </div>
      </div>

      <div className="gain-content">
        <div className="summary-row">
          <div className="summary-item">
            <div className="label">Total cost</div>
            <div className="value cost">{formatCurrency(totals.total_cost || 0)}</div>
          </div>
          <div className="summary-item">
            <div className="label">Total sales</div>
            <div className="value sale">{formatCurrency(totals.total_sale || 0)}</div>
          </div>
          <div className="summary-item">
            <div className="label">Net gain / loss</div>
            <div className={`value net ${ (totals.total_gain_loss || 0) >= 0 ? 'gain' : 'loss' }`}>{formatCurrency(totals.total_gain_loss || 0)}</div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="gain-table">
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '34%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th className="right">Pcs</th>
                <th className="right">Unit cost</th>
                <th className="right">Unit price</th>
                <th className="right">Total cost</th>
                <th className="right">Total sale</th>
                <th className="right">Gain / Loss</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty">No sales for the selected period</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id || `${r.name}-${Math.random()}`}>
                  <td>{r.date}</td>
                  <td>{r.name}</td>
                  <td className="right">{r.pcs}</td>
                  <td className="right">{formatCurrency(r.cost_unit_price || 0)}</td>
                  <td className="right">{formatCurrency(r.selling_unit_price || 0)}</td>
                  <td className="right">{formatCurrency(r.total_cost || 0)}</td>
                  <td className="right">{formatCurrency(r.total_sale || 0)}</td>
                  <td className={`right ${(r.gain_loss || 0) >= 0 ? 'gain' : 'loss'}`}>{formatCurrency(r.gain_loss || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showGainPrintModal && (
        <div className="receipt-print-modal-overlay" onClick={() => setShowGainPrintModal(false)}>
          <div className="receipt-print-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="receipt-print-modal-title">Select printer type</h3>
            <div className="receipt-print-options">
              <button type="button" className="receipt-print-option receipt-print-option-small" onClick={() => { handleGainPrintConfirm('small'); setShowGainPrintModal(false); }}>
                <span className="receipt-print-option-icon">🖨️</span>
                <span className="receipt-print-option-label">Small printer</span>
                <span className="receipt-print-option-desc">58mm thermal (mobile/Bluetooth)</span>
              </button>
              <button type="button" className="receipt-print-option receipt-print-option-normal" onClick={() => { handleGainPrintConfirm('normal'); setShowGainPrintModal(false); }}>
                <span className="receipt-print-option-icon">🖨️</span>
                <span className="receipt-print-option-label">Normal printer</span>
                <span className="receipt-print-option-desc">A4 / Letter — Save as PDF or print</span>
              </button>
            </div>
            <button type="button" className="receipt-print-cancel" onClick={() => setShowGainPrintModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gain;
