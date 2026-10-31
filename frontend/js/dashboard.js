// FarmSaathi AI — Dashboard Overview Module
// Manages KPI stat counters, quick agricultural question triggers, and hero banner actions.

(function(window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function updateDashboardCounts() {
    var crops = (window.getSavedCrops && window.getSavedCrops()) || [];
    var acts = (window.getSavedActivities && window.getSavedActivities()) || [];
    var hist = (window.getSavedHistory && window.getSavedHistory()) || [];

    if ($('statCropsCount')) $('statCropsCount').textContent = crops.length;
    if ($('statCropsFoot')) {
      $('statCropsFoot').textContent = crops.length === 0 ? 'No crops added yet' : (crops.length === 1 ? '1 saved crop' : crops.length + ' saved crops');
    }

    if ($('statActivitiesCount')) {
      var pending = acts.filter(function(a) { return !a.completed && a.status !== 'Completed'; });
      $('statActivitiesCount').textContent = pending.length;
    }
    if ($('statActivitiesFoot')) {
      var pendingActs = acts.filter(function(a) { return !a.completed && a.status !== 'Completed'; });
      $('statActivitiesFoot').textContent = pendingActs.length === 0 ? 'No pending tasks' : (pendingActs.length === 1 ? '1 task pending' : pendingActs.length + ' tasks pending');
    }

    if ($('statScansCount')) $('statScansCount').textContent = hist.length;
    if ($('statScansFoot')) {
      $('statScansFoot').textContent = hist.length === 0 ? 'No scans yet' : (hist.length === 1 ? '1 scan report' : hist.length + ' scan reports');
    }
  }

  function askQuickQuestion(questionText) {
    if (window.navigateTo) window.navigateTo('assistant');
    var input = $('chatInputText');
    if (input) {
      input.value = questionText;
      input.focus();
    }
  }

  // Export module
  window.DashboardModule = {
    updateDashboardCounts: updateDashboardCounts,
    askQuickQuestion: askQuickQuestion
  };

  // Direct window bindings
  window.updateDashboardCounts = updateDashboardCounts;
  window.askQuickQuestion = askQuickQuestion;

})(window);
