// src/components/Home.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import TopNav from './TopNav';

export default function Home() {
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('currentUser');

  return (
    <div className="home-body">
      {/* 🌊 Wave layers */}
      <div className="wave"></div>
      <div className="wave"></div>
      <div className="wave"></div>
      
      {/* Navbar */}
      <TopNav />

      {/* Intro */}
      <div className="container mt-5" id="content">
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '60px 40px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            marginBottom: '30px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Welcome to Survey System
          </h1>
          
          <p style={{ fontSize: '1.3rem', color: '#666', marginBottom: '40px' }}>
            Explore our 3D building visualization and help us improve by asking questions about what you see.
          </p>

          {currentUser && (
            <div>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/survey')}
                style={{ 
                  padding: '15px 50px',
                  fontSize: '1.2rem',
                  borderRadius: '30px',
                  marginRight: '20px',
                  marginBottom: '15px'
                }}
              >
                🏢 Open Visualizer
              </button>
              
              <button
                className="btn btn-outline-primary btn-lg"
                onClick={() => navigate('/ideas')}
                style={{ 
                  padding: '15px 50px',
                  fontSize: '1.2rem',
                  borderRadius: '30px',
                  marginBottom: '15px'
                }}
              >
                💡 Get Question Ideas
              </button>

              <div style={{
                marginTop: '40px',
                padding: '30px',
                background: '#f8f9fa',
                borderRadius: '15px',
                textAlign: 'left'
              }}>
                <h4 style={{ marginBottom: '20px', color: '#333' }}>How it works:</h4>
                <ol style={{ fontSize: '1.1rem', color: '#666', lineHeight: '2' }}>
                  <li>Click "Open Visualizer" to explore the 3D building</li>
                  <li>Use the chatbot (bottom-right) to ask questions</li>
                  <li>Your questions are saved to help improve the system</li>
                  <li>Need ideas? Visit the "Ideas" page for suggestions</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
