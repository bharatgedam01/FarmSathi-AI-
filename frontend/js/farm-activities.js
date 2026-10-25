// FarmSaathi AI — Farm Activities & Calendar Reminders Module
// Full CRUD: Create, Read, Update, Delete with filtering, cloud sync & local persistence.

(function(window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function getActivitiesKey() {
    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    return (user ? user.id + '_' : '') + 'activities_list';
  }

  function getSavedActivities() {
    var today = new Date().toISOString().slice(0, 10);
    var futureDate = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

    var defaultActs = [
      {
        id: 'act_1',
        name: 'Irrigate Soybean Field',
        category: 'Irrigation',
        date: today,
        farm: 'Main Plot',
        crop: 'Soybean',
        notes: 'Check moisture around root zone; run drip for 2 hours.',
        completed: false,
        status: 'Pending'
      },
      {
        id: 'act_2',
        name: 'Inspect Cotton for Sucking Pests',
        category: 'Spraying',
        date: futureDate,
        farm: 'East Field',
        crop: 'Cotton',
        notes: 'Check underside of leaves for aphids and jassids.',
        completed: false,
        status: 'Pending'
      }
    ];

    return (window.AppStorage && window.AppStorage.get) ? window.AppStorage.get(getActivitiesKey(), defaultActs) : defaultActs;
  }

  function setSavedActivities(acts) {
    if (window.AppStorage) {
      window.AppStorage.set(getActivitiesKey(), acts);
    }
    if (window.updateDashboardCounts) {
      window.updateDashboardCounts();
    }
  }

  function renderActivitiesList() {
    var container = $('activityListContainer');
    if (!container) return;
    container.innerHTML = '';
    var acts = getSavedActivities();

    var filterCat = ($('filterActCategory') && $('filterActCategory').value) || '';
    var filterStatus = ($('filterActStatus') && $('filterActStatus').value) || '';

    var filtered = acts.filter(function(a) {
      if (filterCat && a.category !== filterCat) return false;
      if (filterStatus) {
        var isComp = Boolean(a.completed || a.status === 'Completed');
        if (filterStatus === 'Completed' && !isComp) return false;
        if (filterStatus === 'Pending' && isComp) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      var emptyMsg = acts.length === 0
        ? 'No scheduled activities yet. Add your first operation using the form on the left.'
        : 'No activities match the selected filter criteria.';
      container.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 24px;">' + emptyMsg + '</div>';
      return;
    }

    filtered.forEach(function(a) {
      // Find real index in master acts array for mutations
      var realIdx = acts.findIndex(function(item) { return item.id === a.id; });
      if (realIdx === -1) realIdx = 0;

      var row = document.createElement('div');
      row.className = 'list-row';
      var icon = a.category === 'Irrigation' ? '💧' : (a.category === 'Fertilizer' ? '🧪' : (a.category === 'Spraying' ? '🍃' : (a.category === 'Harvesting' ? '🚜' : (a.category === 'Sowing' ? '🌱' : (a.category === 'Weeding' ? '🌾' : '📌')))));
      var isCompleted = Boolean(a.completed || a.status === 'Completed');

      var farmCropTags = [];
      if (a.farm) farmCropTags.push('Plot: <b>' + a.farm + '</b>');
      if (a.crop) farmCropTags.push('Crop: <b>' + a.crop + '</b>');
      var farmCropLine = farmCropTags.length > 0 ? ' · ' + farmCropTags.join(' · ') : '';

      row.innerHTML =
        '<div class="list-row-main" style="' + (isCompleted ? 'opacity: 0.65;' : '') + '">' +
        '  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' +
        '    <strong style="' + (isCompleted ? 'text-decoration: line-through;' : '') + '">' + icon + ' ' + a.name + '</strong>' +
        '    <span class="badge ' + (isCompleted ? 'badge-ok' : '') + '">' + (isCompleted ? '✓ Completed' : '⏳ Pending') + '</span>' +
        '    <span class="badge" style="font-weight: 500;">' + a.category + '</span>' +
        '  </div>' +
        '  <small style="margin-top: 4px; display: block; color: var(--muted);">' +
        '    📅 Date: <b>' + (a.date || 'Scheduled') + '</b>' + farmCropLine +
        '  </small>' +
        (a.notes ? '  <small style="margin-top: 4px; display: block; color: #475a4d; background: #fafcf8; padding: 4px 8px; border-radius: 4px;">📝 ' + a.notes + '</small>' : '') +
        '</div>' +
        '<div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">' +
        '  <button type="button" class="btn btn-secondary btn-sm" onclick="toggleActivity(' + realIdx + ')" title="Mark Done or Undo">' + (isCompleted ? '↺ Undo' : '✓ Done') + '</button>' +
        '  <button type="button" class="btn btn-secondary btn-sm" onclick="openEditActivityModal(' + realIdx + ')" title="Edit Activity">✏️ Edit</button>' +
        '  <button type="button" class="btn btn-danger btn-sm" onclick="deleteActivity(' + realIdx + ')" title="Delete Activity">🗑️</button>' +
        '</div>';
      container.appendChild(row);
    });
  }

  async function handleAddActivitySubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var nameVal = ($('actName') && $('actName').value.trim()) || '';
    if (!nameVal) {
      alert('Please enter an activity description.');
      return;
    }

    var statusEl = $('actStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Scheduling activity…';
    }

    var newAct = {
      id: 'act_' + Date.now(),
      name: nameVal,
      category: ($('actCategory') && $('actCategory').value) || 'General',
      date: ($('actDate') && $('actDate').value) || new Date().toISOString().slice(0, 10),
      farm: ($('actFarm') && $('actFarm').value.trim()) || '',
      crop: ($('actCrop') && $('actCrop').value.trim()) || '',
      notes: ($('actNotes') && $('actNotes').value.trim()) || '',
      completed: false,
      status: 'Pending'
    };

    var acts = getSavedActivities();
    acts.unshift(newAct);
    setSavedActivities(acts);

    if ($('formAddActivity')) $('formAddActivity').reset();
    renderActivitiesList();

    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    var syncedCloud = false;

    // 1. Save to Supabase if configured
    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id) {
      try {
        var sbAct = await window.SupabaseClient.saveActivity(user.id, newAct);
        if (sbAct && sbAct.id) {
          newAct.id = sbAct.id;
          setSavedActivities(acts);
        }
        syncedCloud = true;
      } catch (sbErr) {
        console.warn('Supabase activity save notice:', sbErr.message);
      }
    }

    // 2. Save to Backend if connected
    if (window.isBackendConnected) {
      try {
        var res = await window.apiRequest('/api/activities', 'POST', newAct);
        if (res.ok && res.data && res.data.activity) {
          newAct.id = res.data.activity.id;
          setSavedActivities(acts);
          syncedCloud = true;
        }
      } catch (err) {}
    }

    if (statusEl) {
      statusEl.textContent = syncedCloud
        ? 'Activity scheduled & synced to cloud account ✓'
        : 'Activity reminder added to local device ✓';
    }
  }

  function openEditActivityModal(idx) {
    var acts = getSavedActivities();
    var act = acts[idx];
    if (!act) return;

    if ($('editActIndex')) $('editActIndex').value = idx;
    if ($('editActId')) $('editActId').value = act.id || '';
    if ($('editActName')) $('editActName').value = act.name || '';
    if ($('editActCategory')) $('editActCategory').value = act.category || 'General';
    if ($('editActDate')) $('editActDate').value = act.date || '';
    if ($('editActFarm')) $('editActFarm').value = act.farm || '';
    if ($('editActCrop')) $('editActCrop').value = act.crop || '';
    if ($('editActNotes')) $('editActNotes').value = act.notes || '';

    var modal = $('activityEditModal');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'grid';
    }
  }

  function closeEditActivityModal() {
    var modal = $('activityEditModal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }

  async function handleEditActivitySubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var idx = parseInt($('editActIndex') && $('editActIndex').value, 10);
    var acts = getSavedActivities();
    if (isNaN(idx) || !acts[idx]) {
      closeEditActivityModal();
      return;
    }

    var act = acts[idx];
    act.name = ($('editActName') && $('editActName').value.trim()) || act.name;
    act.category = ($('editActCategory') && $('editActCategory').value) || act.category;
    act.date = ($('editActDate') && $('editActDate').value) || act.date;
    act.farm = ($('editActFarm') && $('editActFarm').value.trim()) || '';
    act.crop = ($('editActCrop') && $('editActCrop').value.trim()) || '';
    act.notes = ($('editActNotes') && $('editActNotes').value.trim()) || '';

    setSavedActivities(acts);
    renderActivitiesList();
    closeEditActivityModal();

    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id && act.id) {
      try {
        await window.SupabaseClient.updateActivity(user.id, act.id, act);
      } catch (sbErr) {
        console.warn('Supabase activity update notice:', sbErr.message);
      }
    }

    if (window.isBackendConnected && act.id) {
      try {
        await window.apiRequest('/api/activities/' + encodeURIComponent(act.id), 'PUT', act);
      } catch (err) {}
    }
  }

  async function toggleActivity(idx) {
    var acts = getSavedActivities();
    var item = acts[idx];
    if (!item) return;

    item.completed = !item.completed;
    item.status = item.completed ? 'Completed' : 'Pending';
    setSavedActivities(acts);
    renderActivitiesList();

    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id && item.id) {
      try {
        await window.SupabaseClient.toggleActivity(user.id, item.id, item.completed);
      } catch (e) {}
    }

    if (window.isBackendConnected && item.id) {
      try {
        await window.apiRequest('/api/activities/' + encodeURIComponent(item.id) + '/toggle', 'POST');
      } catch (e) {}
    }
  }

  async function deleteActivity(idx) {
    var acts = getSavedActivities();
    var toDelete = acts[idx];
    if (!toDelete) return;

    if (!confirm('Are you sure you want to delete the activity "' + (toDelete.name || 'this task') + '"?')) {
      return;
    }

    acts.splice(idx, 1);
    setSavedActivities(acts);
    renderActivitiesList();

    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id && toDelete.id) {
      try {
        await window.SupabaseClient.deleteActivity(user.id, toDelete.id);
      } catch (e) {}
    }

    if (window.isBackendConnected && toDelete.id) {
      try {
        await window.apiRequest('/api/activities/' + encodeURIComponent(toDelete.id), 'DELETE');
      } catch (err) {}
    }
  }

  // Bind close on backdrop click for edit modal
  window.addEventListener('DOMContentLoaded', function() {
    var editModal = $('activityEditModal');
    if (editModal) {
      editModal.addEventListener('click', function(e) {
        if (e.target === editModal) closeEditActivityModal();
      });
    }
  });

  // Export module
  window.FarmActivities = {
    getSavedActivities: getSavedActivities,
    setSavedActivities: setSavedActivities,
    renderActivitiesList: renderActivitiesList,
    handleAddActivitySubmit: handleAddActivitySubmit,
    openEditActivityModal: openEditActivityModal,
    closeEditActivityModal: closeEditActivityModal,
    handleEditActivitySubmit: handleEditActivitySubmit,
    toggleActivity: toggleActivity,
    deleteActivity: deleteActivity
  };

  // Direct window bindings
  window.getSavedActivities = getSavedActivities;
  window.setSavedActivities = setSavedActivities;
  window.renderActivitiesList = renderActivitiesList;
  window.handleAddActivitySubmit = handleAddActivitySubmit;
  window.openEditActivityModal = openEditActivityModal;
  window.closeEditActivityModal = closeEditActivityModal;
  window.handleEditActivitySubmit = handleEditActivitySubmit;
  window.toggleActivity = toggleActivity;
  window.deleteActivity = deleteActivity;

})(window);
