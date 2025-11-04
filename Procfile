# Procfile for Heroku
# This tells Heroku how to start your application
# Note: Heroku only runs ONE process type by default on free tier

# For API-only deployment (recommended for free tier)
web: cd api && npm install && node src/app.js

# Alternative: Frontend-only deployment
# web: cd rasa-frontend && npm install && npm start

# For paid tier with multiple dynos, you can use:
# api: cd api && node src/app.js
# visualiser: cd visualiser && npm run build && npx serve -s build -l $PORT
# frontend: cd rasa-frontend && npm start
