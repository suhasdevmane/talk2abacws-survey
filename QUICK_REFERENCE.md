# User Survey System - Quick Reference

## 🎯 What We Built

A streamlined survey system with:
- **3D Building Visualizer** integration
- **Question Collection** via chatbot
- **MongoDB** for storing user questions
- **Simple Navigation** - Only 2 pages: Visualizer & Ideas

## 🚀 Quick Start

```powershell
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📋 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **API** | http://localhost:5000 | Backend API |
| **Visualizer** | http://localhost:8090 | 3D building view |
| **MongoDB** | localhost:27017 | Database |

## 🔐 User Flow

1. **Visit** http://localhost:3000
2. **Login/Register** with username & password
3. **Redirected to /survey** (Visualizer page)
4. **Two Navigation Options:**
   - **Visualizer** - Explore 3D building with floating chatbot
   - **Ideas** - Get question suggestions

## 📝 Pages Overview

### 1. Login Page (`/login`)
- Simple username/password login
- Auto-register if user doesn't exist
- Redirects to Visualizer after login

### 2. Visualizer Page (`/survey`)
- Full-screen 3D building visualization
- Floating chatbot (bottom-right corner)
- Ask questions - they're saved to MongoDB
- Response: "Thank you! Submit another question."
- Suggestions every 5 questions
- Lightbulb button for manual suggestions

### 3. Ideas Page (`/ideas`)
- Shows 5 random question suggestions
- "Get New Ideas" button for fresh suggestions
- "Go to Visualizer" button to start asking
- Usage instructions

## 🗂️ Database Structure

### MongoDB Collections

**users:**
```javascript
{
  username: String,
  password: String (bcrypt hashed),
  questionCount: Number,
  createdAt: Date
}
```

**questions:**
```javascript
{
  userId: String,
  username: String,
  question: String,
  timestamp: Date
}
```

## 🔧 API Endpoints

### Authentication
- `POST /api/survey/register` - Create account
- `POST /api/survey/login` - Login
- `POST /api/survey/logout` - Logout
- `GET /api/survey/auth/status` - Check auth

### Questions
- `POST /api/survey/question` - Submit question (requires auth)
- `GET /api/survey/questions` - Get user's questions (requires auth)
- `GET /api/survey/suggestions` - Get random suggestions (requires auth)

### Admin (No auth currently - add in production!)
- `GET /api/admin/questions` - All questions grouped by user
- `GET /api/admin/stats` - Statistics

## 📊 View Collected Data

### Option 1: PowerShell Script
```powershell
.\view-survey-data.ps1 -Action summary   # Statistics
.\view-survey-data.ps1 -Action all       # All questions
.\view-survey-data.ps1 -Action export    # Export JSON/CSV
```

### Option 2: API Call
```powershell
curl http://localhost:5000/api/admin/stats
curl http://localhost:5000/api/admin/questions
```

### Option 3: MongoDB Direct
```bash
docker exec -it abacws-mongo mongosh
use survey_db
db.questions.find().pretty()
```

## 🎨 Navigation Bar

Simplified to **2 options only**:
1. **Visualizer** - Opens /survey page
2. **Ideas** - Opens /ideas page

Plus user info (username) and Logout button.

## ✨ Key Features

✅ Automatic login → redirect to Visualizer  
✅ Floating chatbot on all pages  
✅ Question suggestions (automatic + on-demand)  
✅ All questions saved with username & timestamp  
✅ Clean, minimal UI - no unnecessary pages  
✅ MongoDB for flexible data storage  
✅ Session-based authentication  
✅ Export tools for data analysis  

## 🎯 Question Suggestion System

15 pre-loaded questions about:
- Temperature & sensors
- Energy consumption
- Motion detection
- Humidity levels
- Occupancy
- Air quality
- Device status

Users get:
- 3 random suggestions every 5 questions
- 5 suggestions on Ideas page
- Fresh suggestions with "Get New Ideas" button
- Lightbulb button in chatbot

## 🛠️ Customization

### Change Suggestions
Edit: `api/src/api/routers/survey.ts`
```typescript
const QUESTION_SUGGESTIONS = [
  "Your custom question",
  // Add more...
];
```

### Change Suggestion Frequency
Edit: `api/src/api/routers/survey.ts` (line ~210)
```typescript
if (questionCount > 0 && questionCount % 3 === 0) { // Change 3 to your number
```

### Modify Response Message
Edit: `api/src/api/routers/survey.ts`
```typescript
response.message = 'Your custom message';
```

## 🏗️ Architecture

```
Frontend (React)
    ↓
API (Express + MongoDB)
    ↓
MongoDB (users + questions collections)

Visualizer (separate service, embedded via iframe)
```

## 📦 Services in docker-compose.yml

- ✅ **mongo** - Database for users & questions
- ✅ **api** - Backend API service
- ✅ **visualiser** - 3D building viewer
- ✅ **rasa-frontend** - React frontend

**Removed:** PostgreSQL, MySQL (not needed for survey)

## 🔒 Security Notes for Production

Before production deployment:
1. Change `SESSION_SECRET` in docker-compose.yml
2. Enable HTTPS and secure cookies
3. Add rate limiting
4. Implement proper admin authentication
5. Set up database backups
6. Use environment variables for sensitive data
7. Add CORS restrictions

## 📈 Data Analysis

Questions are stored with:
- Username
- Question text
- Timestamp

Export to CSV/JSON and analyze:
- Most active users
- Question frequency
- Common topics
- Time patterns

## 🐛 Troubleshooting

### Frontend not loading
```powershell
docker-compose logs rasa-frontend
```

### API errors
```powershell
docker-compose logs api
```

### MongoDB issues
```powershell
docker-compose logs mongo
docker exec -it abacws-mongo mongosh
```

### Restart everything
```powershell
docker-compose down
docker-compose up -d
```

## 📞 Support

Check logs first:
```powershell
docker-compose logs -f
```

For more details, see `SURVEY_SETUP.md`

---

**Built with:** React, Express, MongoDB, Docker
**Purpose:** Collect user questions about 3D building visualization
