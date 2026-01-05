const cors = require('cors');
const express = require('express');
const cookieParser = require('cookie-parser');
const { consoleLogErrors, errorHandler, mongodbLogErrors } = require('./middleware');
const { devices, docs, healthcheck, query, admin, datasources, mappings, latest, rules, stream, debug, survey } = require('./routers');    

/** Express app */
const api = express();

// Cookie parser middleware - must be before routes
api.use(cookieParser());

// CORS configuration to allow credentials (cookies/sessions)
api.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and common development origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8090',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8090'
    ];
    
    if (allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Api will only respond to JSON
api.use(express.json());

// Helper to extract JWT from cookie
const getAuthenticatedUser = (req) => {
    try {
        const token = req.cookies?.authToken;
        if (!token) return null;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production-use-strong-random-string';
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

// Health now handled at top-level app (/health & /health/db). Keep optional legacy route.
api.get('/health', (_req, res) => res.status(200).json({ status: 'ok', note: 'See top-level /health for db status' }));

// Register routes
api.use("/healthcheck", healthcheck);
api.use("/query", query);
api.use("/devices", devices);
api.use("/survey", survey);
api.use("/admin", admin);
api.use("/datasources", datasources);
api.use("/mappings", mappings);
api.use("/latest", latest);
api.use('/rules', rules);
api.use('/stream', stream);
api.use('/debug', debug);

// Chat history endpoints (mounted at /api level for frontend compatibility)
api.get('/get_history', async (req, res) => {
    try {
        const user = getAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Authentication required', messages: [] });
        }

        const { MongoClient } = require('mongodb');
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017';
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('survey_db');
        const historyCollection = db.collection('chat_history');
        
        const history = await historyCollection.findOne({ username: user.username });
        await client.close();

        if (history && history.messages) {
            res.json({ messages: history.messages });
        } else {
            res.json({ messages: [] });
        }
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to retrieve chat history', messages: [] });
    }
});

api.post('/save_history', async (req, res) => {
    try {
        // Prefer authenticated user from JWT cookie; fallback to explicit username from body
        const user = getAuthenticatedUser(req);
        const { messages, username: bodyUsername } = req.body;
        if (!Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages must be an array' });
        }

        const usernameKey = (user?.username || String(bodyUsername || '')).trim().toLowerCase();
        if (!usernameKey) {
            return res.status(401).json({ error: 'Authentication required or username missing' });
        }

        const { MongoClient } = require('mongodb');
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017';
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('survey_db');
        const historyCollection = db.collection('chat_history');

        await historyCollection.updateOne(
            { username: usernameKey },
            { 
                $set: { 
                    messages: messages,
                    lastUpdated: new Date()
                } 
            },
            { upsert: true }
        );
        await client.close();

        res.json({ success: true, message: 'Chat history saved' });
    } catch (error) {
        console.error('Save history error:', error);
        res.status(500).json({ error: 'Failed to save chat history' });
    }
});

api.get('/history/:username', async (req, res) => {
    try {
        const rawUsername = req.params.username;
        if (!rawUsername) {
            return res.status(400).json({ error: 'Username is required', messages: [] });
        }

        const username = String(rawUsername).trim().toLowerCase();
        if (!username) {
            return res.status(400).json({ error: 'Username is required', messages: [] });
        }

        const { MongoClient } = require('mongodb');
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017';
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('survey_db');
        const historyCollection = db.collection('chat_history');

        const history = await historyCollection.findOne({ username });
        await client.close();

        if (history && Array.isArray(history.messages)) {
            res.json({ messages: history.messages });
        } else {
            res.json({ messages: [] });
        }
    } catch (error) {
        console.error('Get history by username error:', error);
        res.status(500).json({ error: 'Failed to retrieve chat history', messages: [] });
    }
});

// Register error handlers
api.use(mongodbLogErrors);
api.use(consoleLogErrors);
api.use(errorHandler);

// Register documentation router at /docs instead of / to avoid catching all routes
api.use("/docs", docs);

module.exports = api;
