import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  Coins,
  Briefcase,
  Calendar,
} from 'lucide-react';
import { grantsApi, fundingApi, projectsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal, ConfirmDialog } from '../components/common/Modal';

export default function GrantsPage({ addToast }) {
  const { canManage, isAdmin } = useAuth();
  const [grants, setGrants] = useState([]);
  const [sources, setSources] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeGrant, setActiveGrant] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [grantToDelete, setGrantToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    grant_id: '',
    grant_name: '',
    grant_amount: 1000000,
    grant_date: '',
    funding_source_id: '',
    project_id: '',
  });

  const loadGrants = async () => {
    setLoading(true);
    try {
      const data = await grantsApi.list({ search: search || undefined });
      setGrants(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch grants', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [srcList, projList] = await Promise.all([
        fundingApi.list({}),
        projectsApi.list({}),
      ]);
      setSources(srcList);
      setProjects(projList);
      if (srcList.length > 0 && projList.length > 0) {
        setFormData((prev) => ({
          ...prev,
          funding_source_id: srcList[0].funding_source_id,
          project_id: projList[0].project_id,
        }));
      }
    } catch (err) {
      console.warn('Failed to load dependency dropdowns:', err);
    }
  };

  useEffect(() => {
    loadGrants();
  }, [search]);

  useEffect(() => {
    loadDependencies();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveGrant(null);
    setFormData({
      grant_id: '',
      grant_name: '',
      grant_amount: 1500000,
      grant_date: new Date().toISOString().split('T')[0],
      funding_source_id: sources[0]?.funding_source_id || '',
      project_id: projects[0]?.project_id || '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (g) => {
    setIsEditing(true);
    setActiveGrant(g);
    setFormData({
      grant_id: g.grant_id,
      grant_name: g.grant_name,
      grant_amount: g.grant_amount,
      grant_date: g.grant_date,
      funding_source_id: g.funding_source_id,
      project_id: g.project_id,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        grant_name: formData.grant_name,
        grant_amount: parseFloat(formData.grant_amount),
        grant_date: formData.grant_date,
        funding_source_id: parseInt(formData.funding_source_id, 10),
        project_id: parseInt(formData.project_id, 10),
      };

      if (isEditing) {
        await grantsApi.update(activeGrant.grant_id, payload);
        addToast('Grant updated successfully', 'success');
      } else {
        if (formData.grant_id) {
          payload.grant_id = parseInt(formData.grant_id, 10);
        }
        await grantsApi.create(payload);
        addToast('Grant created successfully', 'success');
      }
      setModalOpen(false);
      loadGrants();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!grantToDelete) return;
    setActionLoading(true);
    try {
      await grantsApi.delete(grantToDelete.grant_id);
      addToast(`Grant '${grantToDelete.grant_name}' deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadGrants();
    } catch (err) {
      addToast(err.message || 'Could not delete grant', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search grant, sponsor, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadGrants} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Award New Grant</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Grant Name</th>
              <th>Amount Awarded</th>
              <th>Grant Date</th>
              <th>Funding Source</th>
              <th>Beneficiary Project</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading grants...
                </td>
              </tr>
            ) : grants.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No grants recorded.
                </td>
              </tr>
            ) : (
              grants.map((g) => (
                <tr key={g.grant_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{g.grant_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{g.grant_name}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {formatCurrency(g.grant_amount)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    {g.grant_date}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{g.funding_source_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{g.funding_type}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{g.project_name}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {canManage && (
                        <button className="btn-icon" onClick={() => handleOpenEdit(g)} title="Edit Grant">
                          <Edit2 size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setGrantToDelete(g);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Grant"
                          style={{ color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
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
        title={isEditing ? `Edit Grant #${activeGrant?.grant_id}` : 'Award New Grant'}
      >
        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Grant ID (Optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 606"
                value={formData.grant_id}
                onChange={(e) => setFormData({ ...formData, grant_id: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Grant Title / Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Clean Energy Innovation Grant"
              value={formData.grant_name}
              onChange={(e) => setFormData({ ...formData, grant_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Grant Amount ($) *</label>
              <input
                type="number"
                required
                min="1"
                step="5000"
                className="form-input"
                value={formData.grant_amount}
                onChange={(e) => setFormData({ ...formData, grant_amount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Award Date *</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.grant_date}
                onChange={(e) => setFormData({ ...formData, grant_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Funding Source / Sponsor *</label>
            <select
              required
              className="form-select"
              value={formData.funding_source_id}
              onChange={(e) => setFormData({ ...formData, funding_source_id: e.target.value })}
            >
              {sources.map((s) => (
                <option key={s.funding_source_id} value={s.funding_source_id}>
                  {s.funding_source_name} ({s.funding_type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Beneficiary Research Project *</label>
            <select
              required
              className="form-select"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  #{p.project_id} - {p.project_name} ({p.lab_name})
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : isEditing ? 'Update Grant' : 'Award Grant'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Grant"
        message={`Delete '${grantToDelete?.grant_name}'?`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
