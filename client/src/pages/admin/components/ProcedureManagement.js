import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Modal, ButtonGroup } from 'react-bootstrap';
import axios from 'axios';
import { checkAuthAndRedirect } from '../../../utils/authMiddleware';

const ProcedureManagement = () => {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [formData, setFormData] = useState({
    PROCEDURE_NAME: '',
    PROCEDURE_DURATION: '',
    OPERATION_SUCCESS_RATE: ''
  });

  useEffect(() => {
    fetchProcedures();
  }, []);

  const fetchProcedures = async () => {
    if (await checkAuthAndRedirect()) {
      try {
        const response = await axios.get('http://localhost:8000/api/procedures/all', {
          withCredentials: true
        });
        setProcedures(response.data);
      } catch (error) {
        console.error('Error fetching procedures:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShowModal = (procedure = null) => {
    if (procedure) {
      setEditingProcedure(procedure);
      setFormData({
        PROCEDURE_NAME: procedure.PROCEDURE_NAME,
        PROCEDURE_DURATION: procedure.PROCEDURE_DURATION,
        OPERATION_SUCCESS_RATE: procedure.OPERATION_SUCCESS_RATE
      });
    } else {
      setEditingProcedure(null);
      setFormData({
        PROCEDURE_NAME: '',
        PROCEDURE_DURATION: '',
        OPERATION_SUCCESS_RATE: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProcedure(null);
    setFormData({
      PROCEDURE_NAME: '',
      PROCEDURE_DURATION: '',
      OPERATION_SUCCESS_RATE: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (await checkAuthAndRedirect()) {
      try {
        if (editingProcedure) {
          await axios.patch(
            `http://localhost:8000/api/procedures/${editingProcedure.PROCEDURE_ID}`,
            formData,
            { withCredentials: true }
          );
        } else {
          await axios.post(
            'http://localhost:8000/api/procedures',
            formData,
            { withCredentials: true }
          );
        }
        fetchProcedures();
        handleCloseModal();
      } catch (error) {
        console.error('Error saving procedure:', error);
      }
    }
  };

  const handleDelete = async (procedureId) => {
    if (window.confirm('Are you sure you want to delete this procedure?')) {
      if (await checkAuthAndRedirect()) {
        try {
          await axios.delete(`http://localhost:8000/api/procedures/${procedureId}`, {
            withCredentials: true
          });
          fetchProcedures();
        } catch (error) {
          if (error.response?.status === 409) {
            alert('This procedure cannot be deleted as it is being used by doctors.');
          } else {
            console.error('Error deleting procedure:', error);
          }
        }
      }
    }
  };

  return (
    <div className="table-container w-100">
      <div className="table-header">
        <h2>Procedure Management</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>
          Add New Procedure
        </Button>
      </div>

      <Table striped bordered hover responsive className="w-100">
        <thead>
          <tr>
            <th>Name</th>
            <th>Duration</th>
            <th>Success Rate</th>
            <th style={{ width: '200px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="4" className="text-center">Loading...</td>
            </tr>
          ) : procedures.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center">No procedures found</td>
            </tr>
          ) : (
            procedures.map(procedure => (
              <tr key={procedure.PROCEDURE_ID}>
                <td>{procedure.PROCEDURE_NAME}</td>
                <td>{procedure.PROCEDURE_DURATION} mins</td>
                <td>{procedure.OPERATION_SUCCESS_RATE}%</td>
                <td>
                  <ButtonGroup>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleShowModal(procedure)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(procedure.PROCEDURE_ID)}
                    >
                      Delete
                    </Button>
                  </ButtonGroup>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProcedure ? 'Edit Procedure' : 'Add New Procedure'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Procedure Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.PROCEDURE_NAME}
                onChange={(e) => setFormData({
                  ...formData,
                  PROCEDURE_NAME: e.target.value
                })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Procedure Duration (mins)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={formData.PROCEDURE_DURATION}
                onChange={(e) => setFormData({
                  ...formData,
                  PROCEDURE_DURATION: e.target.value
                })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Operation Success Rate (%)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.OPERATION_SUCCESS_RATE}
                onChange={(e) => setFormData({
                  ...formData,
                  OPERATION_SUCCESS_RATE: e.target.value
                })}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingProcedure ? 'Save Changes' : 'Add Procedure'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ProcedureManagement; 