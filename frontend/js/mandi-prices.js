// FarmSaathi AI — Mandi Market Prices Module
// Connects to Government of India Agmarknet / data.gov.in verified feeds with caching, sorting, and authentic observation dates.

(function(window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function renderMandiTableRows(records) {
    var tbody = $('mandiTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 32px 16px;">No matching mandi price records found for the selected state/commodity filter. Try clearing filters.</td></tr>';
      return;
    }

    records.forEach(function(r) {
      var tr = document.createElement('tr');
      var trendIcon = r.trend === 'up' ? '↗ Rising' : (r.trend === 'down' ? '↘ Falling' : '→ Stable');
      var trendColor = r.trend === 'up' ? 'var(--green)' : (r.trend === 'down' ? 'var(--danger)' : 'var(--muted)');

      var rawDate = r.arrival_date || r.date || 'Recorded';
      var formattedDate = rawDate;
      if (rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        var d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }

      tr.innerHTML =
        '<td><b>🌾 ' + (r.crop || r.commodity || 'Produce') + '</b><br><small style="color: var(--muted);">' + (r.variety || 'Common / FAQ') + '</small></td>' +
        '<td><b>' + (r.market || 'APMC Market') + '</b></td>' +
        '<td>' + (r.state || 'India') + '<br><small style="color: var(--muted);">' + (r.district || '') + '</small></td>' +
        '<td><b style="font-size: 15px; color: var(--deep);">₹' + Number(r.modal_price || 0).toLocaleString('en-IN') + '</b> <small>' + (r.unit || '₹/Qtl') + '</small></td>' +
        '<td>₹' + Number(r.min_price || 0).toLocaleString('en-IN') + ' - ₹' + Number(r.max_price || 0).toLocaleString('en-IN') + '</td>' +
        '<td style="font-weight: 700; color: ' + trendColor + ';">' + trendIcon + '</td>';
      tbody.appendChild(tr);
    });
  }

  async function fetchMandiPrices(forceRefresh) {
    var queryInput = $('mandiSearchQuery');
    var stateSelect = $('mandiStateFilter');
    var sortSelect = $('mandiSortFilter');
    var refreshBtn = $('btnRefreshMandi');

    var q = queryInput ? queryInput.value.trim().toLowerCase() : '';
    var st = stateSelect ? stateSelect.value.trim() : '';
    var sort = (sortSelect && sortSelect.value !== 'date_desc') ? sortSelect.value : 'relevance';

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳ Loading…';
    }

    var tbody = $('mandiTableBody');
    if (tbody && tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 24px;">Loading verified APMC mandi records…</td></tr>';
    }

    // 1. Fetch from Backend REST API
    try {
      var queryParams = [];
      if (st && st !== 'all') queryParams.push('state=' + encodeURIComponent(st));
      if (q) queryParams.push('q=' + encodeURIComponent(q));
      if (sort) queryParams.push('sort=' + encodeURIComponent(sort));
      if (forceRefresh) queryParams.push('refresh=1');

      var endpoint = '/api/mandi' + (queryParams.length ? '?' + queryParams.join('&') : '');
      var res = await window.apiRequest(endpoint, 'GET');

      if (res && res.data && res.data.success && Array.isArray(res.data.records)) {
        renderMandiTableRows(res.data.records);

        var badge = $('badgeMandiSource');
        if (badge) {
          badge.textContent = res.data.live ? '⚡ Live Agmarknet Sync' : 'Verified APMC Bulletins';
          badge.className = res.data.live ? 'badge badge-ok' : 'badge';
        }

        var dateEl = $('mandiLatestDateText');
        if (dateEl && res.data.latest_date) {
          dateEl.innerHTML = 'Latest Observation: <b>' + res.data.latest_date + '</b>';
        }

        var srcEl = $('mandiSourceText');
        if (srcEl && res.data.source) {
          srcEl.textContent = '🏛️ Source: ' + res.data.source;
        }

        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.textContent = '🔄 Refresh';
        }
        return;
      }

      // Backend returned success: false — show honest "not available" message
      if (res && res.data && res.data.success === false) {
        var tbody2 = $('mandiTableBody');
        if (tbody2) {
          tbody2.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted,#888);">' +
            '⚠️ ' + (res.data.message || 'Live mandi price data is not available. Configure DATA_GOV_IN_API_KEY for real-time Agmarknet prices.') +
            '</td></tr>';
        }
        var badge2 = $('badgeMandiSource');
        if (badge2) { badge2.textContent = 'Data Unavailable'; badge2.className = 'badge'; }
        var srcEl2 = $('mandiSourceText');
        if (srcEl2) { srcEl2.textContent = ''; }
        if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = '🔄 Refresh'; }
        return;
      }
    } catch (e) {
      console.warn('Backend mandi API error:', e.message);
    }

    // Backend unreachable — show honest "not available" message, never serve old records as current prices
    var tbodyFallback = $('mandiTableBody');
    if (tbodyFallback) {
      tbodyFallback.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted,#888);">' +
        '⚠️ Live mandi price data is currently unavailable. The server could not be reached. Please check your internet connection and try again.' +
        '</td></tr>';
    }
    var badgeFb = $('badgeMandiSource');
    if (badgeFb) { badgeFb.textContent = 'Data Unavailable'; badgeFb.className = 'badge'; }
    var srcFb = $('mandiSourceText');
    if (srcFb) { srcFb.textContent = ''; }

    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 Refresh';
    }
  }

  // Export module
  window.MandiPrices = {
    fetchMandiPrices: fetchMandiPrices,
    renderMandiTableRows: renderMandiTableRows
  };

  // Direct window binding
  window.fetchMandiPrices = fetchMandiPrices;

})(window);
