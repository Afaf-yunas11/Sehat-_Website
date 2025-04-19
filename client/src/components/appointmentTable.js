import React from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';

const AppointmentTable = ({
  appointments,
  onView,
  onEdit,
  onCancel
}) => (
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
            <Button variant="success" onClick={() => onView(index)}>View</Button>
            <Button
              variant="warning"
              onClick={() => onEdit(index)}
              disabled={appointment.BOOKING_STATUS.toLowerCase() !== 'scheduled'}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => onCancel(index)}
              disabled={appointment.BOOKING_STATUS.toLowerCase() === 'cancelled'}
            >
              Cancel
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
);

export default AppointmentTable;