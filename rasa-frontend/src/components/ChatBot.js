// src/components/ChatBot.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Message from './Message';
import { Container, Button, Form } from 'react-bootstrap';
import { BsDownload, BsTrash, BsDashSquare, BsChatDotsFill, BsFullscreen, BsFullscreenExit } from 'react-icons/bs';
import { FaPaperPlane } from 'react-icons/fa';
import db from '../db';
import '../App.css'; // Ensure CSS is imported

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SURVEY_ENDPOINT = `${API_BASE}/survey/question`;
// Removed suggestions endpoint as per updated UI requirements

function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  // Toggle to show/hide intermediate attachments & verbose stages
  // Persisted in localStorage under 'chat_show_details'. When off:
  //  - Filters out stage/result messages (SPARQL, SQL, analytics payload/results)
  //  - Suppresses attachments in Message component (hideAttachments prop)
  //  - Keeps user messages, final summary, greetings, errors.
  const showDetails = (() => {
    try { return localStorage.getItem('chat_show_details') !== 'false'; } catch { return true; }
  })();
  // Default to minimized; restore from sessionStorage if present
  const [minimized, setMinimized] = useState(() => {
    const saved = sessionStorage.getItem('chatbot_minimized');
    return saved === null ? true : saved === 'true';
  });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const textAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentUser = sessionStorage.getItem('currentUser');


  // Load chat history from server on mount, fallback to Dexie
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
  const res = await fetch(`${API_BASE}/get_history`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const msgs = Array.isArray(data.messages) ? data.messages : [];
          if (msgs.length > 0) {
            setMessages(msgs);
            await db.chatHistory.where('username').equals(currentUser).modify({ messages: msgs });
            return;
          }
        }
      } catch (e) {
        console.warn('Falling back to Dexie for chat history:', e);
      }
      // Dexie fallback or default greeting
      const record = await db.chatHistory.where('username').equals(currentUser).first();
      if (record && record.messages && record.messages.length > 0) {
        setMessages(record.messages);
      } else {
        // Use a single array containing both greeting messages.
        // If you'd rather show them one-by-one, see the staggered example below.
        const greet = [
          {
            sender: 'bot',
            text: 'Welcome to survey chat! Please add your question for our improvement suggestions. To explore, use Floor 5 on the visualizer to see sensors deployed and pick any one.',
            timestamp: new Date().toLocaleTimeString()
          },
          {
            sender: 'bot',
            text: 'Use Ideas tab for ideas to add your questions.',
            timestamp: new Date().toLocaleTimeString()
          }
        ];
        setMessages(greet);

        await db.chatHistory.add({ username: currentUser, messages: greet });
      }
    })();
  }, [currentUser]);

  // Save chat history locally and to server; auto-scroll
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const record = await db.chatHistory.where('username').equals(currentUser).first();
      if (record) {
        await db.chatHistory.update(record.id, { messages });
      } else {
        await db.chatHistory.add({ username: currentUser, messages });
      }
      try {
        await fetch(`${API_BASE}/save_history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ messages })
        });
      } catch (e) {
        console.warn('Failed to sync history to server:', e);
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    })();
  }, [messages, currentUser]);

  const addMessage = (message) => {
    if (!message.timestamp) {
      message.timestamp = new Date().toLocaleTimeString();
    }
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    const userMessage = {
      sender: 'user',
      text: userInput,
      timestamp: new Date().toLocaleTimeString(),
    };
    addMessage(userMessage);
    setIsLoading(true);
    try {
      // Submit question to survey API
      const response = await axios.post(SURVEY_ENDPOINT, {
        question: userInput
      }, {
        withCredentials: true
      });

      const data = response.data;
      
      // Add bot response
      const botMessage = {
        sender: 'bot',
        text: data.message,
        timestamp: new Date().toLocaleTimeString(),
      };
      addMessage(botMessage);

      // If suggestions provided, show them
      if (data.suggestions && data.suggestions.length > 0) {
        const suggestionsMsg = {
          sender: 'bot',
          text: 'Here are some ideas:\n' + data.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n'),
          timestamp: new Date().toLocaleTimeString(),
        };
        addMessage(suggestionsMsg);
      }

      // Show question count if available
      if (data.questionCount) {
        console.log(`Total questions submitted: ${data.questionCount}`);
      }

    } catch (error) {
      console.error("Error communicating with server:", error);
      addMessage({
        sender: 'bot',
        text: error.response?.status === 401 
          ? "Please log in to submit questions." 
          : "Error communicating with the server.",
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsLoading(false);
    }
    setUserInput('');
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
    }
  };

  const handleTextAreaChange = (e) => {
    setUserInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const downloadChatHistory = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = "chatHistory.json";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Destructive actions disabled by product requirement: keep history and artifacts.

  // const clearArtifacts = async () => {};

  // Suggestions feature removed from UI per request

  const toggleMinimize = () => {
    setMinimized(prev => {
      const next = !prev;
      try { sessionStorage.setItem('chatbot_minimized', String(next)); } catch {}
      return next;
    });
  };

  // Toggle full-screen mode using the Fullscreen API
  const toggleFullScreen = () => {
    const elem = document.getElementById('chat-container');
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  // Define container style dynamically based on full-screen mode
  // Wider and taller default to show more history
  const DEFAULT_WIDTH = 490; // px
  const DEFAULT_HEIGHT_VH = 95; // % of viewport height
  const RIGHT_OFFSET = 20; // px

  const containerStyle = isFullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        zIndex: 10000,
      }
    : {
        position: 'fixed',
        bottom: `${RIGHT_OFFSET}px`,
        right: `${RIGHT_OFFSET}px`,
        width: `${DEFAULT_WIDTH}px`,
        height: `${DEFAULT_HEIGHT_VH}vh`,
        margin: 0,
        padding: 0,
        zIndex: 9999,
      };

  // Use a different className in full-screen mode to avoid default constraints.
  const containerClass = isFullScreen ? "fullscreen-chat-container" : "chat-container";

  // Shift page content left to make room for chat, avoiding overlap/empty space
  useEffect(() => {
    const applyLayoutShift = () => {
      try {
        if (!isFullScreen && !minimized) {
          document.body.style.marginRight = `${DEFAULT_WIDTH + RIGHT_OFFSET + 10}px`;
        } else {
          document.body.style.marginRight = '';
        }
      } catch {}
    };
    applyLayoutShift();
    return () => {
      try { document.body.style.marginRight = ''; } catch {}
    };
  }, [isFullScreen, minimized]);

  // Full chat UI view
  const fullChatUI = (
    <Container id="chat-container" className={containerClass} style={containerStyle}>
      <div className="chat-inner">
        {/* Header */}
        <div className="chat-header">
          <h5 className="mb-0"> 💬 BrickBot</h5>
          <div className="header-buttons">
            <Button variant="light" size="sm" onClick={toggleFullScreen}>
              {isFullScreen ? <BsFullscreenExit /> : <BsFullscreen />}
            </Button>
            <Button variant="light" size="sm" onClick={toggleMinimize}>
              <BsDashSquare />
            </Button>
          </div>
        </div>
        {/* Messages */}
        <div className="chat-messages">
          {messages
            .filter(msg => {
              if (showDetails) return true;
              // Only keep high-level summary style messages when details hidden.
              // Heuristics: keep final summary, plain bot greetings, user messages.
              if (msg.sender === 'user') return true;
              const raw = msg.text || '';
              const t = raw.toLowerCase();
              // If message has no text and no attachment fields, drop it to avoid blank bubble
              if ((!raw.trim()) && !msg.attachment && !msg.attachments) return false;
              // Hide if it's an attachment placeholder or stage output indicators
              const hideIndicators = [
                'sparql query results',
                'sparql results saved',
                'sql query results',
                'prepared analytics payload',
                'analytics results',
                'analytics payload',
                'proceeding with analytics',
                'understanding your question',
                'standardized json sample'
              ];
              if (hideIndicators.some(h => t.startsWith(h))) return false;
              // Keep summary or errors or regular bot replies
              if (t.startsWith('summary:')) return true;
              if (t.startsWith('error')) return true;
              return true; // default keep
            })
            .map((msg, index) => (
              <Message key={index} message={msg} hideAttachments={!showDetails} />
            ))}
          {isLoading && (
            <div className="processing-message text-center my-2">
              <span className="processing-text">Processing... please wait.</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="chat-input">
          {/* Input with vertical actions column to maximize typing space */}
          <div className="input-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
            <Form style={{ flex: 1 }}>
              <Form.Group controlId="chatInput" style={{ height: '100%' }}>
                <Form.Control 
                  as="textarea"
                  rows={3}
                  ref={textAreaRef}
                  placeholder="Type your message..."
                  value={userInput}
                  onChange={handleTextAreaChange}
                  onKeyDown={handleKeyDown}
                  style={{ resize: 'none', overflow: 'hidden' }}
                />
              </Form.Group>
            </Form>
            <div className="send-column" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: 56, gap: 8 }}>
              <Button
                variant="primary"
                onClick={sendMessage}
                title="Send message"
                disabled={isLoading || !userInput.trim()}
                style={{ minHeight: 44, minWidth: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                aria-label="Send message"
              >
                <FaPaperPlane size={18} />
              </Button>
              <Button
                variant="secondary"
                onClick={downloadChatHistory}
                title="Download chat history"
                style={{ minHeight: 44, minWidth: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                aria-label="Download chat history"
              >
                <BsDownload size={18} />
              </Button>
              <Button
                variant="danger"
                title="Disabled"
                disabled
                style={{ minHeight: 44, minWidth: 56, opacity: 0.5, cursor: 'not-allowed', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                aria-disabled="true"
                aria-label="Clear chat (disabled)"
              >
                <BsTrash size={18} />
              </Button>
            </div>
          </div>
          {/* Bottom row removed: details toggle no longer shown */}
        </div>
      </div>
    </Container>
  );

  const minimizedView = (
    <div className="chat-minimized" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      <Button variant="primary" onClick={toggleMinimize} style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0 }}>
        <BsChatDotsFill size={30} />
      </Button>
    </div>
  );

  return (
    <>
      {minimized ? minimizedView : fullChatUI}
    </>
  );
}

export default ChatBot;
