import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  Shield,
  UserCheck,
  KeyRound,
  Lock,
} from 'lucide-react';
import { usersApi, researchersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/common/StatusBadge';
import { Modal, ConfirmDialog } from '../components/common/Modal';

export default function UsersPage({ addToast }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [researchers, setResearchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'Researcher',
    is_active: 1,
    researcher_id: '',
    password: '',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list({ search: search || undefined });
      setUsers(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadResearchers = async () => {
    try {
      const data = await researchersApi.list({});
      setResearchers(data);
    } catch (err) {
      console.warn('Failed to load researchers for linking:', err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  useEffect(() => {
    loadResearchers();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveUser(null);
    setFormData({
      email: '',
      full_name: '',
      role: 'Researcher',
      is_active: 1,
      researcher_id: '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setIsEditing(true);
    setActiveUser(u);
    setFormData({
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      is_active: u.is_active,
      researcher_id: u.researcher_id || '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (isEditing) {
        const payload = {
          full_name: formData.full_name,
          role: formData.role,
          is_active: parseInt(formData.is_active, 10),
          researcher_id: formData.researcher_id ? parseInt(formData.researcher_id, 10) : 0,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await usersApi.update(activeUser.user_id, payload);
        addToast('User account updated successfully', 'success');
      } else {
        if (!formData.password) {
          throw new Error('Password is required for new user account');
        }
        const payload = {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: parseInt(formData.is_active, 10),
          researcher_id: formData.researcher_id ? parseInt(formData.researcher_id, 10) : null,
          password: formData.password,
        };
        await usersApi.create(payload);
        addToast('User created successfully with Argon2id hash', 'success');
      }
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.user_id === currentUser?.user_id) {
      addToast('Cannot delete your own active administrator account', 'error');
      setDeleteConfirmOpen(false);
      return;
    }
    setActionLoading(true);
    try {
      await usersApi.delete(userToDelete.user_id);
      addToast(`User '${userToDelete.email}' deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Could not delete user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search email, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadUsers} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>Create Application User</span>
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Full Name</th>
              <th>Email Address</th>
              <th>Assigned RBAC Role</th>
              <th>Status</th>
              <th>Linked Researcher Profile</th>
              <th>Created At</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading accounts from Oracle...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No user accounts found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.user_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{u.user_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td>
                    {u.is_active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">Deactivated</span>
                    )}
                  </td>
                  <td>
                    {u.researcher_name ? (
                      <span style={{ fontSize: '12.5px', color: 'var(--accent-cyan)' }}>
                        {u.researcher_name} (#{u.researcher_id})
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Not Linked</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {u.created_at ? u.created_at.split('T')[0] : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button className="btn-icon" onClick={() => handleOpenEdit(u)} title="Edit User">
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          setUserToDelete(u);
                          setDeleteConfirmOpen(true);
                        }}
                        title="Delete User"
                        style={{ color: 'var(--accent-rose)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit User #${activeUser?.user_id}` : 'Create Application User'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Dr. Maya Angelou"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              disabled={isEditing}
              className="form-input"
              placeholder="user@research.org"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">RBAC Role *</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="Admin">Admin</option>
                <option value="Lab Manager">Lab Manager</option>
                <option value="Researcher">Researcher</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select
                className="form-select"
                value={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
              >
                <option value={1}>Active</option>
                <option value={0}>Deactivated</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Link to Researcher Profile (Optional)</label>
            <select
              className="form-select"
              value={formData.researcher_id}
              onChange={(e) => setFormData({ ...formData, researcher_id: e.target.value })}
            >
              <option value="">None (Independent Account)</option>
              {researchers.map((r) => (
                <option key={r.researcher_id} value={r.researcher_id}>
                  #{r.researcher_id} - {r.researcher_name} ({r.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {isEditing ? 'New Password (Leave blank to keep current)' : 'Password (Argon2id) *'}
            </label>
            <input
              type="password"
              required={!isEditing}
              className="form-input"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete User Account"
        message={`Delete user account for '${userToDelete?.email}'?`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
