import React from 'react';
import Button from 'react-bootstrap/Button';

const AddAppointmentButton = ({ onClick }) => (
  <Button onClick={onClick}>
    Add +
  </Button>
);

export default AddAppointmentButton;