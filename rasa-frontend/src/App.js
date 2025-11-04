// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ChatBot from './components/ChatBot';
import Login from './components/Login';
import Survey from './pages/Survey';
import Ideas from './pages/Ideas';

function App() {
  const [currentUser, setCurrentUser] = useState(() => sessionStorage.getItem('currentUser'));

  useEffect(() => {
    const syncAuth = () => setCurrentUser(sessionStorage.getItem('currentUser'));
    window.addEventListener('storage', syncAuth);
    window.addEventListener('auth-changed', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-changed', syncAuth);
    };
  }, []);
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={currentUser ? <Navigate to="/survey" /> : <Navigate to="/login" />} />
        <Route path="/survey" element={currentUser ? <Survey /> : <Navigate to="/login" />} />
        <Route path="/ideas" element={currentUser ? <Ideas /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {/* Floating chat widget, visible on all pages only when logged in */}
      {currentUser ? <ChatBot /> : null}
    </Router>
  );
}

export default App;
