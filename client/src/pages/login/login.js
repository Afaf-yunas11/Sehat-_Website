import React, { useState } from 'react';
import SehatLogo from '../../assets/sehatLogo500.png';
import ProceedButton from '../../components/proceedButton';
import Alert from '../../components/alert';
import './login.css';

const LoginForm = () => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [alertMessage, setAlertMessage] = useState('');

  const handleLogin = async () => {
    const loginTypes = {
      // eslint-disable-next-line
      ["user"]: "PATIENTS",
      // eslint-disable-next-line
      ["doctor"]: "DOCTORS",
      // eslint-disable-next-line
      ["admin"]: "ADMINS",
      // eslint-disable-next-line
      ["rescue-worker"]: "RESCUE_WORKERS",
    };

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginType: loginTypes[role], email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        setAlertMessage('');
      } else {
        if (response.status === 404 || response.status === 401) {
          setAlertMessage('Invalid credentials');
        }
        if (response.status >= 500 && response.status < 600) {
          setAlertMessage('Server error occurred');
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      setAlertMessage('Server error occurred');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={SehatLogo} alt="Logo" className="logo" />
        <h1>Trusted Care.<br></br> Anytime. Anywhere.</h1>
        <p className="subtitle">Log in to your Sehat account</p>
        <hr className="divider" />
        <h3>I am a...</h3>
        <select
          className="role-dropdown"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          >
          <option value="user">User</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
          <option value="rescue-worker">Rescue Worker</option>
        </select>
        <hr className="divider" />

        {alertMessage && <Alert message={alertMessage} />}

        <input
          type="email"
          placeholder="Enter your email address..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          />
        <input
          type="password"
          placeholder="Enter your password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          />

        <ProceedButton onClick={handleLogin} label="Continue" margin='12px 0 16px 0'></ProceedButton>

        <div className="small-text">
          Forgot password? <a className="small-text" href="https://example.com">Click here</a>
          <br></br>
          Not a user? <a className="small-text" href="https://example.com">Create a free account</a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
