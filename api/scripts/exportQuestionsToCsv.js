/*
 Export survey questions from MongoDB to CSV files.
 Outputs (under api/scripts/out):
  - questions.csv: username,question,timestamp (ISO)
  - user_question_counts.csv: username,count
  - device_question_counts.csv: deviceName,count (optional, parsed from question text)

 Usage (host):
   node api/scripts/exportQuestionsToCsv.js
   MONGO_URL=mongodb://localhost:27017 node api/scripts/exportQuestionsToCsv.js

 Usage (docker exec into API container):
   docker exec -it abacws-api node /api/scripts/exportQuestionsToCsv.js
   docker exec -it -e MONGO_URL=mongodb://mongo:27017 abacws-api node /api/scripts/exportQuestionsToCsv.js
*/

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = 'survey_db';
const OUT_DIR = path.join(__dirname, 'out');

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

function toCsvRow(values) {
  return values
    .map((v) => {
      const s = v === null || v === undefined ? '' : String(v);
      // Escape quotes and wrap
      const esc = s.replace(/"/g, '""');
      return `"${esc}"`;
    })
    .join(',');
}

function writeCsv(fileName, headers, rows) {
  ensureOutDir();
  const filePath = path.join(OUT_DIR, fileName);
  const content = [toCsvRow(headers), ...rows.map((r) => toCsvRow(r))].join('\n');
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

// Extract device names mentioned in a question (very simple heuristic for node_5.XX)
function extractDeviceMentions(text) {
  if (!text) return [];
  const matches = text.match(/node[_\s\.-]?5[\._-]?(\d{2})/gi) || [];
  return matches
    .map((m) => m.replace(/\s+/g, '')
                 .replace(/node/gi, 'node_')
                 .replace(/node__/, 'node_')
                 .replace(/node_-/, 'node_')
                 .replace(/node_5(\d{2})/i, 'node_5.$1')
                 .replace(/node_5\.(\d)(?!\d)/, 'node_5.0$1')) // normalize single digit
    .map((m) => m.toLowerCase());
}

async function run() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    // Fetch users for role lookup
    const users = await db.collection('users').find({}).toArray();
    const userRoles = new Map(); // username (lower) -> roles string
    for (const u of users) {
        if (u.username) {
            const roles = Array.isArray(u.roles) ? u.roles.join('; ') : (u.roles || '');
            userRoles.set(u.username.toLowerCase(), roles);
        }
    }

    const questions = await db.collection('questions')
      .find({})
      .project({ _id: 0, username: 1, question: 1, timestamp: 1 })
      .sort({ timestamp: 1 })
      .toArray();

    console.log(`Loaded ${questions.length} question(s) from ${DB_NAME}.questions`);

    // 1) Flat CSV of all questions
    const qRows = questions.map((q) => {
        const u = (q.username || '').toLowerCase();
        const roles = userRoles.get(u) || '';
        return [q.username || '', roles, q.question || '', (q.timestamp ? new Date(q.timestamp).toISOString() : '')];
    });
    const qFile = writeCsv('questions.csv', ['username', 'roles', 'question', 'timestamp_iso'], qRows);
    console.log('Wrote', qFile);

    // 2) Count by username
    const byUser = new Map();
    for (const q of questions) {
      const u = (q.username || '').toLowerCase();
      byUser.set(u, (byUser.get(u) || 0) + 1);
    }
    const userRows = Array.from(byUser.entries())
        .map(([u, count]) => [u, userRoles.get(u) || '', count])
        .sort((a, b) => b[2] - a[2]); // Sort by count
        
    const uFile = writeCsv('user_question_counts.csv', ['username', 'roles', 'count'], userRows);
    console.log('Wrote', uFile);

    // 3) Optional: Count device mentions in question text
    const deviceCounts = new Map();
    for (const q of questions) {
      const mentions = extractDeviceMentions(q.question || '');
      for (const d of mentions) {
        deviceCounts.set(d, (deviceCounts.get(d) || 0) + 1);
      }
    }
    const devRows = Array.from(deviceCounts.entries()).sort((a, b) => b[1] - a[1]);
    const dFile = writeCsv('device_question_counts.csv', ['deviceName', 'count'], devRows);
    console.log('Wrote', dFile);

  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
