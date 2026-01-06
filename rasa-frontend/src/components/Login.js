// src/components/Login.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../db';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const ROLES = [
  "Facility Managers / Building Maintenance Teams",
  "Building Owners/Property Managers",
  "Occupants/Tenants/Employees",
  "Health and Safety Officers",
  "Sustainability and Energy Management Teams",
  "Compliance and Regulatory Bodies",
  "Insurance Companies",
  "Architects/Building Designers",
  "Researchers/Academics",
  "IT/Data Scientists",
  "Ontology Focused",
  "Vendors/Service Providers",
  "Real Estate Developers"
];

function Login({ prefillUsername = '', disabled = false, consentAccepted = false }) {
  const [username, setUsername] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Prefill username, if provided by consent step
  useEffect(() => {
    const fromSession = sessionStorage.getItem('prefillUsername');
    const fromLocal = localStorage.getItem('consentUsername');
    const initial = prefillUsername || fromSession || fromLocal || '';
    if (initial) setUsername(initial);
  }, [prefillUsername]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (disabled || !consentAccepted) {
      alert('Please accept the consent form before logging in.');
      return;
    }

    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }

    if (selectedRoles.length === 0) {
      alert('Please select at least one role/profile.');
      return;
    }

    setIsLoading(true);

    const doRegister = async () => {
      try {
        const res = await fetch(`${API_BASE}/survey/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Important: Send cookies with request
          body: JSON.stringify({ 
            username: username.trim(), 
            displayName: username.trim(), // Use username as display name by default
            roles: selectedRoles,
            consentAccepted: consentAccepted,
            consentDate: new Date().toISOString()
          })
        });
        
        let data;
        try {
            data = await res.json();
        } catch (jsonError) {
            console.error('Failed to parse registration response:', jsonError);
            throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
        }
        
        if (!res.ok) {
          alert(data.error || 'Registration failed');
          return false;
        }

        // Store username in sessionStorage for UI purposes only
        // Authentication is handled by HTTP-only cookie (JWT)
        sessionStorage.setItem('currentUser', data.user.username);
        
        // Keep a copy locally for offline viewing (optional)
        try {
          const existing = await db.users.where('username').equals(username.trim()).first();
          if (!existing) {
            await db.users.add({ username: username.trim() });
          }
          await db.chatHistory.add({ username: username.trim(), messages: [] });
        } catch (dbError) {
          console.warn('Local DB storage failed:', dbError);
        }

        // Start minimized after login
        sessionStorage.setItem('chatbot_minimized', 'true');
        window.dispatchEvent(new Event('auth-changed'));
        
        alert('Registration successful! Redirecting to survey...');
        navigate('/survey');
        return true;
      } catch (err) {
        console.error('Registration error:', err);
        alert('Registration error. Please check your connection and try again.');
        return false;
      }
    };

    try {
      // Attempt login with JWT-based authentication
      const res = await fetch(`${API_BASE}/survey/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: Send/receive cookies
        body: JSON.stringify({ 
          username: username.trim(),
          roles: selectedRoles
        })
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        // Store username in sessionStorage for UI purposes
        sessionStorage.setItem('currentUser', data.user.username);
        
        // Keep a copy locally (optional, for offline)
        try {
          const existing = await db.users.where('username').equals(username.trim()).first();
          if (!existing) {
            await db.users.add({ username: username.trim() });
          }
        } catch (dbError) {
          console.warn('Local DB storage failed:', dbError);
        }

        // Start minimized after login
        sessionStorage.setItem('chatbot_minimized', 'true');
        window.dispatchEvent(new Event('auth-changed'));
        
        navigate('/survey');
        setIsLoading(false);
        return;
      }

      if (res.status === 401) {
        // Offer registration on invalid username
        setIsLoading(false);
        if (window.confirm('Username not found. Would you like to register this username?')) {
          setIsLoading(true);
          await doRegister();
        }
        setIsLoading(false);
        return;
      }

      // Handle other errors
      alert(data.error || 'Login failed. Please try again.');
      setIsLoading(false);
      
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      
      // Offer to register if login failed
      if (window.confirm('Could not connect to server or user not found. Would you like to register?')) {
        setIsLoading(true);
        await doRegister();
        setIsLoading(false);
      }
    }
  };

  const toggleRole = (role) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <div className="login-container" style={{ margin: '0 auto', width: '100%', maxWidth: '300px', height: '100%', display: 'flex', flexDirection: 'column', opacity: disabled || !consentAccepted ? 0.6 : 1, pointerEvents: disabled || !consentAccepted ? 'none' : 'auto' }}>
      
      {!consentAccepted && (
        <div className="alert alert-secondary" role="alert" style={{ padding: '8px', fontSize: '0.85rem' }}>
          Please complete steps 1 & 2 first.
        </div>
      )}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ marginBottom: '10px', flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '150px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Select Profile(s):</label>
          
          <div style={{
            flexGrow: 1,
            overflowY: 'auto',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            padding: '4px',
            backgroundColor: disabled || !consentAccepted ? '#e9ecef' : '#fff',
            height: '200px'
          }}>
            {ROLES.map((role) => (
              <div 
                key={role} 
                onClick={() => !disabled && consentAccepted && toggleRole(role)}
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #f1f3f5',
                  cursor: disabled || !consentAccepted ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  backgroundColor: selectedRoles.includes(role) ? '#e7f5ff' : '#fff',
                  borderRadius: '4px',
                  marginBottom: '2px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  readOnly
                  style={{ marginTop: '3px', marginRight: '8px', pointerEvents: 'none' }}
                />
                <span style={{ fontSize: '0.85rem', lineHeight: '1.3' }}>{role}</span>
              </div>
            ))}
          </div>
          
          {selectedRoles.length === 0 && (
            <small style={{ color: '#dc3545', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
              * Required
            </small>
          )}
        </div>

        <div style={{ flexShrink: 0 }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Username:</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              disabled={isLoading || disabled || !consentAccepted}
              style={{ width: '100%', padding: '8px', fontSize: '0.9rem', border: '1px solid #ced4da', borderRadius: '4px' }}
              placeholder="Enter username"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading || disabled || !consentAccepted} 
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '10px', 
              fontSize: '0.95rem', 
              fontWeight: '600',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            {isLoading ? 'Processing...' : 'Login / Register'}
          </button>
        </div>
      </form>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>        
      </div>
    </div>
  );
}

export default Login;
