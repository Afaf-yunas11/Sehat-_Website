import React from 'react';
import showPasswordIcon from '../assets/showPasswordIcon.png';
import hidePasswordIcon from '../assets/hidePasswordIcon.png';

const PasswordToggleInput = ({
  value,
  onChange,
  showPassword,
  setShowPassword,
  required = true,
}) => (
  <div className="form-floating mb-3" style={{ position: 'relative' }}>
    <input
      type={showPassword ? "text" : "password"}
      className="form-control"
      id="password"
      name="PASSWORD"
      placeholder="PASSWORD"
      value={value}
      onChange={onChange}
      required={required}
    />
    <label htmlFor="password">Password</label>
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      style={{
        position: 'absolute',
        top: '50%',
        right: '1rem',
        transform: 'translateY(-50%)',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: 0
      }}
      tabIndex={-1}
    >
      {showPassword ? (
        <img src={showPasswordIcon} alt="Hide password" style={{ width: '1.2rem', height: '1.2rem' }} />
      ) : (
        <img src={hidePasswordIcon} alt="Show password" style={{ width: '1.2rem', height: '1.2rem' }} />
      )}
    </button>
  </div>
);

export default PasswordToggleInput;