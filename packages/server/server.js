// Task Manager Sync Server
// A simple local sync server that stores tasks in a JSON file.
//
// Usage:
//   SYNC_PASSWORD=mypassword node server.js
//   SYNC_PASSWORD=mypassword PORT=3456 node server.js
//
// Endpoints:
//   GET  /api/health          — server status (no auth)
//   GET  /api/data            — get all tasks/projects/settings
//   PUT  /api/data            — replace all data (last write wins)
//   GET  /api/data/updated-at — just the timestamp (for cheap polling)

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const PASSWORD = process.env.SYNC_PASSWORD || 'changeme';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

// ─── Middleware ──────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Simple auth — check password in the Authorization header
// Expects: Authorization: Bearer <password>
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header. Use: Bearer <password>' });
  }
  const token = auth.slice(7);
  if (token !== PASSWORD) {
    return res.status(403).json({ error: 'Invalid password' });
  }
  next();
}

// ─── Data persistence ───────────────────────────────────────────

function getDefaultData() {
  return {
    tasks: [],
    projects: ['Personal', 'Work', 'Health'],
    settings: { overclock: false, overclockLocked: false },
    updatedAt: new Date().toISOString()
  };
}

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading data file, starting fresh:', err.message);
  }
  return getDefaultData();
}

function writeData(data) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

// ─── Routes ─────────────────────────────────────────────────────

// Health check (no auth) — useful for clients to detect the server
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'task-manager-sync', version: '1.0.0' });
});

// Auth check — clients can verify their password is correct
app.get('/api/auth-check', requireAuth, (req, res) => {
  res.json({ status: 'ok', message: 'Authenticated' });
});

// Get all data
app.get('/api/data', requireAuth, (req, res) => {
  const data = readData();
  res.json(data);
});

// Get just the timestamp (cheap polling — skip downloading if unchanged)
app.get('/api/data/updated-at', requireAuth, (req, res) => {
  const data = readData();
  res.json({ updatedAt: data.updatedAt });
});

// Replace all data (last write wins)
app.put('/api/data', requireAuth, (req, res) => {
  const { tasks, projects, settings } = req.body;

  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: 'tasks must be an array' });
  }
  if (!projects || !Array.isArray(projects)) {
    return res.status(400).json({ error: 'projects must be an array' });
  }

  const saved = writeData({
    tasks,
    projects,
    settings: settings || { overclock: false, overclockLocked: false }
  });

  console.log(`[${new Date().toISOString()}] Data updated — ${tasks.length} tasks, ${projects.length} projects`);
  res.json(saved);
});

// ─── Start ──────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Task Manager Sync Server                     ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  URL:      http://0.0.0.0:${PORT}               ║`);
  console.log(`║  Data:     ${path.basename(DATA_FILE)}                       ║`);
  console.log(`║  Password: ${PASSWORD === 'changeme' ? 'changeme (⚠ default!)' : '••••••••'}          ║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  GET  /api/health        — server status      ║');
  console.log('║  GET  /api/data          — fetch all data     ║');
  console.log('║  PUT  /api/data          — push all data      ║');
  console.log('║  GET  /api/data/updated-at — last modified    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
