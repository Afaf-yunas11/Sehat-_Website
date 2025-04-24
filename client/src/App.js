// client/src/App.js
import React from 'react';
import LoginForm from './pages/login/login'; // Import the Header component
import routes from './routes/routes'; // Import the routes
import UserDashboard from './pages/userDashboard/userDashboard'; // Import the Dashboard component
import Logout from './pages/logout/logout'; 
import Register from './pages/register/register';
import NotFound from './components/notFound'; // Import the NotFound component
import Account from './pages/account/account';
import LoginRouter from './components/loginRouter';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path={routes.login} element={<LoginForm />} />
          <Route path={routes.dashboard} element={<LoginRouter />} />
          <Route path={routes.logout} element={<Logout />} />
          <Route path={routes.register} element={<Register />} />
          <Route path={routes.account} element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
