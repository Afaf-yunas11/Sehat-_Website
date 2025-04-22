import React, { useEffect, useState } from 'react';
import { sendGetRequest } from '../../utils/api'
import DashboardHeader from '../../components/dashboardHeader';
import { data, useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import femaleDefaultAvatar from '../../assets/femaleDefaultAvatar.png'
import maleDefaultAvatar from '../../assets/maleDefaultAvatar.png'
import otherDefaultAvatar from '../../assets/otherDefaultAvatar.png'

import SpinnerComponent from '../../components/spinnerComponent';
import toTitleCase from '../../utils/toTitleCase';

const roleLabels = {
  PATIENTS: 'PATIENTS',
  DOCTORS: 'DOCTORS',
  ["RESCUE_WORKERS"]: 'RESCUE_WORKERS',
  ADMINS: 'ADMINS'
};

const routes = {
  PATIENTS: '/api/patients/by-user',
  DOCTORS: '/api/doctors/by-user',
  ["RESCUE_WORKERS"]: '/api/rescue-workers/by-user',
  ADMINS: '/api/admins/by-user'
};

const Account = () => {
  const [userAuth, setUserAuth] = useState(null);
  const [payload, setPayload] = useState(null);
  const [user, setUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    sendGetRequest('http://localhost:8000/api/auth/current-user', setUserAuth);
  }, []);

  useEffect(() => {
    if (!userAuth) return;
    fetch(`http://localhost:8000/api/users/${userAuth.userId}`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => { data[0].GENDER = toTitleCase(data[0].GENDER); return data })
      .then(data => setUser(data[0]));
  }, [userAuth]);

  useEffect(() => {
    if (!userAuth) return;
    fetch(`http://localhost:8000${routes[userAuth.loginType]}/${userAuth.userId}`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setPayload(data[0]));
  }, [userAuth])

  const handleDeleteAccount = async () => {
    const response = await fetch(`http://localhost:8000/api/users/${user.USER_ID}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    localStorage.removeItem('userData');
    navigate('/login');
  };


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
                      value={user.GENDER}
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
                  <div className="mb-3"><b>License No:</b> {user.LICENSE_NO}</div>
                  <div className="mb-3"><b>Specialization:</b> {user.SPECIALIZATION_NAME}</div>
                  <div className="mb-3"><b>Status:</b> {user.STATUS}</div>
                  <div className="mb-3"><b>Branch:</b> {user.HOSPITAL_NAME} - {user.LOCATION}</div>
                  <div className="mb-3"><b>Date Started:</b> {user.DATE_STARTED}</div>
                </>
              )}
              {userAuth.loginType === roleLabels.RESCUE_WORKERS && (
                <>
                  <div className="mb-3"><b>Rescue License No:</b> {user.RESCUE_LICENSE_NO}</div>
                  <div className="mb-3"><b>Date Started:</b> {user.RESCUE_DATE_STARTED}</div>
                  <div className="mb-3"><b>Address:</b> {user.RESCUE_ADDRESS}</div>
                </>
              )}
              {userAuth.loginType === roleLabels.ADMINS && (
                <div className="mb-3"><b>Admin privileges enabled.</b></div>
              )}

              <div className="d-flex justify-content-end mt-4 gap-2">
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                  Return to Dashboard
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

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