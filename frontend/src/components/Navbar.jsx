import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { BarChart3, PlusCircle, LayoutDashboard, LogOut, LogIn, UserPlus } from 'lucide-react';

export default function Navbar({ navigate, currentPath }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <div className="brand-logo" onClick={() => navigate('/')}>
          <div className="brand-icon">
            <BarChart3 size={20} />
          </div>
          <span>PollPulse</span>
        </div>

        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <button
                className={`btn btn-sm ${currentPath === '/dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </button>

              <button
                className={`btn btn-sm ${currentPath === '/create-poll' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => navigate('/create-poll')}
              >
                <PlusCircle size={16} />
                <span>Create Poll</span>
              </button>

              <div className="user-badge" title={user?.email}>
                <div className="user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{user?.name?.split(' ')[0]}</span>
              </div>

              <button
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn btn-sm ${currentPath === '/login' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => navigate('/login')}
              >
                <LogIn size={16} />
                <span>Log In</span>
              </button>

              <button
                className="btn btn-sm btn-primary"
                onClick={() => navigate('/signup')}
              >
                <UserPlus size={16} />
                <span>Sign Up</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
