import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Remove user data from localStorage
    localStorage.removeItem('userInfo');
    fetch('http://localhost:8000/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
      .then(response => {
      if (!response.ok) {
        throw new Error('Failed to log out');
      }
      })
      .catch(error => {
      console.error('Logout error:', error);
      });
  }, []);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      {/* Placeholder for image */}
      <div style={{ width: 120, height: 120, background: '#eee', borderRadius: '50%', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#bbb', fontSize: 48 }}>🗝️</span>
      </div>
      <h2>You have been logged out</h2>
      <button className="btn btn-primary mt-4" onClick={handleLoginRedirect}>
        Go to Login
      </button>
    </div>
  );
};

export default Logout;