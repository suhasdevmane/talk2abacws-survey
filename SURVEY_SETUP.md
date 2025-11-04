# User Survey Framework - Setup Guide

## Overview
This framework integrates three services to collect user questions about building visualization:
1. **API Service** (Port 5000) - Handles authentication and stores questions in MongoDB
2. **Visualizer** (Port 8090) - 3D building visualization
3. **Frontend** (Port 3000) - User interface with chatbot

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (React)                      │
│  - Login/Registration                           │
│  - Survey Page (Visualizer + ChatBot)           │
│  - Question submission UI                       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           API Service (Node.js/Express)         │
│  Endpoints:                                     │
│  - POST /api/survey/register                    │
│  - POST /api/survey/login                       │
│  - POST /api/survey/question                    │
│  - GET  /api/survey/suggestions                 │
│  - GET  /api/admin/questions (all questions)    │
│  - GET  /api/admin/stats (statistics)           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           MongoDB                               │
│  Collections:                                   │
│  - users (username, password, questionCount)    │
│  - questions (userId, username, question, ts)   │
│  - sessions (express-session storage)           │
└─────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

**API Service:**
```bash
cd api
npm install
```

**Frontend:**
```bash
cd rasa-frontend
npm install
```

### 2. Start Services with Docker Compose

```bash
docker-compose up -d
```

This will start:
- MongoDB (internal, no exposed port)
- PostgreSQL (port 5432)
- MySQL (internal)
- API Service (port 5000)
- Visualizer (port 8090)
- Frontend (port 3000)

### 3. Access the Application

1. **Open browser**: http://localhost:3000
2. **Login/Register**: Create a new account with username and password
3. **Navigate to Survey**: Click "Start Survey" button on home page
4. **Use the System**:
   - View the 3D visualizer in the main area
   - Use the floating chatbot to ask questions
   - Each question is saved to MongoDB with your username
   - System responds with "Thank you! Submit another question."
   - After every 5 questions, you get automatic suggestions
   - Click the lightbulb icon (💡) to get more question ideas anytime

## User Flow

```
1. User visits http://localhost:3000
2. User logs in or registers (creates account)
3. User is redirected to /survey page
4. User sees:
   - 3D Building Visualizer (full screen)
   - Floating ChatBot widget (bottom right)
5. User explores visualizer and asks questions via chatbot
6. Each question submission:
   - Saves to MongoDB (with username, timestamp)
   - Responds: "Thank you! Submit another question."
   - Every 5 questions: Shows 3 random suggestions
7. User can click lightbulb icon for more suggestions anytime
8. ChatBot tracks question count per user
```

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  password: String (bcrypt hashed),
  createdAt: Date,
  questionCount: Number
}
```

### Questions Collection
```javascript
{
  _id: ObjectId,
  userId: String,
  username: String,
  question: String,
  timestamp: Date
}
```

## API Endpoints

### Authentication
- **POST /api/survey/register**
  - Body: `{ username, password }`
  - Creates new user account
  
- **POST /api/survey/login**
  - Body: `{ username, password }`
  - Returns session cookie

- **POST /api/survey/logout**
  - Destroys session

- **GET /api/survey/auth/status**
  - Check if user is authenticated

### Question Management
- **POST /api/survey/question** (requires auth)
  - Body: `{ question }`
  - Response: `{ success, message, questionCount, suggestions? }`
  - Saves question and returns "Thank you" message
  - Provides suggestions every 5 questions

- **GET /api/survey/questions** (requires auth)
  - Returns all questions for current user

- **GET /api/survey/suggestions** (requires auth)
  - Returns 5 random question suggestions

### Admin Endpoints
- **GET /api/admin/questions**
  - Returns all questions from all users
  - Grouped by username

- **GET /api/admin/stats**
  - Returns statistics:
    - Total users
    - Total questions
    - Average questions per user
    - Top 10 contributors

## Question Suggestions

The system includes 15 pre-configured question suggestions:
- "What is the temperature in Room 101?"
- "Show me the energy consumption for the last week"
- "Which rooms have motion detected right now?"
- "What is the humidity level in the building?"
- "Show me all active sensors"
- And 10 more...

Users receive:
- 3 random suggestions automatically every 5 questions
- 5 random suggestions when clicking the lightbulb button

## Retrieving Collected Data

### Option 1: MongoDB Direct Access
```bash
# Connect to MongoDB container
docker exec -it abacws-mongo mongosh

