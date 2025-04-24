import axios from 'axios';

export const checkAuthAndRedirect = async () => {
  try {
    await axios.get('http://localhost:8000/api/auth/current-user', {
      withCredentials: true
    });
    return true;
  } catch (error) {
    localStorage.removeItem('userData');
    window.location.href = '/login';
    return false;
  }
}; 