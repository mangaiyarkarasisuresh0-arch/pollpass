import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ArrowRight, Zap, RefreshCw, Shield, BarChart3, Users, KeyRound } from 'lucide-react';

export default function HomePage({ navigate }) {
  const { isAuthenticated } = useAuth();
  const [shareCode, setShareCode] = useState('');

  const handleJoinPoll = (e) => {
    e.preventDefault();
    const cleanCode = shareCode.trim().toUpperCase();
    if (cleanCode) {
      navigate(`/poll/${cleanCode}`);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-pill">
          <Zap size={15} color="#818cf8" />
          <span>Real-Time Polling Engine • Redis Pub/Sub & WebSockets</span>
        </div>

        <h1 className="hero-title">
          Live Audience Polling with <br />
          <span className="gradient-text">Zero Page Refreshes</span>
        </h1>

        <p className="hero-subtitle">
          Create dynamic polls, distribute instantaneous share links, and watch audience votes stream in real-time across all screens powered by Go, MongoDB, and Redis.
        </p>

        <div className="hero-cta">
          {isAuthenticated ? (
            <button className="btn btn-primary" onClick={() => navigate('/create-poll')}>
              <span>Create a New Poll</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/signup')}>
              <span>Get Started Free</span>
              <ArrowRight size={18} />
            </button>
          )}

          <button className="btn btn-secondary" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
            <span>{isAuthenticated ? 'Open Dashboard' : 'Log In to Account'}</span>
          </button>
        </div>

        {/* Quick Join By Code Box */}
        <div style={{ maxWidth: '440px', margin: '2.5rem auto 0' }}>
          <form onSubmit={handleJoinPoll} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Enter 6-character Share Code (e.g. XQKX8A)"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.toUpperCase())}
              maxLength={10}
              style={{ textAlign: 'center', letterSpacing: '0.08em', fontWeight: 600 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!shareCode.trim()}>
              Join
            </button>
          </form>
        </div>
      </section>

      {/* Feature Architecture Cards */}
      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon-box">
            <Zap size={24} />
          </div>
          <h3>Redis Sub-Millisecond Speed</h3>
          <p>
            Redis atomic <code>HINCRBY</code> operations handle vote counting instantaneously in memory, ensuring fast response times even under heavy concurrent traffic.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box">
            <RefreshCw size={24} />
          </div>
          <h3>Live Pub/Sub & WebSockets</h3>
          <p>
            Redis broadcasts <code>VOTE_UPDATED</code> events to Go server WebSocket rooms, pushing live vote counts to every connected browser without any page refresh.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box">
            <Shield size={24} />
          </div>
          <h3>Strict Backend Validation</h3>
          <p>
            Go and Gin enforce server-side validation: duplicate prevention via IP & client fingerprinting, active poll verification, and Bcrypt + JWT authentication.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box">
            <BarChart3 size={24} />
          </div>
          <h3>Interactive Live Charts</h3>
          <p>
            Fluid animations, auto-calculated percentage bars, and leader indicators give audiences and creators immediate visual clarity on voting trends.
          </p>
        </div>
      </section>
    </div>
  );
}
