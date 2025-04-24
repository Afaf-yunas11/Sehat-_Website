import React, { useEffect, useState } from 'react';
import DashboardHeader from '../../components/dashboardHeader';
import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';

import femaleDefaultAvatar from '../../assets/femaleDefaultAvatar.png'
import maleDefaultAvatar from '../../assets/maleDefaultAvatar.png'
import otherDefaultAvatar from '../../assets/otherDefaultAvatar.png'

import SpinnerComponent from '../../components/spinnerComponent';
import toTitleCase from '../../utils/toTitleCase';
import { checkAuthAndRedirect } from '../../utils/authMiddleware';
import axios from 'axios';

const roleLabels = {
  PATIENTS: 'PATIENTS',
  DOCTORS: 'DOCTORS',
  ["RESCUE_WORKERS"]: 'RESCUE_WORKERS',
  ADMINS: 'ADMINS'
};

const routes = {
  PATIENTS: '/api/patients/by-user',
  DOCTORS: '/api/doctors/by-user-id',
  ["RESCUE_WORKERS"]: '/api/rescue-workers/by-user',
  ADMINS: '/api/admins/by-user'
};

const Account = () => {
  const [userAuth, setUserAuth] = useState(null);
  const [payload, setPayload] = useState(null);
  const [user, setUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [procedures, setProcedures] = useState([]);
  const [availableProcedures, setAvailableProcedures] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState('');
  const [procedureCost, setProcedureCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (await checkAuthAndRedirect()) {
        const response = await axios.get('http://localhost:8000/api/auth/current-user', {
          withCredentials: true
        });
        setUserAuth(response.data);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!userAuth) return;
    const fetchUserData = async () => {
      if (await checkAuthAndRedirect()) {
        const response = await axios.get(`http://localhost:8000/api/users/${userAuth.userId}`, {
          withCredentials: true
        });
        const data = response.data;
        data[0].GENDER = toTitleCase(data[0].GENDER);
        setUser(data[0]);
      }
    };
    fetchUserData();
  }, [userAuth]);

  useEffect(() => {
    if (!userAuth) return;
    const fetchPayload = async () => {
      if (await checkAuthAndRedirect()) {
        const response = await axios.get(`http://localhost:8000${routes[userAuth.loginType]}/${userAuth.userId}`, {
          withCredentials: true
        });
        setPayload(response.data[0]);
      }
    };
    fetchPayload();
  }, [userAuth])

  // Load doctor's procedures
  useEffect(() => {
    if (!userAuth || userAuth.loginType !== roleLabels.DOCTORS || !payload) return;

    const fetchProcedures = async () => {
      if (await checkAuthAndRedirect()) {
        try {
          const response = await axios.get(`http://localhost:8000/api/procedure-doctor/by-doctor/${payload.LICENSE_NO}`, {
            withCredentials: true
          });
          setProcedures(response.data);
        } catch (error) {
          console.error('Error fetching procedures:', error);
        }
      }
    };

    fetchProcedures();
  }, [userAuth, payload]);

  // Load available procedures when modal opens
  useEffect(() => {
    if (!showProcedureModal) return;

    const fetchAvailableProcedures = async () => {
      if (await checkAuthAndRedirect()) {
        try {
          const response = await axios.get('http://localhost:8000/api/procedure-doctor/available-procedures', {
            withCredentials: true
          });
          const filteredProcedures = response.data.filter(proc =>
            !procedures.some(existingProc => existingProc.PROCEDURE_ID === proc.PROCEDURE_ID)
          );
          setAvailableProcedures(filteredProcedures);
        } catch (error) {
          console.error('Error fetching available procedures:', error);
        }
      }
    };

    fetchAvailableProcedures();
  }, [showProcedureModal, procedures]);

  const handleDeleteAccount = async () => {
    if (await checkAuthAndRedirect()) {
      await axios.delete(`http://localhost:8000/api/users/${user.USER_ID}`, {
        withCredentials: true
      });
      localStorage.removeItem('userData');
      navigate('/login');
    }
  };

  const handleAddProcedure = async (e) => {
    e.preventDefault();
    if (!selectedProcedure || !procedureCost) return;

    setLoading(true);
    try {
      if (await checkAuthAndRedirect()) {
        await axios.post('http://localhost:8000/api/procedure-doctor', {
          licenseNo: payload.LICENSE_NO,
          procedureId: parseInt(selectedProcedure),
          procedureCost: parseFloat(procedureCost)
        }, {
          withCredentials: true
        });

        // Refresh procedures list
        const response = await axios.get(`http://localhost:8000/api/procedure-doctor/by-doctor/${payload.LICENSE_NO}`, {
          withCredentials: true
        });
        setProcedures(response.data);

        // Reset form
        setSelectedProcedure('');
        setProcedureCost('');
      }
    } catch (error) {
      console.error('Error adding procedure:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProcedure = async (procedureId) => {
    if (await checkAuthAndRedirect()) {
      try {
        await axios.delete(`http://localhost:8000/api/procedure-doctor/${payload.LICENSE_NO}/${procedureId}`, {
          withCredentials: true
        });

        // Refresh procedures list
        const response = await axios.get(`http://localhost:8000/api/procedure-doctor/by-doctor/${payload.LICENSE_NO}`, {
          withCredentials: true
        });
        setProcedures(response.data);
        setError(''); // Clear any existing error
      } catch (error) {
        if (error.response?.status === 409) {
          setError('This procedure cannot be removed as it has already been performed.');
        } else {
          setError('An error occurred while deleting the procedure.');
        }
      }
    }
  };

  console.log(userAuth);
  console.log(user);
  console.log(payload);
  if (!userAuth || !user || !payload) return <SpinnerComponent />;

  return (
    <>
      <DashboardHeader
        heading="Account Information"
        body="View and edit your account information here."
        showAppointmentButton={false}
        onAddAppointment={() => { }}
      />

      <div className="d-flex justify-content-center align-items-center" style={{ gap: 32, marginTop: '10vh', marginRight: '5vw' }}>
        <img
          src={
            user.GENDER === 'Female'
              ? femaleDefaultAvatar
              : user.GENDER === 'Male'
                ? maleDefaultAvatar
                : otherDefaultAvatar
          }
          alt="Profile"
          style={{ width: 500, height: 500, borderRadius: '50%' }}
        />
        <div style={{ flex: 1 }}>
          <div className="container">
            <div className="card shadow-sm p-4">
              <div className="row mb-3">
                <div className="col-md-4">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      id="floatingName"
                      value={`${user.F_NAME} ${user.L_NAME}`}
                      disabled
                    />
                    <label htmlFor="floatingName">Name</label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      id="floatingDOB"
                      value={user.DOB}
                      disabled
                    />
                    <label htmlFor="floatingDOB">Date of Birth</label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      id="floatingGender"
                      value={toTitleCase(user.GENDER)}
                      disabled
                    />
                    <label htmlFor="floatingGender">Gender</label>
                  </div>
                </div>
              </div>
              {/* Role-specific info */}
              {userAuth.loginType === roleLabels.PATIENTS && (
                <>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingBloodGroup"
                          value={`${payload.BLOOD_GROUP}`}
                          disabled
                        />
                        <label htmlFor="floatingBloodGroup">Blood Group</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingWeight"
                          value={`${payload.WEIGHT} kg`}
                          disabled
                        />
                        <label htmlFor="floatingWeight">Weight</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingHeight"
                          value={`${payload.HEIGHT} cm`}
                          disabled
                        />
                        <label htmlFor="floatingHeight">Height</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingAddress"
                          value={payload.ADDRESS}
                          disabled
                        />
                        <label htmlFor="floatingAddress">Address</label>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {userAuth.loginType === roleLabels.DOCTORS && (
                <>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingLicenseNo"
                          value={payload.LICENSE_NO}
                          disabled
                        />
                        <label htmlFor="floatingLicenseNo">License No</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingSpecialization"
                          value={payload.SPECIALIZATION_NAME}
                          disabled
                        />
                        <label htmlFor="floatingSpecialization">Specialization</label>
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingStatus"
                          value={toTitleCase(payload.STATUS)}
                          disabled
                        />
                        <label htmlFor="floatingStatus">Status</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingLocation"
                          value={`${payload.LOCATION}`}
                          disabled
                        />
                        <label htmlFor="floatingLocation">Location</label>
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingDateStarted"
                          value={
                            payload.DATE_STARTED
                              ? new Date(payload.DATE_STARTED).toLocaleDateString('en-GB')
                              : ''
                          }
                          disabled
                        />
                        <label htmlFor="floatingDateStarted">Date Started</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingRating"
                          value={payload.RATING || 'Not Rated'}
                          disabled
                        />
                        <label htmlFor="floatingRating">Rating</label>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {userAuth.loginType === roleLabels.RESCUE_WORKERS && (
                <>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingLicenseNo"
                          value={payload.LICENSE_NO}
                          disabled
                        />
                        <label htmlFor="floatingLicenseNo">License No</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingDateStarted"
                          value={new Date(payload.DATE_STARTED).toLocaleDateString('en-GB')}
                          disabled
                        />
                        <label htmlFor="floatingDateStarted">Date Started</label>
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-12">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="floatingAddress"
                          value={payload.ADDRESS}
                          disabled
                        />
                        <label htmlFor="floatingAddress">Address</label>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {userAuth.loginType === roleLabels.ADMINS && (
                <div className="row mb-3">
                  <div className="col-md-6">
                    <div className="form-floating mb-3">
                      <input
                        type="text"
                        className="form-control"
                        id="floatingAdminId"
                        value={payload.ADMIN_ID}
                        disabled
                      />
                      <label htmlFor="floatingAdminId">Admin ID</label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-floating mb-3">
                      <input
                        type="text"
                        className="form-control"
                        id="floatingDateJoined"
                        value={new Date(payload.DATE_STARTED).toLocaleDateString('en-GB')}
                        disabled
                      />
                      <label htmlFor="floatingDateJoined">Date Joined</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-floating mb-3">
                      <input
                        type="text"
                        className="form-control"
                        id="floatingRole"
                        value="System Administrator"
                        disabled
                      />
                      <label htmlFor="floatingRole">Role</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="alert alert-info mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      You have full administrative privileges to manage users, hospitals, procedures, and system settings.
                    </div>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end mt-4 gap-2">
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                  Return to Dashboard
                </Button>
                {userAuth.loginType === roleLabels.DOCTORS && (
                  <Button variant="primary" onClick={() => setShowProcedureModal(true)}>
                    Modify Procedures
                  </Button>
                )}
                {userAuth.loginType !== roleLabels.ADMINS && userAuth.loginType !== roleLabels.DOCTORS && (
                  <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                    Delete Account
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Procedure Management Modal */}
      <Modal show={showProcedureModal} onHide={() => {
        setShowProcedureModal(false);
        setError(''); // Clear error when closing modal
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Manage Procedures</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <div className="alert alert-danger mb-3">
              {error}
            </div>
          )}
          <Form onSubmit={handleAddProcedure}>
            <div className="d-flex gap-2 mb-4">
              <Form.Group className="flex-grow-1">
                <Form.Label>Select Procedure</Form.Label>
                <Form.Select
                  value={selectedProcedure}
                  onChange={(e) => setSelectedProcedure(e.target.value)}
                  required
                >
                  <option value="">Select a procedure...</option>
                  {availableProcedures.map(proc => (
                    <option key={proc.PROCEDURE_ID} value={proc.PROCEDURE_ID}>
                      {proc.PROCEDURE_NAME}
                    </option>
                  ))}
                </Form.Select>
                {availableProcedures.length === 0 && (
                  <small className="text-muted">
                    No additional procedures available to add.
                  </small>
                )}
              </Form.Group>
              <Form.Group style={{ width: '200px' }}>
                <Form.Label>Cost (PKR)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={procedureCost}
                  onChange={(e) => setProcedureCost(e.target.value)}
                  required
                />
              </Form.Group>
              <div className="d-flex align-items-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </Form>

          <h5 className="mb-3">Your Procedures</h5>
          <div className="list-group">
            {procedures.map(proc => (
              <div key={proc.PROCEDURE_ID} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-1">{proc.PROCEDURE_NAME}</h6>
                  <small className="text-muted">Cost: PKR {proc.PROCEDURE_COST}</small>
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteProcedure(proc.PROCEDURE_ID)}
                >
                  ×
                </Button>
              </div>
            ))}
            {procedures.length === 0 && (
              <div className="list-group-item text-muted">
                No procedures added yet
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProcedureModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Account Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete your account? This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>

          <Button variant="danger" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Account;