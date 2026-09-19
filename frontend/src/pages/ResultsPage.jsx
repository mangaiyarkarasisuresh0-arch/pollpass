import React, { useState } from 'react';
import { useLivePoll } from '../hooks/useLivePoll';
import { useToast } from '../components/Toast';
import LiveChart from '../components/LiveChart';
import { Share2, Check, ExternalLink, RefreshCw, AlertTriangle, Radio, Wifi, WifiOff } from 'lucide-react';

export default function ResultsPage({ pollIdOrCode, navigate }) {
  const { addToast } = useToast();
  const { poll, results, totalVotes, isExpired, loading, error, wsStatus, refetch } = useLivePoll(pollIdOrCode);

  const [copied, setCopied] = useState(false);

  const shareUrl = poll ? `${window.location.origin}/poll/${poll.share_code}` : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    addToast('Public voting link copied! Open in another browser or incognito to test live updates.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="content-narrow" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem', color: 'var(--accent-primary)' }} />
        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Connecting to live poll stream...</div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="content-narrow" style={{ paddingTop: '2.5rem' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Poll Not Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {error || 'Unable to find the requested poll.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const isClosed = poll.status !== 'active';

  return (
    <div className="content-narrow" style={{ paddingTop: '1rem' }}>
      {/* Real-Time Live Status Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="live-indicator">
          <div className="live-pulse" />
          <span>
            {wsStatus === 'connected'
              ? 'Live Stream Active (Redis Pub/Sub)'
              : wsStatus === 'connecting'
              ? 'Connecting to WebSocket...'
              : 'Reconnecting Live Stream...'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${isClosed ? 'badge-closed' : isExpired ? 'badge-expired' : 'badge-active'}`}>
            {isClosed ? 'Closed' : isExpired ? 'Expired' : 'Active'}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={refetch}
            title="Manual sync from MongoDB/Redis"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Results Glass Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
            Share Code: <strong style={{ color: 'var(--text-muted)' }}>{poll.share_code}</strong>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.25 }}>
            {poll.question}
          </h1>
        </div>

        {/* Stats Pill */}
        <div className="stats-banner">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Total Responses
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Audience Screen
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#34d399' }}>
              Auto-updating via WebSocket
            </div>
          </div>
        </div>

        {/* The Live Interactive Chart */}
        <LiveChart options={poll.options} results={results} totalVotes={totalVotes} />

        {/* Quick actions inside card */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn btn-secondary" onClick={handleCopyLink} style={{ flex: 1 }}>
            {copied ? <Check size={16} color="#10b981" /> : <Share2 size={16} />}
            <span>{copied ? 'Copied Public Link!' : 'Copy Voting Link'}</span>
          </button>

          {!isClosed && !isExpired && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/poll/${poll.share_code}`)}
              style={{ flex: 1 }}
            >
              <Radio size={16} />
              <span>Cast a Vote</span>
            </button>
          )}
        </div>
      </div>

      {/* Share / Test Instructions Card */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Share2 size={16} color="var(--accent-primary)" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Test Multi-Browser Real-Time Updates</h4>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
          Copy this link and open it in an incognito window or another browser. When someone casts a vote, this screen updates instantaneously without refreshing the page!
        </p>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="form-input"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
          />
          <button className="btn btn-sm btn-primary" onClick={handleCopyLink}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
