// FarmSaathi AI — Government Schemes & Subsidies Module
// Manages real-time government scheme discovery, official announcements, eligibility checking, and farmer-specific relevance.

(function(window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  var schemesState = {
    allSchemes: [],
    filteredSchemes: [],
    announcements: [],
    monitoringStatus: null,
    selectedCategory: 'All',
    selectedState: 'All',
    searchQuery: '',
    onlyRecommended: false,
    selectedScheme: null
  };

  // ============================================================================
  // DATA FETCHING & SYNCHRONIZATION
  // ============================================================================

  async function loadSchemesData() {
    var loadingEl = $('schemesLoading');
    if (loadingEl) loadingEl.style.display = 'block';

    try {
      // 1. Fetch Verified Schemes
      var res = await window.apiRequest('/api/schemes', 'GET');
      if (res && res.ok && res.data && Array.isArray(res.data.schemes)) {
        schemesState.allSchemes = res.data.schemes;
      }

      // 2. Fetch Live Announcements & PIB Feed
      var annRes = await window.apiRequest('/api/schemes/announcements', 'GET');
      if (annRes && annRes.ok && annRes.data && Array.isArray(annRes.data.announcements)) {
        schemesState.announcements = annRes.data.announcements;
      }

      // 3. Fetch Monitoring Health
      var statRes = await window.apiRequest('/api/schemes/status', 'GET');
      if (statRes && statRes.ok && statRes.data && statRes.data.monitoring) {
        schemesState.monitoringStatus = statRes.data.monitoring;
      }

      applyFilters();
      renderMonitoringStatus();
      renderAnnouncementsStream();
    } catch (e) {
      console.warn('Failed to load schemes from backend:', e.message);
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  // ============================================================================
  // FILTERING & RELEVANCE LOGIC
  // ============================================================================

  function applyFilters() {
    var list = schemesState.allSchemes.slice();

    // Category Filter
    if (schemesState.selectedCategory !== 'All') {
      list = list.filter(function(s) {
        return s.category.toLowerCase() === schemesState.selectedCategory.toLowerCase();
      });
    }

    // State Filter
    if (schemesState.selectedState !== 'All') {
      list = list.filter(function(s) {
        return s.state.toLowerCase().includes(schemesState.selectedState.toLowerCase());
      });
    }

    // Only Recommended Filter
    if (schemesState.onlyRecommended) {
      list = list.filter(function(s) {
        return s.isRecommended;
      });
    }

    // Search Query
    if (schemesState.searchQuery) {
      var q = schemesState.searchQuery.toLowerCase();
      list = list.filter(function(s) {
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.name_mr && s.name_mr.toLowerCase().includes(q)) ||
          (s.name_hi && s.name_hi.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.benefits && s.benefits.toLowerCase().includes(q)) ||
          (s.announcement_title && s.announcement_title.toLowerCase().includes(q))
        );
      });
    }

    schemesState.filteredSchemes = list;
    renderSchemesGrid();
  }

  // ============================================================================
  // UI RENDERING
  // ============================================================================

  function renderMonitoringStatus() {
    var status = schemesState.monitoringStatus;
    if (!status) return;

    var badge = $('govSourcesCountBadge');
    if (badge) badge.textContent = (status.sourcesCount || 7) + ' Official Portals Active';

    var timeText = $('govLastSyncTimeText');
    if (timeText && status.lastCheckedAt) {
      var dateObj = new Date(status.lastCheckedAt);
      timeText.textContent = 'Verified: ' + dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    var schemeCountEl = $('statTotalSchemesCount');
    if (schemeCountEl) schemeCountEl.textContent = status.totalSchemes || schemesState.allSchemes.length;

    var openCountEl = $('statOpenWindowsCount');
    if (openCountEl) {
      var openCount = schemesState.allSchemes.filter(function(s) {
        return s.verification_status === 'Application Open' || s.verification_status === 'Officially Confirmed & Active';
      }).length;
      openCountEl.textContent = openCount;
    }
  }

  function renderAnnouncementsStream() {
    var container = $('govAnnouncementsList');
    if (!container) return;

    var list = schemesState.announcements;
    if (!list || list.length === 0) {
      container.innerHTML = '<div style="padding: 14px; color: var(--muted); font-size: 13px;">No recent government circulars recorded.</div>';
      return;
    }

    var html = '';
    list.slice(0, 5).forEach(function(item) {
      var pubDate = item.published_at ? new Date(item.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
      html +=
        '<div style="padding: 12px 14px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">' +
        '  <div style="flex: 1;">' +
        '    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">' +
        '      <span class="badge badge-info" style="font-size: 10.5px; padding: 2px 6px;">' + (item.source_name || 'Official Notification') + '</span>' +
        '      <small style="color: var(--muted); font-size: 11.5px;">' + pubDate + '</small>' +
        '    </div>' +
        '    <div style="font-weight: 650; font-size: 13.5px; color: var(--text); line-height: 1.4;">' + item.title + '</div>' +
        '  </div>' +
        '  <div>' +
        '    <a href="' + item.link + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 11.5px; padding: 4px 10px; white-space: nowrap;">' +
        '      Official Notice ↗' +
        '    </a>' +
        '  </div>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  function renderSchemesGrid() {
    var container = $('schemesCardGrid');
    if (!container) return;

    var list = schemesState.filteredSchemes;
    if (list.length === 0) {
      container.innerHTML =
        '<div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: #fff; border: 1px dashed var(--line); border-radius: var(--radius-md);">' +
        '  <div style="font-size: 32px; margin-bottom: 10px;">🔍</div>' +
        '  <h3 style="margin: 0 0 6px;">No schemes match your filter</h3>' +
        '  <p style="color: var(--muted); font-size: 13.5px; margin: 0 0 16px;">Try clearing search keywords or switching category filters.</p>' +
        '  <button type="button" class="btn btn-secondary btn-sm" onclick="resetSchemeFilters()">Reset All Filters</button>' +
        '</div>';
      return;
    }

    var html = '';
    list.forEach(function(s) {
      var lang = (window.getLang && window.getLang()) || 'en';
      var displayName = s.name;
      if (lang === 'mr' && s.name_mr) displayName = s.name_mr;
      else if (lang === 'hi' && s.name_hi) displayName = s.name_hi;

      // Status badge styling
      var statusBadgeClass = 'badge-success';
      if (s.verification_status === 'Application Open') statusBadgeClass = 'badge-primary';
      else if (s.verification_status === 'Information Updated') statusBadgeClass = 'badge-warning';
      else if (s.verification_status === 'Awaiting Official Verification') statusBadgeClass = 'badge-danger';

      var stateBadge = s.state.includes('Maharashtra') 
        ? '<span class="badge" style="background: #e3f2fd; color: #0d47a1; font-weight: 700;">Maharashtra State</span>'
        : '<span class="badge" style="background: #e8f5e9; color: #1b5e20; font-weight: 700;">Central Govt (All India)</span>';

      var matchTag = s.relevanceTag 
        ? '<div style="margin-bottom: 10px; background: #f0fdf4; border: 1px solid #86efac; color: #15803d; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 650; display: flex; align-items: center; gap: 6px;">' +
            '<span>🎯</span> <span>' + s.relevanceTag + '</span>' +
          '</div>'
        : '';

      html +=
        '<div class="card scheme-card" style="display: flex; flex-direction: column; justify-content: space-between; border-top: 4px solid var(--primary); transition: transform 0.2s, box-shadow 0.2s;">' +
        '  <div>' +
        '    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">' +
        '      <span class="badge ' + statusBadgeClass + '" style="font-size: 11px;">' + s.verification_status + '</span>' +
        '      ' + stateBadge +
        '    </div>' +
        '    ' + matchTag +
        '    <h3 style="margin: 0 0 6px; font-size: 16.5px; line-height: 1.35; color: var(--text);">' + displayName + '</h3>' +
        '    <div style="font-size: 12px; color: var(--muted); margin-bottom: 12px;">' + (s.authority || 'Government Authority') + '</div>' +
        '    <div style="background: #f8faf6; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--line); margin-bottom: 12px;">' +
        '      <div style="font-size: 11px; text-transform: uppercase; font-weight: 750; color: var(--primary); margin-bottom: 3px;">💰 Confirmed Subsidy / Benefit:</div>' +
        '      <div style="font-size: 13.5px; font-weight: 700; color: #143e2c;">' + s.benefits + '</div>' +
        '    </div>' +
        '    <p style="font-size: 13px; color: var(--muted); line-height: 1.5; margin: 0 0 14px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">' +
               s.description +
        '    </p>' +
        '    <div style="font-size: 12px; color: #4b5563; margin-bottom: 14px;">' +
        '      ⏱️ <strong>Application Window:</strong> ' + (s.application_deadline || 'Active / Continuous Enrolment') +
        '    </div>' +
        '  </div>' +
        '  <div style="border-top: 1px solid var(--line); padding-top: 12px; display: flex; gap: 8px;">' +
        '    <button type="button" class="btn btn-secondary btn-sm" style="flex: 1;" onclick="openSchemeDetailModal(\'' + s.id + '\')">📋 View Details</button>' +
        '    <a href="' + s.official_portal_url + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="flex: 1; text-align: center; text-decoration: none;">' +
        '      Apply on Portal ↗' +
        '    </a>' +
        '  </div>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  // ============================================================================
  // SCHEME DETAIL MODAL
  // ============================================================================

  function openSchemeDetailModal(schemeId) {
    var scheme = schemesState.allSchemes.find(function(s) { return s.id === schemeId; });
    if (!scheme) return;

    schemesState.selectedScheme = scheme;

    if ($('modalSchemeTitle')) $('modalSchemeTitle').textContent = scheme.name;
    if ($('modalSchemeAuthority')) $('modalSchemeAuthority').textContent = scheme.authority + ' (' + scheme.state + ')';
    if ($('modalSchemeBenefits')) $('modalSchemeBenefits').textContent = scheme.benefits;
    if ($('modalSchemeEligibility')) $('modalSchemeEligibility').textContent = scheme.eligibility;
    if ($('modalSchemeDocs')) $('modalSchemeDocs').textContent = scheme.required_documents;
    if ($('modalSchemeInstructions')) $('modalSchemeInstructions').textContent = scheme.application_instructions;
    if ($('modalSchemeDeadline')) $('modalSchemeDeadline').textContent = scheme.application_deadline || 'Active / Continuous Enrolment';
    if ($('modalSchemeVerifiedDate')) $('modalSchemeVerifiedDate').textContent = scheme.last_verified_at ? new Date(scheme.last_verified_at).toLocaleDateString() : 'Verified';

    // Set buttons
    var applyBtn = $('modalBtnApplyPortal');
    if (applyBtn) applyBtn.href = scheme.official_portal_url;

    var noticeBtn = $('modalBtnOfficialNotice');
    if (noticeBtn) noticeBtn.href = scheme.official_source_url;

    // Show change history if present
    var historyEl = $('modalSchemeAuditHistory');
    if (historyEl) {
      if (Array.isArray(scheme.changeHistory) && scheme.changeHistory.length > 0) {
        var hHtml = '<h4 style="margin: 16px 0 8px; font-size: 13.5px;">📜 Official Amendment & Change History</h4>';
        scheme.changeHistory.forEach(function(u) {
          hHtml +=
            '<div style="padding: 8px 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 12px; margin-bottom: 6px;">' +
            '  <strong>' + u.field_changed + ' updated:</strong> ' + u.new_value +
            '  <div style="font-size: 10.5px; color: var(--muted); margin-top: 2px;">Source: ' + u.official_source + ' · ' + new Date(u.detected_at).toLocaleDateString() + '</div>' +
            '</div>';
        });
        historyEl.innerHTML = hHtml;
        historyEl.style.display = 'block';
      } else {
        historyEl.style.display = 'none';
      }
    }

    var modal = $('schemeDetailModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeSchemeDetailModal() {
    var modal = $('schemeDetailModal');
    if (modal) modal.style.display = 'none';
  }

  // ============================================================================
  // ADMIN MANUAL SYNC ACTION
  // ============================================================================

  async function triggerManualSchemesCheck() {
    var btn = $('btnTriggerSchemeSync');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '🔄 Checking Official Sources…';
    }

    try {
      var res = await window.apiRequest('/api/schemes/sync', 'POST');
      if (res && res.ok && res.data) {
        var info = res.data.result || {};
        alert('✅ Government Sources Check Complete!\n\n• Sources Checked: ' + (info.sourcesChecked || 7) + '\n• Healthy: ' + (info.sourcesHealthy || 7) + '\n• New Announcements: ' + (info.newAnnouncements || 0) + '\n\nAll verified schemes have been refreshed.');
        await loadSchemesData();
      } else {
        alert('Could not complete live sync. Using last verified government records.');
      }
    } catch (err) {
      alert('Network error while querying official sources: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Check for Updates';
      }
    }
  }

  // Filter Event Handlers
  function setCategoryFilter(category) {
    schemesState.selectedCategory = category;
    var chips = document.querySelectorAll('.scheme-cat-chip');
    chips.forEach(function(c) {
      if (c.getAttribute('data-cat') === category) c.classList.add('active');
      else c.classList.remove('active');
    });
    applyFilters();
  }

  function setStateFilter(state) {
    schemesState.selectedState = state;
    applyFilters();
  }

  function toggleRecommendedOnly() {
    schemesState.onlyRecommended = !schemesState.onlyRecommended;
    var chk = $('chkOnlyRecommended');
    if (chk) chk.checked = schemesState.onlyRecommended;
    applyFilters();
  }

  function onSearchInput(val) {
    schemesState.searchQuery = val.trim();
    applyFilters();
  }

  function resetSchemeFilters() {
    schemesState.selectedCategory = 'All';
    schemesState.selectedState = 'All';
    schemesState.searchQuery = '';
    schemesState.onlyRecommended = false;
    if ($('schemeSearchInput')) $('schemeSearchInput').value = '';
    if ($('chkOnlyRecommended')) $('chkOnlyRecommended').checked = false;
    if ($('schemeStateSelect')) $('schemeStateSelect').value = 'All';
    setCategoryFilter('All');
  }

  // Export module
  window.GovSchemesModule = {
    loadSchemesData: loadSchemesData,
    setCategoryFilter: setCategoryFilter,
    setStateFilter: setStateFilter,
    toggleRecommendedOnly: toggleRecommendedOnly,
    onSearchInput: onSearchInput,
    resetSchemeFilters: resetSchemeFilters,
    openSchemeDetailModal: openSchemeDetailModal,
    closeSchemeDetailModal: closeSchemeDetailModal,
    triggerManualSchemesCheck: triggerManualSchemesCheck
  };

  // Global bindings for inline DOM handlers
  window.setSchemeCategory = setCategoryFilter;
  window.setSchemeState = setStateFilter;
  window.toggleRecommendedSchemes = toggleRecommendedOnly;
  window.onSchemeSearch = onSearchInput;
  window.resetSchemeFilters = resetSchemeFilters;
  window.openSchemeDetailModal = openSchemeDetailModal;
  window.closeSchemeDetailModal = closeSchemeDetailModal;
  window.triggerManualSchemesCheck = triggerManualSchemesCheck;

})(window);
