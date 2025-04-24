import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import UserManagement from './components/UserManagement';
import ProcedureManagement from './components/ProcedureManagement';
import HospitalManagement from './components/HospitalManagement';
import DashboardHeader from '../../components/dashboardHeader';
import Header from '../../components/header';
import { checkAuthAndRedirect } from '../../utils/authMiddleware';
import axios from 'axios';
import './adminDashboard.css';
import SpinnerComponent from '../../components/spinnerComponent';

const AdminDashboard = () => {
  const [activeComponent, setActiveComponent] = useState('users');
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      if (await checkAuthAndRedirect()) {
        try {
          // First get the current user's auth info
          const authResponse = await axios.get('http://localhost:8000/api/auth/current-user', {
            withCredentials: true
          });

          // Then get the user's details
          const userResponse = await axios.get(`http://localhost:8000/api/users/${authResponse.data.userId}`, {
            withCredentials: true
          });

          // Finally get the admin-specific info
          const adminResponse = await axios.get(`http://localhost:8000/api/admins/by-user/${authResponse.data.userId}`, {
            withCredentials: true
          });

          setAdminInfo({
            ...userResponse.data[0],
            ...adminResponse.data[0]
          });
        } catch (error) {
          console.error('Error fetching admin info:', error);
          // If there's an error, the checkAuthAndRedirect middleware will handle the redirect
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAdminInfo();
  }, []);

  const renderComponent = () => {
    switch (activeComponent) {
      case 'users':
        return <UserManagement />;
      case 'procedures':
        return <ProcedureManagement />;
      case 'hospitals':
        return <HospitalManagement />;
      default:
        return <UserManagement />;
    }
  };

  if (loading) {
    return <SpinnerComponent />; // You might want to use your spinner component here
  }

  return (
    <>
      <Header firstName={adminInfo?.F_NAME || ''} />

      <DashboardHeader
        heading="Admin Dashboard"
        body="Manage users, procedures, and hospitals"
        showAppointmentButton={false}
      />
      
      <Container fluid>
        <Row>
          {/* Sidebar */}
          <Col md={2} className="sidebar bg-white border-end">
            <h4 className="text-center mb-4 mt-3">Admin Panel</h4>
            <Nav className="flex-column">
              <Nav.Link 
                className={`text-dark ${activeComponent === 'users' ? 'active' : ''}`}
                onClick={() => setActiveComponent('users')}
              >
                User Management
              </Nav.Link>
              <Nav.Link 
                className={`text-dark ${activeComponent === 'procedures' ? 'active' : ''}`}
                onClick={() => setActiveComponent('procedures')}
              >
                Procedure Management
              </Nav.Link>
              <Nav.Link 
                className={`text-dark ${activeComponent === 'hospitals' ? 'active' : ''}`}
                onClick={() => setActiveComponent('hospitals')}
              >
                Hospital Management
              </Nav.Link>
            </Nav>
          </Col>

          {/* Main Content */}
          <Col md={10} className="main-content p-4">
            {renderComponent()}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default AdminDashboard; 