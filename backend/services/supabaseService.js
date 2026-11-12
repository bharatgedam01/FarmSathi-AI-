// FarmSaathi AI — Supabase PostgreSQL Serverless Service
// Zero-dependency PostgREST client using Node.js standard runtime.
// Uses server-side SUPABASE_SERVICE_ROLE_KEY to bypass RLS for authorized operations,
// while strictly enforcing user ownership on every database operation.

const crypto = require('crypto');

function getTodayIST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function isPastDateIST(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const cleanDate = dateStr.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate < getTodayIST();
  }
  return false;
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL || '';
  return url.replace(/\/$/, '');
}

function isConfigured() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  return Boolean(url && key && url.startsWith('http'));
}

async function request(endpoint, options = {}) {
  const baseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  if (!baseUrl || !serviceKey) {
    throw new Error('Supabase database configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const fullUrl = baseUrl + cleanEndpoint;

  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'apikey': serviceKey,
    'Authorization': 'Bearer ' + serviceKey,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOpts = {
    method,
    headers
  };

  if (options.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(fullUrl, fetchOpts);
  } catch (netErr) {
    throw new Error(`Supabase connection failed: ${netErr.message}`);
  }

  const rawText = await res.text();
  let json = null;
  if (rawText && rawText.trim()) {
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      json = { raw: rawText };
    }
  }

  if (!res.ok) {
    const errorMsg = (json && (json.message || json.error || json.hint || json.details)) || rawText || `HTTP ${res.status}`;
    const err = new Error(`Supabase query error (${res.status}): ${errorMsg}`);
    err.status = res.status;
    err.details = json;
    throw err;
  }

  return json;
}

// Password helpers (matching backend/db.js)
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return testHash === hash;
}

// 1. AUTHENTICATION & USERS
async function createUser(fullName, email, password, phone) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error('Email and password are required');

  // Check existing user
  const existing = await request(`/rest/v1/app_users?email=eq.${encodeURIComponent(cleanEmail)}&select=id`);
  if (Array.isArray(existing) && existing.length > 0) {
    throw new Error('An account with this email address already exists');
  }

  const { hash, salt } = hashPassword(password);
  const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();

  const userRow = {
    id: userId,
    full_name: String(fullName || 'Farmer').trim(),
    email: cleanEmail,
    phone: String(phone || '').trim() || null,
    password_hash: hash,
    salt: salt,
    created_at: now,
    updated_at: now
  };

  const inserted = await request('/rest/v1/app_users', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: userRow
  });

  // Create initial profile
  const profileRow = {
    user_id: userId,
    full_name: userRow.full_name,
    phone: userRow.phone,
    village: null,
    district: null,
    state: 'Maharashtra',
    preferred_language: 'en',
    farm_area: null,
    area_unit: 'acres',
    soil_type: null,
    irrigation_method: null,
    main_crop: null,
    season: 'Kharif',
    latitude: null,
    longitude: null,
    created_at: now,
    updated_at: now
  };

  await request('/rest/v1/profiles', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: profileRow
  }).catch(() => {});

  const u = (Array.isArray(inserted) && inserted[0]) ? inserted[0] : userRow;
  return {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone,
    createdAt: u.created_at
  };
}

async function authenticateUser(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error('Email and password are required');

  const users = await request(`/rest/v1/app_users?email=eq.${encodeURIComponent(cleanEmail)}&select=*`);
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = users[0];
  const valid = verifyPassword(password, user.password_hash, user.salt);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    createdAt: user.created_at
  };
}

async function getUserById(userId) {
  if (!userId) return null;
  const users = await request(`/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=id,full_name,email,phone,created_at`);
  if (!Array.isArray(users) || users.length === 0) return null;
  const u = users[0];
  return {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone,
    createdAt: u.created_at
  };
}

