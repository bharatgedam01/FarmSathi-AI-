// FarmSaathi AI — Crop Health Scanner & Image Analysis Module
// Handles leaf photo uploads, multimodal plant triage, structured diagnostic reports, and scan history.

(function(window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  var selectedImageFile = null;
  var selectedImageBase64 = null;
  var latestAnalysisReport = null;

  function handleFileSelect(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Photo size exceeds 10 MB. Please choose a smaller photo.');
      return;
    }

    selectedImageFile = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      selectedImageBase64 = e.target.result;
      if ($('imgPreview')) $('imgPreview').src = selectedImageBase64;
      if ($('previewContainer')) $('previewContainer').style.display = 'block';
      if ($('dropZone')) $('dropZone').style.display = 'none';
      if ($('btnRunAnalysis')) $('btnRunAnalysis').disabled = false;
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    selectedImageFile = null;
    selectedImageBase64 = null;
    if ($('fileInputCrop')) $('fileInputCrop').value = '';
    if ($('cameraInputCrop')) $('cameraInputCrop').value = '';
    if ($('previewContainer')) $('previewContainer').style.display = 'none';
    if ($('dropZone')) $('dropZone').style.display = 'block';
    if ($('btnRunAnalysis')) $('btnRunAnalysis').disabled = true;
  }

  function renderAnalysisReport(reportText, cropName, fileName, isDemo) {
    var area = $('reportContentArea');
    if (!area) return;

    latestAnalysisReport = {
      id: 'scan_' + Date.now(),
      crop: cropName || 'General Crop',
      file_name: fileName || 'leaf_sample.jpg',
      report: reportText,
      created_at: new Date().toISOString(),
      isDemo: Boolean(isDemo)
    };

    area.innerHTML =
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px;">' +
      '  <span class="badge ' + (isDemo ? 'badge-warn' : 'badge-ok') + '">' + (isDemo ? '🧪 Demo Triage' : '🔬 AI Vision Analyzed') + '</span>' +
      '  <small style="color: var(--muted);">' + new Date().toLocaleTimeString() + '</small>' +
      '</div>' +
      '<div style="white-space: pre-wrap; font-family: inherit; font-size: 13.5px; line-height: 1.6;">' +
      reportText.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</div>';

    if ($('btnSaveAnalysisReport')) $('btnSaveAnalysisReport').disabled = false;
  }

  async function handleVisionSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedImageBase64) {
      alert('Please select or capture a crop leaf photo first.');
      return;
    }

    var statusEl = $('visionStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show';
      statusEl.textContent = 'Analyzing crop photo with multimodal vision…';
    }

    var cropHint = ($('visionCropHint') && $('visionCropHint').value.trim()) || '';
    var fileName = selectedImageFile ? selectedImageFile.name : 'crop_leaf.jpg';
    var lang = (window.getLang && window.getLang()) || 'en';

    try {
      var res = await window.apiRequest('/api/analyze', 'POST', {
        image: selectedImageBase64,
        cropName: cropHint,
        fileName: fileName,
        language: lang
      });

      if (res.ok && res.data && res.data.report) {
        renderAnalysisReport(res.data.report, cropHint || res.data.crop || 'Crop Sample', fileName, false);
        if (statusEl) {
          statusEl.className = 'status-msg show ok';
          statusEl.textContent = 'Analysis complete ✓ Diagnostic recommendations generated.';
        }
        return;
      }
    } catch (err) {
      console.warn('Backend analyze API error, generating local agronomic triage:', err.message);
    }

    // Fallback autonomous triage
    var fallbackReport = window.getAutonomousCropTriage
      ? window.getAutonomousCropTriage(cropHint, lang, fileName)
      : 'Crop triage complete. Recommended: Apply Neem oil (1500 PPM) and consult your district KVK.';

    renderAnalysisReport(fallbackReport, cropHint || 'Crop Sample', fileName, true);
    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Autonomous plant triage generated ✓';
    }
  }

  function runDemoAnalysis() {
    var lang = (window.getLang && window.getLang()) || 'en';
    var demoReport = window.getAutonomousCropTriage
      ? window.getAutonomousCropTriage('Soybean (JS-335)', lang, 'demo_leaf_spot.jpg')
      : 'Demo plant triage report generated.';

    renderAnalysisReport(demoReport, 'Soybean (JS-335)', 'demo_leaf_spot.jpg', true);
    var statusEl = $('visionStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Demo triage report loaded ✓';
    }
  }

  // ============================================================================
  // ANALYSIS HISTORY MANAGEMENT
  // ============================================================================
  function getHistoryKey() {
    var user = window.AuthModule && window.AuthModule.getCurrentUser();
    return (user ? user.id + '_' : '') + 'scan_history';
  }

  function getSavedHistory() {
    return (window.AppStorage && window.AppStorage.get) ? window.AppStorage.get(getHistoryKey(), []) : [];
  }

  function setSavedHistory(hist) {
    if (window.AppStorage) {
      window.AppStorage.set(getHistoryKey(), hist);
    }
    if (window.updateDashboardCounts) {
      window.updateDashboardCounts();
    }
  }

  function renderHistoryList() {
    var container = $('historyListContainer');
    if (!container) return;
    container.innerHTML = '';
    var history = getSavedHistory();

    if (history.length === 0) {
      container.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 20px;">No scan history yet. Upload a photo in Farm Intelligence to generate your first report.</div>';
      return;
    }

    history.forEach(function(h, idx) {
      var row = document.createElement('div');
      row.className = 'list-row';
      var dateStr = new Date(h.created_at).toLocaleString();
      var previewText = (h.report || '').slice(0, 140) + '…';

      row.innerHTML =
        '<div class="list-row-main">' +
        '  <strong>📷 ' + (h.crop || 'Crop Scan') + (h.isDemo ? ' <span class="badge badge-warn">Demo</span>' : ' <span class="badge badge-ok">Verified</span>') + '</strong>' +
        '  <small>' + dateStr + ' · File: ' + (h.file_name || 'photo.jpg') + '</small>' +
        '  <small style="margin-top: 4px; color: #4b5d51;">' + previewText + '</small>' +
        '</div>' +
        '<div style="display: flex; gap: 8px;">' +
        '  <button type="button" class="btn btn-secondary btn-sm" onclick="openReportModal(' + idx + ')">🔍 View Full</button>' +
        '  <button type="button" class="btn btn-danger btn-sm" onclick="deleteHistoryItem(' + idx + ')">🗑️</button>' +
        '</div>';
      container.appendChild(row);
    });
  }

  async function saveCurrentAnalysis() {
    if (!latestAnalysisReport) {
      alert('No analysis report available to save.');
      return;
    }

    var history = getSavedHistory();
    history.unshift(latestAnalysisReport);
    setSavedHistory(history);
    renderHistoryList();

    var statusEl = $('visionStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Report saved to your analysis history ✓';
    }

    var user = window.AuthModule && window.AuthModule.getCurrentUser();

    // 1. Save to Supabase
    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id) {
      try {
        await window.SupabaseClient.saveAnalysis(user.id, latestAnalysisReport);
        if (statusEl) statusEl.textContent = 'Report saved & synced across cloud account ✓';
      } catch (sbErr) {
        console.warn('Supabase save report notice:', sbErr.message);
      }
    }

    // 2. Save to Backend
    if (window.isBackendConnected) {
      try {
        await window.apiRequest('/api/history', 'POST', latestAnalysisReport);
      } catch (beErr) {}
    }
  }

  function openReportModal(idx) {
    var history = getSavedHistory();
    var record = history[idx];
    if (!record) return;

    if ($('modalReportTitle')) $('modalReportTitle').textContent = '🌾 ' + (record.crop || 'Crop') + ' Health Report';
    if ($('modalReportContent')) $('modalReportContent').textContent = record.report;

    var modal = $('reportModal');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'grid';
    }
  }

  function closeReportModal() {
    var modal = $('reportModal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }

  async function deleteHistoryItem(idx) {
    var confirmText = (window.t && window.t('delete_confirm')) || 'Are you sure you want to delete this report?';
    if (confirm(confirmText)) {
      var history = getSavedHistory();
      var toDelete = history[idx];
      history.splice(idx, 1);
      setSavedHistory(history);
      renderHistoryList();

      var user = window.AuthModule && window.AuthModule.getCurrentUser();
      if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id && toDelete && toDelete.id) {
        try {
          await window.SupabaseClient.deleteAnalysis(user.id, toDelete.id);
        } catch (e) {}
      }

      if (window.isBackendConnected && toDelete && toDelete.id) {
        try {
          await window.apiRequest('/api/history/' + encodeURIComponent(toDelete.id), 'DELETE');
        } catch (e) {}
      }
    }
  }

  async function clearAllHistory() {
    if (confirm('Clear all saved crop scan history records?')) {
      setSavedHistory([]);
      renderHistoryList();

      var user = window.AuthModule && window.AuthModule.getCurrentUser();
      if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id) {
        try {
          await window.SupabaseClient.clearAllAnalyses(user.id);
        } catch (e) {}
      }

      if (window.isBackendConnected) {
        try {
          await window.apiRequest('/api/history', 'DELETE');
        } catch (e) {}
      }
    }
  }

  // Bind close on overlay click
  window.addEventListener('DOMContentLoaded', function() {
    var modal = $('reportModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeReportModal();
      });
    }
  });

  // Export module
  window.CropAnalysis = {
    handleFileSelect: handleFileSelect,
    removePhoto: removePhoto,
    handleVisionSubmit: handleVisionSubmit,
    runDemoAnalysis: runDemoAnalysis,
    saveCurrentAnalysis: saveCurrentAnalysis,
    getSavedHistory: getSavedHistory,
    setSavedHistory: setSavedHistory,
    renderHistoryList: renderHistoryList,
    openReportModal: openReportModal,
    closeReportModal: closeReportModal,
    deleteHistoryItem: deleteHistoryItem,
    clearAllHistory: clearAllHistory
  };

  // Direct window bindings
  window.handleFileSelect = handleFileSelect;
  window.removePhoto = removePhoto;
  window.handleVisionSubmit = handleVisionSubmit;
  window.runDemoAnalysis = runDemoAnalysis;
  window.saveCurrentAnalysis = saveCurrentAnalysis;
  window.openReportModal = openReportModal;
  window.closeReportModal = closeReportModal;
  window.deleteHistoryItem = deleteHistoryItem;
  window.clearAllHistory = clearAllHistory;
  window.renderHistoryList = renderHistoryList;

})(window);
