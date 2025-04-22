import React from 'react';
import Button from 'react-bootstrap/Button';

const AddAppointmentButton = ({ onClick }) => (
  <Button
    onClick={onClick}
    style={{ minWidth: '180px' }}
  >
    Add Appointment
  </Button>
);

export default AddAppointmentButton;