const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://mongo:27017';
const DB_NAME = 'survey_db';

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production-use-strong-random-string';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

let db;
let client;

// Initialize MongoDB connection on first request
const connectDB = async () => {
    if (!client || !db) {
        try {
            client = new MongoClient(MONGODB_URI);
            await client.connect();
            db = client.db(DB_NAME);
            console.log('Connected to MongoDB for survey service');
        } catch (error) {
            console.error('MongoDB connection error for survey:', error.message);
            // Reset client so we retry on next request
            client = null;
            db = null;
            throw error;
        }
    }
    return db;
};

// Question suggestions for when users run out of ideas
const QUESTION_SUGGESTIONS = [
    "What is the temperature in Room 101?",
    "Show me the energy consumption for the last week",
    "Which rooms have motion detected right now?",
    "What is the humidity level in the building?",
    "Show me all active sensors",
    "What was the peak energy usage yesterday?",
    "Are there any alerts or anomalies?",
    "What is the CO2 level in the conference room?",
    "Show me the lighting status across all floors",
    "What is the occupancy rate today?",
    "How many devices are currently online?",
    "What is the average temperature across all rooms?",
    "Show me historical data for sensor XYZ",
    "Which areas are using the most energy?",
    "What is the current air quality index?"
];

// Middleware to verify JWT token from cookies
const authenticateToken = (req, res, next) => {
    try {
        // Get token from cookie
        const token = req.cookies?.authToken;

        if (!token) {
            return res.status(401).json({ error: 'Authentication required - no token found' });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        // Clear invalid token
        res.clearCookie('authToken');
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Register endpoint - Creates new user and returns JWT token (username only, no password)
router.post('/register', async (req, res) => {
    try {
        console.log('Registration attempt:', { username: req.body?.username });
        
        const db = await connectDB();
        const { username } = req.body;

        if (!username) {
            console.log('Registration failed: Missing username');
            return res.status(400).json({ error: 'Username is required' });
        }

        // Validate username
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        // Check if user exists
        const usersCollection = db.collection('users');
        const existingUser = await usersCollection.findOne({ username: username.toLowerCase() });

        if (existingUser) {
            console.log('Registration failed: User already exists:', username);
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Validate roles
        const roles = Array.isArray(req.body.roles) ? req.body.roles : [];

        // Create user document (no password)
        const result = await usersCollection.insertOne({
            username: username.toLowerCase(),
            displayName: username,
            roles: roles,
            createdAt: new Date(),
            lastLogin: new Date(),
            questionCount: 0,
            consentAccepted: req.body.consentAccepted || false,
            consentDate: req.body.consentDate ? new Date(req.body.consentDate) : null
        });

        console.log('User created successfully:', username, 'ID:', result.insertedId.toString());

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: result.insertedId.toString(), 
                username: username.toLowerCase() 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Set token in HTTP-only cookie
        res.cookie('authToken', token, {
            httpOnly: true, // Prevents JavaScript access
            secure: false, // Allow HTTP in development
            sameSite: 'lax', // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            path: '/' // Available across all paths
        });

        console.log('JWT token generated and set in cookie for user:', username);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                username: username.toLowerCase(),
                displayName: username,
                questionCount: 0
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login endpoint - Validates username only and returns JWT token (no password required)
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', { username: req.body?.username });
        
        const db = await connectDB();
        const { username } = req.body;

        if (!username) {
            console.log('Login failed: Missing username');
            return res.status(400).json({ error: 'Username is required' });
        }

        // Find user (case-insensitive)
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username: username.toLowerCase() });

        if (!user) {
            console.log('Login failed: User not found:', username);
            return res.status(401).json({ error: 'Username not found' });
        }

        // Update last login timestamp and roles if provided
        const updateDoc = {
            $set: { lastLogin: new Date() }
        };
        
        if (req.body.roles && Array.isArray(req.body.roles)) {
            updateDoc.$set.roles = req.body.roles;
        }

        await usersCollection.updateOne(
            { _id: user._id },
            updateDoc
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id.toString(), 
                username: user.username 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Set token in HTTP-only cookie
        res.cookie('authToken', token, {
            httpOnly: true, // Prevents JavaScript access (XSS protection)
            secure: false, // Allow HTTP in development
            sameSite: 'lax', // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            path: '/' // Available across all paths
        });

        console.log('Login successful for user:', username);

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                username: user.username,
                displayName: user.displayName || user.username,
                questionCount: user.questionCount || 0
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Logout endpoint - Clears JWT token cookie
router.post('/logout', (req, res) => {
    try {
        // Clear the authentication cookie
        res.clearCookie('authToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        
        console.log('User logged out successfully');
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Check authentication status - Returns user info if logged in
router.get('/auth/status', authenticateToken, (req, res) => {
    try {
        if (req.user) {
            res.json({
                authenticated: true,
                user: {
                    username: req.user.username,
                    userId: req.user.userId
                }
            });
        } else {
            res.json({ authenticated: false });
        }
    } catch (error) {
        console.error('Auth status error:', error);
        res.json({ authenticated: false });
    }
});

// Submit question endpoint - Accepts JWT cookie or username in body (dev-friendly)
router.post('/question', async (req, res) => {
    try {
        const db = await connectDB();
        const { question, username: bodyUsername } = req.body;

        // Resolve user from JWT cookie if present, otherwise fallback to provided username
        let username = req.user?.username;
        let userId = req.user?.userId;
        if (!username || !userId) {
            const fallbackUsername = String(bodyUsername || '').trim().toLowerCase();
            if (!fallbackUsername) {
                return res.status(401).json({ error: 'Authentication required or username missing' });
            }
            const usersCollection = (await connectDB()).collection('users');
            const userDoc = await usersCollection.findOne({ username: fallbackUsername });
            if (!userDoc) {
                return res.status(401).json({ error: 'Username not found' });
            }
            username = userDoc.username;
            userId = userDoc._id.toString();
        }

        if (!question || !question.trim()) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Save question to database
        const questionsCollection = db.collection('questions');
        await questionsCollection.insertOne({
            userId,
            username,
            question: question.trim(),
            timestamp: new Date()
        });

        // Update user's question count
        const usersCollection = db.collection('users');
        const updateResultDoc = await usersCollection.findOneAndUpdate(
            { _id: new ObjectId(userId) },
            { $inc: { questionCount: 1 } },
            { returnDocument: 'after' }
        );
        const questionCount = updateResultDoc?.value?.questionCount || 0;

        // Send response with suggestion if needed
        let response = {
            success: true,
            message: 'Thank you! Submit another question.',
            questionCount
        };

        // Provide suggestions every 5 questions or if count is low
        if (questionCount > 0 && questionCount % 5 === 0) {
            const randomSuggestions = QUESTION_SUGGESTIONS
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
            
            response.suggestions = randomSuggestions;
            response.message = 'Thank you! Here are some ideas for more questions:';
        }

        console.log(`Question submitted by ${username}. Total: ${questionCount}`);
        res.json(response);
    } catch (error) {
        console.error('Question submission error:', error);
        res.status(500).json({ error: 'Failed to submit question' });
    }
});

// Get user's questions - Protected route
router.get('/questions', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const userId = req.user.userId;

        const questionsCollection = db.collection('questions');
        const questions = await questionsCollection
            .find({ userId })
            .sort({ timestamp: -1 })
            .toArray();

        res.json({ questions });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ error: 'Failed to retrieve questions' });
    }
});

// Get question suggestions - Protected route
router.get('/suggestions', authenticateToken, async (req, res) => {
    try {
        const randomSuggestions = QUESTION_SUGGESTIONS
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);
        
        res.json({ suggestions: randomSuggestions });
    } catch (error) {
        console.error('Get suggestions error:', error);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

// Admin endpoint: Get all questions (protected, add admin check in production)
router.get('/admin/questions', async (req, res) => {
    try {
        const db = await connectDB();
        const questionsCollection = db.collection('questions');
        const usersCollection = db.collection('users');

        // Fetch all users to create a map of roles
        const users = await usersCollection.find({}).toArray();
        const userRolesMap = {};
        users.forEach(u => {
            if (u.username) {
                userRolesMap[u.username.toLowerCase()] = u.roles || [];
            }
        });
        
        const questions = await questionsCollection
            .find({})
            .sort({ timestamp: -1 })
            .toArray();

        // Group by user
        const userQuestions = questions.reduce((acc, q) => {
            const uname = q.username; 
            // Initialize entry if missing
            if (!acc[uname]) {
                acc[uname] = {
                    roles: userRolesMap[uname.toLowerCase()] || [],
                    questions: []
                };
            }
            acc[uname].questions.push({
                question: q.question,
                timestamp: q.timestamp
            });
            return acc;
        }, {});

        res.json({ 
            totalQuestions: questions.length,
            userCount: Object.keys(userQuestions).length,
            questionsByUser: userQuestions 
        });
    } catch (error) {
        console.error('Admin get questions error:', error);
        res.status(500).json({ error: 'Failed to retrieve questions' });
    }
});

// Admin endpoint: Get statistics
router.get('/admin/stats', async (req, res) => {
    try {
        const db = await connectDB();
        const usersCollection = db.collection('users');
        const questionsCollection = db.collection('questions');

        const totalUsers = await usersCollection.countDocuments();
        const totalQuestions = await questionsCollection.countDocuments();
        
        const topUsers = await questionsCollection.aggregate([
            { $group: { _id: '$username', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();

        res.json({
            totalUsers,
            totalQuestions,
            averageQuestionsPerUser: totalUsers > 0 ? (totalQuestions / totalUsers).toFixed(2) : 0,
            topContributors: topUsers
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
});

// Get chat history for authenticated user
router.get('/get_history', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const historyCollection = db.collection('chat_history');
        
        const history = await historyCollection.findOne({ 
            username: req.user.username 
        });

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

router.get('/history/:username', async (req, res) => {
    try {
        const rawUsername = req.params.username;
        if (!rawUsername) {
            return res.status(400).json({ error: 'Username is required', messages: [] });
        }

        const username = String(rawUsername).trim().toLowerCase();
        if (!username) {
            return res.status(400).json({ error: 'Username is required', messages: [] });
        }

        const db = await connectDB();
        const historyCollection = db.collection('chat_history');

        const history = await historyCollection.findOne({ username });

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

// Save chat history for authenticated user
router.post('/save_history', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const historyCollection = db.collection('chat_history');
        const { messages } = req.body;

        if (!Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages must be an array' });
        }

        await historyCollection.updateOne(
            { username: req.user.username },
            { 
                $set: { 
                    messages: messages,
                    lastUpdated: new Date()
                } 
            },
            { upsert: true }
        );

        res.json({ success: true, message: 'Chat history saved' });
    } catch (error) {
        console.error('Save history error:', error);
        res.status(500).json({ error: 'Failed to save chat history' });
    }
});

// Save consent PDF to server storage
router.post('/save-consent', express.raw({ type: 'application/pdf', limit: '10mb' }), async (req, res) => {
    try {
        const username = req.query.username;
        const timestamp = req.query.timestamp;

        if (!username || !timestamp) {
            return res.status(400).json({ error: 'Username and timestamp are required' });
        }

        // Create consent-pdfs directory inside /api/src/api/data if it doesn't exist
        const consentDir = path.join(__dirname, '../data/consent-pdfs');
        await fs.mkdir(consentDir, { recursive: true });

        // Sanitize filename
        const safeUsername = username.replace(/[^a-z0-9_-]/gi, '_');
        const filename = `consent_${safeUsername}_${timestamp}.pdf`;
        const filepath = path.join(consentDir, filename);

        // Save PDF buffer to disk
        await fs.writeFile(filepath, req.body);

        console.log(`Consent PDF saved for user ${username}: ${filename}`);
        res.json({ success: true, message: 'Consent PDF saved successfully', filename });
    } catch (error) {
        console.error('Save consent PDF error:', error);
        res.status(500).json({ error: 'Failed to save consent PDF' });
    }
});

// Save chat history
router.post('/history', async (req, res) => {
    try {
        const db = await connectDB();
        const { username, messages } = req.body;
        
        if (!username || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid request format' });
        }
        
        const historyCollection = db.collection('chat_history');
        await historyCollection.updateOne(
            { username: username.toLowerCase() },
            { $set: { messages, lastUpdated: new Date() } },
            { upsert: true }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Save history error:', error);
        res.status(500).json({ error: 'Failed to save history' });
    }
});

// Admin endpoint: Get all chat histories
router.get('/admin/history', async (req, res) => {
    try {
        const db = await connectDB();
        const historyCollection = db.collection('chat_history');
        
        const allHistory = await historyCollection.find({}).toArray();
        
        res.json({ 
            count: allHistory.length,
            histories: allHistory 
        });
    } catch (error) {
        console.error('Admin get all history error:', error);
        res.status(500).json({ error: 'Failed to retrieve all chat histories' });
    }
});

module.exports = router;