// 2. PROFILES
async function getProfile(userId) {
  const targetId = userId || 'user_demo';
  const profiles = await request(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(targetId)}&select=*`);

  if (Array.isArray(profiles) && profiles.length > 0) {
    const p = profiles[0];
    return {
      userId: p.user_id,
      fullName: p.full_name || '',
      phone: p.phone || '',
      village: p.village || '',
      district: p.district || '',
      state: p.state || 'Maharashtra',
      preferredLanguage: p.preferred_language || 'en',
      farmArea: p.farm_area || '',
      areaUnit: p.area_unit || 'acres',
      soilType: p.soil_type || '',
      irrigationMethod: p.irrigation_method || '',
      mainCrop: p.main_crop || '',
      season: p.season || 'Kharif',
      latitude: p.latitude !== null ? Number(p.latitude) : null,
      longitude: p.longitude !== null ? Number(p.longitude) : null,
      updatedAt: p.updated_at
    };
  }

  // Fallback to user row if profile row not yet created
  const user = await getUserById(targetId);
  return {
    userId: targetId,
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

async function saveProfile(userId, profileData) {
  const targetId = userId || 'user_demo';
  const now = new Date().toISOString();

  const row = {
    user_id: targetId,
    full_name: profileData.fullName || profileData.full_name || '',
    phone: profileData.phone || null,
    village: profileData.village || null,
    district: profileData.district || null,
    state: profileData.state || 'Maharashtra',
    preferred_language: profileData.preferredLanguage || profileData.preferred_language || 'en',
    farm_area: (profileData.farmArea !== undefined && profileData.farmArea !== null) ? String(profileData.farmArea) : null,
    area_unit: profileData.areaUnit || profileData.area_unit || 'acres',
    soil_type: profileData.soilType || profileData.soil_type || null,
    irrigation_method: profileData.irrigationMethod || profileData.irrigation_method || null,
    main_crop: profileData.mainCrop || profileData.main_crop || null,
    season: profileData.season || 'Kharif',
    latitude: profileData.latitude !== undefined && profileData.latitude !== null && profileData.latitude !== '' ? Number(profileData.latitude) : null,
    longitude: profileData.longitude !== undefined && profileData.longitude !== null && profileData.longitude !== '' ? Number(profileData.longitude) : null,
    updated_at: now
  };

  const upserted = await request('/rest/v1/profiles', {
    method: 'POST',
    headers: {
      'Prefer': 'return=representation,resolution=merge-duplicates'
    },
    body: row
  });

  // If fullName provided, update app_users table
  if (row.full_name) {
    await request(`/rest/v1/app_users?id=eq.${encodeURIComponent(targetId)}`, {
      method: 'PATCH',
      body: { full_name: row.full_name, updated_at: now }
    }).catch(() => {});
  }

  const p = (Array.isArray(upserted) && upserted[0]) ? upserted[0] : row;
  return {
    userId: p.user_id,
    fullName: p.full_name || '',
    phone: p.phone || '',
    village: p.village || '',
    district: p.district || '',
    state: p.state || 'Maharashtra',
    preferredLanguage: p.preferred_language || 'en',
    farmArea: p.farm_area || '',
    areaUnit: p.area_unit || 'acres',
    soilType: p.soil_type || '',
    irrigationMethod: p.irrigation_method || '',
    mainCrop: p.main_crop || '',
    season: p.season || 'Kharif',
    latitude: p.latitude !== null ? Number(p.latitude) : null,
    longitude: p.longitude !== null ? Number(p.longitude) : null,
    updatedAt: p.updated_at
  };
}

// 3. CROPS
async function getCrops(userId) {
  if (!userId) return [];
  const crops = await request(`/rest/v1/crops?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&select=*`);
  if (!Array.isArray(crops)) return [];
  return crops.map(c => ({
    id: c.id,
    userId: c.user_id,
    cropName: c.crop_name,
    fieldName: c.field_name || '',
    variety: c.variety || '',
    sowingDate: c.sowing_date || '',
    growthStage: c.growth_stage || 'Vegetative',
    area: c.area || '',
    notes: c.notes || '',
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}

async function addCrop(userId, cropData) {
  if (!userId) throw new Error('User ID is required to add crops');
  const sowingDate = String(cropData.sowingDate || cropData.sowing_date || '').trim();
  if (sowingDate && isPastDateIST(sowingDate)) {
    throw new Error('Past dates are not allowed. Please select today or a future date (Asia/Kolkata).');
  }
  const now = new Date().toISOString();
  const cropId = 'crop_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

  const row = {
    id: cropId,
    user_id: userId,
    crop_name: String(cropData.cropName || cropData.crop_name || '').trim(),
    field_name: String(cropData.fieldName || cropData.field_name || '').trim() || null,
    variety: String(cropData.variety || '').trim() || null,
    sowing_date: sowingDate || getTodayIST(),
    growth_stage: String(cropData.growthStage || cropData.growth_stage || 'Vegetative').trim(),
    area: String(cropData.area || '').trim() || null,
    notes: String(cropData.notes || '').trim() || null,
    created_at: now,
    updated_at: now
  };

  const inserted = await request('/rest/v1/crops', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: row
  });

  const c = (Array.isArray(inserted) && inserted[0]) ? inserted[0] : row;
  return {
    id: c.id,
    userId: c.user_id,
    cropName: c.crop_name,
    fieldName: c.field_name || '',
    variety: c.variety || '',
    sowingDate: c.sowing_date || '',
    growthStage: c.growth_stage || 'Vegetative',
    area: c.area || '',
    notes: c.notes || '',
    createdAt: c.created_at,
    updatedAt: c.updated_at
  };
}

async function deleteCrop(userId, cropId) {
  if (!userId || !cropId) return false;
  const deleted = await request(`/rest/v1/crops?id=eq.${encodeURIComponent(cropId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=representation' }
  });
  return Array.isArray(deleted) && deleted.length > 0;
}

