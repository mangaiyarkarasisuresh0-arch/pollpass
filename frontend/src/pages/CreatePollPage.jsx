import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { PlusCircle, Trash2, Clock, HelpCircle, Sparkles } from 'lucide-react';

export default function CreatePollPage({ navigate }) {
  const { addToast } = useToast();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiration, setExpiration] = useState('never');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length >= 10) {
      addToast('A maximum of 10 options is permitted', 'error');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      addToast('A poll must have at least 2 options', 'error');
      return;
    }
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
  };

  const handleUseExample = () => {
    setQuestion('What is your favorite programming language?');
    setOptions(['Python', 'JavaScript', 'Go', 'Java']);
    setExpiration('never');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 5) {
      setError('Poll question must be at least 5 characters long');
      return;
    }

    const trimmedOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (trimmedOptions.length < 2) {
      setError('Please provide at least 2 non-empty choices for the audience');
      return;
    }

    // Check duplicates
    const uniqueOptions = new Set(trimmedOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== trimmedOptions.length) {
      setError('All poll options must be distinct (no duplicate choices)');
      return;
    }

    try {
      setLoading(true);
      const res = await api.polls.create({
        question: trimmedQuestion,
        options: trimmedOptions,
        expiration,
      });

      addToast('Poll created successfully with live Redis tracking!', 'success');
      // Navigate to results / live view
      navigate(`/poll/${res.poll.id}/results`);
    } catch (err) {
      setError(err.message || 'Failed to create poll. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-narrow">
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Create Live Poll</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Set up your question and options for real-time live audience response
            </p>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={handleUseExample}
            style={{ fontSize: '0.8rem' }}
          >
            <Sparkles size={14} color="#a855f7" />
            <span>Load Example</span>
          </button>
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
          {/* Question */}
          <div className="form-group">
            <label className="form-label">Poll Question</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Which technology stack do you prefer for high-concurrency microservices?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          {/* Options List */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Choices ({options.length}/10)
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Min 2, Max 10</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Option #${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    required
                  />

                  {options.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleRemoveOption(idx)}
                      title="Remove option"
                      style={{ padding: '0.75rem' }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleAddOption}
                style={{ marginTop: '0.85rem' }}
              >
                <PlusCircle size={16} />
                <span>Add Another Choice</span>
              </button>
            )}
          </div>

          {/* Expiration Setting */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} color="var(--accent-primary)" />
              <span>Poll Expiration Duration</span>
            </label>
            <select
              className="form-select"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
            >
              <option value="never">Never (Stays open until manually closed)</option>
              <option value="1h">1 Hour</option>
              <option value="1d">1 Day (24 Hours)</option>
              <option value="7d">7 Days (1 Week)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating Poll & Redis Keys...' : 'Publish & Generate Share Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
