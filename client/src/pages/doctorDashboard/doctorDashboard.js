import React, { useState, useEffect } from 'react';
import Header from '../../components/header';
import DashboardHeader from '../../components/dashboardHeader';
import AppointmentTable from '../../components/appointmentTable';
import AppointmentViewModal from '../../components/appointmentViewModal';
import SpinnerComponent from '../../components/spinnerComponent';
import { sendGetRequest } from '../../utils/api';
import toTitleCase from '../../utils/toTitleCase';
import formatPhoneNumber from '../../utils/formatPhoneNumber';
import axios from 'axios'

const DoctorDashboard = () => {
  /*1a STATE VARIABLES */
  const [appointments, setAppointments] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [appointmentIndex, setAppointmentIndex] = useState(null);
  const [editAppointment, setEditAppointment] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(null);

  const [bookingStatusChanged, setBookingStatusChanged] = useState(false);
  const [newBookingStatus, setNewBookingStatus] = useState(null);

  /*1b USE_EFFECT FUNCTIONS */
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      const userID = JSON.parse(localStorage.getItem('userData')).userId;
      try {
        const response = await fetch(`http://localhost:8000/api/doctors/by-user-id/${userID}`, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();
        if (response.ok && data.length > 0) {
          setDoctorInfo(data[0]);
        } else {
          if (response.status === 401) {
            localStorage.removeItem('userData');
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Error fetching doctor info:', error);
        setDoctorInfo([]);
      }
    };
    fetchDoctorInfo();
  }, []);


  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const userID = JSON.parse(localStorage.getItem('userData')).userId;
        const reqString = `http://localhost:8000/api/bookings/by-doctor/${userID}`
        const response = await fetch(reqString, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();

        if (response.status === 404) {
          setAppointments([]);
          return;
        }
        if (response.status === 401) {
          localStorage.removeItem('userData');
          window.location.href = '/login';
          return;
        }
        data.forEach(booking => {
          booking.BOOKING_DATE = booking.BOOKING_DATE.split('T')[0];
          booking.HOSPITAL_NAME = toTitleCase(booking.HOSPITAL_NAME);
          booking.PATIENT_NAME = toTitleCase(booking.PATIENT_NAME);
          booking.ROOM_TYPE = toTitleCase(booking.ROOM_TYPE);
          booking.BOOKING_STATUS = toTitleCase(booking.BOOKING_STATUS);
          booking.BOOKING_TIME = new Date(booking.BOOKING_TIME).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          booking.PHONE_NO = formatPhoneNumber(booking.PHONE_NO);
        });
        setAppointments(data);

      } catch (error) {
        console.error('Error fetching appointments:', error);
        setAppointments([]);
      }
    };

    fetchAppointments();
  }, []);

  useEffect(() => {
    const fetchCurrentPatient = async () => {

      if (showViewModal === false) return
      if (appointmentIndex === null) return

      try {
        const userID = appointments[appointmentIndex].PATIENT_USER_ID
        if (isNaN(userID)) return
        const response = await axios.get(`http://localhost:8000/api/patients/by-user/${userID}`, { withCredentials: true });
        setCurrentPatient(response.data[0])
      }
      catch (error) {
        console.error(error);
      }
    }

    fetchCurrentPatient();
  }, [showViewModal]);

  const updateBookingStatus = async () => {

    if (!newBookingStatus || !bookingStatusChanged) return
    try {
      await axios.patch(
        `http://localhost:8000/api/bookings/by-booking/${appointments[appointmentIndex].BOOKING_ID}`,
        { BOOKING_STATUS: newBookingStatus },
        { withCredentials: true }
      );

      setAppointments(prevAppointments => {
        const updated = [...prevAppointments];
        updated[appointmentIndex] = {
          ...updated[appointmentIndex],
          BOOKING_STATUS: toTitleCase(newBookingStatus)
        };
        return updated;
      });
    }
    catch (error) {
      console.error(error);
    }
  }

  if (!appointments || !doctorInfo) return <SpinnerComponent />;

  return (
    <>
      <Header firstName={doctorInfo ? doctorInfo.F_NAME : 'Doctor'} />
      <section className="container-fluid mt-0">
        <DashboardHeader
          heading="Appointments"
          body="Your scheduled and past appointments"
          showAppointmentButton={false}
        />
        <AppointmentTable
          appointments={appointments}
          onView={index => {
            setShowViewModal(true);
            setAppointmentIndex(index);
          }}

          showCancelButton={false}
          showEditButton={false}
          showViewButton={true}
        />

        <AppointmentViewModal
          show={showViewModal}
          onHide={() => { setShowViewModal(false); setAppointmentIndex(null) }}
          appointment={appointments[appointmentIndex]}
          editAppointment={editAppointment}
          setEditAppointment={setEditAppointment}
          editMode={editMode}
          setEditMode={setEditMode}

          makeBookingStatusEditable={true}
          bookingStatusChanged={bookingStatusChanged}
          setBookingStatusChanged={setBookingStatusChanged}
          newBookingStatus={newBookingStatus}
          setNewBookingStatus={setNewBookingStatus}
          onSave={() => {
            updateBookingStatus();
            setShowViewModal(false);
            setNewBookingStatus(null);
            setBookingStatusChanged(false);
          }}
          currentPatient={currentPatient}

          showDoctorName={false}
          showPatientName={true}
        />
      </section>
    </>
  );
};

export default DoctorDashboard;