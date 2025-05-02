import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SehatLogo from '../../assets/sehatLogo500.png';
import showPasswordIcon from '../../assets/showPasswordIcon.png';
import hidePasswordIcon from '../../assets/hidePasswordIcon.png';
import './register.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import toTitleCase from '../../utils/toTitleCase';
import { sendGetRequest } from '../../utils/api'
import PasswordToggleInput from '../../components/passwordToggleInput';



const Register = () => {
  const [userType, setUserType] = useState('');
  const [formData, setFormData] = useState({
    // Common user attributes
    F_NAME: '',
    L_NAME: '',
    EMAIL: '',
    PASSWORD: '',
    DOB: '',
    GENDER: '',

    // Doctor specific
    LICENSE_NO: '',
    SPECIALIZATION_ID: '',
    BRANCH_ID: '',
    DATE_STARTED: new Date().toISOString().split('T')[0],
    STATUS: '', // Set default value

    // Patient specific
    BLOOD_GROUP: '',
    WEIGHT: '',
    ADDRESS: '',
    CITY: '',
    HEIGHT: '',
    // Rescue worker specific
    RESCUE_LICENSE_NO: '',
    RESCUE_DATE_STARTED: '',
    RESCUE_ADDRESS: '',
    RESCUE_CITY: ''
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showPassword, setShowPassword] = useState(false);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpecializationIndex, setSelectedSpecializationIndex] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchIndex, setSelectedBranchIndex] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (successMessage && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      navigate('/login');
    }
    return () => clearTimeout(timer);
  }, [countdown, successMessage, navigate]);

  const handleChange = (convertToTitleCase = false) => (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: convertToTitleCase ? toTitleCase(value) : value
    });
  };

  const handleUserTypeChange = (type) => {
    setUserType(type);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    console.log('Form data:', formData);
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setCountdown(10); // Reset countdown on new submission

    try {

      // Prepare payload based on user type
      const commonFields = {
        F_NAME: formData.F_NAME,
        L_NAME: formData.L_NAME,
        EMAIL: formData.EMAIL,
        PASSWORD: formData.PASSWORD,
        DOB: formData.DOB,
        GENDER: formData.GENDER,
        ACCOUNT_STATUS: "active"
      };

      const userResponse = await fetch('http://localhost:8000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commonFields),
      });

      const userData = await userResponse.json();
      if (!userResponse.ok) throw new Error(userData.message || 'User creation failed');
      console.log(userData);
      const userId = userData.userID;

      let payload;
      switch (userType) {
        case 'doctor':
          payload = {
            USER_ID: userId,
            LICENSE_NO: formData.LICENSE_NO,
            SPECIALIZATION_ID: formData.SPECIALIZATION_ID,
            BRANCH_ID: formData.BRANCH_ID,
            DATE_STARTED: formData.DATE_STARTED,
            STATUS: formData.STATUS
          };
          break;
        case 'patient':
          payload = {
            USER_ID: userId,
            BLOOD_GROUP: formData.BLOOD_GROUP,
            WEIGHT: formData.WEIGHT,
            ADDRESS: formData.ADDRESS,
            CITY: formData.CITY,
            HEIGHT: formData.HEIGHT
          };
          break;
        case 'rescue':
          payload = {
            USER_ID: userId,
            LICENSE_NO: formData.RESCUE_LICENSE_NO,
            DATE_STARTED: formData.RESCUE_DATE_STARTED,
            ADDRESS: formData.RESCUE_ADDRESS,
            CITY: formData.RESCUE_CITY
          };
          break;
        default:
          payload = {};
      }

      const endpoint = userType === 'doctor'
        ? '/api/doctors'
        : userType === 'patient'
          ? '/api/patients'
          : '/api/rescue-workers';

      console.log(payload)
      const roleResponse = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const roleData = await roleResponse.json();
      if (!roleResponse.ok) throw new Error(roleData.message || 'Registration failed');
      setSuccessMessage(`Registration successful! Congratulations! Redirecting to login page in ${countdown}...`);

    } catch (error) {
      console.error('Registration error:', error);
      setErrorMessage(error.message || 'Failed to register');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const data = await sendGetRequest('http://localhost:8000/api/specializations', setSpecializations);
        if (Array.isArray(data)) {
          setSpecializations(
            data.map((spec) => ({
              ...spec,
              SPECIALIZATION_NAME: toTitleCase(spec.SPECIALIZATION_NAME)
            }))
          );
        }
      } catch (error) {
        // Optionally handle error
      }
    };
    fetchSpecializations();
  }, []);

  useEffect(() => {
    if (
      userType === 'doctor' &&
      selectedSpecializationIndex !== '' &&
      specializations[selectedSpecializationIndex]
    ) {
      setFormData((prev) => ({
        ...prev,
        SPECIALIZATION_ID: specializations[selectedSpecializationIndex].SPECIALIZATION_ID
      }));
    }
  }, [selectedSpecializationIndex, specializations, userType]);

  useEffect(() => {
    if (userType === 'doctor') {
      sendGetRequest('http://localhost:8000/api/branch/condensed', (data) => {
        if (Array.isArray(data)) {
          setBranches(
            data.map((branch) => ({
              ...branch,
              HOSPITAL_NAME: toTitleCase(branch.HOSPITAL_NAME)
            }))
          );
        }
      });
    }
  }, [userType]);

  useEffect(() => {
    if (
      userType === 'doctor' &&
      selectedBranchIndex !== '' &&
      branches[selectedBranchIndex]
    ) {
      setFormData((prev) => ({
        ...prev,
        BRANCH_ID: branches[selectedBranchIndex].BRANCH_ID
      }));
    }
  }, [selectedBranchIndex, branches, userType]);

  return (
    <div className="register-container">
      <div className="register-box">
        <img src={SehatLogo} alt="Sehat Logo" className="logo" />
        <h1>Trusted Care.<br />Anytime. Anywhere.</h1>

        {!successMessage && (
          <p className="tagline">Register your Sehat account</p>
        )}

        {successMessage && (
          <p className="tagline">Registration Successful</p>
        )}


        {successMessage && (
          <div className="success-message">
            <button
              type="button"
              className="btn btn-success w-100 mb-3"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <p>Automatically redirecting in {countdown}...</p>
          </div>
        )}

        {errorMessage && <div className="error-message">{errorMessage}</div>}

        {!successMessage && (

          <form onSubmit={handleSubmit}>
            <div className="form-floating mb-3">
              <select
                className="form-select"
                id="role"
                name="ROLE"
                value={userType}
                onChange={(e) => handleUserTypeChange(e.target.value)}
                required
              >
                <option value="">Select Role</option>
                <option value="doctor">Doctor</option>
                <option value="patient">Patient</option>
                <option value="rescue">Rescue Worker</option>
              </select>
              <label htmlFor="role">Role</label>
            </div>

            {userType && (
              <div className="compact-form">
                {/* Common fields */}
                <div className="row-mb-3" style={{ width: '100%', display: 'flex', gap: '1rem', flexDirection: 'row' }}>
                    <div className="form-floating mb-3" style={{ flex: 1 }}>
                      <input
                        type="text"
                        className="form-control"
                        id="fName"
                        name="F_NAME"
                        placeholder="FIRST NAME"
                        value={formData.F_NAME}
                        onChange={handleChange(true)}
                        required
                      />
                      <label htmlFor="fName">First Name</label>
                    </div>
                    <div className="form-floating mb-3" style={{ flex: 1 }}>
                      <input
                        type="text"
                        className="form-control"
                        id="lName"
                        name="L_NAME"
                        placeholder="LAST NAME"
                        value={formData.L_NAME}
                        onChange={handleChange(true)}
                        required
                      />
                      <label htmlFor="lName">Last Name</label>
                    </div>
                  </div>

                <div className="form-floating mb-3">
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="EMAIL"
                    placeholder="EMAIL"
                    value={formData.EMAIL}
                    onChange={handleChange()}
                    required
                  />
                  <label htmlFor="email">Email</label>
                </div>
                <PasswordToggleInput
                  value={formData.PASSWORD}
                  onChange={handleChange()}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                />
                <div className="form-floating mb-3">
                  <input
                    type="date"
                    className="form-control"
                    id="dob"
                    name="DOB"
                    placeholder="DATE OF BIRTH"
                    value={formData.DOB}
                    onChange={handleChange()}
                    required
                  />
                  <label htmlFor="dob">Date of Birth</label>
                </div>

                <div className="form-floating mb-3">
                  <select
                    className="form-select"
                    id="gender"
                    name="GENDER"
                    value={formData.GENDER}
                    onChange={handleChange()}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <label htmlFor="gender">Gender</label>
                </div>

                {/* Doctor specific fields */}
                {userType === 'doctor' && (
                  <>
                    <div className="form-floating mb-3">
                      <input
                        type="number"
                        className="form-control"
                        id="licenseNo"
                        name="LICENSE_NO"
                        placeholder="LICENSE NUMBER"
                        value={formData.LICENSE_NO}
                        onChange={handleChange()}
                        required
                      />
                      <label htmlFor="licenseNo">License Number</label>
                    </div>

                    <div className="form-floating mb-3">
                      <select
                        className="form-select"
                        id="specialization"
                        name="SPECIALIZATION"
                        value={selectedSpecializationIndex}
                        onChange={(e) => setSelectedSpecializationIndex(e.target.value)}
                        required
                      >
                        <option value="">Select Specialization</option>
                        {specializations.map((spec, idx) => (
                          <option key={idx} value={idx}>
                            {spec.SPECIALIZATION_NAME}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="specialization">Specialization</label>
                    </div>

                    <div className="form-floating mb-3">
                      <select
                        className="form-select"
                        id="branch"
                        name="BRANCH_ID"
                        value={selectedBranchIndex}
                        onChange={(e) => setSelectedBranchIndex(e.target.value)}
                        required
                      >
                        <option value="">Select Branch</option>
                        {branches.map((branch, idx) => (
                          <option key={idx} value={idx}>
                            {branch.HOSPITAL_NAME} - {branch.LOCATION}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="branch">Branch</label>
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type="date"
                        className="form-control"
                        id="dateStarted"
                        name="DATE_STARTED"
                        placeholder="DATE STARTED"
                        value={formData.DATE_STARTED}
                        onChange={handleChange()}
                        required
                      />
                      <label htmlFor="dateStarted">Date Started</label>
                    </div>

                    <div className="form-floating mb-3">
                      <select
                        className="form-select"
                        id="Status"
                        name="STATUS"
                        value={formData.STATUS}
                        onChange={e => setFormData({ ...formData, STATUS: e.target.value })}
                        required
                      >
                        <option value="">Select Status</option>
                        <option value="active">Active</option>
                        <option value="on leave">On Leave</option>
                        <option value="on call">On Call</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <label htmlFor="Status">Status</label>
                    </div>
                  </>
                )}

                {/* Patient specific fields */}
                {userType === 'patient' && (
                  <>
                    <div className="form-floating mb-3">
                      <select
                        className="form-select"
                        id="bloodGroup"
                        name="BLOOD_GROUP"
                        value={formData.BLOOD_GROUP}
                        onChange={handleChange()}
                        required
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                      <label htmlFor="bloodGroup">Blood Group</label>
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type="number"
                        className="form-control"
                        id="weight"
                        min={1}
                        name="WEIGHT"
                        placeholder="WEIGHT (KG)"
                        value={formData.WEIGHT}
                        onChange={handleChange()}
                        required
                      />
                      <label htmlFor="weight">Weight (kg)</label>
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type="number"
                        className="form-control"
                        id="height"
                        min={1}
                        name="HEIGHT"
                        placeholder="HEIGHT (CM)"
                        value={formData.HEIGHT}
                        onChange={handleChange()}
                        required
                      />
                      <label htmlFor="height">Height (cm)</label>
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type="text"
                        className="form-control"
                        id="address"
                        name="ADDRESS"
                        placeholder="ADDRESS"
                        value={formData.ADDRESS}
                        onChange={handleChange()}
                        required
                      />
                      <label htmlFor="address">Address</label>
                    </div>

                    <div className="form-floating mb-3">
                      <select
                        className="form-select"
                        id="city"
                        name="CITY"
                        value={formData.CITY}
                        onChange={handleChange()}
                        required
                      >
                        <option value="">Select City</option>
                        <option value="Lahore">Lahore</option>
                        <option value="Islamabad">Islamabad</option>
                        <option value="Karachi">Karachi</option>
                        <option value="Peshawar">Peshawar</option>
                      </select>
                      <label htmlFor="city">City</label>
                    </div>
                  </>
                )}

                {/* Rescue worker specific fields */}
                {userType === 'rescue' && (
                  <>
                    <div className="form-floating mb-3">
                      <input
                        type="number"
                        className="form-control"
                        id="RescueLicenseNo"
                        name="RESCUE_LICENSE_NO"
                        placeholder="RESCUE LICENSE NUMBER"
                        value={formData.RESCUE_LICENSE_NO}
                        onChange={handleChange()}
                        required
                      />
                      <label htmlFor="RescueLicenseNo">License Number</label>
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type="date"
                        className="form-control"
                        id="RescueDateStarted"
                        name="RESCUE_DATE_STARTED"
                        placeholder="RESCUE DATE STARTED"
                        value={formData.RESCUE_DATE_STARTED}
                        onChange={handleChange()}
                        required
                      />
                      <label htmlFor="RescueDateStarted">Date Started</label>
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type="text"
                        className="form-control"
                        id="rescueAddress"
                        name="RESCUE_ADDRESS"
                        placeholder="RESCUE ADDRESS"
                        value={formData.RESCUE_ADDRESS}
                        onChange={handleChange()}
                        required
                      />
                      <label htmlFor="rescueAddress">Address</label>
                    </div>

                    <div className="form-floating mb-3">
                      <select
                        className="form-select"
                        id="rescueCity"
                        name="RESCUE_CITY"
                        value={formData.RESCUE_CITY}
                        onChange={handleChange()}
                        required
                      >
                        <option value="">Select City</option>
                        <option value="Lahore">Lahore</option>
                        <option value="Islamabad">Islamabad</option>
                        <option value="Karachi">Karachi</option>
                        <option value="Peshawar">Peshawar</option>
                      </select>
                      <label htmlFor="rescueCity">City</label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="register-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Hold On...' : 'Register'}
                </button>


              </div>
            )}
          </form>
        )}

        <div className="login-link">
          Already have an account? <a href="/login">Login here</a>
        </div>
      </div>
    </div>
  );
};

export default Register;