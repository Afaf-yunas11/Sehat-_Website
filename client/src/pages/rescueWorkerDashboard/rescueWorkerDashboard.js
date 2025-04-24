import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, ButtonGroup } from 'react-bootstrap';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import Header from '../../components/header';
import DashboardHeader from '../../components/dashboardHeader';
import SpinnerComponent from '../../components/spinnerComponent';
import toTitleCase from '../../utils/toTitleCase';
import { checkAuthAndRedirect } from '../../utils/authMiddleware';
import standingDoctor from '../../assets/standingDoctor.png'
import axios from 'axios';

// Add these constants at the top
const GOOGLE_MAPS_API_KEY = 'AIzaSyCVqfLTuFwcGZkO_W7aNQzij-nL7mlVNy0';
const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const RescueWorkerDashboard = () => {
  const [emergencyCalls, setEmergencyCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCall, setEditingCall] = useState(null);
  const [rescueWorkerInfo, setRescueWorkerInfo] = useState(null);
  const [formData, setFormData] = useState({
    PATIENT_F_NAME: '',
    PATIENT_L_NAME: '',
    GENDER: '',
    AGE: '',
    ADDRESS: '',
    IS_USING_VENTILATOR: false,
    BRANCH_ID: ''
  });
  const [branches, setBranches] = useState([]);

  // Add new state variables for map functionality
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Replace LoadScript with useJsApiLoader
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Add callback for map load
  const onMapLoad = useCallback((map) => {
    // You can store the map instance here if needed
  }, []);

  useEffect(() => {
    const fetchRescueWorkerInfo = async () => {
      if (await checkAuthAndRedirect()) {
        try {
          // Get current user's auth info
          const authResponse = await axios.get('http://localhost:8000/api/auth/current-user', {
            withCredentials: true
          });

          // Get user details
          const userResponse = await axios.get(`http://localhost:8000/api/users/${authResponse.data.userId}`, {
            withCredentials: true
          });

          // Get rescue worker specific info
          const rescueWorkerResponse = await axios.get(`http://localhost:8000/api/rescue-workers/by-user/${authResponse.data.userId}`, {
            withCredentials: true
          });

          setRescueWorkerInfo({
            ...userResponse.data[0],
            ...rescueWorkerResponse.data[0]
          });
        } catch (error) {
          console.error('Error fetching rescue worker info:', error);
        }
      }
    };

    fetchRescueWorkerInfo();
  }, []);

  useEffect(() => {
    if (!rescueWorkerInfo) return;
    fetchEmergencyCalls();
  }, [rescueWorkerInfo]);

  const fetchEmergencyCalls = async () => {
    if (await checkAuthAndRedirect()) {
      try {
        const response = await axios.get(`http://localhost:8000/api/emergency-calls/by-rescue-worker/${rescueWorkerInfo.LICENSE_NO}`, {
          withCredentials: true
        });
        setEmergencyCalls(response.data);
      } catch (error) {
        console.error('Error fetching emergency calls:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      if (await checkAuthAndRedirect()) {
        try {
          const response = await axios.get('http://localhost:8000/api/branch', {
            withCredentials: true
          });
          setBranches(response.data);
        } catch (error) {
          console.error('Error fetching branches:', error);
        }
      }
    };

    fetchBranches();
  }, []);

  // Modify handleShowModal to include location finding
  const handleShowModal = (call = null) => {
    if (call) {
      setEditingCall(call);
      setFormData({
        PATIENT_F_NAME: call.PATIENT_F_NAME,
        PATIENT_L_NAME: call.PATIENT_L_NAME,
        GENDER: call.GENDER,
        AGE: call.AGE || '',
        ADDRESS: call.ADDRESS,
        IS_USING_VENTILATOR: call.IS_USING_VENTILATOR,
        BRANCH_ID: call.BRANCH_ID || ''
      });
      setShowModal(true);
    } else {
      setEditingCall(null);
      setFormData({
        PATIENT_F_NAME: '',
        PATIENT_L_NAME: '',
        GENDER: '',
        AGE: '',
        ADDRESS: '',
        IS_USING_VENTILATOR: false,
        BRANCH_ID: ''
      });
      // Get current location and find nearest hospital before showing the modal
      getCurrentLocation();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (await checkAuthAndRedirect()) {
      try {
        if (editingCall) {
          await axios.patch(
            `http://localhost:8000/api/emergency-calls/${editingCall.EMERGENCY_CALL_ID}`,
            formData,
            { withCredentials: true }
          );
        } else {
          await axios.post(
            'http://localhost:8000/api/emergency-calls',
            {
              ...formData,
              RESCUE_WORKER_ID: rescueWorkerInfo.LICENSE_NO
            },
            { withCredentials: true }
          );
        }
        fetchEmergencyCalls();
        setShowModal(false);
      } catch (error) {
        console.error('Error saving emergency call:', error);
        alert('Error saving emergency call. Please try again.');
      }
    }
  };

  const handleDelete = async (callId) => {
    if (window.confirm('Are you sure you want to delete this emergency call?')) {
      if (await checkAuthAndRedirect()) {
        try {
          await axios.delete(`http://localhost:8000/api/emergency-calls/${callId}`, {
            withCredentials: true
          });
          fetchEmergencyCalls();
        } catch (error) {
          console.error('Error deleting emergency call:', error);
          alert('Error deleting emergency call. Please try again.');
        }
      }
    }
  };

  // Modify the location modal component
  const renderLocationModal = () => (
    <Modal
      show={showLocationModal}
      onHide={() => setShowLocationModal(false)}
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title>Nearby Hospitals</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoaded && currentLocation && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={currentLocation}
            zoom={13}
            onLoad={onMapLoad}
          >
            {/* Current location marker */}
            <Marker
              position={currentLocation}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
              }}
            />

            {/* Hospital markers */}
            {console.log(nearbyHospitals)}
            {nearbyHospitals.map((hospital) => (
              <Marker
                key={hospital.BRANCH_ID}
                position={{
                  lat: parseFloat(hospital.LATITUDE),
                  lng: parseFloat(hospital.LONGITUDE)
                }}
                onClick={() => setSelectedHospital(hospital)}
                icon={{
                  url: hospital === selectedHospital ?
                    'http://maps.google.com/mapfiles/ms/icons/green-dot.png' :
                    'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                }}
              />
            ))}

            {/* Info window for selected hospital */}
            {selectedHospital && (
              <InfoWindow
                position={{
                  lat: parseFloat(selectedHospital.LATITUDE),
                  lng: parseFloat(selectedHospital.LONGITUDE)
                }}
                onCloseClick={() => setSelectedHospital(null)}
              >
                <div>
                  <h6>{selectedHospital.HOSPITAL_NAME ? toTitleCase(selectedHospital.HOSPITAL_NAME) : 'Hospital Branch'}</h6>
                  <p>{selectedHospital.LOCATION ? toTitleCase(selectedHospital.LOCATION) : 'Unknown Location'}</p>
                  <p>Distance: {selectedHospital.distance.toFixed(2)} km</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowLocationModal(false);
                      setShowModal(true);
                    }}
                  >
                    Confirm Selection
                  </Button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}

        <div className="mt-3">
          <h6>Nearest Hospitals:</h6>
          <div className="list-group">
            {nearbyHospitals.slice(0, 5).map((hospital) => (
              <div
                key={hospital.BRANCH_ID}
                className={`list-group-item list-group-item-action ${selectedHospital?.BRANCH_ID === hospital.BRANCH_ID ? 'active' : ''
                  }`}
                onClick={() => setSelectedHospital(hospital)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">{hospital.HOSPITAL_NAME ? toTitleCase(hospital.HOSPITAL_NAME) : 'Hospital Branch'}</h6>
                    <small>{hospital.LOCATION ? toTitleCase(hospital.LOCATION) : 'Unknown Location'}</small>
                  </div>
                  <span className={`badge ${selectedHospital?.BRANCH_ID === hospital.BRANCH_ID ?
                    'bg-white text-primary' : 'bg-primary'
                    } rounded-pill`}>
                    {hospital.distance.toFixed(2)} km
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowLocationModal(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            setShowLocationModal(false);
            setShowModal(true);
          }}
          disabled={!selectedHospital}
        >
          Confirm Selection
        </Button>
      </Modal.Footer>
    </Modal>
  );

  // Modify getCurrentLocation to automatically select nearest hospital
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);

          // Find and automatically select the nearest hospital
          if (await checkAuthAndRedirect()) {
            try {
              const response = await axios.get('http://localhost:8000/api/branch', {
                withCredentials: true
              });

              const hospitalsWithDistance = response.data
                .filter(branch => branch.LATITUDE && branch.LONGITUDE)
                .map(branch => ({
                  ...branch,
                  distance: calculateDistance(location, {
                    lat: parseFloat(branch.LATITUDE),
                    lng: parseFloat(branch.LONGITUDE)
                  })
                }))
                .sort((a, b) => a.distance - b.distance);

              setNearbyHospitals(hospitalsWithDistance);

              // Automatically select the nearest hospital
              if (hospitalsWithDistance.length > 0) {
                const nearestHospital = hospitalsWithDistance[0];
                setSelectedHospital(nearestHospital);
                setFormData(prev => ({
                  ...prev,
                  BRANCH_ID: nearestHospital.BRANCH_ID
                }));
              }
            } catch (error) {
              console.error('Error fetching hospitals:', error);
            }
          }

          setShowLocationModal(true);
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please check your browser settings.');
          setIsLoadingLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setIsLoadingLocation(false);
    }
  };

  // Add function to calculate distance between two points
  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  if (loading || !rescueWorkerInfo) return <SpinnerComponent />;



  return (
    <>
      <Header firstName={rescueWorkerInfo.F_NAME} />

      <DashboardHeader
        heading="Emergency Calls"
        body="Manage your emergency calls and patient transport"
        showAppointmentButton={false}
      />

      <div className="table-container w-100">
        <div className="table-header">
          <h2>Emergency Calls</h2>
          <Button variant="primary" onClick={() => handleShowModal()}>
            Add New Emergency Call
          </Button>
        </div>

        {emergencyCalls.length === 0 ? (
          <div className="text-center my-5">
            <img
              src={standingDoctor}
              alt="Nothing to see"
              style={{ maxWidth: 350, width: '100%', marginBottom: 16 }}
            />
            <div style={{ fontWeight: 500, fontSize: '1.4rem' }}>Nothing to see here</div>
            <div style={{ color: '#888' }}>Add an emergency call to get started</div>
          </div>

        ) : (

          <Table striped bordered hover responsive className="w-100">
            <thead>
              <tr className="text-center align-middle">
                <th>ID</th>
                <th>Patient Name</th>
                <th>Hospital Branch</th>
                <th>Address</th>
                <th>Using Ventilator</th>
                <th>Call Date</th>
                <th style={{ width: '200px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {
                emergencyCalls.map(call => (
                  <tr key={call.EMERGENCY_CALL_ID} className="text-center align-middle">
                    <td>{call.EMERGENCY_CALL_ID}</td>
                    <td>{`${toTitleCase(call.PATIENT_F_NAME)} ${toTitleCase(call.PATIENT_L_NAME)}`}</td>
                    <td>
                      {call.HOSPITAL_NAME ? (
                        <>
                          {toTitleCase(call.HOSPITAL_NAME)}
                          <br />
                          <small className="text-muted">{toTitleCase(call.BRANCH_LOCATION)}</small>
                        </>
                      ) : (
                        'Not Assigned'
                      )}
                    </td>
                    <td>{call.ADDRESS}</td>
                    <td>{call.IS_USING_VENTILATOR ? 'Yes' : 'No'}</td>
                    <td>{new Date(call.CALL_DATE).toLocaleDateString()}</td>
                    <td>
                      <ButtonGroup>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleShowModal(call)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(call.EMERGENCY_CALL_ID)}
                        >
                          Delete
                        </Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                ))}

            </tbody>
          </Table>)}

        {/* Add the location modal */}
        {renderLocationModal()}

        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {editingCall ? 'Edit Emergency Call' : 'Add New Emergency Call'}
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.FloatingLabel label="First Name">
                      <Form.Control
                        type="text"
                        placeholder="First Name"
                        value={formData.PATIENT_F_NAME}
                        onChange={(e) => setFormData({
                          ...formData,
                          PATIENT_F_NAME: e.target.value
                        })}
                        required
                      />
                    </Form.FloatingLabel>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.FloatingLabel label="Last Name">
                      <Form.Control
                        type="text"
                        placeholder="Last Name"
                        value={formData.PATIENT_L_NAME}
                        onChange={(e) => setFormData({
                          ...formData,
                          PATIENT_L_NAME: e.target.value
                        })}
                        required
                      />
                    </Form.FloatingLabel>
                  </Form.Group>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.FloatingLabel label="Gender">
                      <Form.Select
                        value={formData.GENDER}
                        onChange={(e) => setFormData({
                          ...formData,
                          GENDER: e.target.value
                        })}
                        required
                      >
                        <option value="">Select gender...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Form.Select>
                    </Form.FloatingLabel>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.FloatingLabel label="Age">
                      <Form.Control
                        type="number"
                        placeholder="Age"
                        value={formData.AGE}
                        onChange={(e) => setFormData({
                          ...formData,
                          AGE: e.target.value
                        })}
                        min="0"
                        max="200"
                      />
                    </Form.FloatingLabel>
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.FloatingLabel label="Address">
                  <Form.Control
                    as="textarea"
                    placeholder="Address"
                    value={formData.ADDRESS}
                    onChange={(e) => setFormData({
                      ...formData,
                      ADDRESS: e.target.value
                    })}
                    required
                    style={{ height: '100px' }}
                  />
                </Form.FloatingLabel>
              </Form.Group>

              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.FloatingLabel label="Hospital Branch">
                      <Form.Select
                        value={formData.BRANCH_ID}
                        onChange={(e) => setFormData({
                          ...formData,
                          BRANCH_ID: e.target.value
                        })}
                      >
                        <option value="">Select hospital branch...</option>
                        {branches.map(branch => (
                          <option key={branch.BRANCH_ID} value={branch.BRANCH_ID}>
                            {`${toTitleCase(branch.HOSPITAL_NAME)} - ${toTitleCase(branch.LOCATION)}`}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.FloatingLabel>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="ventilator-switch"
                      label="Patient Using Ventilator"
                      checked={formData.IS_USING_VENTILATOR}
                      onChange={(e) => setFormData({
                        ...formData,
                        IS_USING_VENTILATOR: e.target.checked
                      })}
                    />
                  </Form.Group>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingCall ? 'Save Changes' : 'Add Emergency Call'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </>
  );
};

export default RescueWorkerDashboard; 