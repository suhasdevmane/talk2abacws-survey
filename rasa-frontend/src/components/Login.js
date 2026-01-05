// src/components/Login.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../db';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function Login({ prefillUsername = '', disabled = false, consentAccepted = false }) {
  const [username, setUsername] = useState('');
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
        body: JSON.stringify({ username: username.trim() })
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

  return (
    <div className="login-container" style={{ margin: '10px auto', width: '300px' }}>
      <h2>Login / Register</h2>
      <p><strong>Welcome, and thank you for taking part in the survey.</strong></p>
      <p>Please enter your username to continue.</p>
      {!consentAccepted && (
        <div className="alert alert-warning" role="alert">
          Please review and accept the consent form first.
        </div>
      )}
      <form onSubmit={handleLogin}>
        <div>
          <label>Username:</label>
          <input 
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
            disabled={isLoading || disabled || !consentAccepted}
            style={{ width: '100%', marginBottom: '10px' }}
            placeholder="Enter your username"
          />
        </div>
        <button type="submit" disabled={isLoading || disabled || !consentAccepted} style={{ width: '100%' }}>
          {isLoading ? 'Please wait...' : 'Login / Register'}
        </button>
      </form>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>        
      </div>
    </div>
  );
}

export default Login;
