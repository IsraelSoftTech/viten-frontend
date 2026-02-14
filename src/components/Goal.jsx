import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaCheck, FaTrash, FaTimes, FaLock } from 'react-icons/fa';
import { goalsAPI, configurationAPI } from '../api';
import SuccessMessage from './SuccessMessage';
import './Goal.css';

const GOAL_PIN_SESSION_KEY = 'goalPinUnlocked';

const TAB_ALL = 'all';
const TAB_ACTIVE = 'active';
const TAB_ACCOMPLISHED = 'accomplished';
const TAB_TRASHED = 'trashed';

const todayStr = () => new Date().toISOString().slice(0, 10);

const Goal = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    date: todayStr(),
    title: '',
    desired_completion_date: '',
    content: ''
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [pinCheckDone, setPinCheckDone] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);

  const fetchGoals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await goalsAPI.getAll();
      if (res.success) {
        setGoals(res.goals || []);
      } else {
        setError(res.message || 'Failed to load goals');
      }
    } catch (e) {
      setError('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkPin = async () => {
      try {
        const res = await configurationAPI.getGoalPinStatus();
        if (res.success && res.hasPin) {
          setPinRequired(true);
          if (sessionStorage.getItem(GOAL_PIN_SESSION_KEY) === '1') {
            setPinUnlocked(true);
            fetchGoals();
          }
        } else {
          setPinUnlocked(true);
          fetchGoals();
        }
      } catch (e) {
        setPinUnlocked(true);
        fetchGoals();
      } finally {
        setPinCheckDone(true);
      }
    };
    checkPin();
    return () => {
      sessionStorage.removeItem(GOAL_PIN_SESSION_KEY);
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
        sessionStorage.setItem(GOAL_PIN_SESSION_KEY, '1');
        setPinUnlocked(true);
        setPinInput('');
        fetchGoals();
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

  const filteredGoals = () => {
    if (activeTab === TAB_ALL) return goals;
    return goals.filter((g) => g.status === activeTab);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({
      date: todayStr(),
      title: '',
      desired_completion_date: '',
      content: ''
    });
    setNotebookOpen(true);
  };

  const openEdit = (goal) => {
    setEditingId(goal.id);
    setForm({
      date: goal.date || todayStr(),
      title: goal.title || '',
      desired_completion_date: goal.desired_completion_date || '',
      content: goal.content || ''
    });
    setNotebookOpen(true);
  };

  const closeNotebook = () => {
    setNotebookOpen(false);
    setEditingId(null);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const res = await goalsAPI.update(editingId, form);
        if (res.success) {
          setGoals((prev) => prev.map((g) => (g.id === editingId ? res.goal : g)));
          setSuccessMessage('Goal updated successfully!');
          closeNotebook();
        } else {
          setError(res.message || 'Update failed');
        }
      } else {
        const res = await goalsAPI.create(form);
        if (res.success) {
          setGoals((prev) => [res.goal, ...prev]);
          setSuccessMessage('Goal created successfully!');
          closeNotebook();
        } else {
          setError(res.message || 'Create failed');
        }
      }
    } catch (e) {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleSetStatus = async (id, status) => {
    try {
      const res = await goalsAPI.setStatus(id, status);
      if (res.success) {
        setGoals((prev) => prev.map((g) => (g.id === id ? res.goal : g)));
        setSuccessMessage(status === 'accomplished' ? 'Goal marked as accomplished!' : 'Goal moved to trash.');
      }
    } catch (e) {
      setError('Failed to update goal');
    }
  };

  const handleDeletePermanent = async (id) => {
    if (!window.confirm('Permanently delete this goal?')) return;
    try {
      const res = await goalsAPI.delete(id);
      if (res.success) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
        setSuccessMessage('Goal deleted permanently.');
      } else {
        setError(res.message || 'Delete failed');
      }
    } catch (e) {
      setError('Failed to delete goal');
    }
  };

  const list = filteredGoals();

  if (!pinCheckDone) {
    return (
      <div className="goal-container">
        <div className="goal-loading">Checking access...</div>
      </div>
    );
  }

  if (pinRequired && !pinUnlocked) {
    return (
      <div className="goal-container">
        <div className="goal-pin-overlay">
          <div className="goal-pin-box">
            <div className="goal-pin-header">
              <FaLock className="goal-pin-icon" />
              <h2 className="goal-pin-title">Goal is protected</h2>
              <p className="goal-pin-desc">Enter the PIN to access the Goal component.</p>
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
    <div className="goal-container">
      <div className="goal-header">
        <h1 className="goal-title">Goal</h1>
        <button type="button" className="new-goal-btn" onClick={openNew}>
          <FaPlus className="btn-icon" />
          New
        </button>
      </div>

      {error && <div className="goal-error">{error}</div>}

      <div className="goal-tabs">
        <button
          type="button"
          className={`goal-tab ${activeTab === TAB_ALL ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_ALL)}
        >
          All
        </button>
        <button
          type="button"
          className={`goal-tab ${activeTab === TAB_ACTIVE ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_ACTIVE)}
        >
          Active
        </button>
        <button
          type="button"
          className={`goal-tab ${activeTab === TAB_ACCOMPLISHED ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_ACCOMPLISHED)}
        >
          Accomplished
        </button>
        <button
          type="button"
          className={`goal-tab ${activeTab === TAB_TRASHED ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_TRASHED)}
        >
          Trashed
        </button>
      </div>

      {loading ? (
        <div className="goal-loading">Loading goals...</div>
      ) : list.length === 0 ? (
        <div className="goal-empty">
          {activeTab === TAB_ALL
            ? 'No goals yet. Click New to add one.'
            : `No ${activeTab} goals.`}
        </div>
      ) : (
        <div className="goal-list">
          {list.map((goal) => (
            <div
              key={goal.id}
              className={`goal-card ${goal.status}`}
            >
              <div className="goal-card-header">
                <h2 className="goal-card-title">{goal.title}</h2>
                <span className={`goal-badge ${goal.status}`}>{goal.status}</span>
              </div>
              <div className="goal-card-meta">
                <span>Date: {goal.date}</span>
                {goal.desired_completion_date && (
                  <span>Complete by: {goal.desired_completion_date}</span>
                )}
              </div>
              {goal.content && (
                <div className="goal-card-content">{goal.content}</div>
              )}
              <div className="goal-card-actions">
                {goal.status === 'trashed' ? (
                  <button
                    type="button"
                    className="goal-action-btn delete-permanent"
                    onClick={() => handleDeletePermanent(goal.id)}
                    aria-label="Delete permanently"
                  >
                    <FaTrash />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="goal-action-btn edit"
                      onClick={() => openEdit(goal)}
                      aria-label="Edit"
                    >
                      <FaEdit />
                    </button>
                    {goal.status === 'active' && (
                      <button
                        type="button"
                        className="goal-action-btn accomplish"
                        onClick={() => handleSetStatus(goal.id, 'accomplished')}
                        aria-label="Mark as accomplished"
                      >
                        <FaCheck />
                      </button>
                    )}
                    {goal.status !== 'trashed' && (
                      <button
                        type="button"
                        className="goal-action-btn trash"
                        onClick={() => handleSetStatus(goal.id, 'trashed')}
                        aria-label="Move to trash"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notebook modal */}
      {notebookOpen && (
        <div
          className="goal-notebook-overlay"
          onClick={(e) => e.target === e.currentTarget && closeNotebook()}
        >
          <div className="goal-notebook">
            <div className="goal-notebook-inner">
              <h2 className="notebook-form-title">
                {editingId ? 'Edit goal' : 'New goal'}
              </h2>
              <div className="notebook-fields">
                <div className="notebook-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="notebook-field">
                  <label>Title of goal</label>
                  <input
                    type="text"
                    placeholder="Enter goal title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="notebook-field">
                  <label>Desired completion date</label>
                  <input
                    type="date"
                    value={form.desired_completion_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, desired_completion_date: e.target.value }))
                    }
                  />
                </div>
                <div className="notebook-field">
                  <label>Goal (notebook)</label>
                  <div className="notebook-lines-wrap">
                    <textarea
                      placeholder="Write your goal here..."
                      value={form.content}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                      rows={9}
                    />
                  </div>
                </div>
              </div>
              <div className="notebook-form-actions">
                <button
                  type="button"
                  className="notebook-cancel-btn"
                  onClick={closeNotebook}
                  disabled={saving}
                >
                  <FaTimes /> Cancel
                </button>
                <button
                  type="button"
                  className="notebook-save-btn"
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <SuccessMessage
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}
    </div>
  );
};

export default Goal;
