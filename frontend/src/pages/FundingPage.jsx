import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  Award,
} from 'lucide-react';
import { fundingApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { DetailDrawer } from '../components/common/DetailDrawer';

export default function FundingPage({ addToast }) {
  const { canManage, isAdmin } = useAuth();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSource, setActiveSource] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    funding_source_id: '',
    funding_source_name: '',
    funding_type: 'Government',
    contact_email: '',
    contact_number: '',
  });

  const loadSources = async () => {
    setLoading(true);
    try {
      const data = await fundingApi.list({
        search: search || undefined,
        funding_type: typeFilter || undefined,
      });
      setSources(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch funding sources', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [search, typeFilter]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveSource(null);
    setFormData({
      funding_source_id: '',
      funding_source_name: '',
      funding_type: 'Government',
      contact_email: '',
      contact_number: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (src) => {
    setIsEditing(true);
    setActiveSource(src);
    setFormData({
      funding_source_id: src.funding_source_id,
      funding_source_name: src.funding_source_name,
      funding_type: src.funding_type,
      contact_email: src.contact_email || '',
      contact_number: src.contact_number || '',
    });
    setModalOpen(true);
  };

  const handleOpenDetail = async (src) => {
    try {
      const full = await fundingApi.get(src.funding_source_id);
      setDetailData(full);
      setDrawerOpen(true);
    } catch (err) {
      addToast(err.message || 'Failed to load details', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        funding_source_name: formData.funding_source_name,
        funding_type: formData.funding_type,
        contact_email: formData.contact_email || undefined,
        contact_number: formData.contact_number || undefined,
      };

      if (isEditing) {
        await fundingApi.update(activeSource.funding_source_id, payload);
        addToast('Funding source updated successfully', 'success');
      } else {
        if (formData.funding_source_id) {
          payload.funding_source_id = parseInt(formData.funding_source_id, 10);
        }
        await fundingApi.create(payload);
        addToast('Funding source created successfully', 'success');
      }
      setModalOpen(false);
      loadSources();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sourceToDelete) return;
    setActionLoading(true);
    try {
      await fundingApi.delete(sourceToDelete.funding_source_id);
      addToast(`Funding source '${sourceToDelete.funding_source_name}' deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadSources();
    } catch (err) {
      addToast(err.message || 'Could not delete funding source', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
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
            placeholder="Search sponsor name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '170px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Funding Types</option>
            <option value="Government">Government</option>
            <option value="International">International</option>
            <option value="Private">Private</option>
            <option value="Non-Profit">Non-Profit</option>
          </select>

          <button className="btn btn-secondary" onClick={loadSources} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Add Funding Source</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Funding Organization</th>
              <th>Funding Type</th>
              <th>Contact Email</th>
              <th>Contact Phone</th>
              <th>Grants Awarded</th>
              <th>Total Funded</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading funding sources...
                </td>
              </tr>
            ) : sources.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No funding sources found.
                </td>
              </tr>
            ) : (
              sources.map((src) => (
                <tr key={src.funding_source_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{src.funding_source_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{src.funding_source_name}</td>
                  <td>
                    <span className="badge badge-info">{src.funding_type}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{src.contact_email || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                    {src.contact_number || '—'}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{src.grants_count}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {formatCurrency(src.total_funded_amount)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button className="btn-icon" onClick={() => handleOpenDetail(src)} title="View Details">
                        <Eye size={15} />
                      </button>
                      {canManage && (
                        <button className="btn-icon" onClick={() => handleOpenEdit(src)} title="Edit">
                          <Edit2 size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setSourceToDelete(src);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete"
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
        title={isEditing ? `Edit Funding Source #${activeSource?.funding_source_id}` : 'Add Funding Source'}
      >
        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Funding Source ID (Optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 506"
                value={formData.funding_source_id}
                onChange={(e) => setFormData({ ...formData, funding_source_id: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Funding Source Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. European Research Foundation"
              value={formData.funding_source_name}
              onChange={(e) => setFormData({ ...formData, funding_source_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Funding Type *</label>
            <select
              required
              className="form-select"
              value={formData.funding_type}
              onChange={(e) => setFormData({ ...formData, funding_type: e.target.value })}
            >
              <option value="Government">Government</option>
              <option value="International">International</option>
              <option value="Private">Private</option>
              <option value="Non-Profit">Non-Profit</option>
              <option value="University">University</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="grants@sponsor.org"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-input"
                placeholder="9000000099"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : isEditing ? 'Update Source' : 'Save Source'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Drawer */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={detailData?.funding_source_name || 'Funding Source Details'}
        subtitle={`ID: #${detailData?.funding_source_id} • Type: ${detailData?.funding_type}`}
      >
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Total Sponsored
                </span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {formatCurrency(detailData.total_funded_amount)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Grants Awarded
                </span>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{detailData.grants_count}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Contact Email
                </span>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{detailData.contact_email || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Contact Phone
                </span>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{detailData.contact_number || 'N/A'}</div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Award size={16} style={{ color: 'var(--accent-amber)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Grants Provided by this Sponsor</h3>
              </div>
              {detailData.grants?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No grants recorded from this source yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.grants?.map((g) => (
                    <div
                      key={g.grant_id}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{g.grant_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Project: {g.project_name} &bull; Date: {g.grant_date}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>
                        {formatCurrency(g.grant_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Funding Source"
        message={`Delete '${sourceToDelete?.funding_source_name}'?`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
