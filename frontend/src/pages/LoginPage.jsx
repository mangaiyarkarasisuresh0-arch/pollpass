import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { LogIn, Sparkles } from 'lucide-react';

export default function LoginPage({ navigate }) {
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
      addToast('Welcome back! Successfully logged in.', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('alice@example.com');
    setPassword('password123');
  };

  return (
    <div className="content-narrow" style={{ paddingTop: '2.5rem' }}>
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <LogIn size={24} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Log in to manage your active polls and review audience analytics
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.9rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>

        {/* Quick Demo Helper */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={fillDemoAccount}
            style={{ fontSize: '0.8rem' }}
          >
            <Sparkles size={14} color="#a855f7" />
            <span>Fill Demo Credentials</span>
          </button>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Don't have an account yet?{' '}
          <span
            onClick={() => navigate('/signup')}
            style={{ color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer' }}
          >
            Sign up here
          </span>
        </div>
      </div>
    </div>
  );
}
