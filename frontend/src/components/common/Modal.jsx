import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 640 }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Delete',
  isDestructive = true,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={460}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
        {message}
      </p>
      <div className="modal-footer" style={{ borderTop: 'none', margin: 0, padding: 0 }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}

export default Modal;
