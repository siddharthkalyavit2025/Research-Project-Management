import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  Building,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { equipmentApi, labsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import { Modal, ConfirmDialog } from '../components/common/Modal';

export default function EquipmentPage({ addToast }) {
  const { canManage, isAdmin } = useAuth();
  const [equipmentList, setEquipmentList] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [labFilter, setLabFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEq, setActiveEq] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eqToDelete, setEqToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    equipment_id: '',
    equipment_name: '',
    equipment_type: '',
    purchase_date: '',
    equipment_cost: 0,
    availability_status: 'Available',
    lab_code: '',
  });

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const data = await equipmentApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        lab_code: labFilter || undefined,
      });
      setEquipmentList(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch equipment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLabs = async () => {
    try {
      const data = await labsApi.list({});
      setLabs(data);
      if (data.length > 0 && !formData.lab_code) {
        setFormData((prev) => ({ ...prev, lab_code: data[0].lab_code }));
      }
    } catch (err) {
      console.warn('Failed to load labs:', err);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, [search, statusFilter, labFilter]);

  useEffect(() => {
    loadLabs();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveEq(null);
    setFormData({
      equipment_id: '',
      equipment_name: '',
      equipment_type: 'Analytical Instrument',
      purchase_date: new Date().toISOString().split('T')[0],
      equipment_cost: 500000,
      availability_status: 'Available',
      lab_code: labs[0]?.lab_code || '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (eq) => {
    setIsEditing(true);
    setActiveEq(eq);
    setFormData({
      equipment_id: eq.equipment_id,
      equipment_name: eq.equipment_name,
      equipment_type: eq.equipment_type || '',
      purchase_date: eq.purchase_date || '',
      equipment_cost: eq.equipment_cost,
      availability_status: eq.availability_status || 'Available',
      lab_code: eq.lab_code,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        equipment_name: formData.equipment_name,
        equipment_type: formData.equipment_type || undefined,
        purchase_date: formData.purchase_date || undefined,
        equipment_cost: parseFloat(formData.equipment_cost),
        availability_status: formData.availability_status,
        lab_code: parseInt(formData.lab_code, 10),
      };

      if (isEditing) {
        await equipmentApi.update(activeEq.equipment_id, payload);
        addToast('Equipment updated successfully', 'success');
      } else {
        if (formData.equipment_id) {
          payload.equipment_id = parseInt(formData.equipment_id, 10);
        }
        await equipmentApi.create(payload);
        addToast('Equipment registered successfully', 'success');
      }
      setModalOpen(false);
      loadEquipment();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eqToDelete) return;
    setActionLoading(true);
    try {
      await equipmentApi.delete(eqToDelete.equipment_id);
      addToast(`Equipment '${eqToDelete.equipment_name}' deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadEquipment();
    } catch (err) {
      addToast(err.message || 'Could not delete equipment', 'error');
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
            placeholder="Search equipment name, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '170px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="In Use">In Use</option>
            <option value="Under Maintenance">Under Maintenance</option>
          </select>

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
          >
            <option value="">All Laboratories</option>
            {labs.map((l) => (
              <option key={l.lab_code} value={l.lab_code}>
                {l.lab_name}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary" onClick={loadEquipment} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Register Equipment</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Equipment Name</th>
              <th>Type / Category</th>
              <th>Acquisition Cost</th>
              <th>Purchase Date</th>
              <th>Status</th>
              <th>Assigned Lab</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading equipment from Oracle...
                </td>
              </tr>
            ) : equipmentList.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No equipment records found.
                </td>
              </tr>
            ) : (
              equipmentList.map((eq) => (
                <tr key={eq.equipment_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{eq.equipment_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{eq.equipment_name}</td>
                  <td>
                    <span className="badge badge-secondary">{eq.equipment_type || 'General'}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {formatCurrency(eq.equipment_cost)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    {eq.purchase_date || '—'}
                  </td>
                  <td>
                    <StatusBadge status={eq.availability_status} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{eq.lab_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{eq.lab_location}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {canManage && (
                        <button className="btn-icon" onClick={() => handleOpenEdit(eq)} title="Edit Equipment">
                          <Edit2 size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setEqToDelete(eq);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Equipment"
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
        title={isEditing ? `Edit Equipment #${activeEq?.equipment_id}` : 'Register Lab Equipment'}
      >
        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Equipment ID (Optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 706"
                value={formData.equipment_id}
                onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Equipment Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Transmission Electron Microscope"
              value={formData.equipment_name}
              onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Equipment Type / Category</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Imaging & Microscopy"
              value={formData.equipment_type}
              onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Purchase Cost ($) *</label>
              <input
                type="number"
                required
                min="0"
                step="1000"
                className="form-input"
                value={formData.equipment_cost}
                onChange={(e) => setFormData({ ...formData, equipment_cost: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Assigned Laboratory *</label>
              <select
                required
                className="form-select"
                value={formData.lab_code}
                onChange={(e) => setFormData({ ...formData, lab_code: e.target.value })}
              >
                {labs.map((l) => (
                  <option key={l.lab_code} value={l.lab_code}>
                    {l.lab_name} ({l.discipline})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Availability Status</label>
              <select
                className="form-select"
                value={formData.availability_status}
                onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
              >
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : isEditing ? 'Update Equipment' : 'Register Equipment'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Equipment"
        message={`Delete '${eqToDelete?.equipment_name}'?`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
