import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaCheck, FaTrash, FaTimes } from 'react-icons/fa';
import { goalsAPI } from '../api';
import './Goal.css';

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
    fetchGoals();
  }, []);

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
          closeNotebook();
        } else {
          setError(res.message || 'Update failed');
        }
      } else {
        const res = await goalsAPI.create(form);
        if (res.success) {
          setGoals((prev) => [res.goal, ...prev]);
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
      } else {
        setError(res.message || 'Delete failed');
      }
    } catch (e) {
      setError('Failed to delete goal');
    }
  };

  const list = filteredGoals();

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
                  >
                    <FaTrash /> Delete permanently
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="goal-action-btn edit"
                      onClick={() => openEdit(goal)}
                    >
                      <FaEdit /> Edit
                    </button>
                    {goal.status === 'active' && (
                      <button
                        type="button"
                        className="goal-action-btn accomplish"
                        onClick={() => handleSetStatus(goal.id, 'accomplished')}
                      >
                        <FaCheck /> Accomplished
                      </button>
                    )}
                    {goal.status !== 'trashed' && (
                      <button
                        type="button"
                        className="goal-action-btn trash"
                        onClick={() => handleSetStatus(goal.id, 'trashed')}
                      >
                        <FaTrash /> Trash
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
    </div>
  );
};

export default Goal;
