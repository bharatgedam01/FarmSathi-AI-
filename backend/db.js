// FarmSaathi AI - Persistent JSON Database Manager
// Zero external dependencies; uses Node.js standard libraries (fs, path, crypto)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
// In serverless environments, /tmp is the only writable storage path
const DATA_DIR = isServerless ? path.join('/tmp', 'farmsaathi') : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists safely without crashing read-only environments
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (dirErr) {
  // Gracefully handled; serverless fallback uses in-memory database
}

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return testHash === hash;
}

// Initial seed data for immediate fully-working demonstration
function getInitialSeedData() {
  const demoSalt = '7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';
  const demoHash = hashPassword('farmer123', demoSalt).hash;

  return {
    users: [
      {
        id: 'user_demo',
        fullName: 'Demo Farmer',
        email: 'farmer@farmsaathi.in',
        phone: '+91 9876543210',
        passwordHash: demoHash,
        salt: demoSalt,
        createdAt: new Date().toISOString()
      }
    ],
    sessions: [
      {
        token: 'demo-session-token-farmsaathi-2026',
        userId: 'user_demo',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
      }
    ],
    profiles: {
      user_demo: {
        userId: 'user_demo',
        fullName: 'Demo Farmer',
        phone: '+91 9876543210',
        village: 'Chamorshi',
        district: 'Gadchiroli',
        state: 'Maharashtra',
        preferredLanguage: 'en',
        farmArea: '3.5',
        areaUnit: 'acres',
        soilType: 'Black Cotton Soil',
        irrigationMethod: 'Drip Irrigation',
        mainCrop: 'Soybean & Cotton',
        season: 'Kharif',
        latitude: 20.18,
        longitude: 80.00,
        updatedAt: new Date().toISOString()
      }
    },
    crops: [],
    activities: [],
    analyses: []
  };
}

let inMemoryDb = null;

// Load DB from file, creating with seed data if absent
function getDb() {
  if (inMemoryDb) return inMemoryDb;

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      // Ensure all tables exist
      if (!Array.isArray(parsed.users)) parsed.users = [];
      if (!Array.isArray(parsed.sessions)) parsed.sessions = [];
      if (!parsed.profiles || typeof parsed.profiles !== 'object') parsed.profiles = {};
      if (!Array.isArray(parsed.crops)) parsed.crops = [];
      if (!Array.isArray(parsed.activities)) parsed.activities = [];
      if (!Array.isArray(parsed.analyses)) parsed.analyses = [];
      if (!Array.isArray(parsed.government_schemes)) parsed.government_schemes = [];
      if (!Array.isArray(parsed.scheme_announcements)) parsed.scheme_announcements = [];
      if (!Array.isArray(parsed.scheme_updates)) parsed.scheme_updates = [];
      if (!Array.isArray(parsed.scheme_monitoring_logs)) parsed.scheme_monitoring_logs = [];
      inMemoryDb = parsed;
      return inMemoryDb;
    }
  } catch (err) {
    console.warn('Database file read notice:', err.message);
  }

  const seed = getInitialSeedData();
  inMemoryDb = seed;
  saveDb(seed);
  return inMemoryDb;
}

// Atomic save to database with memory guarantee
function saveDb(data) {
  inMemoryDb = data;
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (writeErr) {
      // In read-only serverless environments, inMemoryDb retains all updates safely
    }
  }
}

// Authentication Helpers
function createUser(fullName, email, password, phone) {
  const db = getDb();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error('Email and password are required');
  }

  const existing = db.users.find(u => u.email === cleanEmail);
  if (existing) {
    throw new Error('An account with this email address already exists');
  }

  const { hash, salt } = hashPassword(password);
  const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');

  const newUser = {
    id: userId,
    fullName: String(fullName || 'Farmer').trim(),
    email: cleanEmail,
    phone: String(phone || '').trim(),
    passwordHash: hash,
    salt: salt,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Create initial profile for user
  db.profiles[userId] = {
    userId: userId,
    fullName: newUser.fullName,
    phone: newUser.phone,
    village: '',
    district: '',
    state: 'Maharashtra',
    preferredLanguage: 'en',
    farmArea: '',
    areaUnit: 'acres',
    soilType: '',
    irrigationMethod: '',
    mainCrop: '',
    season: 'Kharif',
    latitude: null,
    longitude: null,
    updatedAt: new Date().toISOString()
  };

  saveDb(db);
  return newUser;
}

function authenticateUser(email, password) {
  const db = getDb();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = db.users.find(u => u.email === cleanEmail);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const valid = verifyPassword(password, user.passwordHash, user.salt);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  return user;
}

