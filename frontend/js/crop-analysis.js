// FarmSaathi AI — Crop Health Scanner & Image Analysis Module
// Multimodal vision leaf analysis, persistent photo storage, thumbnail history, and triage reports.

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
    var validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
      alert('Please select a valid crop leaf photo (JPG, JPEG, PNG, or WEBP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('Photo size exceeds 15 MB. Please select a smaller photo or compress it.');
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

  function renderAnalysisReport(reportText, cropName, fileName, isDemo, imageUrl) {
    var area = $('reportContentArea');
    if (!area) return;

    latestAnalysisReport = {
      id: 'scan_' + Date.now(),
      crop: cropName || 'Identified Crop',
      file_name: fileName || (selectedImageFile ? selectedImageFile.name : 'crop_photo.jpg'),
      imageUrl: imageUrl || null,
      report: reportText,
      created_at: new Date().toISOString(),
      isDemo: Boolean(isDemo)
    };

    var imagePreviewHtml = '';
    if (imageUrl) {
      imagePreviewHtml =
        '<div style="margin-bottom: 14px; text-align: center; background: #fafcf8; padding: 10px; border-radius: 8px; border: 1px solid var(--line);">' +
        '  <img src="' + imageUrl + '" alt="' + (cropName || 'Leaf Photo') + '" style="max-height: 200px; max-width: 100%; border-radius: 6px; object-fit: contain; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">' +
        '</div>';
    }

    var badgeText = isDemo
      ? '<span class="badge badge-warn">🧪 Advisory / Unconfigured Mode</span>'
      : '<span class="badge badge-ok">🔬 Multimodal Vision AI Verified</span>';

    area.innerHTML =
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px;">' +
      '  ' + badgeText +
      '  <small style="color: var(--muted);">' + new Date().toLocaleTimeString() + '</small>' +
      '</div>' +
      imagePreviewHtml +
      '<div style="white-space: pre-wrap; font-family: inherit; font-size: 13.5px; line-height: 1.6; color: var(--text);">' +
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
      statusEl.textContent = 'Inspecting leaf pixels with vision AI model…';
    }

    var cropHint = ($('visionCropHint') && $('visionCropHint').value.trim()) || '';
    var fileName = selectedImageFile ? selectedImageFile.name : 'crop_leaf.jpg';
    var lang = (window.getLang && window.getLang()) || 'en';

    var savedImageUrl = null;
    var user = window.AuthModule && window.AuthModule.getCurrentUser();

    // 1. Try uploading to Supabase Storage if configured
    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id && selectedImageFile) {
      try {
        var sbUrl = await window.SupabaseClient.uploadCropPhoto(user.id, selectedImageFile, fileName);
        if (sbUrl) savedImageUrl = sbUrl;
      } catch (uploadErr) {
        console.warn('Supabase storage upload note:', uploadErr.message);
      }
    }

    try {
      var res = await window.apiRequest('/api/analyze', 'POST', {
        image: selectedImageBase64,
        cropName: cropHint,
        fileName: fileName,
        language: lang
      });

      if (res && res.data && res.data.report) {
        var backendImageUrl = res.data.imageUrl || savedImageUrl;
        var finalCrop = res.data.crop || cropHint || 'Identified Plant';
        var isUnconfigured = Boolean(res.data.missingConfig || res.data.mode === 'unconfigured');

        renderAnalysisReport(res.data.report, finalCrop, fileName, isUnconfigured, backendImageUrl);

        if (statusEl) {
          if (isUnconfigured) {
            statusEl.className = 'status-msg show warn';
            statusEl.textContent = 'Vision API key not set — setup instructions displayed above.';
          } else {
            statusEl.className = 'status-msg show ok';
            statusEl.textContent = 'Vision diagnosis completed successfully ✓';
          }
        }
        return;
      }
    } catch (err) {
      console.warn('Backend analyze API communication error:', err.message);
    }

    // Direct fallback report
    var fallbackReport =
      '⚠️ **Vision AI Service Unavailable**\n\n' +
      'Could not reach the vision AI model backend. Please ensure the server is running with `GEMINI_API_KEY` or `OPENAI_API_KEY` configured in `.env`.\n\n' +
      '**General Agricultural Advisory:**\n' +
      '• Observe symptoms: note whether lesions have yellow halos (often fungal) or water-soaked borders (bacterial).\n' +
      '• Remove and safely discard heavily infected plant leaves to prevent spore dispersion.\n' +
      '• Avoid overhead sprinkler irrigation during active leaf blights.\n' +
      '• Consult your local Krishi Vigyan Kendra (KVK) or call the toll-free Kisan Call Center at 1800-180-1551.';

    renderAnalysisReport(fallbackReport, cropHint || 'Crop Sample', fileName, true, savedImageUrl);
    if (statusEl) {
      statusEl.className = 'status-msg show warn';
      statusEl.textContent = 'Backend service unavailable. Please check server logs.';
    }
  }

  function runDemoAnalysis() {
    var lang = (window.getLang && window.getLang()) || 'en';
    var demoReport =
      '### 1. 🌾 Crop & Plant Part Identification\n' +
      '• Crop: **Soybean (Glycine max)**\n' +
      '• Affected Plant Part: Mid-canopy trifoliate leaves\n\n' +
      '### 2. 🔍 Observable Visual Symptoms\n' +
      '• Distinct small brown circular to angular necrotic spots on the leaf lamina with chlorotic yellow halos.\n' +
      '• No sign of mechanical feeding or chewing insect punctures.\n\n' +
      '### 3. 🔬 Diagnostic Assessment\n' +
      '• Primary Indication: **Target Spot / Cercospora Leaf Blight (Cercospora kikuchii / Corynespora cassiicola)**.\n' +
      '• Confidence Level: Moderate based on lesion morphology.\n\n' +
      '### 4. 🛡️ Recommended IPM Action Plan\n' +
      '• Biological Control: Spray Trichoderma viride or Pseudomonas fluorescens @ 5 g/litre.\n' +
      '• Cultural Care: Ensure optimal plant spacing and avoid water stagnation around roots.\n' +
      '• Chemical Option (if infection exceeds 10% canopy): Azoxystrobin + Difenoconazole or Pyraclostrobin following label instructions.\n' +
      '• Timing & Safety: Spray during calm morning hours with protective mask and gloves.';

    renderAnalysisReport(demoReport, 'Soybean (JS-335)', 'demo_leaf_sample.jpg', true, null);
    var statusEl = $('visionStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Reference agronomy triage report loaded ✓';
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
      container.innerHTML =
        '<div style="color: var(--muted); font-size: 13.5px; text-align: center; padding: 32px 16px;">' +
        '  <div style="font-size: 32px; margin-bottom: 8px;">📷</div>' +
        '  No scan history yet. Upload a leaf photo in Farm Intelligence to generate your first diagnostic report.' +
        '</div>';
      return;
    }

    history.forEach(function(h, idx) {
      var row = document.createElement('div');
      row.className = 'list-row';
      row.style.display = 'flex';
      row.style.gap = '14px';
      row.style.alignItems = 'center';

      var dateStr = new Date(h.created_at).toLocaleString();
      var previewText = (h.report || '').replace(/[#*`_]/g, '').slice(0, 130) + '…';

      var thumbHtml = '';
      if (h.imageUrl) {
        thumbHtml =
          '<div style="flex-shrink: 0; width: 68px; height: 68px; border-radius: 8px; overflow: hidden; background: #eef3eb; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center;">' +
          '  <img src="' + h.imageUrl + '" alt="' + (h.crop || 'Crop') + '" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null;this.parentElement.innerHTML=\'<span style=\\\'font-size: 26px;\\\'>🌿</span>\';">' +
          '</div>';
      } else {
        thumbHtml =
          '<div style="flex-shrink: 0; width: 68px; height: 68px; border-radius: 8px; background: #f0f5ee; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; font-size: 28px;">' +
          '  🌿' +
          '</div>';
      }

      var badge = h.isDemo
        ? '<span class="badge badge-warn">Demo / Advisory</span>'
        : '<span class="badge badge-ok">AI Vision Analyzed</span>';

      row.innerHTML =
        thumbHtml +
        '<div class="list-row-main" style="flex: 1; min-width: 0;">' +
        '  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' +
        '    <strong>' + (h.crop || 'Crop Scan') + '</strong>' +
        '    ' + badge +
        '  </div>' +
        '  <small style="color: var(--muted); margin-top: 3px; display: block;">' + dateStr + ' · File: ' + (h.file_name || 'photo.jpg') + '</small>' +
        '  <small style="margin-top: 4px; color: #4b5d51; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">' + previewText + '</small>' +
        '</div>' +
        '<div style="display: flex; gap: 8px; flex-shrink: 0;">' +
        '  <button type="button" class="btn btn-secondary btn-sm" onclick="openReportModal(' + idx + ')" title="View complete report and original photo">🔍 View Full</button>' +
        '  <button type="button" class="btn btn-danger btn-sm" onclick="deleteHistoryItem(' + idx + ')" title="Delete scan report">🗑️</button>' +
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
        if (statusEl) statusEl.textContent = 'Report and photo saved & synced across cloud account ✓';
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

    if ($('modalReportTitle')) {
      $('modalReportTitle').textContent = '🌾 ' + (record.crop || 'Crop') + ' Health Triage Report';
    }

    var imgContainer = $('modalReportImageContainer');
    var modalImg = $('modalReportImage');
    if (imgContainer && modalImg) {
      if (record.imageUrl) {
        modalImg.src = record.imageUrl;
        imgContainer.style.display = 'block';
      } else {
        imgContainer.style.display = 'none';
      }
    }

    if ($('modalReportContent')) {
      $('modalReportContent').textContent = record.report;
    }

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
    var history = getSavedHistory();
    var toDelete = history[idx];
    if (!toDelete) return;

    if (!confirm('Are you sure you want to delete this scan report for "' + (toDelete.crop || 'this crop') + '"?')) {
      return;
    }

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

  async function clearAllHistory() {
    if (!confirm('Are you sure you want to delete all saved crop scan history records?')) {
      return;
    }

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

  // Bind close on overlay backdrop click
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
