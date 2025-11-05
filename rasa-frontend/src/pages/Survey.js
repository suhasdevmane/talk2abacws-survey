// src/pages/Survey.js
import React from 'react';
import TopNav from '../components/TopNav';
import '../components/Home.css';

export default function Survey() {
  // Prefer same-origin path proxied by the dev server to avoid ngrok iframe warnings
  const visualizerUrl = process.env.REACT_APP_VISUALIZER_URL || '/visualiser';
  
  return (
    <div className="home-body" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Wave layers */}
      <div className="wave"></div>
      <div className="wave"></div>
      <div className="wave"></div>
      
      {/* Navbar */}
      <TopNav />

      {/* Main content area with visualizer */}
      <div style={{
        marginTop: '0px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px'
      }}>
        {/* Visualizer iframe */}
        <div style={{ 
          flex: 1, 
          background: 'white', 
          borderRadius: '10px', 
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <iframe
            src={visualizerUrl}
            title="3D Building Visualizer"
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
          />
        </div>
      </div>

      {/* ChatBot will appear as floating widget via App.js */}
    </div>
  );
}
