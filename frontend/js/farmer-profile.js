// FarmSaathi AI — Farmer Profile Module
// Handles farmer personal land records, soil properties, GPS detection, and synchronization with Supabase/Backend.

(function(window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function getProfileKey() {
    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    return user ? 'profile_' + user.id : 'farmer_profile';
  }

  function getFarmerProfile() {
    return window.Storage.get(getProfileKey(), {
      full_name: 'Rahul Patil',
      phone: '+91 9876543210',
      village: 'Chamorshi',
      district: 'Gadchiroli',
      state: 'Maharashtra',
      preferred_language: 'en',
      farm_area: '3.5',
      area_unit: 'acres',
      soil_type: 'Black Cotton Soil',
      irrigation_method: 'Drip Irrigation',
      main_crop: 'Soybean & Cotton',
      season: 'Kharif',
      latitude: 20.18,
      longitude: 80.00
    });
  }

  function saveFarmerProfileLocal(p) {
    window.Storage.set(getProfileKey(), p);
    // Also keep generic backup for offline demo
    window.Storage.set('farmer_profile', p);
  }

  function loadProfileForm() {
    var profile = getFarmerProfile();
    populateProfileFields(profile);
  }

  function populateProfileFields(profile) {
    if (!profile) return;
    if ($('profFullName')) $('profFullName').value = profile.full_name || profile.fullName || '';
    if ($('profPhone')) $('profPhone').value = profile.phone || '';
    if ($('profVillage')) $('profVillage').value = profile.village || '';
    if ($('profDistrict')) $('profDistrict').value = profile.district || '';
    if ($('profState')) $('profState').value = profile.state || 'Maharashtra';
    if ($('profLanguage')) $('profLanguage').value = profile.preferred_language || profile.preferredLanguage || window.getLang() || 'en';
    if ($('profFarmArea')) $('profFarmArea').value = profile.farm_area || profile.farmArea || '';
    if ($('profAreaUnit')) $('profAreaUnit').value = profile.area_unit || profile.areaUnit || 'acres';
    if ($('profSoilType')) $('profSoilType').value = profile.soil_type || profile.soilType || '';
    if ($('profIrrigation')) $('profIrrigation').value = profile.irrigation_method || profile.irrigationMethod || '';
    if ($('profMainCrop')) $('profMainCrop').value = profile.main_crop || profile.mainCrop || '';
    if ($('profSeason')) $('profSeason').value = profile.season || 'Kharif';

    if (profile.latitude && profile.longitude && $('gpsCoordsText')) {
      $('gpsCoordsText').textContent = '📍 GPS: ' + Number(profile.latitude).toFixed(4) + ', ' + Number(profile.longitude).toFixed(4);
    }

    // Update greeting
    var greeting = $('pageGreeting');
    if (greeting) {
      var name = profile.full_name || profile.fullName || 'Farmer';
      greeting.textContent = 'Good day, ' + name + ' 👋';
    }
  }

  async function handleProfileSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var statusEl = $('profileStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Saving profile…';
    }

    var existing = getFarmerProfile();
    var p = {
      full_name: ($('profFullName') && $('profFullName').value.trim()) || 'Farmer',
      phone: ($('profPhone') && $('profPhone').value.trim()) || '',
      village: ($('profVillage') && $('profVillage').value.trim()) || '',
      district: ($('profDistrict') && $('profDistrict').value.trim()) || '',
      state: ($('profState') && $('profState').value) || 'Maharashtra',
      preferred_language: ($('profLanguage') && $('profLanguage').value) || 'en',
      farm_area: ($('profFarmArea') && $('profFarmArea').value) || '',
      area_unit: ($('profAreaUnit') && $('profAreaUnit').value) || 'acres',
      soil_type: ($('profSoilType') && $('profSoilType').value) || '',
      irrigation_method: ($('profIrrigation') && $('profIrrigation').value) || '',
      main_crop: ($('profMainCrop') && $('profMainCrop').value.trim()) || '',
      season: ($('profSeason') && $('profSeason').value) || 'Kharif',
      latitude: existing.latitude || null,
      longitude: existing.longitude || null,
      updated_at: new Date().toISOString()
    };

    saveFarmerProfileLocal(p);
    populateProfileFields(p);

    if (window.applyLanguage) {
      window.applyLanguage(p.preferred_language);
    }

    // 1. Sync to Supabase if configured
    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    var syncedCloud = false;

    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id) {
      try {
        await window.SupabaseClient.saveProfile(user.id, p);
        syncedCloud = true;
      } catch (sbErr) {
        console.warn('Supabase profile save notice:', sbErr.message);
      }
    }

    // 2. Sync to Backend if connected
    if (window.isBackendConnected) {
      try {
        var res = await window.apiRequest('/api/profile', 'POST', p);
        if (res.ok) syncedCloud = true;
      } catch (beErr) {}
    }

    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = syncedCloud
        ? 'Farmer Profile saved & synced across cloud account ✓'
        : 'Farmer Profile saved to local device ✓';
    }

    if (window.AuthModule && window.AuthModule.updateAuthUI) {
      window.AuthModule.updateAuthUI();
    }
  }

  function detectFarmGps() {
    var gpsText = $('gpsCoordsText');
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your current browser.');
      return;
    }

    if (gpsText) gpsText.textContent = 'Acquiring GPS location…';

    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        var p = getFarmerProfile();
        p.latitude = lat;
        p.longitude = lon;
        saveFarmerProfileLocal(p);

        if (gpsText) {
          gpsText.textContent = '📍 Coords: ' + lat.toFixed(4) + ', ' + lon.toFixed(4) + ' ✓';
        }
        alert('Farm GPS coordinates captured: ' + lat.toFixed(4) + ', ' + lon.toFixed(4));

        if (window.fetchWeather) {
          window.fetchWeather(lat + ',' + lon);
        }
      },
      function(err) {
        if (gpsText) gpsText.textContent = 'GPS permission denied or unavailable';
        alert('Could not acquire GPS: ' + err.message + '. Please ensure location permission is allowed.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  function deleteProfileData() {
    if (confirm('Delete all saved farmer profile data from this device?')) {
      window.Storage.remove(getProfileKey());
      window.Storage.remove('farmer_profile');
      loadProfileForm();
      alert('Profile data cleared.');
    }
  }

  // Export module
  window.FarmerProfile = {
    getProfile: getFarmerProfile,
    saveProfileLocal: saveFarmerProfileLocal,
    loadProfileForm: loadProfileForm,
    populateFields: populateProfileFields,
    handleProfileSubmit: handleProfileSubmit,
    detectFarmGps: detectFarmGps,
    deleteProfileData: deleteProfileData
  };

  // Direct window bindings for HTML onclick / onsubmit
  window.getFarmerProfile = getFarmerProfile;
  window.saveFarmerProfileLocal = saveFarmerProfileLocal;
  window.loadProfileForm = loadProfileForm;
  window.handleProfileSubmit = handleProfileSubmit;
  window.detectFarmGps = detectFarmGps;
  window.deleteProfileData = deleteProfileData;

})(window);
