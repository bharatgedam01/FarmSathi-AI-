// FarmSaathi AI — Supabase Cloud Client & Storage Integration
// Handles user authentication, session persistence, and Row Level Security (RLS) data synchronization.
// Strictly uses public Project URL and Publishable Key (Anon Key). Never includes service role keys.

(function(window) {
  'use strict';

  // Default configuration or saved overrides
  var savedUrl = '';
  var savedKey = '';
  try {
    savedUrl = localStorage.getItem('fs_supabase_url') || '';
    savedKey = localStorage.getItem('fs_supabase_anon_key') || '';
  } catch (e) {}

  var CONFIG = {
    // Configurable via Settings page or window.FARMSAATHI_CONFIG
    supabaseUrl: (window.FARMSAATHI_CONFIG && window.FARMSAATHI_CONFIG.supabaseUrl) || savedUrl || '',
    supabaseAnonKey: (window.FARMSAATHI_CONFIG && window.FARMSAATHI_CONFIG.supabaseAnonKey) || savedKey || ''
  };

  var clientInstance = null;

  function isConfigured() {
    return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && CONFIG.supabaseUrl.startsWith('http'));
  }

  function getClient() {
    if (clientInstance) return clientInstance;
    if (!isConfigured()) return null;

    try {
      var lib = window.supabase;
      if (lib && typeof lib.createClient === 'function') {
        clientInstance = lib.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        console.log('🌱 Supabase Client initialized successfully');
        return clientInstance;
      }
    } catch (err) {
      console.warn('Supabase initialization notice:', err.message);
    }
    return null;
  }

  function setConfig(url, anonKey) {
    CONFIG.supabaseUrl = (url || '').trim();
    CONFIG.supabaseAnonKey = (anonKey || '').trim();
    try {
      if (CONFIG.supabaseUrl) localStorage.setItem('fs_supabase_url', CONFIG.supabaseUrl);
      else localStorage.removeItem('fs_supabase_url');
      if (CONFIG.supabaseAnonKey) localStorage.setItem('fs_supabase_anon_key', CONFIG.supabaseAnonKey);
      else localStorage.removeItem('fs_supabase_anon_key');
    } catch (e) {}
    clientInstance = null;
    return getClient();
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================
  async function signUp(email, password, fullName, phone) {
    var sb = getClient();
    if (!sb) throw new Error('Supabase is not configured. Please add your Supabase URL and Anon Key.');

    var res = await sb.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName || '',
          phone: phone || '',
          preferred_language: 'en'
        }
      }
    });

    if (res.error) throw res.error;
    var user = res.data.user;

    // Create initial profile in public.profiles and public.farm_records
    if (user) {
      try {
        await saveProfile(user.id, {
          full_name: fullName || '',
          phone: phone || '',
          preferred_language: 'en'
        });
      } catch (profErr) {
        console.warn('Auto profile creation notice:', profErr.message);
      }
    }

    return res.data;
  }

  async function signIn(email, password) {
    var sb = getClient();
    if (!sb) throw new Error('Supabase is not configured.');

    var res = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut() {
    var sb = getClient();
    if (!sb) return;
    var res = await sb.auth.signOut();
    if (res.error) throw res.error;
  }

  async function getSession() {
    var sb = getClient();
    if (!sb) return null;
    var res = await sb.auth.getSession();
    return (res.data && res.data.session) || null;
  }

  async function getUser() {
    var sb = getClient();
    if (!sb) return null;
    try {
      var res = await sb.auth.getUser();
      return (res.data && res.data.user) || null;
    } catch (e) {
      return null;
    }
  }

  async function resetPasswordForEmail(email, redirectTo) {
    var sb = getClient();
    if (!sb) throw new Error('Supabase is not configured. Please add your Supabase URL and Anon Key in Settings.');

    var targetUrl = redirectTo || (window.location.origin + '/reset-password.html');
    var res = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: targetUrl
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function updatePassword(newPassword) {
    var sb = getClient();
    if (!sb) throw new Error('Supabase is not configured.');

    var res = await sb.auth.updateUser({
      password: newPassword
    });
    if (res.error) throw res.error;
    return res.data;
  }

  function onAuthStateChange(callback) {
    var sb = getClient();
    if (!sb || !sb.auth) return null;
    return sb.auth.onAuthStateChange(callback);
  }

  async function initFromApi() {
    if (!isConfigured()) {
      try {
        var res = await fetch('/api/status');
        if (res.ok) {
          var data = await res.json();
          if (data && data.supabaseUrl && data.supabaseAnonKey) {
            setConfig(data.supabaseUrl, data.supabaseAnonKey);
          }
        }
      } catch (e) {}
    }
  }

  // Auto-attempt backend status config
  try {
    if (typeof window !== 'undefined') {
      initFromApi();
    }
  } catch (e) {}

  // ============================================================================
  // FARMER PROFILES (with fallback to public.farm_records)
  // ============================================================================
  async function fetchProfile(userId) {
    var sb = getClient();
    if (!sb || !userId) return null;

    // 1. Try public.profiles table
    try {
      var res = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!res.error && res.data) {
        return res.data;
      }
    } catch (e) {}

    // 2. Fallback to public.farm_records (record_type = 'profile')
    try {
      var recRes = await sb.from('farm_records')
        .select('*')
        .eq('user_id', userId)
        .eq('record_type', 'profile')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recRes.error && recRes.data && recRes.data.record_data) {
        return Object.assign({ id: userId }, recRes.data.record_data);
      }
    } catch (e) {}

    return null;
  }

  async function saveProfile(userId, profileData) {
    var sb = getClient();
    if (!sb || !userId) return null;

    var now = new Date().toISOString();
    var cleanProfile = {
      id: userId,
      full_name: profileData.full_name || profileData.fullName || '',
      phone: profileData.phone || '',
      village: profileData.village || '',
      district: profileData.district || '',
      state: profileData.state || 'Maharashtra',
      preferred_language: profileData.preferred_language || profileData.preferredLanguage || 'en',
      farm_area: profileData.farm_area ? parseFloat(profileData.farm_area) : null,
      area_unit: profileData.area_unit || 'acres',
      soil_type: profileData.soil_type || '',
      irrigation_method: profileData.irrigation_method || '',
      main_crop: profileData.main_crop || profileData.mainCrop || '',
      season: profileData.season || 'Kharif',
      latitude: profileData.latitude ? parseFloat(profileData.latitude) : null,
      longitude: profileData.longitude ? parseFloat(profileData.longitude) : null,
      updated_at: now
    };

    // Upsert into public.profiles
    var profileResult = null;
    try {
      var res = await sb.from('profiles').upsert(cleanProfile).select().single();
      if (!res.error) profileResult = res.data;
    } catch (e) {}

    // Also mirror to public.farm_records for compatibility
    try {
      await sb.from('farm_records').upsert({
        user_id: userId,
        record_type: 'profile',
        title: cleanProfile.full_name || 'Farmer Profile',
        record_data: cleanProfile,
        updated_at: now
      });
    } catch (e) {}

    return profileResult || cleanProfile;
  }

  // ============================================================================
  // CROPS MANAGEMENT (with fallback to public.farm_records)
  // ============================================================================
  async function fetchCrops(userId) {
    var sb = getClient();
    if (!sb || !userId) return null;

    // 1. Try public.crops table
    try {
      var res = await sb.from('crops').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(function(c) {
          return {
            id: c.id,
            name: c.crop_name || c.name,
            cropName: c.crop_name,
            variety: c.variety || '',
            plot: c.field_name || c.plot || 'Farm Plot',
            fieldName: c.field_name,
            sowing_date: c.sowing_date || '',
            sowingDate: c.sowing_date,
            stage: c.growth_stage || 'Vegetative',
            growthStage: c.growth_stage,
            area: c.area,
            notes: c.notes || ''
          };
        });
      }
    } catch (e) {}

    // 2. Fallback to public.farm_records
    try {
      var recRes = await sb.from('farm_records')
        .select('*')
        .eq('user_id', userId)
        .eq('record_type', 'crop')
        .order('created_at', { ascending: false });

      if (!recRes.error && Array.isArray(recRes.data)) {
        return recRes.data.map(function(r) {
          return Object.assign({ id: r.id }, r.record_data);
        });
      }
    } catch (e) {}

    return [];
  }

  async function saveCrop(userId, crop) {
    var sb = getClient();
    if (!sb || !userId) return null;

    var now = new Date().toISOString();
    var cropRow = {
      user_id: userId,
      crop_name: crop.name || crop.cropName,
      variety: crop.variety || '',
      field_name: crop.plot || crop.fieldName || 'Plot A',
      sowing_date: crop.sowing_date || crop.sowingDate || now.slice(0, 10),
      growth_stage: crop.stage || crop.growthStage || 'Vegetative',
      area: crop.area ? parseFloat(crop.area) : null,
      notes: crop.notes || ''
    };

    var saved = null;
    try {
      var res = await sb.from('crops').insert(cropRow).select().single();
      if (!res.error) saved = res.data;
    } catch (e) {}

    // Mirror to farm_records
    try {
      var recRes = await sb.from('farm_records').insert({
        user_id: userId,
        record_type: 'crop',
        title: cropRow.crop_name,
        record_data: crop
      }).select().single();
      if (!saved && !recRes.error) saved = recRes.data;
    } catch (e) {}

    return saved;
  }

  async function deleteCrop(userId, cropId) {
    var sb = getClient();
    if (!sb || !userId || !cropId) return false;

    try {
      await sb.from('crops').delete().eq('id', cropId).eq('user_id', userId);
    } catch (e) {}

    try {
      await sb.from('farm_records').delete().eq('id', cropId).eq('user_id', userId);
    } catch (e) {}

    return true;
  }

  // ============================================================================
  // FARM ACTIVITIES & CALENDAR REMINDERS
  // ============================================================================
  async function fetchActivities(userId) {
    var sb = getClient();
    if (!sb || !userId) return null;

    try {
      var res = await sb.from('farm_activities').select('*').eq('user_id', userId).order('activity_date', { ascending: true });
      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(function(a) {
          return {
            id: a.id,
            name: a.activity_name,
            category: a.category || 'General',
            date: a.activity_date,
            status: a.status || 'Pending',
            completed: a.status === 'Completed',
            notes: a.notes || ''
          };
        });
      }
    } catch (e) {}

    try {
      var recRes = await sb.from('farm_records')
        .select('*')
        .eq('user_id', userId)
        .eq('record_type', 'activity')
        .order('created_at', { ascending: true });

      if (!recRes.error && Array.isArray(recRes.data)) {
        return recRes.data.map(function(r) {
          return Object.assign({ id: r.id }, r.record_data);
        });
      }
    } catch (e) {}

    return [];
  }

  async function saveActivity(userId, activity) {
    var sb = getClient();
    if (!sb || !userId) return null;

    var actRow = {
      user_id: userId,
      activity_name: activity.name,
      category: activity.category || 'General',
      activity_date: activity.date || new Date().toISOString().slice(0, 10),
      status: activity.completed ? 'Completed' : 'Pending',
      notes: activity.notes || ''
    };

    var saved = null;
    try {
      var res = await sb.from('farm_activities').insert(actRow).select().single();
      if (!res.error) saved = res.data;
    } catch (e) {}

    try {
      var recRes = await sb.from('farm_records').insert({
        user_id: userId,
        record_type: 'activity',
        title: actRow.activity_name,
        record_data: activity
      }).select().single();
      if (!saved && !recRes.error) saved = recRes.data;
    } catch (e) {}

    return saved;
  }

  async function toggleActivity(userId, activityId, isCompleted) {
    var sb = getClient();
    if (!sb || !userId || !activityId) return false;

    var status = isCompleted ? 'Completed' : 'Pending';
    try {
      await sb.from('farm_activities').update({ status: status }).eq('id', activityId).eq('user_id', userId);
    } catch (e) {}

    try {
      await sb.from('farm_records').update({ status: status }).eq('id', activityId).eq('user_id', userId);
    } catch (e) {}

    return true;
  }

  async function deleteActivity(userId, activityId) {
    var sb = getClient();
    if (!sb || !userId || !activityId) return false;

    try {
      await sb.from('farm_activities').delete().eq('id', activityId).eq('user_id', userId);
    } catch (e) {}

    try {
      await sb.from('farm_records').delete().eq('id', activityId).eq('user_id', userId);
    } catch (e) {}

    return true;
  }

  // ============================================================================
  // CROP ANALYSES & HEALTH HISTORY
  // ============================================================================
  async function fetchAnalyses(userId) {
    var sb = getClient();
    if (!sb || !userId) return null;

    try {
      var res = await sb.from('crop_analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(function(h) {
          return {
            id: h.id,
            crop: h.detected_crop || 'Crop Scan',
            file_name: h.original_file_name || 'leaf_photo.jpg',
            report: h.report,
            created_at: h.created_at,
            isDemo: false
          };
        });
      }
    } catch (e) {}

    try {
      var recRes = await sb.from('farm_records')
        .select('*')
        .eq('user_id', userId)
        .eq('record_type', 'analysis')
        .order('created_at', { ascending: false });

      if (!recRes.error && Array.isArray(recRes.data)) {
        return recRes.data.map(function(r) {
          return Object.assign({ id: r.id }, r.record_data);
        });
      }
    } catch (e) {}

    return [];
  }

  async function saveAnalysis(userId, analysis) {
    var sb = getClient();
    if (!sb || !userId) return null;

    var row = {
      user_id: userId,
      detected_crop: analysis.crop || 'Crop Scan',
      original_file_name: analysis.file_name || analysis.fileName || 'photo.jpg',
      report: analysis.report,
      model_name: 'gpt-4o-mini'
    };

    var saved = null;
    try {
      var res = await sb.from('crop_analyses').insert(row).select().single();
      if (!res.error) saved = res.data;
    } catch (e) {}

    try {
      var recRes = await sb.from('farm_records').insert({
        user_id: userId,
        record_type: 'analysis',
        title: row.detected_crop,
        record_data: analysis
      }).select().single();
      if (!saved && !recRes.error) saved = recRes.data;
    } catch (e) {}

    return saved;
  }

  async function deleteAnalysis(userId, analysisId) {
    var sb = getClient();
    if (!sb || !userId || !analysisId) return false;

    try {
      await sb.from('crop_analyses').delete().eq('id', analysisId).eq('user_id', userId);
    } catch (e) {}

    try {
      await sb.from('farm_records').delete().eq('id', analysisId).eq('user_id', userId);
    } catch (e) {}

    return true;
  }

  async function clearAllAnalyses(userId) {
    var sb = getClient();
    if (!sb || !userId) return false;

    try {
      await sb.from('crop_analyses').delete().eq('user_id', userId);
    } catch (e) {}

    try {
      await sb.from('farm_records').delete().eq('user_id', userId).eq('record_type', 'analysis');
    } catch (e) {}

    return true;
  }

  // Export to window
  window.SupabaseClient = {
    CONFIG: CONFIG,
    isConfigured: isConfigured,
    getClient: getClient,
    setConfig: setConfig,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    getUser: getUser,
    resetPasswordForEmail: resetPasswordForEmail,
    updatePassword: updatePassword,
    onAuthStateChange: onAuthStateChange,
    initFromApi: initFromApi,
    fetchProfile: fetchProfile,
    saveProfile: saveProfile,
    fetchCrops: fetchCrops,
    saveCrop: saveCrop,
    deleteCrop: deleteCrop,
    fetchActivities: fetchActivities,
    saveActivity: saveActivity,
    toggleActivity: toggleActivity,
    deleteActivity: deleteActivity,
    fetchAnalyses: fetchAnalyses,
    saveAnalysis: saveAnalysis,
    deleteAnalysis: deleteAnalysis,
    clearAllAnalyses: clearAllAnalyses
  };

})(window);
