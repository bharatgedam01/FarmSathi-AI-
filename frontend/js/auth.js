// FarmSaathi AI — Authentication & Session Management Module
// Supports Supabase Auth (Email/Password), Backend REST Sessions, and Instant Offline Demo Mode.

(function(window) {
  'use strict';

  var authTab = 'login';
  var currentUser = null;

  function $(id) {
    return document.getElementById(id);
  }

  function getCurrentUser() {
    return currentUser;
  }

  function setCurrentUser(user) {
    currentUser = user;
    updateAuthUI();
  }

  function openAuthModal(mode) {
    setAuthTab(mode || 'login');
    var modal = $('authModal');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'grid';
    }
    var msg = $('authStatusMsg');
    if (msg) {
      msg.className = 'status-msg';
      msg.textContent = '';
    }
  }

  function closeAuthModal() {
    var modal = $('authModal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }

  function setAuthTab(tab) {
    authTab = tab;
    var tabLogin = $('tabAuthLogin');
    var tabSignup = $('tabAuthSignup');
    var tabDemo = $('tabAuthDemo');

    if (tabLogin) {
      tabLogin.style.background = tab === 'login' ? 'var(--green)' : '';
      tabLogin.style.color = tab === 'login' ? '#ffffff' : '';
    }
    if (tabSignup) {
      tabSignup.style.background = tab === 'signup' ? 'var(--green)' : '';
      tabSignup.style.color = tab === 'signup' ? '#ffffff' : '';
    }
    if (tabDemo) {
      tabDemo.style.background = tab === 'demo' ? 'var(--green)' : '#eef7e5';
      tabDemo.style.color = tab === 'demo' ? '#ffffff' : '';
    }

    var title = $('authModalTitle');
    var nameField = $('authNameField');
    var emailField = $('authEmailField');
    var passField = $('authPasswordField');
    var submitBtn = $('btnAuthSubmit');
    var forgotBtn = $('btnForgotPass');

    if (tab === 'login') {
      if (title) title.textContent = 'Sign in to FarmSaathi AI';
      if (nameField) nameField.style.display = 'none';
      if (emailField) emailField.style.display = 'flex';
      if (passField) passField.style.display = 'flex';
      if (submitBtn) submitBtn.textContent = 'Log In';
      if (forgotBtn) forgotBtn.style.display = 'inline-block';
    } else if (tab === 'signup') {
      if (title) title.textContent = 'Create your Farmer Account';
      if (nameField) nameField.style.display = 'flex';
      if (emailField) emailField.style.display = 'flex';
      if (passField) passField.style.display = 'flex';
      if (submitBtn) submitBtn.textContent = 'Create Account';
      if (forgotBtn) forgotBtn.style.display = 'none';
    } else if (tab === 'demo') {
      if (title) title.textContent = 'Instant Demo Farmer Account';
      if (nameField) nameField.style.display = 'flex';
      if (emailField) emailField.style.display = 'none';
      if (passField) passField.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Activate Demo Profile';
      if (forgotBtn) forgotBtn.style.display = 'none';
    }
  }

  async function handleAuthSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var statusEl = $('authStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show';
      statusEl.textContent = 'Connecting…';
    }

    // 1. DEMO MODE
    if (authTab === 'demo') {
      var demoName = ($('authFullName') && $('authFullName').value.trim()) || 'Rahul Patil';
      currentUser = {
        id: 'user_demo',
        fullName: demoName,
        email: 'farmer@farmsaathi.in',
        isDemo: true
      };

      if (window.FarmerProfile && window.FarmerProfile.getProfile) {
        var prof = window.FarmerProfile.getProfile();
        prof.full_name = demoName;
        window.FarmerProfile.saveProfileLocal(prof);
      }

      updateAuthUI();
      if (statusEl) {
        statusEl.className = 'status-msg show ok';
        statusEl.textContent = 'Demo profile active as ' + demoName + ' ✓';
      }
      setTimeout(closeAuthModal, 900);
      return;
    }

    var email = ($('authEmail') && $('authEmail').value.trim()) || '';
    var password = ($('authPassword') && $('authPassword').value) || '';

    // 2. SUPABASE AUTH (if configured)
    if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
      try {
        if (authTab === 'signup') {
          var fullName = ($('authFullName') && $('authFullName').value.trim()) || 'Farmer';
          var data = await window.SupabaseClient.signUp(email, password, fullName);
          currentUser = {
            id: data.user.id,
            fullName: fullName,
            email: email
          };
          window.Storage.set('current_user', currentUser);
          if (statusEl) {
            statusEl.className = 'status-msg show ok';
            statusEl.textContent = 'Supabase account created successfully! Welcome, ' + fullName + ' ✓';
          }
        } else if (authTab === 'login') {
          var data = await window.SupabaseClient.signIn(email, password);
          currentUser = {
            id: data.user.id,
            fullName: (data.user.user_metadata && data.user.user_metadata.full_name) || email,
            email: email
          };
          window.Storage.set('current_user', currentUser);
          if (statusEl) {
            statusEl.className = 'status-msg show ok';
            statusEl.textContent = 'Logged in with Supabase ✓ Welcome back!';
          }
        }

        updateAuthUI();
        setTimeout(closeAuthModal, 1100);
        if (window.syncAllData) window.syncAllData();
        return;
      } catch (sbErr) {
        console.warn('Supabase auth attempt failed, trying backend REST API:', sbErr.message);
        // Fall through to backend REST API
      }
    }

    // 3. BACKEND REST API AUTH
    if (authTab === 'signup') {
      var fullName = ($('authFullName') && $('authFullName').value.trim()) || 'Farmer';
      var res = await window.apiRequest('/api/auth/signup', 'POST', {
        fullName: fullName,
        email: email,
        password: password
      });

      if (res.ok && res.data && res.data.success) {
        window.Storage.set('auth_token', res.data.token);
        currentUser = res.data.user;
        window.Storage.set('current_user', currentUser);
        updateAuthUI();
        if (statusEl) {
          statusEl.className = 'status-msg show ok';
          statusEl.textContent = 'Account created successfully! Welcome, ' + fullName + ' ✓';
        }
        setTimeout(closeAuthModal, 1100);
        if (window.syncAllData) window.syncAllData();
      } else {
        if (statusEl) {
          statusEl.className = 'status-msg show err';
          statusEl.textContent = (res.data && res.data.error) || 'Failed to create account.';
        }
      }
    } else if (authTab === 'login') {
      var res = await window.apiRequest('/api/auth/login', 'POST', {
        email: email,
        password: password
      });

      if (res.ok && res.data && res.data.success) {
        window.Storage.set('auth_token', res.data.token);
        currentUser = res.data.user;
        window.Storage.set('current_user', currentUser);
        updateAuthUI();
        if (statusEl) {
          statusEl.className = 'status-msg show ok';
          statusEl.textContent = 'Welcome back, ' + (res.data.user.fullName || email) + '! Logged in ✓';
        }
        setTimeout(closeAuthModal, 1100);
        if (window.syncAllData) window.syncAllData();
      } else {
        if (statusEl) {
          statusEl.className = 'status-msg show err';
          statusEl.textContent = (res.data && res.data.error) || 'Invalid email or password.';
        }
      }
    }
  }

  function handleForgotPassword() {
    alert('Default Demo Credentials:\n• Email: farmer@farmsaathi.in\n• Password: farmer123\n\nYou can also click "Demo Mode" or create a new account.');
  }

  async function handleLogout() {
    if (confirm('Log out from your FarmSaathi AI account?')) {
      if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
        try {
          await window.SupabaseClient.signOut();
        } catch (e) {}
      }

      if (window.isBackendConnected) {
        try {
          await window.apiRequest('/api/auth/logout', 'POST');
        } catch (e) {}
      }

      window.Storage.remove('auth_token');
      window.Storage.remove('current_user');
      currentUser = null;
      updateAuthUI();
      alert('Logged out successfully.');
      if (window.navigateTo) window.navigateTo('dashboard');
    }
  }

  function updateAuthUI() {
    var dot = $('accountDot');
    var label = $('accountLabel');
    var triggerBtn = $('btnAuthTrigger');
    var badgeSync = $('badgeProfileSync');
    var storageModeText = $('txtStorageMode');

    var profile = (window.FarmerProfile && window.FarmerProfile.getProfile) ? window.FarmerProfile.getProfile() : {};
    var name = (currentUser && (currentUser.fullName || currentUser.full_name)) || profile.full_name || 'Rahul Patil';
    var email = (currentUser && currentUser.email) || '';

    var isSupabase = window.SupabaseClient && window.SupabaseClient.isConfigured();
    var isBackend = window.isBackendConnected;

    if (isSupabase) {
      if (dot) dot.className = 'account-dot';
      var acctText = '🟢 Supabase Cloud · ' + name + (email ? ' (' + email + ')' : '');
      if (label) label.textContent = acctText;
      if (triggerBtn) triggerBtn.textContent = currentUser ? 'Account (' + name + ')' : 'Log in / Account';
      if (badgeSync) badgeSync.textContent = 'Supabase Cloud Synced ✓';
      if (storageModeText) storageModeText.textContent = 'Supabase Cloud PostgreSQL (with Row Level Security)';
    } else if (isBackend) {
      if (dot) dot.className = 'account-dot';
      var acctText = '🟢 Backend Connected · ' + name + (email ? ' (' + email + ')' : ' (farmer@farmsaathi.in)');
      if (label) label.textContent = acctText;
      if (triggerBtn) triggerBtn.textContent = currentUser ? 'Account (' + name + ')' : 'Switch Account';
      if (badgeSync) badgeSync.textContent = 'Node.js Backend Synced ✓';
      if (storageModeText) storageModeText.textContent = 'Node.js Persistent JSON Database (data/database.json)';
    } else {
      if (dot) dot.className = 'account-dot offline';
      if (label) label.textContent = name + ' · Local Browser Storage (Offline Ready)';
      if (triggerBtn) triggerBtn.textContent = 'Demo Profile';
      if (badgeSync) badgeSync.textContent = 'Local Storage Mode';
      if (storageModeText) storageModeText.textContent = 'Local Browser Storage (Offline Ready)';
    }
  }

  // Restore session
  async function restoreSession() {
    // 1. Check Supabase session
    if (window.SupabaseClient && window.SupabaseClient.isConfigured()) {
      try {
        var session = await window.SupabaseClient.getSession();
        if (session && session.user) {
          currentUser = {
            id: session.user.id,
            fullName: (session.user.user_metadata && session.user.user_metadata.full_name) || session.user.email,
            email: session.user.email
          };
          updateAuthUI();
          return;
        }
      } catch (e) {}
    }

    // 2. Check stored session
    var token = window.Storage.get('auth_token', null);
    if (token) {
      var meRes = await window.apiRequest('/api/auth/me', 'GET');
      if (meRes.ok && meRes.data && meRes.data.user) {
        currentUser = meRes.data.user;
        updateAuthUI();
      }
    }
  }

  // Bind close on overlay click
  window.addEventListener('DOMContentLoaded', function() {
    var modal = $('authModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeAuthModal();
      });
    }
  });

  // Export to window
  window.AuthModule = {
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    openAuthModal: openAuthModal,
    closeAuthModal: closeAuthModal,
    setAuthTab: setAuthTab,
    handleAuthSubmit: handleAuthSubmit,
    handleForgotPassword: handleForgotPassword,
    handleLogout: handleLogout,
    updateAuthUI: updateAuthUI,
    restoreSession: restoreSession
  };

  // Direct window bindings for inline HTML handlers
  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.setAuthTab = setAuthTab;
  window.handleAuthSubmit = handleAuthSubmit;
  window.handleForgotPassword = handleForgotPassword;
  window.handleLogout = handleLogout;
  window.updateAuthUI = updateAuthUI;

})(window);
