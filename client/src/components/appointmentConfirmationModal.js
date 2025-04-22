import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import thumbsUpAvatar from '../assets/thumbsUpAvatar.png';

const AppointmentConfirmationModal = ({ show, onClose, onGoToDashboard }) => (
  <Modal show={show} onHide={onClose} centered>
    <Modal.Body className="text-center">
      <img
        src={thumbsUpAvatar}
        alt="Success"
        style={{ maxWidth: 250, width: '100%', marginBottom: 24, marginRight: 19 }}
      />
      <div style={{ fontWeight: 600, fontSize: '1.3rem', marginBottom: 8 }}>
        Wooo!
      </div>
      <div style={{ color: '#198754', fontSize: '1.1rem', marginBottom: 24 }}>
        Appointment Created Successfully!
      </div>
      <Button variant="success" onClick={onGoToDashboard}>
        Go to Dashboard
      </Button>
    </Modal.Body>
  </Modal>
);

export default AppointmentConfirmationModal;