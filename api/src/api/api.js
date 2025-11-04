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
api.use(express.json());// Health now handled at top-level app (/health & /health/db). Keep optional legacy route.
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

// Register error handlers
api.use(mongodbLogErrors);
api.use(consoleLogErrors);
api.use(errorHandler);

// Register documentation router at /docs instead of / to avoid catching all routes
api.use("/docs", docs);

module.exports = api;