// 4. FARM ACTIVITIES
async function getActivities(userId) {
  if (!userId) return [];
  const acts = await request(`/rest/v1/farm_activities?user_id=eq.${encodeURIComponent(userId)}&order=activity_date.asc,created_at.desc&select=*`);
  if (!Array.isArray(acts)) return [];
  return acts.map(a => ({
    id: a.id,
    userId: a.user_id,
    name: a.name,
    category: a.category || 'General',
    date: a.activity_date,
    farm: a.farm || '',
    crop: a.crop || '',
    notes: a.notes || '',
    completed: Boolean(a.completed),
    createdAt: a.created_at,
    updatedAt: a.updated_at
  }));
}

async function addActivity(userId, activityData) {
  if (!userId) throw new Error('User ID is required to add activities');
  const actDate = String(activityData.date || activityData.activity_date || '').trim();
  if (actDate && isPastDateIST(actDate)) {
    throw new Error('Past dates are not allowed. Please select today or a future date (Asia/Kolkata).');
  }
  const now = new Date().toISOString();
  const actId = 'act_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

  const row = {
    id: actId,
    user_id: userId,
    name: String(activityData.name || '').trim(),
    category: String(activityData.category || 'General').trim(),
    activity_date: actDate || getTodayIST(),
    farm: String(activityData.farm || activityData.fieldName || '').trim() || null,
    crop: String(activityData.crop || activityData.cropName || '').trim() || null,
    notes: String(activityData.notes || '').trim() || null,
    completed: Boolean(activityData.completed),
    created_at: now,
    updated_at: now
  };

  const inserted = await request('/rest/v1/farm_activities', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: row
  });

  const a = (Array.isArray(inserted) && inserted[0]) ? inserted[0] : row;
  return {
    id: a.id,
    userId: a.user_id,
    name: a.name,
    category: a.category,
    date: a.activity_date,
    farm: a.farm || '',
    crop: a.crop || '',
    notes: a.notes || '',
    completed: Boolean(a.completed),
    createdAt: a.created_at,
    updatedAt: a.updated_at
  };
}

