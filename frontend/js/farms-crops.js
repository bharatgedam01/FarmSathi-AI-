// FarmSaathi AI — My Farms & Crops Module
// Handles crop logs, sowing dates, growth stage tracking, and database synchronization.

(function(window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function getCropsKey() {
    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    return (user ? user.id + '_' : '') + 'crops_list';
  }

  function getSavedCrops() {
    return window.Storage.get(getCropsKey(), [
      {
        id: 'crop_1',
        name: 'Soybean (सोयाबीन)',
        cropName: 'Soybean',
        variety: 'JS-335 / Phule Kalyani',
        plot: 'North Field - Plot A',
        fieldName: 'North Field - Plot A',
        sowing_date: '2026-06-25',
        sowingDate: '2026-06-25',
        stage: 'Pod Formation (शेंगा भरणे)',
        growthStage: 'Pod Formation',
        area: 2.0,
        notes: 'Applied 0:52:34 foliar nutrition. Soil moisture optimal.'
      },
      {
        id: 'crop_2',
        name: 'Cotton (कापूस)',
        cropName: 'Cotton',
        variety: 'BT Cotton (Medium Staple)',
        plot: 'South Field - Plot B',
        fieldName: 'South Field - Plot B',
        sowing_date: '2026-06-20',
        sowingDate: '2026-06-20',
        stage: 'Boll Development (बोंड विकास)',
        growthStage: 'Boll Development',
        area: 1.5,
        notes: 'Installed 5 pheromone traps for pink bollworm monitoring.'
      }
    ]);
  }

  function setSavedCrops(crops) {
    window.Storage.set(getCropsKey(), crops);
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
      var emptyMsg = (window.t && window.t('empty_records')) || 'No crops saved yet. Fill out the form to add your first crop record.';
      container.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 20px;">' + emptyMsg + '</div>';
      return;
    }

    crops.forEach(function(c, idx) {
      var row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML =
        '<div class="list-row-main">' +
        '  <strong>🌾 ' + (c.name || c.cropName) + (c.variety ? ' — ' + c.variety : '') + '</strong>' +
        '  <small>' + (c.plot || c.fieldName || 'Farm plot') + ' · Sown: ' + (c.sowing_date || c.sowingDate || 'N/A') + ' · Stage: <span class="badge badge-ok">' + (c.stage || c.growthStage || 'Vegetative') + '</span>' + (c.area ? ' · Area: ' + c.area + ' Acres' : '') + '</small>' +
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
      sowing_date: ($('cropSowingDate') && $('cropSowingDate').value) || new Date().toISOString().slice(0, 10),
      sowingDate: ($('cropSowingDate') && $('cropSowingDate').value) || new Date().toISOString().slice(0, 10),
      stage: ($('cropStage') && $('cropStage').value) || 'Vegetative',
      growthStage: ($('cropStage') && $('cropStage').value) || 'Vegetative',
      area: ($('cropArea') && $('cropArea').value) ? parseFloat($('cropArea').value) : null,
      notes: ($('cropNotes') && $('cropNotes').value.trim()) || '',
      created_at: new Date().toISOString()
    };

    var crops = getSavedCrops();
    crops.unshift(newCrop);
    setSavedCrops(crops);

    if ($('formAddCrop')) $('formAddCrop').reset();
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
        }
      } catch (err) {}
    }

    if (statusEl) {
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
