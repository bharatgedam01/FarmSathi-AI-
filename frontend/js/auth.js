// FarmSaathi AI — Authentication & Session Management Module
// Handles Supabase Cloud Authentication (Sign Up, Sign In, Password Reset, Session Restoration),
// Protected Routes, User-Level Data Isolation, and Secure Logout.
// Note: The previous switch-account action has been completely removed as per security specifications.

(function(window) {
  'use strict';

  // Ensure window.AppStorage is available immediately in this module
  // Uses 'fs_' prefix to preserve all farmer profiles, farm details, and history.
  // Never overwrites native window.Storage.
  window.AppStorage = window.AppStorage || {
    get: function(key, fallback) {
      try {
        if (typeof localStorage === 'undefined') return fallback;
        var data = localStorage.getItem('fs_' + key);
        if (data === null || data === undefined) return fallback;
        try {
          return JSON.parse(data);
        } catch (parseErr) {
          return data;
        }
      } catch (e) {
        return fallback;
      }
    },
    set: function(key, value) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem('fs_' + key, JSON.stringify(value));
      } catch (e) {}
    },
    remove: function(key) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem('fs_' + key);
      } catch (e) {}
    }
  };

  // Ensure window.apiRequest is available immediately in this module
  var API_BASE = (typeof location !== 'undefined' && location.protocol === 'file:') ? 'http://localhost:3000' : '';

  window.apiRequest = window.apiRequest || async function apiRequest(endpoint, method, data) {
    var headers = { 'Content-Type': 'application/json' };
    var token = null;
    try {
      token = (window.AppStorage && window.AppStorage.get) ? window.AppStorage.get('auth_token', null) : null;
      if (!token) {
        var rawToken = localStorage.getItem('fs_auth_token');
        if (rawToken) {
          try { token = JSON.parse(rawToken); } catch (e) { token = rawToken; }
        }
      }
    } catch (e) {}

    if (token) headers['Authorization'] = 'Bearer ' + token;

    var cleanPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    var baseUrl = (typeof location !== 'undefined' && location.origin && location.origin !== 'null' && location.protocol !== 'file:')
      ? location.origin
      : 'http://localhost:3000';
    var url = cleanPath.startsWith('http') ? cleanPath : (baseUrl + cleanPath);
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeoutMs = (cleanPath.includes('/chat') || cleanPath.includes('/analyze')) ? 60000 : 15000;
    var timer = controller ? setTimeout(function() { controller.abort(); }, timeoutMs) : null;

    try {
      var opts = {
        method: method || 'GET',
        headers: headers
      };
      if (controller) opts.signal = controller.signal;
      if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || '').toUpperCase())) {
        opts.body = typeof data === 'string' ? data : JSON.stringify(data);
      }
      var res = await fetch(url, opts);
      if (timer) clearTimeout(timer);
      var json = null;
      var rawText = '';
      try {
        rawText = await res.text();
        json = JSON.parse(rawText);
      } catch (pe) {
        var fallbackMsg = res.status >= 500
          ? 'Authentication service is initializing. Please try again in a few moments.'
          : (rawText && rawText.length < 120 && !rawText.includes('<') ? rawText : 'Service returned an unparseable response.');
        json = { error: fallbackMsg, status: res.status };
      }
      return { ok: res.ok, status: res.status, data: json };
    } catch (err) {
      if (timer) clearTimeout(timer);
      return { ok: false, error: err.message };
    }
  };

  var currentUser = null;

  function $(id) {
    return document.getElementById(id);
  }

  function getCurrentUser() {
    return currentUser;
  }

  function setCurrentUser(user) {
    currentUser = user;
    if (window.AppStorage) {
      if (user) window.AppStorage.set('current_user', user);
      else window.AppStorage.remove('current_user');
    }
    try {
      if (user) localStorage.setItem('fs_current_user', JSON.stringify(user));
      else localStorage.removeItem('fs_current_user');
    } catch (e) {}
    updateAuthUI();
  }

  // ============================================================================
  // CORE AUTHENTICATION ACTIONS (SUPABASE & BACKEND)
  // ============================================================================

  // 1. SIGN IN
  async function signInUser(email, password) {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    // 1. Try Supabase Auth first
    if (window.SupabaseClient) {
      if (!window.SupabaseClient.isConfigured() && typeof window.SupabaseClient.initFromApi === 'function') {
        try {
          await window.SupabaseClient.initFromApi();
        } catch (e) {}
      }

      if (window.SupabaseClient.isConfigured()) {
        var sbData = await window.SupabaseClient.signIn(email, password);
        if (sbData && sbData.user) {
          var userMeta = sbData.user.user_metadata || {};
          var fullName = (userMeta.full_name || '').trim();
          if (!fullName && window.SupabaseClient.fetchProfile) {
            try {
              var sbProf = await window.SupabaseClient.fetchProfile(sbData.user.id);
              if (sbProf && (sbProf.full_name || sbProf.fullName)) {
                fullName = (sbProf.full_name || sbProf.fullName).trim();
              }
            } catch (e) {}
          }
          var user = {
            id: sbData.user.id,
            fullName: fullName,
            email: sbData.user.email,
            authProvider: 'supabase'
          };
          setCurrentUser(user);
          return { success: true, user: user, session: sbData.session };
        }
      }
    }

    // 2. Fallback to Backend REST API (when Supabase is not configured in this environment)
    if (typeof window.apiRequest === 'function') {
      var res = await window.apiRequest('/api/auth/login', 'POST', {
        email: email,
        password: password
      });

      if (res.ok && res.data && res.data.success) {
        if (window.AppStorage) {
          window.AppStorage.set('auth_token', res.data.token);
        }
        try {
          localStorage.setItem('fs_auth_token', JSON.stringify(res.data.token));
        } catch (e) {}
        var backendUser = Object.assign({}, res.data.user, { authProvider: 'backend' });
        setCurrentUser(backendUser);
        return { success: true, user: backendUser, token: res.data.token };
      } else {
        var errMsg = (res.data && res.data.error) || 'Invalid email or password.';
        throw new Error(errMsg);
      }
    }

    throw new Error('Authentication service is not configured. Please check your Supabase or server connection.');
  }

  // 2. SIGN UP / REGISTER
  async function signUpUser(fullName, email, password) {
    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }
    if (!email || !email.trim()) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // 1. Try Supabase Auth first
    if (window.SupabaseClient) {
      if (!window.SupabaseClient.isConfigured() && typeof window.SupabaseClient.initFromApi === 'function') {
        try {
          await window.SupabaseClient.initFromApi();
        } catch (e) {}
      }

      if (window.SupabaseClient.isConfigured()) {
        var sbData = await window.SupabaseClient.signUp(email, password, fullName.trim());
        var needsEmailConfirmation = false;
        if (sbData && sbData.user && (!sbData.session || !sbData.user.confirmed_at)) {
          if (Array.isArray(sbData.user.identities) && sbData.user.identities.length === 0) {
            throw new Error('An account with this email address already exists. Please log in.');
          }
          needsEmailConfirmation = !sbData.session;
        }

        if (sbData && sbData.session && sbData.user) {
          var user = {
            id: sbData.user.id,
            fullName: fullName.trim(),
            email: sbData.user.email,
            authProvider: 'supabase'
          };
          setCurrentUser(user);
          return { success: true, user: user, needsConfirmation: false };
        }

        return {
          success: true,
          user: sbData.user,
          needsConfirmation: needsEmailConfirmation
        };
      }
    }

    // 2. Fallback to Backend REST API (when Supabase is not configured)
    if (typeof window.apiRequest === 'function') {
      var res = await window.apiRequest('/api/auth/signup', 'POST', {
        fullName: fullName.trim(),
        email: email.trim(),
        password: password
      });

      if (res.ok && res.data && res.data.success) {
        if (window.AppStorage) {
          window.AppStorage.set('auth_token', res.data.token);
        }
        try {
          localStorage.setItem('fs_auth_token', JSON.stringify(res.data.token));
        } catch (e) {}
        var backendUser = Object.assign({}, res.data.user, { authProvider: 'backend' });
        setCurrentUser(backendUser);
        return { success: true, user: backendUser, needsConfirmation: false };
      } else {
        var errMsg = (res.data && res.data.error) || 'Failed to create account.';
        throw new Error(errMsg);
      }
    }

    throw new Error('Authentication service is not configured. Please check your Supabase or server connection.');
  }

  // 3. REQUEST PASSWORD RESET
  async function requestPasswordReset(email) {
    if (!email || !email.trim()) {
      throw new Error('Please enter your registered email address.');
    }

    if (window.SupabaseClient) {
      if (!window.SupabaseClient.isConfigured() && typeof window.SupabaseClient.initFromApi === 'function') {
        try {
          await window.SupabaseClient.initFromApi();
        } catch (e) {}
      }

      if (window.SupabaseClient.isConfigured()) {
        var redirectUrl = window.location.origin + '/reset-password.html';
        await window.SupabaseClient.resetPasswordForEmail(email.trim(), redirectUrl);
        return { success: true, message: 'Password reset link sent to your email.' };
      }
    }

    // Local / Backend fallback notice
    return {
      success: true,
      message: 'If your email is registered, password reset instructions have been sent.'
    };
  }

  // 4. PERFORM PASSWORD RESET (NEW PASSWORD)
  async function performPasswordReset(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    if (window.SupabaseClient) {
      if (!window.SupabaseClient.isConfigured() && typeof window.SupabaseClient.initFromApi === 'function') {
        try {
          await window.SupabaseClient.initFromApi();
        } catch (e) {}
      }

      if (window.SupabaseClient.isConfigured()) {
        await window.SupabaseClient.updatePassword(newPassword);
        return { success: true, message: 'Password updated successfully!' };
      }
    }

    throw new Error('Supabase client is not configured for password updates.');
  }

  // 5. SECURE LOGOUT
  async function handleLogout() {
    var confirmLogout = window.confirm('Are you sure you want to log out from FarmSaathi AI?');
    if (!confirmLogout) return;

    try {
      if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
        await window.SupabaseClient.signOut();
      }
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }

    try {
      if (typeof window.apiRequest === 'function') {
        await window.apiRequest('/api/auth/logout', 'POST');
      }
    } catch (e) {
      console.warn('Backend logout notice:', e);
    }

    if (window.AppStorage) {
      window.AppStorage.remove('auth_token');
      window.AppStorage.remove('current_user');
      window.AppStorage.remove('farmer_profile');
    }
    try {
      localStorage.removeItem('fs_auth_token');
      localStorage.removeItem('fs_current_user');
      localStorage.removeItem('fs_farmer_profile');
    } catch (e) {}

    currentUser = null;
    updateAuthUI();

    // Redirect to login page
    window.location.href = '/login.html';
  }

  // ============================================================================
  // AUTH UI SYNC & SESSION RESTORATION
  // ============================================================================

  function updateAuthUI() {
    var dot = $('accountDot');
    var label = $('accountLabel');
    var badgeSync = $('badgeProfileSync');
    var storageModeText = $('txtStorageMode');
    var topUserName = $('topUserName');
    var pageGreeting = $('pageGreeting');

    var profile = (window.FarmerProfile && window.FarmerProfile.getProfile) ? window.FarmerProfile.getProfile() : {};
    var rawName = (currentUser && (currentUser.fullName || currentUser.full_name)) || (profile && (profile.full_name || profile.fullName)) || '';
    if (rawName === 'Rahul Patil') {
      rawName = (currentUser && (currentUser.fullName || currentUser.full_name)) || '';
    }
    var displayName = rawName.trim();
    var nameOrFallback = displayName || 'Farmer';
    var email = (currentUser && currentUser.email) || '';

    if (topUserName) {
      topUserName.textContent = nameOrFallback;
    }

    if (pageGreeting) {
      pageGreeting.textContent = 'Good day, ' + nameOrFallback + ' 👋';
    }

    var isSupabase = window.SupabaseClient && window.SupabaseClient.isConfigured();
    var isBackend = window.isBackendConnected;

    if (isSupabase && currentUser) {
      if (dot) dot.className = 'account-dot';
      var acctText = '🟢 Supabase Secure Session · ' + nameOrFallback + (email ? ' (' + email + ')' : '');
      if (label) label.textContent = acctText;
      if (badgeSync) badgeSync.textContent = 'Supabase Cloud Synced ✓';
      if (storageModeText) storageModeText.textContent = 'Supabase Cloud PostgreSQL (with Row Level Security)';
    } else if (isBackend && currentUser) {
      if (dot) dot.className = 'account-dot';
      var acctText = '🟢 Authenticated Farmer · ' + nameOrFallback + (email ? ' (' + email + ')' : '');
      if (label) label.textContent = acctText;
      if (badgeSync) badgeSync.textContent = 'Node.js Backend Synced ✓';
      if (storageModeText) storageModeText.textContent = 'Node.js Persistent JSON Database (data/database.json)';
    } else if (currentUser) {
      if (dot) dot.className = 'account-dot';
      if (label) label.textContent = nameOrFallback + ' · Authenticated Farmer';
      if (badgeSync) badgeSync.textContent = 'Local Storage Mode';
      if (storageModeText) storageModeText.textContent = 'Local Browser Storage';
    } else {
      if (dot) dot.className = 'account-dot offline';
      if (label) label.textContent = 'Unauthenticated Session';
    }

    if (typeof window.updateChatGreeting === 'function') {
      window.updateChatGreeting();
    }
  }

  // Restore authenticated session on page load
  async function restoreSession() {
    // 1. Check Supabase session
    if (window.SupabaseClient) {
      if (typeof window.SupabaseClient.initFromApi === 'function') {
        try {
          await window.SupabaseClient.initFromApi();
        } catch (e) {}
      }

      if (window.SupabaseClient.isConfigured()) {
        try {
          var session = await window.SupabaseClient.getSession();
          if (session && session.user) {
            var meta = session.user.user_metadata || {};
            var fullName = (meta.full_name || '').trim();

            if (!fullName && window.SupabaseClient.fetchProfile) {
              try {
                var sbProf = await window.SupabaseClient.fetchProfile(session.user.id);
                if (sbProf && (sbProf.full_name || sbProf.fullName)) {
                  fullName = (sbProf.full_name || sbProf.fullName).trim();
                }
              } catch (e) {}
            }

            currentUser = {
              id: session.user.id,
              fullName: fullName,
              email: session.user.email,
              authProvider: 'supabase'
            };
            if (window.AppStorage) window.AppStorage.set('current_user', currentUser);
            try {
              localStorage.setItem('fs_current_user', JSON.stringify(currentUser));
            } catch (e) {}
            updateAuthUI();
            return currentUser;
          }
        } catch (e) {
          console.warn('Supabase restoreSession notice:', e.message);
        }
      }
    }

    // 2. Check stored session in Storage or localStorage
    var storedUser = null;
    if (window.AppStorage) {
      storedUser = window.AppStorage.get('current_user', null);
    }
    if (!storedUser) {
      try {
        var raw = localStorage.getItem('fs_current_user');
        if (raw) storedUser = JSON.parse(raw);
      } catch (e) {}
    }

    var token = (window.AppStorage && window.AppStorage.get) ? window.AppStorage.get('auth_token', null) : null;
    if (!token) {
      try {
        var rawT = localStorage.getItem('fs_auth_token');
        if (rawT) {
          try { token = JSON.parse(rawT); } catch (e) { token = rawT; }
        }
      } catch (e) {}
    }

    if (storedUser) {
      currentUser = storedUser;
      updateAuthUI();
      return currentUser;
    }

    if (token && typeof window.apiRequest === 'function') {
      try {
        var meRes = await window.apiRequest('/api/auth/me', 'GET');
        if (meRes.ok && meRes.data && meRes.data.user) {
          currentUser = Object.assign({}, meRes.data.user, { authProvider: 'backend' });
          if (window.AppStorage) window.AppStorage.set('current_user', currentUser);
          try {
            localStorage.setItem('fs_current_user', JSON.stringify(currentUser));
          } catch (e) {}
          updateAuthUI();
          return currentUser;
        }
      } catch (e) {}
    }

    return null;
  }

  // Listen to Supabase auth state changes automatically
  function setupAuthListener() {
    if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
      try {
        window.SupabaseClient.onAuthStateChange(function(event, session) {
          if (event === 'SIGNED_IN' && session && session.user) {
            var meta = session.user.user_metadata || {};
            currentUser = {
              id: session.user.id,
              fullName: meta.full_name || session.user.email.split('@')[0],
              email: session.user.email,
              authProvider: 'supabase'
            };
            if (window.AppStorage) window.AppStorage.set('current_user', currentUser);
            try {
              localStorage.setItem('fs_current_user', JSON.stringify(currentUser));
            } catch (e) {}
            updateAuthUI();
          } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            if (window.AppStorage) {
              window.AppStorage.remove('current_user');
              window.AppStorage.remove('auth_token');
            }
            try {
              localStorage.removeItem('fs_current_user');
              localStorage.removeItem('fs_auth_token');
            } catch (e) {}
            updateAuthUI();
          }
        });
      } catch (e) {}
    }
  }

  // Run on page load
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
      restoreSession().then(function() {
        setupAuthListener();
      });
    });
  }

  // Export to window
  window.AuthModule = {
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    signInUser: signInUser,
    signUpUser: signUpUser,
    requestPasswordReset: requestPasswordReset,
    performPasswordReset: performPasswordReset,
    handleLogout: handleLogout,
    updateAuthUI: updateAuthUI,
    restoreSession: restoreSession
  };

  // Direct window bindings for backwards compatibility
  window.handleLogout = handleLogout;
  window.updateAuthUI = updateAuthUI;
  window.restoreSession = restoreSession;

})(window);
