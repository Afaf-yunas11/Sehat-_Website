import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Form, Modal, Accordion, Card, Badge, ButtonGroup } from 'react-bootstrap';
import axios from 'axios';
import { checkAuthAndRedirect } from '../../../utils/authMiddleware';
import toTitleCase from '../../../utils/toTitleCase';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCVqfLTuFwcGZkO_W7aNQzij-nL7mlVNy0'; // Replace with your API key

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 33.6844,
  lng: 73.0479
};

const HospitalManagement = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [selectedBranchIndex, setSelectedBranchIndex] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(defaultCenter);
  const [formData, setFormData] = useState({
    HOSPITAL_ID: '',
    HOSPITAL_NAME: '',
    branches: [{
      ADDRESS: '',
      CITY: '',
      TOTAL_BEDS: '',
      TOTAL_VENTILATORS: '',
      LATITUDE: '',
      LONGITUDE: '',
      PHONE_NO: ''
    }]
  });

  // Add new state for map loading
  const [mapLoaded, setMapLoaded] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const onMapLoad = useCallback((map) => {
    // You can store the map instance here if needed
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    if (await checkAuthAndRedirect()) {
      try {
        const response = await axios.get('http://localhost:8000/api/hospitals', {
          withCredentials: true
        });

        // Group branches by hospital
        const groupedHospitals = response.data.reduce((acc, branch) => {
          if (!acc[branch.HOSPITAL_ID]) {
            acc[branch.HOSPITAL_ID] = {
              HOSPITAL_ID: branch.HOSPITAL_ID,
              HOSPITAL_NAME: toTitleCase(branch.HOSPITAL_NAME),
              branches: []
            };
          }

          // Extract address and city from LOCATION if present
          let address = '';
          let city = '';
          if (branch.LOCATION) {
            const locationParts = branch.LOCATION.split(', ');
            if (locationParts.length >= 2) {
              // Last part is the city, everything before is the address
              city = locationParts.pop();
              address = locationParts.join(', ');
            } else {
              address = branch.LOCATION;
            }
          }

          acc[branch.HOSPITAL_ID].branches.push({
            BRANCH_ID: branch.BRANCH_ID,
            LOCATION: branch.LOCATION, // Keep for display purposes
            ADDRESS: address,
            CITY: city,
            TOTAL_BEDS: branch.TOTAL_BEDS,
            TOTAL_VENTILATORS: branch.TOTAL_VENTILATORS,
            PHONE_NO: branch.PHONE_NO,
            LATITUDE: branch.LATITUDE,
            LONGITUDE: branch.LONGITUDE
          });
          return acc;
        }, {});

        setHospitals(Object.values(groupedHospitals));
      } catch (error) {
        console.error('Error fetching hospitals:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShowModal = (hospital = null) => {
    if (hospital) {
      setEditingHospital(hospital);
      setFormData({
        HOSPITAL_ID: hospital.HOSPITAL_ID,
        HOSPITAL_NAME: hospital.HOSPITAL_NAME,
        branches: hospital.branches
      });
    } else {
      setEditingHospital(null);
      setFormData({
        HOSPITAL_ID: '',
        HOSPITAL_NAME: '',
        branches: [{
          ADDRESS: '',
          CITY: '',
          TOTAL_BEDS: '',
          TOTAL_VENTILATORS: '',
          LATITUDE: '',
          LONGITUDE: '',
          PHONE_NO: ''
        }]
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingHospital(null);
    setFormData({
      HOSPITAL_ID: '',
      HOSPITAL_NAME: '',
      branches: [{
        ADDRESS: '',
        CITY: '',
        TOTAL_BEDS: '',
        TOTAL_VENTILATORS: '',
        LATITUDE: '',
        LONGITUDE: '',
        PHONE_NO: ''
      }]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (await checkAuthAndRedirect()) {
      try {
        if (editingHospital) {
          // Update hospital name
          await axios.patch(
            `http://localhost:8000/api/hospitals/${editingHospital.HOSPITAL_ID}`,
            { HOSPITAL_NAME: formData.HOSPITAL_NAME },
            { withCredentials: true }
          );

          // Update existing branches and add new ones
          for (const branch of formData.branches) {
            if (branch.BRANCH_ID) {
              // Update existing branch
              await axios.patch(
                `http://localhost:8000/api/branch/${branch.BRANCH_ID}`,
                {
                  HOSPITAL_ID: editingHospital.HOSPITAL_ID,
                  TOTAL_BEDS: parseInt(branch.TOTAL_BEDS),
                  TOTAL_VENTILATORS: parseInt(branch.TOTAL_VENTILATORS),
                  ADDRESS: branch.ADDRESS,
                  CITY: branch.CITY,
                  LATITUDE: branch.LATITUDE ? parseFloat(branch.LATITUDE) : null,
                  LONGITUDE: branch.LONGITUDE ? parseFloat(branch.LONGITUDE) : null,
                  PHONE_NO: branch.PHONE_NO
                },
                { withCredentials: true }
              );
            } else {
              // Add new branch
              await axios.post(
                'http://localhost:8000/api/branch',
                {
                  HOSPITAL_ID: editingHospital.HOSPITAL_ID,
                  TOTAL_BEDS: parseInt(branch.TOTAL_BEDS),
                  TOTAL_VENTILATORS: parseInt(branch.TOTAL_VENTILATORS),
                  ADDRESS: branch.ADDRESS,
                  CITY: branch.CITY,
                  LATITUDE: branch.LATITUDE ? parseFloat(branch.LATITUDE) : null,
                  LONGITUDE: branch.LONGITUDE ? parseFloat(branch.LONGITUDE) : null,
                  PHONE_NO: branch.PHONE_NO
                },
                { withCredentials: true }
              );
            }
          }

          // Handle deleted branches
          const existingBranchIds = editingHospital.branches.map(b => b.BRANCH_ID);
          const currentBranchIds = formData.branches.map(b => b.BRANCH_ID).filter(Boolean);
          const deletedBranchIds = existingBranchIds.filter(id => !currentBranchIds.includes(id));

          for (const branchId of deletedBranchIds) {
            await axios.delete(`http://localhost:8000/api/branch/${branchId}`, {
              withCredentials: true
            });
          }
        } else {
          // Create new hospital
          const hospitalResponse = await axios.post(
            'http://localhost:8000/api/hospitals',
            {
              HOSPITAL_NAME: formData.HOSPITAL_NAME
            },
            { withCredentials: true }
          );

          formData.HOSPITAL_ID = hospitalResponse.data.HOSPITAL_ID;

          for (const branch of formData.branches) {
            await axios.post(
              'http://localhost:8000/api/branch',
              {
                HOSPITAL_ID: parseInt(formData.HOSPITAL_ID),
                TOTAL_BEDS: parseInt(branch.TOTAL_BEDS),
                TOTAL_VENTILATORS: parseInt(branch.TOTAL_VENTILATORS),
                ADDRESS: branch.ADDRESS,
                CITY: branch.CITY,
                LATITUDE: branch.LATITUDE ? parseFloat(branch.LATITUDE) : null,
                LONGITUDE: branch.LONGITUDE ? parseFloat(branch.LONGITUDE) : null,
                PHONE_NO: branch.PHONE_NO
              },
              { withCredentials: true }
            );
          }
        }

        fetchHospitals();
        handleCloseModal();
      } catch (error) {
        console.error('Error saving hospital:', error);
        if (error.response?.data?.error) {
          alert(error.response.data.error);
        } else {
          alert('An error occurred while saving the hospital');
        }
      }
    }
  };

  const handleDelete = async (hospitalId) => {
    if (window.confirm('Are you sure you want to delete this hospital and all its branches?')) {
      if (await checkAuthAndRedirect()) {
        try {
          // First delete all branches of the hospital
          const hospital = hospitals.find(h => h.HOSPITAL_ID === hospitalId);
          for (const branch of hospital.branches) {
            await axios.delete(`http://localhost:8000/api/branch/${branch.BRANCH_ID}`, {
              withCredentials: true
            });
          }

          // Then delete the hospital
          await axios.delete(`http://localhost:8000/api/hospitals/${hospitalId}`, {
            withCredentials: true
          });

          fetchHospitals();
        } catch (error) {
          console.error('Error deleting hospital:', error);
          if (error.response?.data?.error) {
            alert(error.response.data.error);
          } else {
            alert('An error occurred while deleting the hospital');
          }
        }
      }
    }
  };

  const handleAddBranch = () => {
    setFormData({
      ...formData,
      branches: [
        ...formData.branches,
        {
          ADDRESS: '',
          CITY: '',
          TOTAL_BEDS: '',
          TOTAL_VENTILATORS: '',
          LATITUDE: '',
          LONGITUDE: '',
          PHONE_NO: ''
        }
      ]
    });
  };

  const handleRemoveBranch = (index) => {
    const newBranches = formData.branches.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      branches: newBranches
    });
  };

  const handleBranchChange = (index, field, value) => {
    const newBranches = [...formData.branches];
    newBranches[index] = {
      ...newBranches[index],
      [field]: value
    };
    setFormData({
      ...formData,
      branches: newBranches
    });
  };

  const handleMapClick = (event) => {
    setSelectedLocation({
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    });
  };

  const handleLocationSelect = () => {
    const newBranches = [...formData.branches];
    newBranches[selectedBranchIndex] = {
      ...newBranches[selectedBranchIndex],
      LATITUDE: Number(selectedLocation.lat).toFixed(6),
      LONGITUDE: Number(selectedLocation.lng).toFixed(6)
    };
    setFormData({
      ...formData,
      branches: newBranches
    });
    setShowMapModal(false);
  };

  const openMapModal = (index) => {
    setSelectedBranchIndex(index);
    const branch = formData.branches[index];
    if (branch.LATITUDE && branch.LONGITUDE) {
      setSelectedLocation({
        lat: parseFloat(branch.LATITUDE),
        lng: parseFloat(branch.LONGITUDE)
      });
    } else {
      setSelectedLocation(defaultCenter);
    }
    setShowMapModal(true);
  };

  // Function to format coordinates nicely
  const formatCoordinates = (lat, lng) => {
    if (!lat || !lng) return 'No location set';
    lat = Number(lat);
    lng = Number(lng);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const renderMap = () => {
    if (!isLoaded) return <div>Loading map...</div>;

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={selectedLocation || defaultCenter}
        zoom={13}
        onLoad={onMapLoad}
        onClick={handleMapClick}
      >
        {selectedLocation && (
          <Marker
            position={selectedLocation}
            draggable={true}
            onDragEnd={(e) => {
              setSelectedLocation({
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
              });
            }}
          />
        )}
      </GoogleMap>
    );
  };

  const renderLocationModal = () => (
    <Modal show={showMapModal} onHide={() => setShowMapModal(false)} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Set Branch Location</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {renderMap()}
        <div className="mt-3">
          <p>Selected coordinates: {formatCoordinates(selectedLocation?.lat, selectedLocation?.lng)}</p>
          <small className="text-muted">
            Click on the map or drag the marker to adjust the location
          </small>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowMapModal(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleLocationSelect}>
          Confirm Location
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className="table-container">
      <div className="table-header">
        <h2>Hospital Management</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>
          Add New Hospital
        </Button>
      </div>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Hospital Name</th>
            <th>Total Branches</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="3" className="text-center">Loading...</td>
            </tr>
          ) : hospitals.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center">No hospitals found</td>
            </tr>
          ) : (
            hospitals.map(hospital => (
              <tr key={hospital.HOSPITAL_ID}>
                <td>{toTitleCase(hospital.HOSPITAL_NAME)}</td>
                <td>{hospital.branches?.length || 0}</td>
                <td>
                  <ButtonGroup>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleShowModal(hospital)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(hospital.HOSPITAL_ID)}
                    >
                      Delete
                    </Button>
                  </ButtonGroup>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Hospital Form Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingHospital ? 'Edit Hospital' : 'Add New Hospital'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Hospital Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.HOSPITAL_NAME}
                onChange={(e) => setFormData({
                  ...formData,
                  HOSPITAL_NAME: e.target.value
                })}
                required
              />
            </Form.Group>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Branches</h5>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleAddBranch}
                >
                  Add Branch
                </Button>
              </div>
              {formData.branches.map((branch, index) => (
                <div key={index} className="card mb-2">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <Form.Group className="mb-3">
                          <Form.Label>Address</Form.Label>
                          <Form.Control
                            type="text"
                            value={branch.ADDRESS || ''}
                            onChange={(e) => handleBranchChange(index, 'ADDRESS', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-6">
                        <Form.Group className="mb-3">
                          <Form.Label>City</Form.Label>
                          <Form.Control
                            type="text"
                            value={branch.CITY || ''}
                            onChange={(e) => handleBranchChange(index, 'CITY', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <Form.Group className="mb-3">
                          <Form.Label>Phone Number</Form.Label>
                          <Form.Control
                            type="text"
                            value={branch.PHONE_NO || ''}
                            onChange={(e) => handleBranchChange(index, 'PHONE_NO', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-6">
                        <Form.Group className="mb-3">
                          <Form.Label>Total Beds</Form.Label>
                          <Form.Control
                            type="number"
                            value={branch.TOTAL_BEDS || ''}
                            onChange={(e) => handleBranchChange(index, 'TOTAL_BEDS', e.target.value)}
                            required
                            min="0"
                          />
                        </Form.Group>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <Form.Group className="mb-3">
                          <Form.Label>Total Ventilators</Form.Label>
                          <Form.Control
                            type="number"
                            value={branch.TOTAL_VENTILATORS || ''}
                            onChange={(e) => handleBranchChange(index, 'TOTAL_VENTILATORS', e.target.value)}
                            required
                            min="0"
                          />
                        </Form.Group>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => openMapModal(index)}
                          className="me-2"
                        >
                          Set Location on Map
                        </Button>
                        <small className="text-muted">
                          {
                            (isNaN(branch.LATITUDE) || isNaN(branch.LONGITUDE)) ?
                              "NULL" :
                              formatCoordinates(branch.LATITUDE, branch.LONGITUDE)}
                        </small>
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveBranch(index)}
                      >
                        Remove Branch
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingHospital ? 'Save Changes' : 'Add Hospital'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {renderLocationModal()}
    </div>
  );
};

export default HospitalManagement; 