function getSessionSecret() {
  return process.env.CRON_SECRET || process.env.SESSION_SECRET || 'farmsaathi-secure-session-salt-2026';
}

function createSession(userId) {
  const db = getDb();
  const secret = getSessionSecret();
  const exp = Date.now() + 30 * 86400000;
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const token = `fs_sess.${payload}.${sig}`;

  const session = {
    token: token,
    userId: userId,
    expiresAt: new Date(exp).toISOString()
  };

  const now = new Date().toISOString();
  db.sessions = (db.sessions || []).filter(s => s.expiresAt > now);
  db.sessions.push(session);
  saveDb(db);
  return token;
}

function getUserByToken(token) {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const secret = getSessionSecret();

  // 1. Verify stateless HMAC signed token (works across all serverless lambda instances)
  if (cleanToken.startsWith('fs_sess.')) {
    try {
      const parts = cleanToken.split('.');
      if (parts.length === 3) {
        const payloadStr = parts[1];
        const signature = parts[2];
        const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');
        if (signature === expectedSig) {
          const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
          if (payload.exp && payload.exp > Date.now()) {
            const db = getDb();
            const user = (db.users || []).find(u => u.id === payload.userId);
            if (user) {
              return {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                createdAt: user.createdAt
              };
            }
            return {
              id: payload.userId,
              fullName: 'Farmer',
              email: '',
              phone: ''
            };
          }
        }
      }
    } catch (e) {}
  }

  // 2. Fallback to in-memory/file session storage
  const db = getDb();
  const session = (db.sessions || []).find(s => s.token === cleanToken);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  const user = (db.users || []).find(u => u.id === session.userId);
  if (!user) {
    return {
      id: session.userId,
      fullName: 'Farmer',
      email: '',
      phone: ''
    };
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt
  };
}

function deleteSession(token) {
  if (!token) return;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const db = getDb();
  db.sessions = db.sessions.filter(s => s.token !== cleanToken);
  saveDb(db);
}

// Profile API
function getProfile(userId) {
  const db = getDb();
  if (userId && db.profiles && db.profiles[userId]) {
    return db.profiles[userId];
  }
  const user = (userId && db.users) ? db.users.find(u => u.id === userId) : null;
  return {
    userId: userId || 'anonymous',
    fullName: (user && user.fullName) || '',
    phone: (user && user.phone) || '',
    village: '',
    district: '',
    state: 'Maharashtra',
    preferredLanguage: 'en',
    farmArea: '',
    areaUnit: 'acres',
    soilType: '',
    irrigationMethod: '',
    mainCrop: '',
    season: 'Kharif',
    latitude: null,
    longitude: null,
    updatedAt: new Date().toISOString()
  };
}

function saveProfile(userId, profileData) {
  const db = getDb();
  const targetId = userId || 'user_demo';

  const existing = db.profiles[targetId] || {};
  const updated = {
    ...existing,
    ...profileData,
    userId: targetId,
    updatedAt: new Date().toISOString()
  };

  db.profiles[targetId] = updated;

  // Also update user's fullName if provided
  if (profileData.fullName || profileData.full_name) {
    const name = profileData.fullName || profileData.full_name;
    const user = db.users.find(u => u.id === targetId);
    if (user) user.fullName = name;
  }

  saveDb(db);
  return updated;
}

// Crops API
function getCrops(userId) {
  if (!userId) return [];
  const db = getDb();
  return db.crops.filter(c => c.userId === userId);
}

