import React from 'react';

const ProceedButton = ({ onClick, label = "Proceed", margin = "12px 0 16px 0" }) => {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: '#2f80ed',
        color: 'white',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '6px',
        margin: margin,
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#1e5bbf'}
      onMouseLeave={(e) => e.target.style.backgroundColor = '#2f80ed'}
    >
      {label}
    </button>
  );
};

export default ProceedButton;