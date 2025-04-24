import UserDashboard from '../pages/userDashboard/userDashboard';
import DoctorDashboard from '../pages/doctorDashboard/doctorDashboard';
import AdminDashboard from '../pages/admin/adminDashboard';
import RescueWorkerDashboard from '../pages/rescueWorkerDashboard/rescueWorkerDashboard'
import NotFound from '../components/notFound'
import { useEffect, useState } from 'react';
import userTypes from '../utils/userTypes'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginRouter = () => {
  const [userAuth, setUserAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/auth/current-user', {
          withCredentials: true
        });
        
        if (response.data) {
          setUserAuth(response.data);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) return null;
  if (!userAuth) {
    navigate('/login');
    return null;
  }

  const { loginType } = userAuth;
  
  let ComponentToRender;
  switch (loginType) {
    case userTypes.PATIENTS:
      ComponentToRender = <UserDashboard />;
      break;
    case userTypes.DOCTORS:
      ComponentToRender = <DoctorDashboard />;
      break;
    case userTypes.ADMINS:
      ComponentToRender = <AdminDashboard />
      break;
    case userTypes.RESCUE_WORKERS:
      ComponentToRender = <RescueWorkerDashboard />;
      break;
    default:
      ComponentToRender = <NotFound />
  }

  return ComponentToRender;
};

export default LoginRouter;