import React from 'react';
import AddAppointmentButton from './addAppointmentButton';

const DashboardHeader = ({ showAppointmentButton = true, onAddAppointment, heading, body }) => (
  <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded shadow-sm"
    style={{
      background: 'linear-gradient(90deg, #0d6efd 0%, #198754 100%)',
      color: 'white',
      boxShadow: '0 4px 24px rgba(13,110,253,0.10)',
      position: 'relative',
      overflow: 'hidden'
    }}>
    <div>
      <h2 className="mb-0 fw-bold" style={{ letterSpacing: '1px', fontSize: '2.2rem', textShadow: '1px 2px 8px rgba(0,0,0,0.08)' }}>
        <span style={{
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '1.1em',
          color: '#fff'
        }}>
          {heading}
        </span>
      </h2>
      <div style={{ fontSize: '1.4rem', color: '#e3f2fd', marginTop: 2, fontWeight: 400 }}>
        {body}
      </div>
    </div>
    {showAppointmentButton && (
      <AddAppointmentButton onClick={onAddAppointment} />
    )}
  </div>
);

export default DashboardHeader;