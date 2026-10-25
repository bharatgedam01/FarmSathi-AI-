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
    if ($('statActivitiesCount')) $('statActivitiesCount').textContent = acts.length;
    if ($('statScansCount')) $('statScansCount').textContent = hist.length;
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
