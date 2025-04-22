import React from 'react';
import routes from '../routes/routes';
import walkingPatient from '../assets/walkingPatient.png';

const NotFound = () => (
  <>
  <div style={{ position: 'absolute', top: 24, left: 32, fontWeight: 700, fontSize: '1.2rem', color: '#d32f2f' }}>
    Error 404 | Not Found
  </div>

  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
    <img
      src={walkingPatient}
      alt="You seem lost"
      style={{ maxWidth: 350, width: '100%' }}
    />
    <div style={{ fontWeight: 500, fontSize: '1.4rem', marginTop: 16 }}>You seem lost</div>
    <div style={{ color: '#888' }}>Click here to <a style={{ color: '#888' }} href={routes.login}>log in</a> </div>
  </div>
  </>
);

export default NotFound;