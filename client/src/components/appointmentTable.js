import React from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import standingDoctor from '../assets/standingDoctor.png';
import 'bootstrap/dist/css/bootstrap.min.css';



const AppointmentTable = ({
  appointments,
  onView = () => { },
  onEdit = () => { },
  onCancel = () => { },

  showPatientName = true,
  showViewButton = true,
  showEditButton = true,
  showCancelButton = true,
}) => {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center my-5">
        <img
          src={standingDoctor}
          alt="Nothing to see"
          style={{ maxWidth: 350, width: '100%', marginBottom: 16 }}
        />
        <div style={{ fontWeight: 500, fontSize: '1.4rem' }}>Nothing to see here</div>
        <div style={{ color: '#888' }}>Add an appointment to get started</div>
      </div>
    );
  }

  return (

    <div style={{ width: '100%' }}>
      <Table striped responsive bordered hover style={{ width: '100%', margin: 0 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Booking Date</th>
            <th>Hospital Name</th>
            {showPatientName && (<th> Patient Name</th>)}
            <th>Procedure Name</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {appointments.length > 0 && appointments.map((appointment, index) => (
            <tr key={index}>
              <td>{appointment.BOOKING_ID}</td>
              <td>
                {(() => {
                  const [year, month, day] = appointment.BOOKING_DATE.split('-');
                  return `${day}/${month}/${year}`;
                })()}
              </td>
              <td>{appointment.HOSPITAL_NAME}</td>
              {showPatientName && (<td> {appointment.PATIENT_NAME} </td>)}
              <td>{appointment.PROCEDURE_NAME}</td>
              <td>{appointment.BOOKING_STATUS}</td>
              <td className="btn-group" width='100%' role="group" aria-label="Basic mixed styles example">
                {showViewButton && (
                  <Button
                    variant="success"
                    onClick={() => onView(index)}
                    style={{ minWidth: 120 }}
                  >
                    View
                  </Button>
                )}

                {showEditButton && (
                  <Button
                    variant="warning"
                    onClick={() => onEdit(index)}
                    disabled={appointment.BOOKING_STATUS.toLowerCase() !== 'scheduled'}
                    style={{ minWidth: 120 }}
                  >
                    Edit
                  </Button>
                )}

                {showCancelButton && (
                  <Button
                    variant="danger"
                    onClick={() => onCancel(index)}
                    disabled={appointment.BOOKING_STATUS.toLowerCase() !== 'scheduled'}
                    style={{ minWidth: 120 }}
                  >
                    Cancel
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default AppointmentTable;