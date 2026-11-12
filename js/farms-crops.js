// FarmSaathi AI — My Farms & Crops Module
// Handles crop logs, sowing dates, growth stage tracking, and database synchronization.

(function(window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function getTodayIST() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  function formatIndianDate(dateStr) {
    if (!dateStr) return 'N/A';
    var clean = String(dateStr).slice(0, 10);
    var parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return dateStr;
  }

  function getCropsKey() {
    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    return (user ? user.id + '_' : '') + 'crops_list';
  }

  function getSavedCrops() {
    // Always default to an empty array so new users see 0 crops, not sample data.
    return (window.AppStorage && window.AppStorage.get) ? window.AppStorage.get(getCropsKey(), []) : [];
  }

  function setSavedCrops(crops) {
    if (window.AppStorage) {
      window.AppStorage.set(getCropsKey(), crops);
    }
    if (window.updateDashboardCounts) {
      window.updateDashboardCounts();
    }
  }

  function renderCropsList() {
    var container = $('cropsList');
    if (!container) return;
    container.innerHTML = '';
    var crops = getSavedCrops();

    if (crops.length === 0) {
      var emptyMsg = (window.t && window.t('empty_crops')) || 'No crops added yet. Add your first crop to get started.';
      container.innerHTML = '<div style="color: var(--muted); font-size: 13.5px; text-align: center; padding: 28px 16px;">🌱 ' + emptyMsg + '</div>';
      return;
    }

    crops.forEach(function(c, idx) {
      var row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML =
        '<div class="list-row-main">' +
        '  <strong>🌾 ' + (c.name || c.cropName) + (c.variety ? ' — ' + c.variety : '') + '</strong>' +
        '  <small>' + (c.plot || c.fieldName || 'Farm plot') + ' · Sown: ' + formatIndianDate(c.sowing_date || c.sowingDate) + ' · Stage: <span class="badge badge-ok">' + (c.stage || c.growthStage || 'Vegetative') + '</span>' + (c.area ? ' · Area: ' + c.area + ' Acres' : '') + '</small>' +
        (c.notes ? '  <small style="margin-top: 4px; color: #475a4d;">📝 ' + c.notes + '</small>' : '') +
        '</div>' +
        '<div>' +
        '  <button type="button" class="btn btn-danger btn-sm" onclick="deleteCrop(' + idx + ')">🗑️ Delete</button>' +
        '</div>';
      container.appendChild(row);
    });
  }

  async function handleAddCropSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var statusEl = $('cropStatusMsg');
    var sowingInputVal = ($('cropSowingDate') && $('cropSowingDate').value) || '';
    var todayIST = getTodayIST();

    if (sowingInputVal && sowingInputVal < todayIST) {
      if (statusEl) {
        statusEl.className = 'status-msg show error';
        statusEl.textContent = '⚠️ Sowing date cannot be in the past. Please select today (' + formatIndianDate(todayIST) + ') or a future date.';
      }
      return;
    }

    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Saving crop record…';
    }

    var newCrop = {
      id: 'crop_' + Date.now(),
      name: ($('cropName') && $('cropName').value.trim()) || 'Crop',
      cropName: ($('cropName') && $('cropName').value.trim()) || 'Crop',
      variety: ($('cropVariety') && $('cropVariety').value.trim()) || '',
      plot: ($('cropPlot') && $('cropPlot').value.trim()) || 'Farm Plot',
      fieldName: ($('cropPlot') && $('cropPlot').value.trim()) || 'Farm Plot',
      sowing_date: sowingInputVal || todayIST,
      sowingDate: sowingInputVal || todayIST,
      stage: ($('cropStage') && $('cropStage').value) || 'Vegetative',
      growthStage: ($('cropStage') && $('cropStage').value) || 'Vegetative',
      area: ($('cropArea') && $('cropArea').value) ? parseFloat($('cropArea').value) : null,
      notes: ($('cropNotes') && $('cropNotes').value.trim()) || '',
      created_at: new Date().toISOString()
    };

    var crops = getSavedCrops();
    crops.unshift(newCrop);
    setSavedCrops(crops);

    if ($('formAddCrop')) {
      $('formAddCrop').reset();
      if ($('cropSowingDate')) {
        $('cropSowingDate').min = todayIST;
        $('cropSowingDate').value = todayIST;
      }
    }
    renderCropsList();

    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    var syncedCloud = false;

    // 1. Save to Supabase if configured
    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id) {
      try {
        var sbCrop = await window.SupabaseClient.saveCrop(user.id, newCrop);
        if (sbCrop && sbCrop.id) {
          newCrop.id = sbCrop.id;
          setSavedCrops(crops);
        }
        syncedCloud = true;
      } catch (sbErr) {
        console.warn('Supabase save crop notice:', sbErr.message);
      }
    }

    // 2. Save to Backend if connected
    if (window.isBackendConnected) {
      try {
        var res = await window.apiRequest('/api/crops', 'POST', newCrop);
        if (res.ok && res.data && res.data.crop) {
          newCrop.id = res.data.crop.id;
          setSavedCrops(crops);
          syncedCloud = true;
        } else if (res.status === 401) {
          // Not authenticated — remove the locally-saved crop and show error
          var idx = crops.indexOf(newCrop);
          if (idx !== -1) crops.splice(idx, 1);
          setSavedCrops(crops);
          renderCropsList();
          if (statusEl) {
            statusEl.className = 'status-msg show error';
            statusEl.textContent = '⚠️ Please sign in to save crops. Your session may have expired.';
          }
          return;
        } else if (!res.ok) {
          var backendErr = (res.data && (res.data.error || res.data.message)) || ('Server error ' + res.status);
          console.warn('Backend crop save failed:', backendErr);
          if (statusEl) {
            statusEl.className = 'status-msg show error';
            statusEl.textContent = '⚠️ Cloud save failed: ' + backendErr + '. Crop saved locally only.';
          }
        }
      } catch (err) {
        console.warn('Backend crop save error:', err.message);
      }
    }

    if (statusEl && statusEl.className.includes('error') === false) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = syncedCloud
        ? 'Crop saved & synced across cloud account ✓'
        : 'Crop record added to local device ✓';
    }
  }

  async function deleteCrop(idx) {
    var confirmText = (window.t && window.t('delete_confirm')) || 'Are you sure you want to delete this record?';
    if (confirm(confirmText)) {
      var crops = getSavedCrops();
      var toDelete = crops[idx];
      crops.splice(idx, 1);
      setSavedCrops(crops);
      renderCropsList();

      var user = window.AuthModule && window.AuthModule.getCurrentUser();

      // Delete from Supabase
      if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id && toDelete && toDelete.id) {
        try {
          await window.SupabaseClient.deleteCrop(user.id, toDelete.id);
        } catch (e) {}
      }

      // Delete from Backend
      if (window.isBackendConnected && toDelete && toDelete.id) {
        try {
          await window.apiRequest('/api/crops/' + encodeURIComponent(toDelete.id), 'DELETE');
        } catch (err) {}
      }
    }
  }

  function initCrops() {
    var sowingInput = $('cropSowingDate');
    if (sowingInput) {
      var today = getTodayIST();
      sowingInput.min = today;
      if (!sowingInput.value) sowingInput.value = today;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCrops);
  } else {
    setTimeout(initCrops, 50);
  }

  // Export module
  window.FarmsCrops = {
    getSavedCrops: getSavedCrops,
    setSavedCrops: setSavedCrops,
    renderCropsList: renderCropsList,
    handleAddCropSubmit: handleAddCropSubmit,
    deleteCrop: deleteCrop
  };

  // Direct window bindings
  window.getSavedCrops = getSavedCrops;
  window.setSavedCrops = setSavedCrops;
  window.renderCropsList = renderCropsList;
  window.handleAddCropSubmit = handleAddCropSubmit;
  window.deleteCrop = deleteCrop;

})(window);
