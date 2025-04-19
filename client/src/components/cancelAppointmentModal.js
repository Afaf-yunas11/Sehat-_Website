import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

const CancelAppointmentModal = ({
  show,
  onHide,
  onCancel
}) => (
  <Modal show={show} onHide={onHide} backdrop="static" keyboard={false}>
    <Modal.Header closeButton>
      <Modal.Title>Cancel Appointment</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to cancel this appointment?
      <br />
      This action cannot be undone.
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onHide}>
        Close
      </Button>
      <Button variant="primary" onClick={onCancel}>
        Cancel Appointment
      </Button>
    </Modal.Footer>
  </Modal>
);

export default CancelAppointmentModal;