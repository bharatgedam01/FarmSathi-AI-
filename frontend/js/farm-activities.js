// FarmSaathi AI — Farm Activities & Calendar Reminders Module
// Handles task scheduling, irrigation reminders, fertilizer intervals, and database synchronization.

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

    return window.Storage.get(getActivitiesKey(), [
      {
        id: 'act_1',
        name: 'Irrigate Soybean Field',
        category: 'Irrigation',
        date: today,
        notes: 'Check moisture around root zone; run drip for 2 hours.',
        completed: false
      },
      {
        id: 'act_2',
        name: 'Inspect Cotton for Sucking Pests',
        category: 'Spraying',
        date: futureDate,
        notes: 'Check underside of leaves for aphids and jassids.',
        completed: false
      }
    ]);
  }

  function setSavedActivities(acts) {
    window.Storage.set(getActivitiesKey(), acts);
    if (window.updateDashboardCounts) {
      window.updateDashboardCounts();
    }
  }

  function renderActivitiesList() {
    var container = $('activityListContainer');
    if (!container) return;
    container.innerHTML = '';
    var acts = getSavedActivities();

    if (acts.length === 0) {
      var emptyMsg = (window.t && window.t('empty_records')) || 'No scheduled activities. Add tasks using the form on the left.';
      container.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 20px;">' + emptyMsg + '</div>';
      return;
    }

    acts.forEach(function(a, idx) {
      var row = document.createElement('div');
      row.className = 'list-row';
      var icon = a.category === 'Irrigation' ? '💧' : (a.category === 'Fertilizer' ? '🧪' : (a.category === 'Spraying' ? '🍃' : '📌'));
      var isCompleted = Boolean(a.completed || a.status === 'Completed');

      row.innerHTML =
        '<div class="list-row-main" style="' + (isCompleted ? 'opacity: 0.6; text-decoration: line-through;' : '') + '">' +
        '  <strong>' + icon + ' ' + a.name + (isCompleted ? ' <span class="badge badge-ok">Completed</span>' : '') + '</strong>' +
        '  <small>Date: <b>' + a.date + '</b> · Category: <span class="badge">' + a.category + '</span></small>' +
        (a.notes ? '  <small style="margin-top: 4px; color: #475a4d;">' + a.notes + '</small>' : '') +
        '</div>' +
        '<div style="display: flex; gap: 6px;">' +
        '  <button type="button" class="btn btn-secondary btn-sm" onclick="toggleActivity(' + idx + ')">' + (isCompleted ? '↺ Undo' : '✓ Done') + '</button>' +
        '  <button type="button" class="btn btn-danger btn-sm" onclick="deleteActivity(' + idx + ')">🗑️</button>' +
        '</div>';
      container.appendChild(row);
    });
  }

  async function handleAddActivitySubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var statusEl = $('actStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Scheduling activity…';
    }

    var newAct = {
      id: 'act_' + Date.now(),
      name: ($('actName') && $('actName').value.trim()) || 'Farm Task',
      category: ($('actCategory') && $('actCategory').value) || 'General',
      date: ($('actDate') && $('actDate').value) || new Date().toISOString().slice(0, 10),
      notes: ($('actNotes') && $('actNotes').value.trim()) || '',
      completed: false
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

  // Export module
  window.FarmActivities = {
    getSavedActivities: getSavedActivities,
    setSavedActivities: setSavedActivities,
    renderActivitiesList: renderActivitiesList,
    handleAddActivitySubmit: handleAddActivitySubmit,
    toggleActivity: toggleActivity,
    deleteActivity: deleteActivity
  };

  // Direct window bindings
  window.getSavedActivities = getSavedActivities;
  window.setSavedActivities = setSavedActivities;
  window.renderActivitiesList = renderActivitiesList;
  window.handleAddActivitySubmit = handleAddActivitySubmit;
  window.toggleActivity = toggleActivity;
  window.deleteActivity = deleteActivity;

})(window);
