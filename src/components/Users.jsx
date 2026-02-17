import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import { userAPI } from '../api';
import SuccessMessage from './SuccessMessage';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await userAPI.getAllUsers();
      if (response.success) {
        setUsers(response.users || []);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (error) {
      setError('An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setEditForm({
      username: user.username,
      fullName: user.full_name,
      phone: user.phone || '',
      email: user.email,
      password: ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (userId) => {
    setError('');
    try {
      const response = await userAPI.updateUser(userId, {
        username: editForm.username,
        fullName: editForm.fullName,
        phone: editForm.phone,
        email: editForm.email,
        ...(editForm.password && { password: editForm.password })
      });

      if (response.success) {
        setEditingId(null);
        setEditForm({});
        setSuccessMessage('User updated successfully!');
        fetchUsers(); // Refresh the list
      } else {
        setError(response.message || 'Failed to update user');
      }
    } catch (error) {
      setError('An error occurred while updating user');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setError('');
    try {
      const response = await userAPI.deleteUser(userId);
      if (response.success) {
        setSuccessMessage('User deleted successfully!');
        fetchUsers(); // Refresh the list
      } else {
        setError(response.message || 'Failed to delete user');
      }
    } catch (error) {
      setError('An error occurred while deleting user');
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="users-container">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
      <div className="users-header">
        <h1 className="users-title">Users Management</h1>
        <button className="refresh-button" onClick={fetchUsers}>
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-message">Loading users...</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-users">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      {editingId === user.id ? (
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          className="edit-input"
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    <td>
                      {editingId === user.id ? (
                        <input
                          type="text"
                          value={editForm.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className="edit-input"
                        />
                      ) : (
                        user.full_name
                      )}
                    </td>
                    <td>
                      {editingId === user.id ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="edit-input"
                        />
                      ) : (
                        user.email
                      )}
                    </td>
                    <td>
                      {editingId === user.id ? (
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="edit-input"
                        />
                      ) : (
                        user.phone || 'N/A'
                      )}
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      {editingId === user.id ? (
                        <div className="action-buttons">
                          <button
                            className="action-btn save-btn"
                            onClick={() => handleSaveEdit(user.id)}
                            title="Save"
                          >
                            <FaSave />
                          </button>
                          <button
                            className="action-btn cancel-btn"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : user.username !== 'admin1234' ? (
                        <div className="action-buttons">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit(user)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(user.id)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <div className="password-edit-note">
          <p>Leave password field empty to keep current password. Enter new password to change it.</p>
          <input
            type="password"
            placeholder="New Password (optional)"
            value={editForm.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className="password-edit-input"
          />
        </div>
      )}
    </div>
  );
};

export default Users;