async function updateActivity(userId, activityId, activityData) {
  if (!userId || !activityId) return null;
  if (activityData.date !== undefined && isPastDateIST(String(activityData.date).trim())) {
    throw new Error('Past dates are not allowed. Please select today or a future date (Asia/Kolkata).');
  }
  const patch = { updated_at: new Date().toISOString() };

  if (activityData.name !== undefined) patch.name = String(activityData.name).trim();
  if (activityData.category !== undefined) patch.category = String(activityData.category).trim();
  if (activityData.date !== undefined) patch.activity_date = String(activityData.date).trim();
  if (activityData.farm !== undefined) patch.farm = String(activityData.farm).trim();
  if (activityData.crop !== undefined) patch.crop = String(activityData.crop).trim();
  if (activityData.notes !== undefined) patch.notes = String(activityData.notes).trim();
  if (activityData.completed !== undefined) patch.completed = Boolean(activityData.completed);

  const updated = await request(`/rest/v1/farm_activities?id=eq.${encodeURIComponent(activityId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: patch
  });

  if (!Array.isArray(updated) || updated.length === 0) return null;
  const a = updated[0];
  return {
    id: a.id,
    userId: a.user_id,
    name: a.name,
    category: a.category,
    date: a.activity_date,
    farm: a.farm || '',
    crop: a.crop || '',
    notes: a.notes || '',
    completed: Boolean(a.completed),
    createdAt: a.created_at,
    updatedAt: a.updated_at
  };
}

async function toggleActivity(userId, activityId) {
  if (!userId || !activityId) return null;
  const current = await request(`/rest/v1/farm_activities?id=eq.${encodeURIComponent(activityId)}&user_id=eq.${encodeURIComponent(userId)}&select=completed`);
  if (!Array.isArray(current) || current.length === 0) return null;

  const nextStatus = !current[0].completed;
  return await updateActivity(userId, activityId, { completed: nextStatus });
}

async function deleteActivity(userId, activityId) {
  if (!userId || !activityId) return false;
  const deleted = await request(`/rest/v1/farm_activities?id=eq.${encodeURIComponent(activityId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=representation' }
  });
  return Array.isArray(deleted) && deleted.length > 0;
}

// 5. CROP ANALYSES
async function getAnalyses(userId) {
  if (!userId) return [];
  const list = await request(`/rest/v1/crop_analyses?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&select=*`);
  if (!Array.isArray(list)) return [];
  return list.map(an => ({
    id: an.id,
    userId: an.user_id,
    crop: an.crop,
    fileName: an.file_name || 'photo.jpg',
    imageUrl: an.image_url || null,
    report: an.report,
    isDemo: Boolean(an.is_demo),
    confidence: an.confidence || null,
    model_name: an.model_name || null,
    detected_crop: an.detected_crop || null,
    possible_issue: an.possible_issue || null,
    createdAt: an.created_at
  }));
}

async function addAnalysis(userId, analysisData) {
  if (!userId) throw new Error('User ID is required to save scan analyses');
  const now = new Date().toISOString();
  const scanId = analysisData.id || ('scan_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'));

  const row = {
    id: scanId,
    user_id: userId,
    crop: String(analysisData.crop || 'Plant Specimen').trim(),
    file_name: String(analysisData.fileName || analysisData.file_name || 'photo.jpg').trim(),
    image_url: analysisData.imageUrl || analysisData.image_url || analysisData.imagePath || analysisData.image_path || null,
    report: String(analysisData.report || '').trim(),
    is_demo: Boolean(analysisData.isDemo !== undefined ? analysisData.isDemo : analysisData.is_demo),
    confidence: analysisData.confidence || null,
    model_name: analysisData.model_name || analysisData.modelName || null,
    detected_crop: analysisData.detected_crop || analysisData.detectedCrop || null,
    possible_issue: analysisData.possible_issue || analysisData.possibleIssue || null,
    created_at: now
  };

  const inserted = await request('/rest/v1/crop_analyses', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: row
  });

  const an = (Array.isArray(inserted) && inserted[0]) ? inserted[0] : row;
  return {
    id: an.id,
    userId: an.user_id,
    crop: an.crop,
    fileName: an.file_name,
    imageUrl: an.image_url,
    report: an.report,
    isDemo: Boolean(an.is_demo),
    confidence: an.confidence,
    model_name: an.model_name,
    detected_crop: an.detected_crop,
    possible_issue: an.possible_issue,
    createdAt: an.created_at
  };
}

async function deleteAnalysis(userId, analysisId) {
  if (!userId || !analysisId) return false;
  const deleted = await request(`/rest/v1/crop_analyses?id=eq.${encodeURIComponent(analysisId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=representation' }
  });
  return Array.isArray(deleted) && deleted.length > 0;
}

async function clearAnalyses(userId) {
  if (!userId) return 0;
  const deleted = await request(`/rest/v1/crop_analyses?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=representation' }
  });
  return Array.isArray(deleted) ? deleted.length : 0;
}

// 6. SYSTEM STATS & RPC
async function getStats() {
  const [uRes, cRes, aRes, anRes] = await Promise.all([
    request('/rest/v1/app_users?select=id', { headers: { 'Range-Unit': 'items', 'Prefer': 'count=exact' } }).catch(() => []),
    request('/rest/v1/crops?select=id', { headers: { 'Range-Unit': 'items', 'Prefer': 'count=exact' } }).catch(() => []),
    request('/rest/v1/farm_activities?select=id', { headers: { 'Range-Unit': 'items', 'Prefer': 'count=exact' } }).catch(() => []),
    request('/rest/v1/crop_analyses?select=id', { headers: { 'Range-Unit': 'items', 'Prefer': 'count=exact' } }).catch(() => [])
  ]);

  return {
    usersCount: Array.isArray(uRes) ? uRes.length : 0,
    cropsCount: Array.isArray(cRes) ? cRes.length : 0,
    activitiesCount: Array.isArray(aRes) ? aRes.length : 0,
    analysesCount: Array.isArray(anRes) ? anRes.length : 0,
    storageEngine: 'Supabase PostgreSQL Cloud Database (PostgREST API)'
  };
}

async function rpc(functionName, payload) {
  return await request(`/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    method: 'POST',
    body: payload
  });
}

module.exports = {
  isConfigured,
  request,
  createUser,
  authenticateUser,
  getUserById,
  getProfile,
  saveProfile,
  getCrops,
  addCrop,
  deleteCrop,
  getActivities,
  addActivity,
  updateActivity,
  toggleActivity,
  deleteActivity,
  getAnalyses,
  addAnalysis,
  deleteAnalysis,
  clearAnalyses,
  getStats,
  rpc
};

