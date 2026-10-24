// FarmSaathi AI - Persistent JSON Database Manager
// Zero external dependencies; uses Node.js standard libraries (fs, path, crypto)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
        fullName: 'Rahul Patil',
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
        fullName: 'Rahul Patil',
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
    crops: [
      {
        id: 'crop_1',
        userId: 'user_demo',
        cropName: 'Soybean (JS-335)',
        fieldName: 'North Field - Plot A',
        sowingDate: '2026-06-25',
        growthStage: 'Pod Filling (शेंगा भरणे)',
        area: '2.0 Acres',
        notes: 'Applied 0:52:34 foliar spray. Moisture level good.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'crop_2',
        userId: 'user_demo',
        cropName: 'BT Cotton',
        fieldName: 'South Field - Plot B',
        sowingDate: '2026-06-20',
        growthStage: 'Boll Development (बोंड विकास)',
        area: '1.5 Acres',
        notes: 'Installed 5 pheromone traps for pink bollworm monitoring.',
        createdAt: new Date().toISOString()
      }
    ],
    activities: [
      {
        id: 'act_1',
        userId: 'user_demo',
        name: 'Irrigate Soybean Field',
        category: 'Irrigation',
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        notes: 'Check moisture in root zone; run drip irrigation for 2 hours.',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'act_2',
        userId: 'user_demo',
        name: 'Inspect Cotton for Pink Bollworm',
        category: 'Spraying',
        date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        notes: 'Inspect 20 bolls across field for early moth entry holes.',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'act_3',
        userId: 'user_demo',
        name: 'Soil Nutrient Testing Preparation',
        category: 'Fertilizer',
        date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
        notes: 'Collect V-shaped soil samples from 8 spots for KVK testing.',
        completed: false,
        createdAt: new Date().toISOString()
      }
    ],
    analyses: [
      {
        id: 'scan_1',
        userId: 'user_demo',
        crop: 'Soybean Leaf Specimen',
        fileName: 'soybean_leaf_sample.jpg',
        report: '🌾 Farm Intelligence — Crop Leaf Health Triage Report (Soybean)\n======================================================\n1. Visible Plant Observations:\n   - Foliage displays localized chlorotic yellowing on lower leaves with healthy veins.\n2. Differential Diagnosis:\n   - Primary: Early cercospora leaf spot combined with mild nitrogen deficiency.\n3. Immediate Actions:\n   - Rogue out heavily spotted senescent leaves; avoid overhead watering.\n4. Safe IPM Remedies:\n   - Apply bio-fungicide Trichoderma viride @ 5g/L during cool evening hours.\n5. Official Referral:\n   - Consult your local Krishi Vigyan Kendra (KVK) or Kisan Call Centre (1800-180-1551).',
        isDemo: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ]
  };
}

// Load DB from file, creating with seed data if absent
function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    const seed = getInitialSeedData();
    saveDb(seed);
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    // Ensure all tables exist
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!Array.isArray(parsed.sessions)) parsed.sessions = [];
    if (!parsed.profiles || typeof parsed.profiles !== 'object') parsed.profiles = {};
    if (!Array.isArray(parsed.crops)) parsed.crops = [];
    if (!Array.isArray(parsed.activities)) parsed.activities = [];
    if (!Array.isArray(parsed.analyses)) parsed.analyses = [];
    return parsed;
  } catch (err) {
    console.error('Error reading database file, resetting to seed:', err);
    const seed = getInitialSeedData();
    saveDb(seed);
    return seed;
  }
}

