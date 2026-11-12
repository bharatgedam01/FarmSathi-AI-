// scripts/migrate_to_supabase.js
// FarmSaathi AI — Strict Zero-Dependency Atomic Supabase Migration
// Uses Node.js standard libraries (fs, path, crypto, fetch)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isForce = process.argv.includes('--force');

async function supabaseRequest(endpoint, options = {}) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const fullUrl = SUPABASE_URL + cleanEndpoint;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOpts = { method, headers };
  if (options.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(fullUrl, fetchOpts);
  } catch (err) {
    throw new Error(`Network failure reaching Supabase: ${err.message}`);
  }

  const rawText = await res.text();
  let json = null;
  if (rawText && rawText.trim()) {
    try { json = JSON.parse(rawText); } catch (e) { json = { raw: rawText }; }
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

async function main() {
  console.log('===========================================================');
  console.log('  FarmSaathi AI — Supabase Strict Atomic Data Migration');
  console.log('===========================================================\n');

  const srcPath = path.join(__dirname, '../data/database.json');
  if (!fs.existsSync(srcPath)) throw new Error(`Missing source file: ${srcPath}`);

  // 1. BACKUP & CHECKSUM
  console.log('[1/6] Creating verified local backup...');
  const timestamp = Date.now();
  const backupPath = path.join(__dirname, `../data/database.backup.${timestamp}.json`);
  fs.copyFileSync(srcPath, backupPath);

  const srcBuf = fs.readFileSync(srcPath);
  const backupBuf = fs.readFileSync(backupPath);
  const srcHash = crypto.createHash('sha256').update(srcBuf).digest('hex');
  const backupHash = crypto.createHash('sha256').update(backupBuf).digest('hex');

  if (srcHash !== backupHash) throw new Error('FATAL: Backup SHA-256 does not match original file!');
  console.log(`  ✓ Backup verified: database.backup.${timestamp}.json (SHA-256: ${srcHash.slice(0, 16)}...)`);

  // 2. PARSE & STRUCTURAL VALIDATION
  console.log('\n[2/6] Validating database structure & referential integrity...');
  let raw;
  try {
    raw = JSON.parse(backupBuf.toString('utf8'));
  } catch (err) {
    throw new Error(`FATAL: database.json is not valid JSON: ${err.message}`);
  }

  if (!Array.isArray(raw.users)) throw new Error('Missing or invalid "users" array in database.json');
  if (typeof raw.profiles !== 'object' || raw.profiles === null) throw new Error('Missing or invalid "profiles" object in database.json');
  if (!Array.isArray(raw.crops)) throw new Error('Missing or invalid "crops" array in database.json');
  if (!Array.isArray(raw.activities)) throw new Error('Missing or invalid "activities" array in database.json');
  if (!Array.isArray(raw.analyses)) throw new Error('Missing or invalid "analyses" array in database.json');

  const validUserIds = new Set();
  raw.users.forEach((u, i) => {
    if (!u.id || !u.email || !u.passwordHash || !u.salt) {
      throw new Error(`Malformed user at index ${i}: ID, email, passwordHash, and salt are required.`);
    }
    validUserIds.add(u.id);
  });

  const profileArray = Object.values(raw.profiles || {});
  profileArray.forEach((p, i) => {
    const uId = p.userId || p.user_id;
    if (!uId || !validUserIds.has(uId)) {
      throw new Error(`Malformed profile at index ${i}: invalid or missing userId "${uId}".`);
    }
  });

  raw.crops.forEach((c, i) => {
    if (!c.id || !validUserIds.has(c.userId)) {
      throw new Error(`Crop at index ${i} has invalid ID or references missing userId "${c.userId}".`);
    }
  });

  raw.activities.forEach((a, i) => {
    if (!a.id || !validUserIds.has(a.userId)) {
      throw new Error(`Activity at index ${i} has invalid ID or references missing userId "${a.userId}".`);
    }
  });

  raw.analyses.forEach((an, i) => {
    if (!an.id || !validUserIds.has(an.userId)) {
      throw new Error(`Analysis at index ${i} has invalid ID or references missing userId "${an.userId}".`);
    }
  });

  console.log(`  ✓ Validated: ${raw.users.length} users, ${profileArray.length} profiles, ${raw.crops.length} crops, ${raw.activities.length} activities, ${raw.analyses.length} analyses.`);
  console.log('  ✓ 100% referential integrity confirmed (0 orphan records).');

  // 3. PRE-MIGRATION CONFLICT DETECTION
  console.log('\n[3/6] Inspecting existing Supabase records for conflicts...');
  let existingDbUsers;
  try {
    existingDbUsers = await supabaseRequest('/rest/v1/app_users?select=id,email');
  } catch (err) {
    throw new Error(`Failed to query app_users: ${err.message}. Ensure schema.sql was executed in Supabase first.`);
  }

  if (Array.isArray(existingDbUsers) && existingDbUsers.length > 0) {
    const existingMap = new Map(existingDbUsers.map(u => [u.id, u.email]));
    const conflicts = [];
    raw.users.forEach(srcU => {
      if (existingMap.has(srcU.id) && existingMap.get(srcU.id) !== srcU.email) {
        conflicts.push(`User ID "${srcU.id}" exists in Supabase with email "${existingMap.get(srcU.id)}" but source has "${srcU.email}"`);
      }
    });

    if (conflicts.length > 0) {
      console.error('\n❌ CONFLICT DETECTED: Existing Supabase records differ from source database:');
      conflicts.forEach(c => console.error(`  - ${c}`));
      throw new Error('Migration aborted. Conflicting records must be resolved manually.');
    }

    if (!isForce) {
      console.warn(`\n⚠️  ABORTED: Supabase already contains ${existingDbUsers.length} app_users.`);
      console.warn('   No data conflicts were found. To proceed safely (ON CONFLICT DO NOTHING), run:');
      console.warn('   node scripts/migrate_to_supabase.js --force\n');
      process.exit(0);
    } else {
      console.log(`  ℹ Note: Supabase contains ${existingDbUsers.length} existing non-conflicting users. Proceeding with safe non-destructive import.`);
    }
  } else {
    console.log('  ✓ Supabase target tables are clean.');
  }

  // 4. PREPARE PAYLOAD
  console.log('\n[4/6] Packaging atomic payload...');
  const payload = {
    users: raw.users.map(u => ({
      id: u.id,
      full_name: u.fullName || 'Farmer',
      email: u.email,
      phone: u.phone || null,
      password_hash: u.passwordHash,
      salt: u.salt,
      created_at: u.createdAt || new Date().toISOString(),
      updated_at: u.createdAt || new Date().toISOString()
    })),
    profiles: profileArray.map(p => ({
      user_id: p.userId || p.user_id,
      full_name: p.fullName || p.full_name || '',
      phone: p.phone || null,
      village: p.village || null,
      district: p.district || null,
      state: p.state || 'Maharashtra',
      preferred_language: p.preferredLanguage || 'en',
      farm_area: p.farmArea ? String(p.farmArea) : null,
      area_unit: p.areaUnit || 'acres',
      soil_type: p.soilType || null,
      irrigation_method: p.irrigationMethod || null,
      main_crop: p.mainCrop || p.main_crop || null,
      season: p.season || null,
      latitude: p.latitude || null,
      longitude: p.longitude || null,
      created_at: p.updatedAt || new Date().toISOString(),
      updated_at: p.updatedAt || new Date().toISOString()
    })),
    crops: raw.crops.map(c => ({
      id: c.id,
      user_id: c.userId,
      crop_name: c.cropName,
      field_name: c.fieldName || null,
      variety: c.variety || null,
      sowing_date: c.sowingDate || null,
      growth_stage: c.growthStage || 'Vegetative',
      area: c.area ? String(c.area) : null,
      notes: c.notes || null,
      created_at: c.createdAt || new Date().toISOString(),
      updated_at: c.createdAt || new Date().toISOString()
    })),
    activities: raw.activities.map(a => ({
      id: a.id,
      user_id: a.userId,
      name: a.name,
      category: a.category || 'General',
      activity_date: a.date,
      farm: a.farm || null,
      crop: a.crop || null,
      notes: a.notes || null,
      completed: Boolean(a.completed),
      created_at: a.createdAt || new Date().toISOString(),
      updated_at: a.createdAt || new Date().toISOString()
    })),
    analyses: raw.analyses.map(an => ({
      id: an.id,
      user_id: an.userId,
      crop: an.crop || an.detected_crop || an.detectedCrop || 'Plant Specimen',
      file_name: an.fileName || an.file_name || null,
      image_url: an.imageUrl || an.image_url || an.imagePath || an.image_path || null,
      report: an.report || '',
      is_demo: Boolean(an.isDemo !== undefined ? an.isDemo : an.is_demo),
      confidence: an.confidence || null,
      model_name: an.model_name || an.modelName || null,
      detected_crop: an.detected_crop || an.detectedCrop || an.crop || null,
      possible_issue: an.possible_issue || an.possibleIssue || null,
      created_at: an.createdAt || an.created_at || new Date().toISOString()
    }))
  };

  // 5. ATOMIC EXECUTION VIA RPC
  console.log('\n[5/6] Executing atomic database transaction via RPC migrate_farm_payload...');
  const rpcResult = await supabaseRequest('/rest/v1/rpc/migrate_farm_payload', {
    method: 'POST',
    body: { p_data: payload }
  });
  console.log('  ✓ RPC transaction result:', rpcResult);

  // 6. EXACT RECORD & FOREIGN-KEY OWNERSHIP VERIFICATION
  console.log('\n[6/6] Verifying exact IDs and foreign-key ownership across all 5 tables in Supabase...');

  const [uData, pData, cData, aData, anData] = await Promise.all([
    supabaseRequest('/rest/v1/app_users?select=id,email'),
    supabaseRequest('/rest/v1/profiles?select=user_id'),
    supabaseRequest('/rest/v1/crops?select=id,user_id'),
    supabaseRequest('/rest/v1/farm_activities?select=id,user_id'),
    supabaseRequest('/rest/v1/crop_analyses?select=id,user_id')
  ]);

  const sbUsers = new Map((uData || []).map(u => [u.id, u.email]));
  const sbProfiles = new Set((pData || []).map(p => p.user_id));
  const sbCrops = new Map((cData || []).map(c => [c.id, c.user_id]));
  const sbActivities = new Map((aData || []).map(a => [a.id, a.user_id]));
  const sbAnalyses = new Map((anData || []).map(an => [an.id, an.user_id]));

  // Verify Users
  raw.users.forEach(u => {
    if (!sbUsers.has(u.id)) throw new Error(`Verification failure: Missing user "${u.id}" in Supabase.`);
    if (sbUsers.get(u.id) !== u.email) throw new Error(`Verification failure: Email mismatch for user "${u.id}".`);
  });

  // Verify Profiles
  profileArray.forEach(p => {
    const uId = p.userId || p.user_id;
    if (!sbProfiles.has(uId)) throw new Error(`Verification failure: Missing profile for user "${uId}".`);
  });

  // Verify Crops & Ownership
  raw.crops.forEach(c => {
    if (!sbCrops.has(c.id)) throw new Error(`Verification failure: Missing crop "${c.id}" in Supabase.`);
    if (sbCrops.get(c.id) !== c.userId) throw new Error(`Verification failure: Crop "${c.id}" owner mismatch.`);
  });

  // Verify Activities & Ownership
  raw.activities.forEach(a => {
    if (!sbActivities.has(a.id)) throw new Error(`Verification failure: Missing activity "${a.id}" in Supabase.`);
    if (sbActivities.get(a.id) !== a.userId) throw new Error(`Verification failure: Activity "${a.id}" owner mismatch.`);
  });

  // Verify Analyses & Ownership
  raw.analyses.forEach(an => {
    if (!sbAnalyses.has(an.id)) throw new Error(`Verification failure: Missing analysis "${an.id}" in Supabase.`);
    if (sbAnalyses.get(an.id) !== an.userId) throw new Error(`Verification failure: Analysis "${an.id}" owner mismatch.`);
  });

  console.log('\n--- Final Verification Audit ---');
  console.log(`  ✓ App Users:       All ${raw.users.length} source records verified with exact ID & email matches.`);
  console.log(`  ✓ Profiles:        All ${profileArray.length} source records verified with exact user_id matches.`);
  console.log(`  ✓ Crops:           All ${raw.crops.length} source records verified with exact crop ID & user ownership.`);
  console.log(`  ✓ Activities:      All ${raw.activities.length} source records verified with exact activity ID & user ownership.`);
  console.log(`  ✓ Analyses:        All ${raw.analyses.length} source records verified with exact scan ID & user ownership.`);

  console.log('\n===========================================================');
  console.log('  SUCCESS: Migration verified with 100% relational parity!');
  console.log('===========================================================\n');
}

main().catch(err => {
  console.error('\n❌ MIGRATION FAILED:', err.message);
  process.exit(1);
});

