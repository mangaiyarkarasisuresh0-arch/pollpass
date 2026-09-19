import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { createPollWebSocket } from '../services/websocket';

export function useLivePoll(idOrCode) {
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);

  const fetchPollData = useCallback(async () => {
    if (!idOrCode) return;
    try {
      setLoading(true);
      setError(null);
      // Determine if ID or ShareCode
      let res;
      if (idOrCode.length === 24) {
        // Hex ObjectID
        res = await api.polls.getById(idOrCode);
      } else {
        res = await api.polls.getByShareCode(idOrCode);
      }

      setPoll(res.poll);
      setResults(res.results || {});
      setTotalVotes(res.total_votes || 0);
      setIsExpired(res.is_expired || false);
      setHasVoted(res.has_voted || false);
    } catch (err) {
      setError(err.message || 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  }, [idOrCode]);

  useEffect(() => {
    fetchPollData();
  }, [fetchPollData]);

  // Connect WebSocket once poll is loaded and we have poll.id
  useEffect(() => {
    if (!poll?.id) return;

    const ws = createPollWebSocket(
      poll.id,
      (event) => {
        if (event.event === 'VOTE_UPDATED') {
          console.log('[Live Update Received]:', event);
          setResults(event.results || {});
          setTotalVotes(event.total_votes || 0);
        }
      },
      (status) => {
        setWsStatus(status);
      }
    );

    wsRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, [poll?.id]);

  const castVote = async (optionId) => {
    if (!poll) return;
    const res = await api.votes.cast(poll.id, optionId);
    setResults(res.results || {});
    setTotalVotes(res.total_votes || 0);
    setHasVoted(true);
    return res;
  };

  return {
    poll,
    results,
    totalVotes,
    isExpired,
    hasVoted,
    loading,
    error,
    wsStatus,
    castVote,
    refetch: fetchPollData,
  };
}