function addCrop(userId, cropData) {
  if (!userId) throw new Error('User ID is required to add crops');
  const db = getDb();
  const targetId = userId;

  const newCrop = {
    id: 'crop_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
    userId: targetId,
    cropName: String(cropData.cropName || cropData.crop_name || '').trim(),
    fieldName: String(cropData.fieldName || cropData.field_name || '').trim(),
    sowingDate: String(cropData.sowingDate || cropData.sowing_date || '').trim(),
    growthStage: String(cropData.growthStage || cropData.growth_stage || 'Vegetative').trim(),
    area: String(cropData.area || '').trim(),
    notes: String(cropData.notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  db.crops.unshift(newCrop);
  saveDb(db);
  return newCrop;
}

function deleteCrop(userId, cropId) {
  if (!userId || !cropId) return false;
  const db = getDb();
  const initialLen = db.crops.length;

  db.crops = db.crops.filter(c => !(c.id === cropId && c.userId === userId));
  saveDb(db);
  return db.crops.length < initialLen;
}

// Activities API
function getActivities(userId) {
  if (!userId) return [];
  const db = getDb();
  return db.activities.filter(a => a.userId === userId);
}

function addActivity(userId, activityData) {
  if (!userId) throw new Error('User ID is required to add activities');
  const db = getDb();
  const targetId = userId;

  const newActivity = {
    id: 'act_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
    userId: targetId,
    name: String(activityData.name || '').trim(),
    category: String(activityData.category || 'General').trim(),
    date: String(activityData.date || new Date().toISOString().slice(0, 10)).trim(),
    farm: String(activityData.farm || activityData.fieldName || '').trim(),
    crop: String(activityData.crop || activityData.cropName || '').trim(),
    notes: String(activityData.notes || '').trim(),
    completed: Boolean(activityData.completed),
    createdAt: new Date().toISOString()
  };

  db.activities.unshift(newActivity);
  saveDb(db);
  return newActivity;
}

function updateActivity(userId, activityId, activityData) {
  const db = getDb();
  const targetId = userId || 'user_demo';
  const act = db.activities.find(a => a.id === activityId && (a.userId === targetId || targetId === 'user_demo'));
  if (act) {
    if (activityData.name !== undefined) act.name = String(activityData.name).trim();
    if (activityData.category !== undefined) act.category = String(activityData.category).trim();
    if (activityData.date !== undefined) act.date = String(activityData.date).trim();
    if (activityData.farm !== undefined) act.farm = String(activityData.farm).trim();
    if (activityData.crop !== undefined) act.crop = String(activityData.crop).trim();
    if (activityData.notes !== undefined) act.notes = String(activityData.notes).trim();
    if (activityData.completed !== undefined) act.completed = Boolean(activityData.completed);
    act.updatedAt = new Date().toISOString();
    saveDb(db);
    return act;
  }
  return null;
}

function deleteActivity(userId, activityId) {
  if (!userId || !activityId) return false;
  const db = getDb();
  const initialLen = db.activities.length;

  db.activities = db.activities.filter(a => !(a.id === activityId && a.userId === userId));
  saveDb(db);
  return db.activities.length < initialLen;
}

function toggleActivity(userId, activityId) {
  if (!userId || !activityId) return null;
  const db = getDb();
  const act = db.activities.find(a => a.id === activityId && a.userId === userId);
  if (act) {
    act.completed = !act.completed;
    saveDb(db);
    return act;
  }
  return null;
}

// Analyses API
function getAnalyses(userId) {
  if (!userId) return [];
  const db = getDb();
  return (db.analyses || []).filter(a => a.userId === userId);
}

function addAnalysis(userId, analysisData) {
  if (!userId) throw new Error('User ID is required to save scan analyses');
  const db = getDb();
  const targetId = userId;

  const newAnalysis = {
    id: analysisData.id || ('scan_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex')),
    userId: targetId,
    crop: String(analysisData.crop || 'Plant Specimen').trim(),
    fileName: String(analysisData.fileName || analysisData.file_name || 'photo.jpg').trim(),
    imageUrl: analysisData.imageUrl || analysisData.image_url || analysisData.imagePath || analysisData.image_path || null,
    report: String(analysisData.report || '').trim(),
    isDemo: Boolean(analysisData.isDemo),
    createdAt: new Date().toISOString()
  };

  db.analyses.unshift(newAnalysis);
  saveDb(db);
  return newAnalysis;
}

function deleteAnalysis(userId, analysisId) {
  if (!userId || !analysisId) return false;
  const db = getDb();
  const initialLen = (db.analyses || []).length;

  db.analyses = (db.analyses || []).filter(a => !(a.id === analysisId && a.userId === userId));
  saveDb(db);
  return db.analyses.length < initialLen;
}

function clearAnalyses(userId) {
  if (!userId) return 0;
  const db = getDb();
  const beforeLen = (db.analyses || []).length;
  db.analyses = (db.analyses || []).filter(a => a.userId !== userId);
  saveDb(db);
  return beforeLen - db.analyses.length;
}

function getStats() {
  const db = getDb();
  return {
    usersCount: db.users.length,
    cropsCount: db.crops.length,
    activitiesCount: db.activities.length,
    analysesCount: db.analyses.length,
    databaseFile: DB_FILE,
    storageEngine: 'Persistent JSON Database (Zero-Dependency)'
  };
}

module.exports = {
  getDb,
  saveDb,
  createUser,
  authenticateUser,
  createSession,
  getUserByToken,
  deleteSession,
  getProfile,
  saveProfile,
  getCrops,
  addCrop,
  deleteCrop,
  getActivities,
  addActivity,
  updateActivity,
  deleteActivity,
  toggleActivity,
  getAnalyses,
  addAnalysis,
  deleteAnalysis,
  clearAnalyses,
  getStats
};
