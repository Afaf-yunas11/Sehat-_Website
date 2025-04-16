// client/src/App.js
import React from 'react';
import LoginForm from './pages/login/login'; // Import the Header component
import routes from './routes/routes'; // Import the routes

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path={routes.login} element={<LoginForm />} />
          {/* Add more routes as needed */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
