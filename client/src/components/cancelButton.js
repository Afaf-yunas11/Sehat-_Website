import React from 'react';

const CancelButton = ({ onClick, label = "Cancel", margin = '12px 0 16px 0' }) => {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: 'black',
        color: 'white',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '6px',
        margin: margin,
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#333'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'black'}
    >
      {label}
    </button>
  );
};

export default CancelButton;