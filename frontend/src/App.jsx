import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CreatePollPage from './pages/CreatePollPage';
import VotePage from './pages/VotePage';
import ResultsPage from './pages/ResultsPage';

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route matching logic
  const renderRoute = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Initializing PollPulse...</div>
        </div>
      );
    }

    // 1. Exact matches
    if (currentPath === '/' || currentPath === '') {
      return <HomePage navigate={navigate} />;
    }
    if (currentPath === '/login') {
      return <LoginPage navigate={navigate} />;
    }
    if (currentPath === '/signup') {
      return <SignupPage navigate={navigate} />;
    }
    if (currentPath === '/dashboard') {
      if (!isAuthenticated) {
        return <LoginPage navigate={navigate} />;
      }
      return <DashboardPage navigate={navigate} />;
    }
    if (currentPath === '/create-poll') {
      if (!isAuthenticated) {
        return <LoginPage navigate={navigate} />;
      }
      return <CreatePollPage navigate={navigate} />;
    }

    // 2. Results match: /poll/:idOrCode/results
    const resultsMatch = currentPath.match(/^\/poll\/([^/]+)\/results$/);
    if (resultsMatch) {
      const pollIdOrCode = resultsMatch[1];
      return <ResultsPage pollIdOrCode={pollIdOrCode} navigate={navigate} />;
    }

    // 3. Voting match: /poll/:shareCode
    const voteMatch = currentPath.match(/^\/poll\/([^/]+)$/);
    if (voteMatch) {
      const shareCode = voteMatch[1];
      return <VotePage shareCode={shareCode} navigate={navigate} />;
    }

    // Fallback 404
    return (
      <div className="content-narrow" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem' }}>404 - Page Not Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            The page you are looking for does not exist or has been moved.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Navbar navigate={navigate} currentPath={currentPath} />
      <main className="main-content">{renderRoute()}</main>
      <footer className="footer">
        <div>
          PollPulse • Full-Stack Live Polling Engine powered by <strong>React, Go (Gin), MongoDB & Redis</strong>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AuthProvider>
  );
}
