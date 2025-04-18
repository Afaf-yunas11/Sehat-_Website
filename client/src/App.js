// client/src/App.js
import React from 'react';
import LoginForm from './pages/login/login'; // Import the Header component
import routes from './routes/routes'; // Import the routes
import Dashboard from './pages/dashboard/dashboard'; // Import the Dashboard component
import Logout from './pages/logout/logout'; 

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path={routes.login} element={<LoginForm />} />
          <Route path={routes.dashboard} element={<Dashboard />} />
          <Route path={routes.logout} element={<Logout />} />
          {/* Add more routes as needed */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
