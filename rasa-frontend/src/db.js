// src/db.js
import Dexie from 'dexie';

// Create a new database named 'ChatDB'
const db = new Dexie('ChatDB');

// Define the database schema
db.version(1).stores({
  // The 'users' store holds user credentials (username only, no password).
  // '++id' means auto-incremented primary key.
  users: '++id, username',

  // The 'chatHistory' store holds the chat history per user.
  // We'll index by username.
  chatHistory: '++id, username, messages'
});

export default db;
