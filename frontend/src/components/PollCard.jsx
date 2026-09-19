import React, { useState } from 'react';
import { Share2, BarChart2, Check, Trash2, Power, PowerOff, ExternalLink } from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../services/api';

export default function PollCard({ poll, onRefresh, navigate }) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const shareUrl = `${window.location.origin}/poll/${poll.share_code}`;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    addToast('Share link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleStatus = async (e) => {
    e.stopPropagation();
    const newStatus = poll.status === 'active' ? 'closed' : 'active';
    try {
      setLoadingAction(true);
      await api.polls.updateStatus(poll.id, newStatus);
      addToast(`Poll ${newStatus === 'active' ? 'reopened' : 'closed'} successfully`, 'info');
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast(err.message || 'Failed to update poll status', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this poll and all its vote history?')) {
      return;
    }
    try {
      setLoadingAction(true);
      await api.polls.delete(poll.id);
      addToast('Poll deleted successfully', 'info');
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast(err.message || 'Failed to delete poll', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const isExpired = poll.is_expired || (poll.expires_at && new Date(poll.expires_at) < new Date());

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            {isExpired ? (
              <span className="badge badge-expired">Expired</span>
            ) : poll.status === 'active' ? (
              <span className="badge badge-active">Active</span>
            ) : (
              <span className="badge badge-closed">Closed</span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Code: <strong style={{ color: 'var(--text-muted)' }}>{poll.share_code}</strong>
            </span>
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
            {poll.question}
          </h3>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {poll.total_votes || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Total Votes
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        <span>{poll.options?.length || 0} choices</span>
        <span style={{ margin: '0 0.5rem' }}>•</span>
        <span>Created {new Date(poll.created_at).toLocaleDateString()}</span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/poll/${poll.id}/results`)}>
          <BarChart2 size={15} />
          <span>Live Results</span>
        </button>

        <button className="btn btn-sm btn-secondary" onClick={handleCopy} title="Copy public voting link">
          {copied ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
          <span>{copied ? 'Copied Link!' : 'Share Link'}</span>
        </button>

        <button
          className="btn btn-sm btn-secondary"
          onClick={() => window.open(shareUrl, '_blank')}
          title="Open public voting page in new tab"
        >
          <ExternalLink size={15} />
          <span>Vote View</span>
        </button>

        <button
          className="btn btn-sm btn-secondary"
          onClick={handleToggleStatus}
          disabled={loadingAction}
          title={poll.status === 'active' ? 'Close poll to stop accepting votes' : 'Re-open poll'}
        >
          {poll.status === 'active' ? <PowerOff size={15} color="#f87171" /> : <Power size={15} color="#34d399" />}
          <span>{poll.status === 'active' ? 'Close Poll' : 'Reopen'}</span>
        </button>

        <button
          className="btn btn-sm btn-danger"
          onClick={handleDelete}
          disabled={loadingAction}
          style={{ marginLeft: 'auto' }}
          title="Delete Poll"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
