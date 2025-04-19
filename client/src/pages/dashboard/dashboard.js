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

import NewAppointmentModal from '../../components/newAppointmentModal';
import AppointmentViewModal from '../../components/appointmentViewModal';
import CancelAppointmentModal from '../../components/cancelAppointmentModal';
import AppointmentTable from '../../components/appointmentTable';
import AddAppointmentButton from '../../components/addAppointmentButton';
import { sendGetRequest } from '../../utils/api';

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
  const [selectedHospitalIndex, setSelectedHospitalIndex] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorIndex, setSelectedDoctorIndex] = useState(null);
  const [rooms, setRooms] = useState([]); // Add this state at the top with other useStates
  const [procedureCost, setProcedureCost] = useState(0);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);


  const [newAppointment, setNewAppointment] = useState({
    USER_ID: '',
    PROCEDURE_ID: '',
    LICENSE_NO: '',
    ROOM_ID: '',
    BOOKING_DATE: '',
    BOOKING_TIME: '',
    DURATION_OF_STAY: '',
    BOOKING_STATUS: 'scheduled'
  });
  const [newFormValid, setNewFormValid] = useState({
    USER_ID: true,
    PROCEDURE_ID: true,
    LICENSE_NO: true,
    ROOM_ID: true,
    BOOKING_DATE: true,
    BOOKING_TIME: true,
    DURATION_OF_STAY: true,
    BOOKING_STATUS: true
  });

  useEffect(() => {
    if (!showNewAppointmentModal) return;

    const today = new Date();
    const selectedDate = new Date(newAppointment.BOOKING_DATE);
    const isDateValid = newAppointment.BOOKING_DATE && selectedDate >= today.setHours(0, 0, 0, 0);
    const isTimeValid = !!newAppointment.BOOKING_TIME;
    const isDurationValid = !!newAppointment.DURATION_OF_STAY && Number(newAppointment.DURATION_OF_STAY) > 0;
    const isProcedureIdValid = !!newAppointment.PROCEDURE_ID;
    const isLicenseNoValid = !!newAppointment.LICENSE_NO;
    const isRoomIdValid = !!newAppointment.ROOM_ID;

    setNewFormValid({
      USER_ID: true,
      PROCEDURE_ID: isProcedureIdValid,
      LICENSE_NO: isLicenseNoValid,
      ROOM_ID: isRoomIdValid,
      BOOKING_DATE: isDateValid,
      BOOKING_TIME: isTimeValid,
      DURATION_OF_STAY: isDurationValid,
      BOOKING_STATUS: true, // Assuming BOOKING_STATUS is always valid
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

  useEffect(() => {

    if (selectedDoctorIndex === null || selectedRoomIndex === null) return;
    if (selectedDoctorIndex < 0 || selectedRoomIndex < 0) return;
    if (procedures[selectedProcedure] === undefined) return;
    if (doctors[selectedDoctorIndex] === undefined) return;

    sendGetRequest(`http://localhost:8000/api/procedures/procedure-cost-by-procedure-and-license/${procedures[selectedProcedure].PROCEDURE_ID}/${doctors[selectedDoctorIndex].LICENSE_NO}`, setProcedureCost);
  }, [selectedDoctorIndex, selectedRoomIndex]);

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

  async function normalizeRooms(rooms) {
    rooms.forEach((room) => {
      if (room.ROOM_TYPE) {
        room.ROOM_TYPE = toTitleCase(room.ROOM_TYPE);
      }
    })
  }
  async function normalizeHospitalNames(hospitals) {
    hospitals.forEach(hospital => {
      if (hospital.HOSPITAL_NAME) {
        hospital.HOSPITAL_NAME = toTitleCase(hospital.HOSPITAL_NAME);
      }
      if (hospital.LOCATION) {
        hospital.LOCATION = toTitleCase(hospital.LOCATION);
      }
    });
  }

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

  useEffect(() => {
    if (!userInfo) return;
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

  useEffect(() => {
    // Only fetch if both a hospital and procedure are selected
    if (
      selectedHospitalIndex === null ||
      selectedHospitalIndex === undefined ||
      selectedHospitalIndex < 0 ||
      !hospitals[selectedHospitalIndex] ||
      selectedProcedure === null ||
      selectedProcedure === undefined ||
      selectedProcedure < 0
    ) {
      setRooms([]); // Clear rooms if not valid
      return;
    }

    const branchId = hospitals[selectedHospitalIndex].BRANCH_ID;
    if (!branchId) {
      setRooms([]);
      return;
    }

    const fetchRoomsByBranch = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/rooms/by-branch-id/${branchId}`,
          {
            method: 'GET',
            credentials: 'include'
          }
        );
        if (response.status === 401) {
          localStorage.removeItem('userData');
          window.location.href = '/login';
          return;
        }
        const data = await response.json();
        normalizeRooms(data);
        setRooms(data);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setRooms([]);
      }
    };

    fetchRoomsByBranch();
  }, [selectedHospitalIndex, selectedProcedure, hospitals]);

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
    if (selectedProcedure === null || selectedProcedure === undefined) return;
    if (selectedProcedure < 0) return;
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
        await normalizeHospitalNames(data);
        setHospitals(data);
      } catch (error) {
        console.error('Error fetching hospitals:', error);
      }
    }
    fetchHospitalNames();
  }, [selectedProcedure])

  useEffect(() => {
    if (selectedHospitalIndex === null || selectedHospitalIndex === undefined) return;
    if (selectedProcedure === null || selectedProcedure === undefined) return;
    if (selectedHospitalIndex < 0 || selectedProcedure < 0) return;
    const fetchDoctorsByProcedureAndHospital = async (procedureId, hospitalId) => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/doctors/by-branch-and-procedure/${hospitalId}/${procedureId}`,
          {
            method: 'GET',
            credentials: 'include'
          }
        );
        if (response.status === 401) {
          localStorage.removeItem('userData');
          window.location.href = '/login';
          return [];
        }
        const data = await response.json();
        if (data.length === 0) {
          console.error('No doctors found for the selected hospital and procedure');
          setDoctors([]);
        }
        setDoctors(data);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        return [];
      }
    };
    fetchDoctorsByProcedureAndHospital(procedures[selectedProcedure].PROCEDURE_ID, hospitals[selectedHospitalIndex].BRANCH_ID);
  }, [selectedHospitalIndex, selectedProcedure]);

  return (
    <>
      <Header firstName={userInfo ? userInfo.F_NAME : 'User'} />
      <section>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Appointments</h2>
          <AddAppointmentButton
            onClick={async () => {
              setShowNewAppointmentModal(true);
              await fetchProcedures();
            }}
          />
        </div>
        <AppointmentTable
          appointments={appointments}
          onView={index => {
            setEditMode(false);
            setShowViewModal(true);
            setAppointmentIndex(index);
          }}
          onEdit={index => {
            setEditMode(true);
            setShowViewModal(true);
            setAppointmentIndex(index);
          }}
          onCancel={index => {
            setShowModal(true);
            setAppointmentIndex(index);
          }}
        />

        <CancelAppointmentModal
          show={showModal}
          onHide={() => setShowModal(false)}
          onCancel={() => {
            handleCancelAppointment(appointmentIndex);
            setShowModal(false);
          }}
        />

        <AppointmentViewModal
          show={showViewModal}
          onHide={() => setShowViewModal(false)}
          appointment={appointments[appointmentIndex]}
          editAppointment={editAppointment}
          setEditAppointment={setEditAppointment}
          editMode={editMode}
          setEditMode={setEditMode}
          formValid={formValid}
          setAppointmentIndex={setAppointmentIndex}
          onSave={async () => {
            const response = await fetch(`http://localhost:8000/api/bookings/by-booking/${appointments[appointmentIndex].BOOKING_ID}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                BOOKING_DATE: editAppointment.BOOKING_DATE,
                BOOKING_TIME: editAppointment.BOOKING_TIME,
                DURATION_OF_STAY: editAppointment.DURATION_OF_STAY
              })
            });
            if (response.ok) {
              const updatedAppointments = appointments.map((appt, i) =>
                i === appointmentIndex ? { ...appt, ...editAppointment } : appt
              );
              setAppointments(updatedAppointments);
              setShowViewModal(false);
            } else {
              console.error('Error updating appointment:', response.statusText);
            }
          }}
        />

        <NewAppointmentModal
          show={showNewAppointmentModal}
          onHide={() => setShowNewAppointmentModal(false)}
          newAppointment={newAppointment}
          setNewAppointment={setNewAppointment}
          newFormValid={newFormValid}
          isNewFormAllValid={isNewFormAllValid}
          onBook={async () => {
            const response = await fetch('http://localhost:8000/api/bookings', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newAppointment)
            });
            if (response.ok) {
              setShowNewAppointmentModal(false);
              setNewAppointment({
                USER_ID: '',
                PROCEDURE_ID: '',
                LICENSE_NO: '',
                ROOM_ID: '',
                BOOKING_DATE: '',
                BOOKING_TIME: '',
                DURATION_OF_STAY: '',
                BOOKING_STATUS: 'scheduled'
              });
              if (!userInfo) return
              fetchAppointments();
            } else {
              alert('Failed to book appointment');
            }
          }}
          hospitals={hospitals}
          selectedHospitalIndex={selectedHospitalIndex}
          setSelectedHospitalIndex={setSelectedHospitalIndex}
          setRooms={setRooms}
          procedures={procedures}
          selectedProcedure={selectedProcedure}
          setSelectedProcedure={setSelectedProcedure}
          procedureCost={procedureCost}
          setProcedureCost={setProcedureCost}
          setDoctors={setDoctors}
          doctors={doctors}
          selectedDoctorIndex={selectedDoctorIndex}
          setSelectedDoctorIndex={setSelectedDoctorIndex}
          rooms={rooms}
          selectedRoomIndex={selectedRoomIndex}
          setSelectedRoomIndex={setSelectedRoomIndex}
        />
      </section>
    </>
  );
};
export default Dashboard;