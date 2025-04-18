import React, { useState, useEffect, use } from 'react';
import './dashboard.css';
import Header from '../../components/header';
import ProceedButton from '../../components/proceedButton';
import Alert from '../../components/alert';
import SehatLogo from '../../assets/sehatLogo500.png';
import { useNavigate } from 'react-router-dom';
import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';

import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

import toSentenceCase from '../../utils/toSentenceCase';
import toTitleCase from '../../utils/toTitleCase';
import formatPhoneNumber from '../../utils/formatPhoneNumber';
import Map from '../../components/map';


const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [appointmentIndex, setAppointmentIndex] = useState(null);
  const [editAppointment, setEditAppointment] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [formValid, setFormValid] = useState({ BOOKING_DATE: true, BOOKING_TIME: true, DURATION_OF_STAY: true });
  const [procedures, setProcedures] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);

  const [newAppointment, setNewAppointment] = useState({
    BOOKING_DATE: '',
    BOOKING_TIME: '',
    DURATION_OF_STAY: '',
    HOSPITAL_NAME: '',
    PROCEDURE_NAME: '',
    DOCTOR_NAME: '',
    ROOM_TYPE: '',
    PHONE_NO: ''
  });
  const [newFormValid, setNewFormValid] = useState({
    BOOKING_DATE: true,
    BOOKING_TIME: true,
    DURATION_OF_STAY: true,
    HOSPITAL_NAME: true,
    PROCEDURE_NAME: true,
    DOCTOR_NAME: true,
    ROOM_TYPE: true,
    PHONE_NO: true
  });

  useEffect(() => {
    if (!showNewAppointmentModal) return;
    const today = new Date();
    const selectedDate = new Date(newAppointment.BOOKING_DATE);
    const isDateValid = newAppointment.BOOKING_DATE && selectedDate >= today.setHours(0, 0, 0, 0);
    const isTimeValid = !!newAppointment.BOOKING_TIME;
    const isDurationValid = !!newAppointment.DURATION_OF_STAY && Number(newAppointment.DURATION_OF_STAY) > 0;
    const isHospitalValid = !!newAppointment.HOSPITAL_NAME?.trim();
    const isProcedureValid = !!newAppointment.PROCEDURE_NAME?.trim();
    const isDoctorValid = !!newAppointment.DOCTOR_NAME?.trim();
    const isRoomValid = !!newAppointment.ROOM_TYPE?.trim();
    const isPhoneValid = !!newAppointment.PHONE_NO?.trim();

    setNewFormValid({
      BOOKING_DATE: isDateValid,
      BOOKING_TIME: isTimeValid,
      DURATION_OF_STAY: isDurationValid,
      HOSPITAL_NAME: isHospitalValid,
      PROCEDURE_NAME: isProcedureValid,
      DOCTOR_NAME: isDoctorValid,
      ROOM_TYPE: isRoomValid,
      PHONE_NO: isPhoneValid
    });
  }, [newAppointment, showNewAppointmentModal]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const userID = JSON.parse(localStorage.getItem('userData')).userId;

      try {
        const response = await fetch(`http://localhost:8000/api/users/${userID}`, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();
        if (response.ok) {
          setUserInfo(data[0]);
        } else {
          if (response.status === 401) {
            localStorage.removeItem('userData');
            window.location.href = '/login';
          }
          console.error('Error fetching user info:', userInfo);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  async function normalizeAppointments(appointments) {
    await appointments.map((appointments) => {
      appointments.BOOKING_DATE = new Date(appointments.BOOKING_DATE).toISOString().split('T')[0];
      appointments.BOOKING_TIME = new Date(appointments.BOOKING_TIME).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      appointments.HOSPITAL_NAME = toTitleCase(appointments.HOSPITAL_NAME)
      appointments.PROCEDURE_NAME = toTitleCase(appointments.PROCEDURE_NAME)
      appointments.BOOKING_STATUS = toSentenceCase(appointments.BOOKING_STATUS)
      appointments.DOCTOR_NAME = toTitleCase(appointments.DOCTOR_NAME)
      appointments.ROOM_TYPE = toTitleCase(appointments.ROOM_TYPE)
      appointments.PHONE_NO = formatPhoneNumber(appointments.PHONE_NO)

    })
  }

  async function normalizeHospitalNames(hospitals) {
    console.log(hospitals);
    hospitals.forEach(hospital => {
      if (hospital.HOSPITAL_NAME) {
        hospital.HOSPITAL_NAME = toTitleCase(hospital.HOSPITAL_NAME);
      }
      if (hospital.LOCATION) {
        hospital.LOCATION = toTitleCase(hospital.LOCATION);
      }
    });
  }

  useEffect(() => {
    if (!userInfo) return;

    const fetchAppointments = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/bookings/by-user/${userInfo.USER_ID}`, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem('userData');
          window.location.href = '/login';
        }

        await normalizeAppointments(data);
        setAppointments(data);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };

    fetchAppointments();
  }, [userInfo]);


  useEffect(() => {
    if (appointmentIndex !== null && appointments[appointmentIndex]) {
      setEditAppointment({ ...appointments[appointmentIndex] });
    }
  }, [appointmentIndex, editMode]);


  const handleCancelAppointment = async (index) => {
    const response = await fetch(`http://localhost:8000/api/bookings/by-booking/${appointments[index].BOOKING_ID}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ BOOKING_STATUS: 'cancelled' })
    });
    if (response.ok) {
      const updatedAppointments = appointments.map((appt, i) =>
        i === index ? { ...appt, BOOKING_STATUS: 'Cancelled' } : appt
      );
      setAppointments(updatedAppointments);
      setShowModal(false);
    }
    else {
      console.error('Error cancelling appointment:', response.statusText);
    }
  }

  const fetchProcedures = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/procedures/', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('userData');
        window.location.href = '/login';
      }

      setProcedures(data);
    } catch (error) {
      console.error('Error fetching procedures:', error);
    }
  };

  /* FETCHES ONLY HOSPITALS THAT CAN PERFORM A SPECIFIC PROCEDURE */


  useEffect(() => {
    if (!editMode) {
      setFormValid({ BOOKING_DATE: true, BOOKING_TIME: true, DURATION_OF_STAY: true });
      return;
    }
    const today = new Date();
    const selectedDate = new Date(editAppointment.BOOKING_DATE);
    const isDateValid = editAppointment.BOOKING_DATE && selectedDate >= today.setHours(0, 0, 0, 0);
    const isTimeValid = !!editAppointment.BOOKING_TIME;
    const isDurationValid = !!editAppointment.DURATION_OF_STAY && Number(editAppointment.DURATION_OF_STAY) > 0;

    setFormValid({ BOOKING_DATE: isDateValid, BOOKING_TIME: isTimeValid, DURATION_OF_STAY: isDurationValid });
  }, [editAppointment, editMode]);

  const isNewFormAllValid = Object.values(newFormValid).every(Boolean);

  useEffect(() => {
    if (!selectedProcedure) return;
    const fetchHospitalNames = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/hospitals/by-procedure-id/${procedures[selectedProcedure].PROCEDURE_ID}`, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();
        if (response.status === 401) {
          localStorage.removeItem('userData');
          window.location.href = '/login';
        }
        setHospitals(data);
        await normalizeHospitalNames(data);
        setNewAppointment({ ...newAppointment, HOSPITAL_NAME: data[0].HOSPITAL_NAME });
      } catch (error) {
        console.error('Error fetching hospitals:', error);
      }
    }
    fetchHospitalNames();
  }, [selectedProcedure])

  return (
    <>
      <Header firstName={userInfo ? userInfo.F_NAME : 'User'} />
      <section>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Appointments</h2>
          <Button
            onClick={async () => {
              setShowNewAppointmentModal(true);
              await fetchProcedures();
              console.log(procedures);
            }
            }
          >Add +</Button>
        </div>
        <Table striped>
          <thead>
            <tr>
              <th>ID</th>
              <th>Booking Date</th>
              <th>Hospital Name</th>
              <th>Procedure Name</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment, index) => (
              <tr key={index}>
                <td>{appointment.BOOKING_ID}</td>
                <td>
                  {(() => {
                    const [year, month, day] = appointment.BOOKING_DATE.split('-');
                    return `${day}/${month}/${year}`;
                  })()}
                </td>
                <td>{appointment.HOSPITAL_NAME}</td>
                <td>{appointment.PROCEDURE_NAME}</td>
                <td>{appointment.BOOKING_STATUS}</td>
                <td className="btn-group" role="group" aria-label="Basic mixed styles example">
                  <button type="button" className="btn btn-success" onClick={() => { setEditMode(false); setShowViewModal(true); setAppointmentIndex(index); }}>View</button>
                  <button type="button" className="btn btn-warning" onClick={() => { setEditMode(true); setShowViewModal(true); setAppointmentIndex(index); }} data-bs-toggle="modal" data-bs-target="#staticBackdrop" disabled={appointment.BOOKING_STATUS.toLowerCase() !== 'scheduled'} >Edit</button>
                  <button type="button" className="btn btn-danger" onClick={() => { setShowModal(true); setAppointmentIndex(index); }} disabled={appointment.BOOKING_STATUS.toLowerCase() === 'cancelled'}>Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static" keyboard={false}>
          <Modal.Header closeButton>
            <Modal.Title>Cancel Appointment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to cancel this appointment?
            <br />
            This action cannot be undone.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => { handleCancelAppointment(appointmentIndex); setShowModal(false) }}>
              Cancel Appointment
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showViewModal} onHide={() => { setShowViewModal(false); setEditMode(false); setAppointmentIndex(null) }} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Appointment Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {appointments[appointmentIndex] && (
              <div className="row">
                {/* Left: Details */}
                <div className="col-md-7 border-end border-3 pe-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="bookingId" value={appointments[appointmentIndex].BOOKING_ID} disabled />
                        <label htmlFor="bookingId">Booking ID</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        {editMode ? (
                          <input
                            type="date"
                            className={`form-control border ${formValid.BOOKING_DATE ? 'border-primary' : 'border-danger'}`}
                            id="bookingDate"
                            value={editAppointment.BOOKING_DATE || ''}
                            disabled={!editMode}
                            onChange={e => setEditAppointment({ ...editAppointment, BOOKING_DATE: e.target.value })}
                          />
                        ) : (
                          <input
                            type="date"
                            className="form-control"
                            id="bookingDate"
                            value={appointments[appointmentIndex].BOOKING_DATE}
                            disabled
                          />
                        )}
                        <label htmlFor="bookingDate">Booking Date</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        {editMode ? (
                          <input
                            type="time"
                            className={`form-control border ${formValid.BOOKING_TIME ? 'border-primary' : 'border-danger'}`}
                            id="bookingTime"
                            value={editAppointment.BOOKING_TIME || ''}
                            disabled={!editMode}
                            onChange={e => setEditAppointment({ ...editAppointment, BOOKING_TIME: e.target.value })}
                          />
                        ) : (
                          <input
                            type="time"
                            className="form-control"
                            id="bookingTime"
                            value={appointments[appointmentIndex].BOOKING_TIME}
                            disabled
                          />
                        )}
                        <label htmlFor="bookingTime">Booking Time</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="bookingStatus" value={appointments[appointmentIndex].BOOKING_STATUS} disabled />
                        <label htmlFor="bookingStatus">Status</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="doctorName" value={appointments[appointmentIndex].DOCTOR_NAME} disabled />
                        <label htmlFor="doctorName">Doctor Name</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="procedureName" value={appointments[appointmentIndex].PROCEDURE_NAME} disabled />
                        <label htmlFor="procedureName">Procedure Name</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="procedureDuration" value={appointments[appointmentIndex].PROCEDURE_DURATION + " minutes"} disabled />
                        <label htmlFor="procedureDuration">Procedure Duration</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="roomType" value={appointments[appointmentIndex].ROOM_TYPE} disabled />
                        <label htmlFor="roomType">Room Type</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        {editMode ? (
                          <input
                            type="number"
                            className={`form-control border ${formValid.DURATION_OF_STAY ? 'border-primary' : 'border-danger'}`}
                            id="durationOfStay"
                            min="1"
                            value={editAppointment.DURATION_OF_STAY || ''}
                            disabled={!editMode}
                            onChange={
                              e => {
                                setEditAppointment({
                                  ...editAppointment, DURATION_OF_STAY: e.target.value

                                })
                              }}
                          />
                        ) : (
                          <input
                            type="text"
                            className="form-control"
                            id="durationOfStay"
                            value={appointments[appointmentIndex].DURATION_OF_STAY + " day(s)"}
                            disabled
                          />
                        )}
                        <label htmlFor="durationOfStay">Duration of Stay</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="phoneNo" value={appointments[appointmentIndex].PHONE_NO} disabled />
                        <label htmlFor="phoneNo">Phone No</label>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Right: Map and Hospital Info */}
                <div className="col-md-5 d-flex flex-column align-items-center">
                  <Map
                    containerStyle={{ width: "100%", height: "300px" }}
                    center={{
                      lat: appointments[appointmentIndex].LATITUDE,
                      lng: appointments[appointmentIndex].LONGITUDE
                    }}
                    zoom={12}
                  />
                  <div className="w-100 mt-3">
                    <div className="form-floating mb-3">
                      <input type="text" className="form-control" id="hospitalName" value={appointments[appointmentIndex].HOSPITAL_NAME} disabled />
                      <label htmlFor="hospitalName">Hospital Name</label>
                    </div>
                    <div className="form-floating mb-3">
                      <input type="text" className="form-control" id="branchLocation" value={appointments[appointmentIndex].BRANCH_LOCATION} disabled />
                      <label htmlFor="branchLocation">Branch Location</label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowViewModal(false); setEditMode(false); setAppointmentIndex(null); }}>
              Close
            </Button>
            {editMode && (
              <Button variant="primary" disabled={!(formValid.BOOKING_DATE === true && formValid.BOOKING_TIME === true && formValid.DURATION_OF_STAY === true)} onClick={async () => {
                const response = await fetch(`http://localhost:8000/api/bookings/by-booking/${appointments[appointmentIndex].BOOKING_ID}`, {
                  method: 'PATCH',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ BOOKING_DATE: editAppointment.BOOKING_DATE, BOOKING_TIME: editAppointment.BOOKING_TIME, DURATION_OF_STAY: editAppointment.DURATION_OF_STAY })
                });
                if (response.ok) {
                  const updatedAppointments = appointments.map((appt, i) =>
                    i === appointmentIndex ? { ...appt, ...editAppointment } : appt
                  );
                  setAppointments(updatedAppointments);
                  setShowViewModal(false);
                }
                else {
                  console.error('Error updating appointment:', response.statusText);
                }

                console.log({ BOOKING_DATE: editAppointment.BOOKING_DATE, BOOKING_TIME: editAppointment.BOOKING_TIME, DURATION_OF_STAY: editAppointment.DURATION_OF_STAY });
              }}>
                Save Changes
              </Button>
            )}
          </Modal.Footer>
        </Modal>

        <Modal show={showNewAppointmentModal} onHide={() => setShowNewAppointmentModal(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Book New Appointment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <input
                    type="date"
                    className={`form-control border ${newFormValid.BOOKING_DATE ? 'border-primary' : 'border-danger'}`}
                    id="newBookingDate"
                    min={new Date().toISOString().split('T')[0]}
                    value={newAppointment.BOOKING_DATE}
                    onChange={e => setNewAppointment({ ...newAppointment, BOOKING_DATE: e.target.value })}
                  />
                  <label htmlFor="newBookingDate">Booking Date</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <input
                    type="time"
                    className={`form-control border ${newFormValid.BOOKING_TIME ? 'border-primary' : 'border-danger'}`}
                    id="newBookingTime"
                    value={newAppointment.BOOKING_TIME}
                    onChange={e => setNewAppointment({ ...newAppointment, BOOKING_TIME: e.target.value })}
                  />
                  <label htmlFor="newBookingTime">Booking Time</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <input
                    type="number"
                    min="1"
                    className={`form-control border ${newFormValid.DURATION_OF_STAY ? 'border-primary' : 'border-danger'}`}
                    id="newDurationOfStay"
                    value={newAppointment.DURATION_OF_STAY}
                    onChange={e => setNewAppointment({ ...newAppointment, DURATION_OF_STAY: e.target.value })}
                  />
                  <label htmlFor="newDurationOfStay">Duration of Stay (days)</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <select
                    className={`form-select border ${newFormValid.HOSPITAL_NAME ? 'border-primary' : 'border-danger'}`}
                    id="newHospitalName"
                    value={newAppointment.HOSPITAL_NAME}
                    disabled={!newFormValid.PROCEDURE_NAME}
                    onChange={e => 
                    {
                      console.log(e.target.value);
                      setNewAppointment({ ...newAppointment, HOSPITAL_NAME: e.target.value })
                    }}
                  >
                    <option value="">Select Hospital</option>
                    {hospitals.map((hospital, idx) => (
                      <option key={idx} value={idx}>
                        {`${hospital.HOSPITAL_NAME} - ${hospital.LOCATION}`}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="newHospitalName">Hospital Name</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <select
                    className={`form-select border ${newFormValid.PROCEDURE_NAME ? 'border-primary' : 'border-danger'}`}
                    id="newProcedureName"
                    value={selectedProcedure ?? ""} 
                    onChange={async e => {
                      setNewAppointment({ ...newAppointment, PROCEDURE_NAME: procedures[e.target.value].PROCEDURE_NAME });
                      setSelectedProcedure(e.target.value);
                    }}
                  >
                    <option value="">Select Procedure</option>
                    {procedures.map((procedure, idx) => (
                      <option key={idx} value={idx}>
                        {procedure.PROCEDURE_NAME}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="newProcedureName">Procedure Name</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className={`form-control border ${newFormValid.DOCTOR_NAME ? 'border-primary' : 'border-danger'}`}
                    id="newDoctorName"
                    value={newAppointment.DOCTOR_NAME}
                    onChange={e => setNewAppointment({ ...newAppointment, DOCTOR_NAME: e.target.value })}
                  />
                  <label htmlFor="newDoctorName">Doctor Name</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className={`form-control border ${newFormValid.ROOM_TYPE ? 'border-primary' : 'border-danger'}`}
                    id="newRoomType"
                    value={newAppointment.ROOM_TYPE}
                    onChange={e => setNewAppointment({ ...newAppointment, ROOM_TYPE: e.target.value })}
                  />
                  <label htmlFor="newRoomType">Room Type</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className={`form-control border ${newFormValid.PHONE_NO ? 'border-primary' : 'border-danger'}`}
                    id="newPhoneNo"
                    value={newAppointment.PHONE_NO}
                    onChange={e => setNewAppointment({ ...newAppointment, PHONE_NO: e.target.value })}
                  />
                  <label htmlFor="newPhoneNo">Phone No</label>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNewAppointmentModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!isNewFormAllValid}
              onClick={async () => {
                // Example: POST to your backend
                const response = await fetch('http://localhost:8000/api/bookings', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newAppointment)
                });
                if (response.ok) {
                  setShowNewAppointmentModal(false);
                  setNewAppointment({
                    BOOKING_DATE: '',
                    BOOKING_TIME: '',
                    DURATION_OF_STAY: '',
                    HOSPITAL_NAME: '',
                    PROCEDURE_NAME: '',
                    DOCTOR_NAME: '',
                    ROOM_TYPE: '',
                    PHONE_NO: ''
                  });
                  // Optionally refresh appointments
                  // fetchAppointments();
                } else {
                  // Handle error
                  alert('Failed to book appointment');
                }
              }}
            >
              Book Appointment
            </Button>
          </Modal.Footer>
        </Modal>
      </section>
    </>
  );
};
export default Dashboard;