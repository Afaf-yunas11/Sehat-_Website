import React, { useState, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Map from './map';
import Overlay from 'react-bootstrap/esm/Overlay';
import Popover from 'react-bootstrap/Popover';
import Spinner from 'react-bootstrap/esm/Spinner';
import { bookingStatuses } from '../utils/constants'
import toTitleCase from '../utils/toTitleCase';

const AppointmentViewModal = ({
  show = false,
  onHide = () => { },
  appointment = null,
  editAppointment = null,
  setEditAppointment = () => { },
  editMode = false,
  setEditMode = () => { },
  formValid = {},
  onSave = () => { },
  setAppointmentIndex = () => { },

  makeBookingStatusEditable = true,
  bookingStatusChanged = false,
  setBookingStatusChanged = () => {},
  newBookingStatus = null,
  setNewBookingStatus = () => { },

  currentPatient = null,
  showPatientName = true,

  showDoctorName = true
}) => {

  const [showPatientPopover, setShowPatientPopover] = useState(false);
  const patientProfileButtonRef = useRef(null);

  if(appointment === null) return null

  return (
    <Modal show={show} onHide={() => { onHide(); setEditMode(false); setAppointmentIndex(null); setBookingStatusChanged(false); setNewBookingStatus(null) }} fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>Appointment Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {appointment && (
          <div className="row">
            {/* Left: Details */}
            <div className="col-md-7 border-end border-3 pe-3">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="form-floating mb-3">
                    <input type="text" className="form-control" id="bookingId" value={appointment.BOOKING_ID} disabled />
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
                        value={appointment.BOOKING_DATE}
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
                        value={appointment.BOOKING_TIME}
                        disabled
                      />
                    )}
                    <label htmlFor="bookingTime">Booking Time</label>
                  </div>
                </div>
                {makeBookingStatusEditable ? (
                  <div className="col-md-6">
                    <div className="form-floating mb-3">
                      <select
                        className="form-select"
                        id="bookingStatus"
                        value={newBookingStatus || appointment.BOOKING_STATUS.toLowerCase()}
                        onChange={e => {
                          const selectedStatus = e.target.value;
                          setNewBookingStatus(selectedStatus);
                          setBookingStatusChanged(true);
                        }}
                        disabled={!makeBookingStatusEditable}
                      >
                        {Object.values(bookingStatuses).map(status => (
                          <option key={status} value={status}>
                            {toTitleCase(status)}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="bookingStatus">Status</label>
                    </div>
                  </div>
                ) : (
                  <div className="col-md-6">
                    <div className="form-floating mb-3">
                      <input type="text" className="form-control" id="bookingStatus" value={appointment.BOOKING_STATUS} disabled />
                      <label htmlFor="bookingStatus">Status</label>
                    </div>
                  </div>
                )}
                {showDoctorName && (
                  <div className="col-md-6">
                    <div className="form-floating mb-3">
                      <input type="text" className="form-control" id="doctorName" value={appointment.DOCTOR_NAME} disabled />
                      <label htmlFor="doctorName">Doctor Name</label>
                    </div>
                  </div>
                )}

                {showPatientName && (
                  <div className='col-md-6' style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="patientName" value={appointment.PATIENT_NAME || 'NULL'} disabled />

                        <label htmlFor="patientName">Patient Name</label>
                      </div>
                    </div>
                    <Button
                      ref={patientProfileButtonRef}
                      variant="outline-primary"
                      disabled={false}
                      style={{
                        flex: 1,
                        marginLeft: 10,
                        minHeight: '55px',
                        marginBottom: '16px'
                      }}
                      onMouseEnter={() => { setShowPatientPopover(true) }}
                      onMouseLeave={() => { setShowPatientPopover(false) }}
                    >
                      View Profile
                    </Button>
                    <Overlay
                      target={patientProfileButtonRef.current}
                      show={showPatientPopover}
                      placement='right'
                    >
                      <Popover id="patient-profile-popover" style={{ minWidth: 350 }}>
                        <Popover.Header as="h3" style={{ backgroundColor: '#0d6efd', color: 'white', fontWeight: 'bold' }}>Patient Profile</Popover.Header>
                        <Popover.Body>
                          {currentPatient ? (
                            <>
                              <div>Patient Name: <b>{`${currentPatient.F_NAME} ${currentPatient.L_NAME}`}</b></div>
                              <hr />
                              <div>Blood Group: <b>{currentPatient.BLOOD_GROUP}</b> </div>
                              <div>Weight: <b>{`${currentPatient.WEIGHT} kgs`}</b></div>
                              <div>Height: <b>{`${currentPatient.HEIGHT} cm`}</b> </div>
                            </>
                          ) :

                            <Spinner size='sm' variant='primary'></Spinner>
                          }
                        </Popover.Body>
                      </Popover>
                    </Overlay>
                  </div>
                )}

                <div className="col-md-6">
                  <div className="form-floating mb-3">
                    <input type="text" className="form-control" id="procedureName" value={appointment.PROCEDURE_NAME} disabled />
                    <label htmlFor="procedureName">Procedure Name</label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-floating mb-3">
                    <input type="text" className="form-control" id="procedureDuration" value={appointment.PROCEDURE_DURATION + " minutes"} disabled />
                    <label htmlFor="procedureDuration">Procedure Duration</label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-floating mb-3">
                    <input type="text" className="form-control" id="roomType" value={appointment.ROOM_TYPE} disabled />
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
                        onChange={e => setEditAppointment({ ...editAppointment, DURATION_OF_STAY: e.target.value })}
                      />
                    ) : (
                      <input
                        type="text"
                        className="form-control"
                        id="durationOfStay"
                        value={appointment.DURATION_OF_STAY + " day(s)"}
                        disabled
                      />
                    )}
                    <label htmlFor="durationOfStay">Duration of Stay</label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-floating mb-3">
                    <input type="text" className="form-control" id="phoneNo" value={appointment.PHONE_NO} disabled />
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
                  lat: appointment.LATITUDE,
                  lng: appointment.LONGITUDE
                }}
                zoom={15}
              />
              <div className="w-100 mt-3">
                <div className="form-floating mb-3">
                  <input type="text" className="form-control" id="hospitalName" value={appointment.HOSPITAL_NAME} disabled />
                  <label htmlFor="hospitalName">Hospital Name</label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" className="form-control" id="branchLocation" value={appointment.BRANCH_LOCATION} disabled />
                  <label htmlFor="branchLocation">Branch Location</label>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => { onHide(); setEditMode(false); setAppointmentIndex(null); setBookingStatusChanged(false); setNewBookingStatus(null) }}>
          Close
        </Button>
        {editMode && (
          <Button
            variant="primary"
            disabled={!(formValid.BOOKING_DATE && formValid.BOOKING_TIME && formValid.DURATION_OF_STAY)}
            onClick={onSave}
          >
            Save Changes
          </Button>
        )}

        {bookingStatusChanged && makeBookingStatusEditable && (
          <Button
            variant="primary"
            onClick={onSave}
          >
            Save Changes
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}

export default AppointmentViewModal;