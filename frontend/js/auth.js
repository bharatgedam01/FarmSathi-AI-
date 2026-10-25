// FarmSaathi AI — Authentication & Session Management Module
// Handles Supabase Cloud Authentication (Sign Up, Sign In, Password Reset, Session Restoration),
// Protected Routes, User-Level Data Isolation, and Secure Logout.
// Note: The previous switch-account action has been completely removed as per security specifications.

(function(window) {
  'use strict';

  var currentUser = null;

  function $(id) {
    return document.getElementById(id);
  }

  function getCurrentUser() {
    return currentUser;
  }

  function setCurrentUser(user) {
    currentUser = user;
    if (window.Storage) {
      if (user) window.Storage.set('current_user', user);
      else window.Storage.remove('current_user');
    }
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

    // Try Supabase Auth
    if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
      var sbData = await window.SupabaseClient.signIn(email, password);
      if (sbData && sbData.user) {
        var userMeta = sbData.user.user_metadata || {};
        var user = {
          id: sbData.user.id,
          fullName: userMeta.full_name || email.split('@')[0],
          email: sbData.user.email,
          authProvider: 'supabase'
        };
        setCurrentUser(user);
        return { success: true, user: user, session: sbData.session };
      }
    }

    // Fallback to Backend REST API
    var res = await window.apiRequest('/api/auth/login', 'POST', {
      email: email,
      password: password
    });

    if (res.ok && res.data && res.data.success) {
      if (window.Storage) {
        window.Storage.set('auth_token', res.data.token);
      }
      var backendUser = Object.assign({}, res.data.user, { authProvider: 'backend' });
      setCurrentUser(backendUser);
      return { success: true, user: backendUser, token: res.data.token };
    } else {
      var errMsg = (res.data && res.data.error) || 'Invalid email or password.';
      throw new Error(errMsg);
    }
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

    // Try Supabase Auth
    if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
      var sbData = await window.SupabaseClient.signUp(email, password, fullName.trim());
      var needsEmailConfirmation = false;
      if (sbData && sbData.user && (!sbData.session || !sbData.user.confirmed_at)) {
        // If identities exist and confirmed_at is null, email confirmation required
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

    // Fallback to Backend REST API
    var res = await window.apiRequest('/api/auth/signup', 'POST', {
      fullName: fullName.trim(),
      email: email.trim(),
      password: password
    });

    if (res.ok && res.data && res.data.success) {
      if (window.Storage) {
        window.Storage.set('auth_token', res.data.token);
      }
      var backendUser = Object.assign({}, res.data.user, { authProvider: 'backend' });
      setCurrentUser(backendUser);
      return { success: true, user: backendUser, needsConfirmation: false };
    } else {
      var errMsg = (res.data && res.data.error) || 'Failed to create account.';
      throw new Error(errMsg);
    }
  }

  // 3. REQUEST PASSWORD RESET
  async function requestPasswordReset(email) {
    if (!email || !email.trim()) {
      throw new Error('Please enter your registered email address.');
    }

    if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
      var redirectUrl = window.location.origin + '/reset-password.html';
      await window.SupabaseClient.resetPasswordForEmail(email.trim(), redirectUrl);
      return { success: true, message: 'Password reset link sent to your email.' };
    }

    // Local / Backend simulation
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

    if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
      await window.SupabaseClient.updatePassword(newPassword);
      return { success: true, message: 'Password updated successfully!' };
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
      if (window.isBackendConnected) {
        await window.apiRequest('/api/auth/logout', 'POST');
      }
    } catch (e) {
      console.warn('Backend logout error:', e);
    }

    if (window.Storage) {
      window.Storage.remove('auth_token');
      window.Storage.remove('current_user');
      window.Storage.remove('farmer_profile');
    }
    try {
      localStorage.removeItem('fs_auth_token');
      localStorage.removeItem('fs_current_user');
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
    var name = (currentUser && (currentUser.fullName || currentUser.full_name)) || profile.full_name || 'Farmer';
    var email = (currentUser && currentUser.email) || '';

    if (topUserName) {
      topUserName.textContent = name;
    }

    if (pageGreeting && name) {
      pageGreeting.textContent = 'Good day, ' + name + ' 👋';
    }

    var isSupabase = window.SupabaseClient && window.SupabaseClient.isConfigured();
    var isBackend = window.isBackendConnected;

    if (isSupabase && currentUser) {
      if (dot) dot.className = 'account-dot';
      var acctText = '🟢 Supabase Secure Session · ' + name + (email ? ' (' + email + ')' : '');
      if (label) label.textContent = acctText;
      if (badgeSync) badgeSync.textContent = 'Supabase Cloud Synced ✓';
      if (storageModeText) storageModeText.textContent = 'Supabase Cloud PostgreSQL (with Row Level Security)';
    } else if (isBackend && currentUser) {
      if (dot) dot.className = 'account-dot';
      var acctText = '🟢 Authenticated Farmer · ' + name + (email ? ' (' + email + ')' : '');
      if (label) label.textContent = acctText;
      if (badgeSync) badgeSync.textContent = 'Node.js Backend Synced ✓';
      if (storageModeText) storageModeText.textContent = 'Node.js Persistent JSON Database (data/database.json)';
    } else if (currentUser) {
      if (dot) dot.className = 'account-dot';
      if (label) label.textContent = name + ' · Authenticated Farmer';
      if (badgeSync) badgeSync.textContent = 'Local Storage Mode';
      if (storageModeText) storageModeText.textContent = 'Local Browser Storage';
    } else {
      if (dot) dot.className = 'account-dot offline';
      if (label) label.textContent = 'Unauthenticated Session';
    }
  }

  // Restore authenticated session on page load
  async function restoreSession() {
    // 1. Check Supabase session
    if (window.SupabaseClient) {
      if (typeof window.SupabaseClient.initFromApi === 'function') {
        await window.SupabaseClient.initFromApi();
      }

      if (window.SupabaseClient.isConfigured()) {
        try {
          var session = await window.SupabaseClient.getSession();
          if (session && session.user) {
            var meta = session.user.user_metadata || {};
            currentUser = {
              id: session.user.id,
              fullName: meta.full_name || session.user.email.split('@')[0],
              email: session.user.email,
              authProvider: 'supabase'
            };
            if (window.Storage) window.Storage.set('current_user', currentUser);
            updateAuthUI();
            return currentUser;
          }
        } catch (e) {
          console.warn('Supabase restoreSession notice:', e.message);
        }
      }
    }

    // 2. Check stored session
    if (window.Storage) {
      var storedUser = window.Storage.get('current_user', null);
      var token = window.Storage.get('auth_token', null);
      if (storedUser) {
        currentUser = storedUser;
        updateAuthUI();
        return currentUser;
      }

      if (token && window.apiRequest) {
        try {
          var meRes = await window.apiRequest('/api/auth/me', 'GET');
          if (meRes.ok && meRes.data && meRes.data.user) {
            currentUser = Object.assign({}, meRes.data.user, { authProvider: 'backend' });
            window.Storage.set('current_user', currentUser);
            updateAuthUI();
            return currentUser;
          }
        } catch (e) {}
      }
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
            if (window.Storage) window.Storage.set('current_user', currentUser);
            updateAuthUI();
          } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            if (window.Storage) {
              window.Storage.remove('current_user');
              window.Storage.remove('auth_token');
            }
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
