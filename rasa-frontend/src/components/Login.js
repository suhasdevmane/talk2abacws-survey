// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../db';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      alert('Please enter both username and password');
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
            password,
            displayName: username.trim() // Use username as display name by default
          })
        });
        
        const data = await res.json();
        
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
            await db.users.add({ username: username.trim(), password });
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
        body: JSON.stringify({ username: username.trim(), password })
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        // Store username in sessionStorage for UI purposes
        sessionStorage.setItem('currentUser', data.user.username);
        
        // Keep a copy locally (optional, for offline)
        try {
          const existing = await db.users.where('username').equals(username.trim()).first();
          if (!existing) {
            await db.users.add({ username: username.trim(), password });
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
        // Offer registration on invalid credentials
        setIsLoading(false);
        if (window.confirm('Invalid username or password. Would you like to register this username?')) {
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
    <div className="login-container" style={{ margin: '50px auto', width: '300px' }}>
      <h2>Login / Register</h2>
      <p><strong>Welcome, and thank you for taking part in the survey.</strong></p>
      <p> Please use any Username and create a password to save your progress.</p>
      <form onSubmit={handleLogin}>
        <div>
          <label>Username:</label>
          <input 
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
            disabled={isLoading}
            style={{ width: '100%', marginBottom: '10px' }}
          />
        </div>
        <div>
          <label>Password:</label>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            disabled={isLoading}
            style={{ width: '100%', marginBottom: '10px' }}
          />
        </div>
        <button type="submit" disabled={isLoading} style={{ width: '100%' }}>
          {isLoading ? 'Please wait...' : 'Login / Register'}
        </button>
      </form>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>JWT Authentication Enabled</p>
        
      </div>
    </div>
  );
}

export default Login;
