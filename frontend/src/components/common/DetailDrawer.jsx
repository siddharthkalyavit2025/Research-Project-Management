import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export function DetailDrawer({ isOpen, onClose, title, subtitle, children }) {
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
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{title}</h2>
            {subtitle && (
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = Info;
        if (toast.type === 'success') Icon = CheckCircle;
        if (toast.type === 'error') Icon = AlertCircle;
        if (toast.type === 'warning') Icon = AlertTriangle;

        return (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <Icon size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {toast.title && <strong style={{ display: 'block', fontSize: '13px' }}>{toast.title}</strong>}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
