import React, { useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';

import { useState, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const NewAppointmentModal = ({
  show,
  onHide,
  newAppointment,
  setNewAppointment,
  newFormValid,
  isNewFormAllValid,
  onBook,
  hospitals,
  selectedHospitalIndex,
  setSelectedHospitalIndex,
  setRooms,
  procedures,
  selectedProcedure,
  setSelectedProcedure,
  procedureCost,
  setProcedureCost,
  setDoctors,
  setRoomsOnProcedure,
  doctors,
  selectedDoctorIndex,
  setSelectedDoctorIndex,
  rooms,
  selectedRoomIndex,
  setSelectedRoomIndex
}) => {

  // Add refs and state for popover
  const [showPopover, setShowPopover] = useState(false);
  const costButtonRef = useRef(null);

  // Calculate costs
  const roomCost = rooms && rooms[selectedRoomIndex] ? parseInt(rooms[selectedRoomIndex].ROOM_COST_PER_NIGHT || 0) : 0;
  const duration = parseInt(newAppointment.DURATION_OF_STAY || 0);
  const procedureCostValue = procedureCost && procedureCost.procedureCost ? parseInt(procedureCost.procedureCost) : 0;
  const totalCost = roomCost * duration + procedureCostValue;
  const priceAvailable = !!(roomCost && duration && procedureCostValue);


  return (

    <Modal show={show} onHide={onHide} fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>Book New Appointment</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row g-3">

          {/* Booking Info Section */}
          <h5 className="mt-2 mb-1">Booking Info</h5>
          <div className="col-md-4">
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
          <div className="col-md-4">
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
          <div className="col-md-4">
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

          {/* Procedure Info Section */}
          <h5 className="mt-3 mb-1">Procedure Info</h5>
          <div className="col-md-4">
            <div className="form-floating mb-3">
              <select
                className={`form-select border border-primary`}
                id="newProcedureName"
                value={selectedProcedure ?? -1}
                onChange={async e => {
                  const idx = Number(e.target.value);
                  if (idx < 0) {
                    setSelectedProcedure(null);
                    setNewAppointment({ ...newAppointment, PROCEDURE_ID: "", LICENSE_NO: "", ROOM_ID: "" });
                    setSelectedHospitalIndex(null);
                    setDoctors([]);
                    setRooms([]);
                    return;
                  }
                  setNewAppointment({ ...newAppointment, PROCEDURE_ID: procedures[idx].PROCEDURE_ID, LICENSE_NO: "", ROOM_ID: "" });
                  setSelectedProcedure(idx);
                  setSelectedHospitalIndex(null);
                  setDoctors([]);
                  setRooms([]);
                }}
              >
                <option value={-1}>Select Procedure</option>
                {(procedures || []).map((procedure, idx) => (
                  <option key={idx} value={idx}>
                    {procedure.PROCEDURE_NAME}
                  </option>
                ))}
              </select>
              <label htmlFor="newProcedureName">Procedure Type</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-floating mb-3">
              <select
                className={`form-select border ${newFormValid.PROCEDURE_ID ? 'border-primary' : 'border-danger'}`}
                id="newHospitalName"
                value={selectedHospitalIndex ?? ""}
                disabled={!newFormValid.PROCEDURE_ID}
                onChange={e => {
                  if (e.target.value === "") {
                    setNewAppointment({ ...newAppointment, ROOM_ID: "" });
                    setSelectedHospitalIndex(null);
                    setRooms([]);
                  } else {
                    setSelectedHospitalIndex(Number(e.target.value));
                    setRooms([]);
                  }
                }}
              >
                <option value="">Select Hospital Branch</option>
                {(hospitals || []).map((hospital, idx) => (
                  <option key={idx} value={idx}>
                    {`${hospital.HOSPITAL_NAME} - ${hospital.LOCATION}`}
                  </option>
                ))}
              </select>
              <label htmlFor="newHospitalName">Hospital Branch</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-floating mb-3">
              <select
                className={`form-select border ${newFormValid.ROOM_ID ? 'border-primary' : 'border-danger'}`}
                id="newRoomType"
                value={selectedRoomIndex ?? ""}
                onChange={(e) => {

                  if (e.target.value === "") {
                    setNewAppointment({ ...newAppointment, ROOM_ID: "" });
                    setSelectedRoomIndex(null);
                    return;
                  }

                  setNewAppointment({ ...newAppointment, ROOM_ID: rooms[e.target.value].ROOM_ID });
                  setSelectedRoomIndex(e.target.value);
                }}
                disabled={!rooms || rooms.length === 0}
              >
                <option value="">Select Room</option>
                {rooms && rooms.map((room, idx) => (
                  <option key={idx} value={idx}>
                    {room.ROOM_TYPE}
                  </option>
                ))}
              </select>
              <label htmlFor="newRoomType">Room Type</label>
            </div>
          </div>

          {/* Doctor Info Section */}
          <h5 className="mt-3 mb-1">Doctor Info</h5>
          <div className="col-md-6">
            <div className="form-floating mb-3">
              <select
                className={`form-select border ${newFormValid.ROOM_ID ? 'border-primary' : 'border-danger'}`}
                id={selectedDoctorIndex ?? ""}
                value={selectedDoctorIndex ?? ""}
                onChange={e => {
                  if (e.target.value === "") {
                    setNewAppointment({ ...newAppointment, LICENSE_NO: "" });
                    setSelectedDoctorIndex(null);
                  } else {
                    setNewAppointment({ ...newAppointment, LICENSE_NO: doctors[e.target.value].LICENSE_NO });
                    setSelectedDoctorIndex(e.target.value);
                  }
                }}
                disabled={!doctors || doctors.length === 0}
              >
                <option value="">Select Doctor</option>
                {doctors && doctors.map((doctor, idx) => (
                  <option key={idx} value={idx}>
                    {`Dr. ${doctor.F_NAME} ${doctor.L_NAME}`}
                  </option>
                ))}
              </select>
              <label htmlFor="newDoctorName">Doctor Name</label>
            </div>
          </div>

          {/* Show doctor info if a doctor is selected */}
          {doctors && newAppointment.LICENSE_NO && (() => {
            const selectedDoctor = doctors.find(
              doc => doc.LICENSE_NO === newAppointment.LICENSE_NO
            );
            if (
              selectedDoctorIndex < 0 ||
              selectedDoctorIndex === undefined ||
              selectedDoctorIndex === null
            )
              return null;
            return (
              <>
                <div className="col-md-6">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      id="doctorRating"
                      value={doctors[selectedDoctorIndex].RATING}
                      disabled
                    />
                    <label htmlFor="doctorRating">Rating</label>
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '1.5rem',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const rating = doctors[selectedDoctorIndex].RATING;
                        if (i < Math.floor(rating)) {
                          return <span key={i} style={{ color: '#ffc107' }}>★</span>;
                        } else if (i < rating) {
                          // Half star
                          return (
                            <span key={i} style={{ color: '#ffc107', position: 'relative', display: 'inline-block', width: '1em' }}>
                              <span style={{ position: 'absolute', width: '50%', overflow: 'hidden' }}>★</span>
                              <span style={{ color: '#e4e5e9' }}>★</span>
                            </span>
                          );
                        } else {
                          return <span key={i} style={{ color: '#e4e5e9' }}>★</span>;
                        }
                      })}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      id="doctorSpecialization"
                      value={doctors[selectedDoctorIndex].SPECIALIZATION_NAME}
                      disabled
                    />
                    <label htmlFor="doctorSpecialization">Specialization</label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      id="doctorLicense"
                      value={doctors[selectedDoctorIndex].LICENSE_NO}
                      disabled
                    />
                    <label htmlFor="doctorLicense">License No</label>
                  </div>
                </div>
              </>
            );
          })()}

        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-between align-items-center w-100">
          {/* Total Cost Thumbnail with Popover */}
          <Button
            ref={costButtonRef}
            variant="outline-primary"
            disabled={!priceAvailable}
            style={{
              fontWeight: 600,
              fontSize: '1rem',
              minWidth: '220px',
              textAlign: 'left'
            }}
            className="me-3"
            onMouseEnter={() => priceAvailable && setShowPopover(true)}
            onMouseLeave={() => setShowPopover(false)}
          >
            Estimated Cost: {priceAvailable ? `PKR ${totalCost}` : ''}
          </Button>
          <Overlay
            target={costButtonRef.current}
            show={showPopover}
            placement="top"
          >
            <Popover id="cost-popover" style={{ minWidth: 350 }}>
              <Popover.Header as="h3" style={{ backgroundColor: '#0d6efd', color: 'white', fontWeight: 'bold' }}>Cost Breakdown</Popover.Header>
              <Popover.Body>
                <div>Room Cost: PKR {roomCost} x {duration} days = <b>PKR {roomCost * duration}</b></div>
                <div>Procedure Cost: <b>PKR {procedureCostValue}</b></div>
                <hr />
                <div><b>Total: PKR {totalCost}</b></div>
              </Popover.Body>
            </Popover>
          </Overlay>
          <div>
            <Button variant="secondary" onClick={onHide}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!isNewFormAllValid}
              onClick={(e) => {
                newAppointment.DURATION_OF_STAY = parseInt(newAppointment.DURATION_OF_STAY);
                newAppointment.ROOM_ID = parseInt(newAppointment.ROOM_ID);
                newAppointment.USER_ID = parseInt(JSON.parse(localStorage.getItem("userData")).userId);
                const bookingTime = newAppointment.BOOKING_TIME;
                const formattedBookingTime = bookingTime.length === 5 ? bookingTime + ':00' : bookingTime;
                newAppointment.BOOKING_TIME = formattedBookingTime;
                onBook();
              }}
              className="ms-2"
            >
              Book Appointment
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
};

export default NewAppointmentModal;