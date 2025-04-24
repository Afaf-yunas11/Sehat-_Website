import React, { useState, useEffect } from 'react';
import { Table, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import axios from 'axios';
import { checkAuthAndRedirect } from '../../../utils/authMiddleware';
import userTypes from '../../../utils/userTypes';
import toTitleCase from '../../../utils/toTitleCase';
import SpinnerComponent from '../../../components/spinnerComponent';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (await checkAuthAndRedirect()) {
      try {
        const response = await axios.get('http://localhost:8000/api/users', {
          withCredentials: true
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBanUser = async (userId, isBanned) => {
    if (await checkAuthAndRedirect()) {
      try {
        await axios.patch(`http://localhost:8000/api/users/${userId}`, {
          ACCOUNT_STATUS: isBanned ? 'active' : 'inactive'
        }, {
          withCredentials: true
        });
        fetchUsers(); // Refresh the list
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    }
  };

  const formatRole = (role) => {
    return toTitleCase(role.replace(/_/g, ' '));
  };

  const filteredUsers = users.filter(user => {
    const searchTerms = searchTerm.toLowerCase().split(' ');
    const userFullName = `${user.F_NAME} ${user.L_NAME}`.toLowerCase();
    const userEmail = user.EMAIL.toLowerCase();
    
    const matchesSearch = searchTerms.every(term => 
      userFullName.includes(term) || 
      userEmail.includes(term)
    );
    
    const matchesRole = filterRole === 'all' || user.ROLE === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="table-container">
      <div className="table-header">
        <h2>User Management</h2>
        <div className="d-flex gap-3">
          <InputGroup style={{ width: '300px' }}>
            <Form.Control
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <Form.Select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="all">All Roles</option>
            <option value={userTypes.PATIENTS}>Patients</option>
            <option value={userTypes.DOCTORS}>Doctors</option>
            <option value={userTypes.RESCUE_WORKERS}>Rescue Workers</option>
          </Form.Select>
        </div>
      </div>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="6" className="text-center"><SpinnerComponent /></td>
            </tr>
          ) : filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center">No users found</td>
            </tr>
          ) : (
            filteredUsers.map(user => (
              <tr key={user.USER_ID}>
                <td>{user.USER_ID}</td>
                <td>{`${user.F_NAME} ${user.L_NAME}`}</td>
                <td>{user.EMAIL}</td>
                <td>{formatRole(user.ROLE)}</td>
                <td>
                  <Badge bg={user.ACCOUNT_STATUS.toLowerCase() === 'active' ? 'success' : 'danger'}>
                    {toTitleCase(user.ACCOUNT_STATUS)}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant={user.ACCOUNT_STATUS.toLowerCase() === 'active' ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleBanUser(user.USER_ID, user.ACCOUNT_STATUS.toLowerCase() === 'inactive')}
                  >
                    {user.ACCOUNT_STATUS.toLowerCase() === 'active' ? 'Ban' : 'Unban'}
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default UserManagement; 