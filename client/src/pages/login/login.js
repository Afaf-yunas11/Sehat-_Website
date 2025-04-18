import React, { useState } from 'react';
import SehatLogo from '../../assets/sehatLogo500.png';
import ProceedButton from '../../components/proceedButton';
import Alert from '../../components/alert';
import styles from './login.module.css';

const LoginForm = () => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [alertMessage, setAlertMessage] = useState('');

  const handleLogin = async () => {
    const loginTypes = {
      ["user"]: "PATIENTS",
      ["doctor"]: "DOCTORS",
      ["admin"]: "ADMINS",
      ["rescue-worker"]: "RESCUE_WORKERS",
    };

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginType: loginTypes[role], email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        localStorage.setItem('userData', JSON.stringify(data));
        setAlertMessage('');
        window.location.href = '/dashboard';
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
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <img src={SehatLogo} alt="Logo" className={styles.logo} />
        <h1 className={styles.loginPageTitle}>Trusted Care.<br /> Anytime. Anywhere.</h1>
        <p className={styles.subtitle}>Log in to your Sehat account</p>
        <hr className={styles.divider} />
        <p className={styles.subtitle}>I am a...</p>
        <select
          className={styles.roleDropdown}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">User</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
          <option value="rescue-worker">Rescue Worker</option>
        </select>
        <hr className={styles.divider} />

        {alertMessage && <Alert message={alertMessage} />}

        <input
          type="email"
          placeholder="Enter your email address..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.loginEmailInput}
        />
        <input
          type="password"
          placeholder="Enter your password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.loginPasswordInput}
        />

        <ProceedButton onClick={handleLogin} label="Continue" margin="12px 0 16px 0" />

        <div className={styles.smallText}>
          Forgot password? <a className={styles.smallText} href="https://example.com">Click here</a>
          <br />
          Not a user? <a className={styles.smallText} href="https://example.com">Create a free account</a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
