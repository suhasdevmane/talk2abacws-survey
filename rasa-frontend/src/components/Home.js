// src/components/Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import TopNav from './TopNav';
import ConsentForm from './ConsentForm';
import Login from './Login';

const readConsentFlag = () => {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem('consentAccepted') === 'true') return true;
  return document.cookie?.split(';').some((c) => c.trim().startsWith('abacws_consent=')) || false;
};

export default function Home() {
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('currentUser');
  const [consentAccepted, setConsentAccepted] = useState(() => readConsentFlag());
  const [infoSheetDownloaded, setInfoSheetDownloaded] = useState(() => {
    return localStorage.getItem('infoSheetDownloaded') === 'true';
  });

  useEffect(() => {
    const syncConsent = () => setConsentAccepted(readConsentFlag());
    window.addEventListener('storage', syncConsent);
    window.addEventListener('abacws-consent-accepted', syncConsent);
    return () => {
      window.removeEventListener('storage', syncConsent);
      window.removeEventListener('abacws-consent-accepted', syncConsent);
    };
  }, []);

  const handleInfoSheetDownload = (e) => {
    e.preventDefault();
    
    // Download the PDF
    const link = document.createElement('a');
    link.href = process.env.PUBLIC_URL + '/03. Participant_Information.pdf';
    link.download = 'Participant_Information.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mark as downloaded
    localStorage.setItem('infoSheetDownloaded', 'true');
    setInfoSheetDownloaded(true);
  };

  return (
    <div className="home-body">
      {/* 🌊 Wave layers */}
      <div className="wave"></div>
      <div className="wave"></div>
      <div className="wave"></div>
      
      {/* Navbar */}
      <TopNav />

      {/* Intro / Content */}
      <div className="container-fluid px-2 mt-2" id="content" style={{ maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
        {!currentUser ? (
          <div className="row g-2 h-100">
            {/* Left: Info / PI sheet - moved to left for first impression */}
            <div className="col-12 col-lg-3 h-100">
              <div className="card shadow-sm h-100" style={{ border: 'none', borderRadius: '12px', overflowY: 'auto' }}>
                <div className="card-body d-flex flex-column p-3">
                  {/* Step 1 Header */}
                  <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <div style={{
                      width: '32px', height: '32px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '50%', color: 'white', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '12px', fontSize: '1rem'
                    }}>1</div>
                    <div>
                      <h5 className="m-0" style={{ color: '#333', fontWeight: '600', fontSize: '1.1rem' }}>Study Information</h5>
                    </div>
                  </div>

                  <div className="mb-3" style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#555' }}>
                    <p className="mb-1"><strong>Study Title:</strong><br/>
                    A Survey-Based Study to Develop a Corpus of Natural Language Queries for Smart Building Interaction</p>
                    
                    <p className="mb-1"><strong>SREC Reference:</strong> COMSC/Ethics/2025/044</p>
                    
                    <p className="mb-1"><strong>Lead Researcher:</strong> Suhas Devmane</p>
                    
                    <p className="mb-0 mt-2" style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#6c757d' }}>
                      <strong>Need assistance during the guided survey?</strong><br/>
                      Email <a href="mailto:Devmanesp1@cardiff.ac.uk" style={{ color: '#667eea' }}>Devmanesp1@cardiff.ac.uk</a> for help or clarifications.
                    </p>
                  </div>
                  <div className="mt-auto">
                    <button 
                      className="btn w-100 btn-sm" 
                      onClick={handleInfoSheetDownload}
                      style={{ 
                        borderRadius: '8px', 
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        padding: '10px',
                        background: infoSheetDownloaded ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {infoSheetDownloaded ? '✅ Downloaded' : '📄 View Full Info Sheet'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Consent - larger and more prominent */}
            <div className="col-12 col-lg-6 h-100">
              <div className="card shadow-sm h-100" style={{ border: 'none', borderRadius: '12px', overflow: 'hidden' }}>
                <div className="card-body p-3 d-flex flex-column" style={{ height: '100%' }}>
                  {/* Step 2 Header */}
                  <div className="d-flex align-items-center mb-2 pb-2 border-bottom flex-shrink-0">
                    <div style={{
                      width: '32px', height: '32px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '50%', color: 'white', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '12px', fontSize: '1rem'
                    }}>2</div>
                    <div>
                      <h5 className="m-0" style={{ color: '#333', fontWeight: '600', fontSize: '1.1rem' }}>Consent Form</h5>
                    </div>
                  </div>
                  
                  <ConsentForm 
                    disabled={!infoSheetDownloaded}
                    onAccepted={(name) => {
                    // Hint for login prefill
                    sessionStorage.setItem('prefillUsername', name);
                    setConsentAccepted(true);
                  }} />
                </div>
              </div>
            </div>

            {/* Right: Login (gated) */}
            <div className="col-12 col-lg-3 h-100">
              <div className="card shadow-sm h-100" style={{ border: 'none', borderRadius: '12px', overflowY: 'auto' }}>
                <div className="card-body d-flex flex-column p-3">
                  {/* Step 3 Header */}
                  <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <div style={{
                      width: '32px', height: '32px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2ff 100%)',
                      borderRadius: '50%', color: 'white', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '12px', fontSize: '1rem'
                    }}>3</div>
                    <div>
                      <h5 className="m-0" style={{ color: '#333', fontWeight: '600', fontSize: '1.1rem' }}>Login / Register</h5>
                    </div>
                  </div>

                  <Login prefillUsername={sessionStorage.getItem('prefillUsername') || localStorage.getItem('consentUsername') || ''}
                         disabled={!consentAccepted}
                         consentAccepted={consentAccepted} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🏢</div>
            <h1 style={{ 
              fontSize: '2.8rem', 
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '700'
            }}>
              Welcome to Survey System
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '40px', lineHeight: '1.6' }}>
              Explore our interactive 3D building visualization and help us improve by asking questions about what you see.
            </p>
            
            <div className="d-flex justify-content-center gap-3 flex-wrap mb-4">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/survey')}
                style={{ 
                  padding: '14px 48px',
                  fontSize: '1.15rem',
                  borderRadius: '50px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🏢 Open Visualizer
              </button>
              
              <button
                className="btn btn-outline-primary btn-lg"
                onClick={() => navigate('/ideas')}
                style={{ 
                  padding: '14px 48px',
                  fontSize: '1.15rem',
                  borderRadius: '50px',
                  fontWeight: '600',
                  borderWidth: '2px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#667eea';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
              >
                💡 Get Question Ideas
              </button>
            </div>

            <div style={{
              marginTop: '50px',
              padding: '32px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '16px',
              textAlign: 'left',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              <h4 style={{ marginBottom: '20px', color: '#333', fontWeight: '600', fontSize: '1.5rem' }}>
                📍 How it works:
              </h4>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ 
                      minWidth: '32px', 
                      height: '32px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.9rem'
                    }}>1</div>
                    <div>
                      <strong style={{ color: '#333', fontSize: '1.05rem' }}>Explore 3D Building</strong>
                      <p style={{ color: '#666', marginBottom: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Click "Open Visualizer" to navigate the interactive 3D model of our building
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="col-12 col-md-6">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ 
                      minWidth: '32px', 
                      height: '32px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.9rem'
                    }}>2</div>
                    <div>
                      <strong style={{ color: '#333', fontSize: '1.05rem' }}>Ask Questions</strong>
                      <p style={{ color: '#666', marginBottom: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Use the chatbot in the bottom-right corner to ask questions about the building
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="col-12 col-md-6">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ 
                      minWidth: '32px', 
                      height: '32px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.9rem'
                    }}>3</div>
                    <div>
                      <strong style={{ color: '#333', fontSize: '1.05rem' }}>Help Improve</strong>
                      <p style={{ color: '#666', marginBottom: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Your questions are saved and help us understand how to improve the system
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="col-12 col-md-6">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    <div style={{ 
                      minWidth: '32px', 
                      height: '32px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.9rem'
                    }}>4</div>
                    <div>
                      <strong style={{ color: '#333', fontSize: '1.05rem' }}>Need Ideas?</strong>
                      <p style={{ color: '#666', marginBottom: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Visit the "Ideas" page for question suggestions to get started
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
