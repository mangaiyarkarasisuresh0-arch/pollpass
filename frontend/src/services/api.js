// API service for PollPulse

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Generate or retrieve persistent browser voter fingerprint
export const getVoterFingerprint = () => {
  let fp = localStorage.getItem('pollpulse_voter_fp');
  if (!fp) {
    fp = 'voter_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('pollpulse_voter_fp', fp);
  }
  return fp;
};

// Generic fetch wrapper with token and voter fingerprint injection
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('pollpulse_token');
  const headers = {
    'Content-Type': 'application/json',
    'X-Voter-Fingerprint': getVoterFingerprint(),
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    const networkErr = new Error('Network error: Unable to connect to backend server. Ensure backend is running.');
    networkErr.status = 0;
    throw networkErr;
  }
}

export const api = {
  auth: {
    signup: (userData) => request('/auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    me: () => request('/auth/me'),
  },
  polls: {
    create: (pollData) => request('/polls', { method: 'POST', body: JSON.stringify(pollData) }),
    getMyPolls: () => request('/polls/my'),
    getById: (id) => request(`/polls/${id}`),
    getByShareCode: (shareCode) => request(`/polls/share/${shareCode}`),
    updateStatus: (id, status) => request(`/polls/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id) => request(`/polls/${id}`, { method: 'DELETE' }),
  },
  votes: {
    cast: (idOrCode, optionId) =>
      request(`/polls/${idOrCode}/vote`, {
        method: 'POST',
        body: JSON.stringify({
          option_id: optionId,
          voter_fingerprint: getVoterFingerprint(),
        }),
      }),
    getResults: (idOrCode) => request(`/polls/${idOrCode}/results`),
  },
};
