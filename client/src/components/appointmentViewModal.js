import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Map from './map';

const AppointmentViewModal = ({
  show,
  onHide,
  appointment,
  editAppointment,
  setEditAppointment,
  editMode,
  setEditMode,
  formValid,
  onSave,
  setAppointmentIndex
}) => (
  <Modal show={show} onHide={() => { onHide(); setEditMode(false); setAppointmentIndex(null); }} fullscreen>
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
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <input type="text" className="form-control" id="bookingStatus" value={appointment.BOOKING_STATUS} disabled />
                  <label htmlFor="bookingStatus">Status</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-floating mb-3">
                  <input type="text" className="form-control" id="doctorName" value={appointment.DOCTOR_NAME} disabled />
                  <label htmlFor="doctorName">Doctor Name</label>
                </div>
              </div>
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
      <Button variant="secondary" onClick={() => { onHide(); setEditMode(false); setAppointmentIndex(null); }}>
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
    </Modal.Footer>
  </Modal>
);

export default AppointmentViewModal;