# Switch to database
use survey_db

# View all questions
db.questions.find().pretty()

# Count questions by user
db.questions.aggregate([
  { $group: { _id: "$username", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

# Export to JSON
mongoexport --db=survey_db --collection=questions --out=questions.json
```

### Option 2: Admin API Endpoint
```bash
# Get all questions grouped by user
curl http://localhost:5000/api/admin/questions

# Get statistics
curl http://localhost:5000/api/admin/stats
```

### Option 3: Export from Frontend
Each user can download their own chat history using the download button in the chatbot.

## Environment Variables

**docker-compose.yml** configures:
- `MONGO_URL=mongodb://mongo:27017`
- `SESSION_SECRET=change-this-secret-in-production`
- `REACT_APP_API_URL=http://localhost:5000/api`
- `REACT_APP_VISUALIZER_URL=http://localhost:8090`

## Features

✅ **User Authentication**: Secure login/registration with bcrypt password hashing  
✅ **Question Collection**: All questions saved with username and timestamp  
✅ **Automatic Suggestions**: Smart prompts to encourage more questions  
✅ **Session Management**: Persistent sessions using MongoDB store  
✅ **Question Tracking**: Per-user question count  
✅ **Admin Analytics**: View all collected data and statistics  
✅ **Floating ChatBot**: Always accessible on survey page  
✅ **3D Visualizer Integration**: Full-screen building view  
✅ **Responsive Design**: Works on desktop and mobile  

## Customization

### Add More Question Suggestions
Edit `api/src/api/routers/survey.ts`:
```typescript
const QUESTION_SUGGESTIONS = [
  "Your custom question here",
  // Add more...
];
```

### Change Suggestion Frequency
Edit `api/src/api/routers/survey.ts` line ~210:
```typescript
// Change from every 5 to every 3 questions:
if (questionCount > 0 && questionCount % 3 === 0) {
```

### Modify Response Message
Edit `api/src/api/routers/survey.ts` line ~214:
```typescript
response.message = 'Your custom message here';
```

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongo

# View MongoDB logs
docker logs abacws-mongo
```

### API Not Responding
```bash
# Check API logs
docker logs abacws-api

# Restart API service
docker-compose restart api
```

### Frontend Can't Connect to API
- Verify `REACT_APP_API_URL` in docker-compose.yml
- Check browser console for CORS errors
- Ensure API is running: http://localhost:5000/health

## Production Deployment

Before deploying to production:

1. **Change SESSION_SECRET** in docker-compose.yml
2. **Enable HTTPS** and set `secure: true` for cookies
3. **Add rate limiting** to prevent abuse
4. **Implement proper admin authentication**
5. **Set up database backups**
6. **Configure CORS** properly for your domain

## Data Analysis

Example Python script to analyze collected questions:
```python
from pymongo import MongoClient
import pandas as pd

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017')
db = client.survey_db

# Get all questions
questions = list(db.questions.find())
df = pd.DataFrame(questions)

# Analysis
print(f"Total questions: {len(df)}")
print(f"Unique users: {df['username'].nunique()}")
print(f"\nQuestions per user:")
print(df['username'].value_counts())

# Word frequency
from collections import Counter
words = ' '.join(df['question']).lower().split()
print(f"\nMost common words:")
print(Counter(words).most_common(20))
```

## License
MIT

## Support
For issues or questions, please create an issue in the repository.
