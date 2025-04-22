import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import otherDefaultAvatar from '../../assets/otherDefaultAvatar.png';
import routes from '../../routes/routes';

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
    <>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <img
          src={otherDefaultAvatar}
          alt="You seem lost"
          style={{ maxWidth: 350, width: '100%', marginLeft:"4vw" }}
        />
        <div style={{ fontWeight: 500, fontSize: '1.4rem', marginTop: 16 }}>Till next time!</div>
        <div style={{ color: '#888' }}>Click here to <a style={{ color: '#888' }} href={routes.login}>log in</a> </div>
      </div>

    </>
  );
};

export default Logout;