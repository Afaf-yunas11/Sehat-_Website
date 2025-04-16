import React, { useState } from 'react';

const Alert = ({ message }) => {
  return (
    <div
      style={{
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '10px 20px',
        borderRadius: '5px',
        border: '1px solid #f5c6cb',
        position: 'relative',
        marginBottom: '10px',
      }}
    >
      <span>{message}</span>
    </div>
  );
};

export default Alert;