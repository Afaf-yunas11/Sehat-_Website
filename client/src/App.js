// client/src/App.js
import React from 'react';
import LoginPage from './components/loginPage';  // Step 1: Import Counter component
import Header from './components/header'; // Import the Header component

function App() {
  return (
    <div>
      <Header />
      <LoginPage /> 
    </div>
  );
}

export default App;
