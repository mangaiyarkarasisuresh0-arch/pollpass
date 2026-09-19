import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import PollCard from '../components/PollCard';
import { PlusCircle, BarChart3, Users, CheckCircle, RefreshCw } from 'lucide-react';

export default function DashboardPage({ navigate }) {
  const { addToast } = useToast();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'closed'

  const fetchPolls = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.polls.getMyPolls();
      setPolls(data.polls || []);
    } catch (err) {
      addToast(err.message || 'Failed to fetch your polls', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Aggregate stats
  const totalPolls = polls.length;
  const totalVotes = polls.reduce((sum, p) => sum + (p.total_votes || 0), 0);
  const activePolls = polls.filter((p) => p.status === 'active' && !p.is_expired).length;

  const filteredPolls = polls.filter((p) => {
    if (filter === 'active') return p.status === 'active' && !p.is_expired;
    if (filter === 'closed') return p.status === 'closed' || p.is_expired;
    return true;
  });

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>Creator Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor live vote traffic and manage audience polling links</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchPolls} title="Refresh data">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <button className="btn btn-primary" onClick={() => navigate('/create-poll')}>
            <PlusCircle size={18} />
            <span>Create Poll</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <BarChart3 size={20} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Polls</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalPolls}</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-secondary)',
              }}
            >
              <Users size={20} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Votes Cast</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalVotes}</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-success)',
              }}
            >
              <CheckCircle size={20} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Polls</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{activePolls}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
        }}
      >
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('all')}
        >
          All Polls ({totalPolls})
        </button>
        <button
          className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('active')}
        >
          Active ({activePolls})
        </button>
        <button
          className={`btn btn-sm ${filter === 'closed' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('closed')}
        >
          Closed / Expired ({totalPolls - activePolls})
        </button>
      </div>

      {/* Polls Listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '1rem' }} />
          <div>Loading your polls from MongoDB and Redis...</div>
        </div>
      ) : filteredPolls.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--accent-gradient-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: 'var(--accent-primary)',
            }}
          >
            <BarChart3 size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No polls found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {filter === 'all'
              ? 'You have not created any polls yet. Create your first live poll and share it with your audience!'
              : `No ${filter} polls found matching your filter.`}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/create-poll')}>
            <PlusCircle size={18} />
            <span>Create First Poll</span>
          </button>
        </div>
      ) : (
        <div>
          {filteredPolls.map((poll) => (
            <PollCard key={poll.id} poll={poll} onRefresh={fetchPolls} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}
