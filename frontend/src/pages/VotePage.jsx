import React, { useState, useEffect } from 'react';
import { useLivePoll } from '../hooks/useLivePoll';
import { useToast } from '../components/Toast';
import LiveChart from '../components/LiveChart';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertTriangle, BarChart2, Radio, Lock, Clock, Sparkles } from 'lucide-react';

export default function VotePage({ shareCode, navigate }) {
  const { addToast } = useToast();
  const { poll, results, totalVotes, isExpired, hasVoted: serverHasVoted, loading, error, castVote } = useLivePoll(shareCode);

  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localVoted, setLocalVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Check local storage for persistent voted state
  useEffect(() => {
    if (poll?.id) {
      const stored = localStorage.getItem(`voted_poll_${poll.id}`);
      if (stored) {
        setLocalVoted(true);
      }
    }
  }, [poll?.id]);

  const hasAlreadyVoted = localVoted || serverHasVoted;
  const isClosed = poll && poll.status !== 'active';
  const cannotVote = isClosed || isExpired || hasAlreadyVoted;

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOptionId) {
      addToast('Please select one of the choices before submitting', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await castVote(selectedOptionId);

      // Save locally to avoid multi-vote attempts
      if (poll?.id) {
        localStorage.setItem(`voted_poll_${poll.id}`, selectedOptionId);
      }
      setLocalVoted(true);

      // Celebrate with confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b'],
      });

      addToast('Your vote was recorded live!', 'success');
      setShowResults(true);
    } catch (err) {
      if (err.status === 409) {
        setLocalVoted(true);
        addToast('You have already submitted a vote for this poll', 'error');
      } else {
        addToast(err.message || 'Failed to submit vote', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content-narrow" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading poll details...</div>
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
            {error || 'This live poll does not exist or the link may have been entered incorrectly.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-narrow" style={{ paddingTop: '1.5rem' }}>
      <div className="glass-card">
        {/* Status Notification Banner if Closed or Expired */}
        {isClosed && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Lock size={16} />
            <span>This poll has been closed by the creator and is no longer accepting votes.</span>
          </div>
        )}

        {isExpired && !isClosed && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Clock size={16} />
            <span>This poll has reached its expiration time and is now archived.</span>
          </div>
        )}

        {hasAlreadyVoted && !showResults && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>You have already voted on this poll. You can watch live incoming updates below.</span>
          </div>
        )}

        {/* Poll Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className={`badge ${isClosed ? 'badge-closed' : isExpired ? 'badge-expired' : 'badge-active'}`}>
              {isClosed ? 'Closed' : isExpired ? 'Expired' : 'Live Polling'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Share Code: {poll.share_code}</span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.25 }}>
            {poll.question}
          </h1>
        </div>

        {/* If Already Voted or Results Toggled: Show Live Results Chart */}
        {hasAlreadyVoted || showResults || cannotVote ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Live Audience Breakdown</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {totalVotes} {totalVotes === 1 ? 'total vote' : 'total votes'}
              </div>
            </div>

            <LiveChart options={poll.options} results={results} totalVotes={totalVotes} />

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary btn-block"
                onClick={() => navigate(`/poll/${poll.id}/results`)}
              >
                <BarChart2 size={16} />
                <span>Full Live Screen View</span>
              </button>
            </div>
          </div>
        ) : (
          /* Voting Form */
          <form onSubmit={handleVoteSubmit}>
            <div className="vote-options-list">
              {poll.options?.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`vote-option-label ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedOptionId(opt.id)}
                  >
                    <div className="vote-radio-circle">
                      <div className="vote-radio-inner" />
                    </div>
                    <span className="vote-option-text">{opt.text}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={!selectedOptionId || submitting}
              >
                {submitting ? 'Submitting Vote...' : 'Submit Vote'}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => navigate(`/poll/${poll.id}/results`)}
              >
                <BarChart2 size={16} />
                <span>View Results Without Voting</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