// Atomic save to database
function saveDb(data) {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
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

function createSession(userId) {
  const db = getDb();
  const token = 'fs_sess_' + crypto.randomBytes(24).toString('hex');
  const session = {
    token: token,
    userId: userId,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
  };

  // Clean expired sessions
  const now = new Date().toISOString();
  db.sessions = db.sessions.filter(s => s.expiresAt > now);
  db.sessions.push(session);
  saveDb(db);
  return token;
}

function getUserByToken(token) {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const db = getDb();
  const session = db.sessions.find(s => s.token === cleanToken);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) return null;

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
  const targetId = userId || 'user_demo';
  return db.profiles[targetId] || db.profiles['user_demo'];
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
  const db = getDb();
  const targetId = userId || 'user_demo';
  return db.crops.filter(c => c.userId === targetId || (!c.userId && targetId === 'user_demo'));
}

function addCrop(userId, cropData) {
  const db = getDb();
  const targetId = userId || 'user_demo';

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
  const db = getDb();
  const targetId = userId || 'user_demo';
  const initialLen = db.crops.length;

  db.crops = db.crops.filter(c => !(c.id === cropId && (c.userId === targetId || targetId === 'user_demo')));
  saveDb(db);
  return db.crops.length < initialLen;
}

// Activities API
function getActivities(userId) {
  const db = getDb();
  const targetId = userId || 'user_demo';
  return db.activities.filter(a => a.userId === targetId || (!a.userId && targetId === 'user_demo'));
}

function addActivity(userId, activityData) {
  const db = getDb();
  const targetId = userId || 'user_demo';

  const newActivity = {
    id: 'act_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
    userId: targetId,
    name: String(activityData.name || '').trim(),
    category: String(activityData.category || 'General').trim(),
    date: String(activityData.date || new Date().toISOString().slice(0, 10)).trim(),
    notes: String(activityData.notes || '').trim(),
    completed: Boolean(activityData.completed),
    createdAt: new Date().toISOString()
  };

  db.activities.unshift(newActivity);
  saveDb(db);
  return newActivity;
}

function deleteActivity(userId, activityId) {
  const db = getDb();
  const targetId = userId || 'user_demo';
  const initialLen = db.activities.length;

  db.activities = db.activities.filter(a => !(a.id === activityId && (a.userId === targetId || targetId === 'user_demo')));
  saveDb(db);
  return db.activities.length < initialLen;
}

function toggleActivity(userId, activityId) {
  const db = getDb();
  const targetId = userId || 'user_demo';
  const act = db.activities.find(a => a.id === activityId && (a.userId === targetId || targetId === 'user_demo'));
  if (act) {
    act.completed = !act.completed;
    saveDb(db);
    return act;
  }
  return null;
}

// Analyses API
function getAnalyses(userId) {
  const db = getDb();
  const targetId = userId || 'user_demo';
  return db.analyses.filter(a => a.userId === targetId || (!a.userId && targetId === 'user_demo'));
}

function addAnalysis(userId, analysisData) {
  const db = getDb();
  const targetId = userId || 'user_demo';

  const newAnalysis = {
    id: 'scan_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
    userId: targetId,
    crop: String(analysisData.crop || 'Plant Specimen').trim(),
    fileName: String(analysisData.fileName || analysisData.file_name || 'photo.jpg').trim(),
    report: String(analysisData.report || '').trim(),
    isDemo: Boolean(analysisData.isDemo),
    createdAt: new Date().toISOString()
  };

  db.analyses.unshift(newAnalysis);
  saveDb(db);
  return newAnalysis;
}

function deleteAnalysis(userId, analysisId) {
  const db = getDb();
  const targetId = userId || 'user_demo';
  const initialLen = db.analyses.length;

  db.analyses = db.analyses.filter(a => !(a.id === analysisId && (a.userId === targetId || targetId === 'user_demo')));
  saveDb(db);
  return db.analyses.length < initialLen;
}

function clearAnalyses(userId) {
  const db = getDb();
  const targetId = userId || 'user_demo';
  db.analyses = db.analyses.filter(a => a.userId !== targetId && targetId !== 'user_demo');
  saveDb(db);
  return true;
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
  deleteActivity,
  toggleActivity,
  getAnalyses,
  addAnalysis,
  deleteAnalysis,
  clearAnalyses,
  getStats
};
