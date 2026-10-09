import React, { useState } from 'react';
import { Database, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Beaker, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@research.org');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.15), transparent 70%), #0b0f19',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Database size={28} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>
            Nexus Research
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
            Laboratory & Research Project Management System
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#fb7185',
              fontSize: '13px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="name@research.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600 }}
            disabled={loading}
          >
            {loading ? (
              'Verifying Credentials...'
            ) : (
              <>
                <span>Sign In to Platform</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '28px', paddingTop: '22px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <p
            style={{
              fontSize: '11.5px',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            Demo Accounts (Click to Fill)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '8px 4px', flexDirection: 'column', gap: '4px' }}
              onClick={() => handleQuickLogin('admin@research.org', 'Admin@123')}
            >
              <ShieldCheck size={14} style={{ color: '#c084fc' }} />
              <span>Admin</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '8px 4px', flexDirection: 'column', gap: '4px' }}
              onClick={() => handleQuickLogin('labmanager@research.org', 'Manager@123')}
            >
              <Beaker size={14} style={{ color: '#22d3ee' }} />
              <span>Lab Manager</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '8px 4px', flexDirection: 'column', gap: '4px' }}
              onClick={() => handleQuickLogin('aarav@research.org', 'Researcher@123')}
            >
              <UserCheck size={14} style={{ color: '#34d399' }} />
              <span>Researcher</span>
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '11.5px',
            color: 'var(--text-dim)',
          }}
        >
          Secured with Argon2id &bull; Oracle Database XE Backend
        </div>
      </div>
    </div>
  );
}
