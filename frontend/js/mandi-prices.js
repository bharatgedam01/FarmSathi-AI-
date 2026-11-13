// FarmSaathi AI — Mandi Market Prices Module
// Fetches from backend /api/mandi which proxies data.gov.in.
// data.gov.in does NOT send CORS headers, so browser-direct fetch is not possible.
// If Vercel server-side is blocked by NIC firewall, shows an honest diagnostic error.
// Never fakes or silently substitutes live prices.

(function(window) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  // -------------------------------------------------------------------------
  // Render table rows from records array
  // -------------------------------------------------------------------------
  function renderMandiTableRows(records) {
    var tbody = $('mandiTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px 16px;">No matching mandi price records found. Try clearing filters.</td></tr>';
      return;
    }

    records.forEach(function(r) {
      var tr = document.createElement('tr');
      var trendIcon  = r.trend === 'up' ? '↗ Rising' : (r.trend === 'down' ? '↘ Falling' : '→ Stable');
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
        '<td><b>🌾 ' + (r.crop || r.commodity || 'Produce') + '</b><br><small style="color:var(--muted);">' + (r.variety || 'Common / FAQ') + '</small></td>' +
        '<td><b>' + (r.market || 'APMC Market') + '</b></td>' +
        '<td>' + (r.state || 'India') + '<br><small style="color:var(--muted);">' + (r.district || '') + '</small></td>' +
        '<td><b style="font-size:15px;color:var(--deep);">₹' + Number(r.modal_price || 0).toLocaleString('en-IN') + '</b> <small>' + (r.unit || '₹/Qtl') + '</small></td>' +
        '<td>₹' + Number(r.min_price || 0).toLocaleString('en-IN') + ' – ₹' + Number(r.max_price || 0).toLocaleString('en-IN') + '</td>' +
        '<td style="font-weight:700;color:' + trendColor + ';">' + trendIcon + '</td>';
      tbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------------------
  // Main fetch function — called by UI buttons and on page load
  // -------------------------------------------------------------------------
  async function fetchMandiPrices(forceRefresh) {
    var queryInput  = $('mandiSearchQuery');
    var stateSelect = $('mandiStateFilter');
    var sortSelect  = $('mandiSortFilter');
    var refreshBtn  = $('btnRefreshMandi');

    var keyword     = queryInput  ? queryInput.value.trim().toLowerCase() : '';
    var stateFilter = stateSelect ? stateSelect.value.trim() : '';
    var sortVal     = (sortSelect && sortSelect.value !== 'date_desc') ? sortSelect.value : 'relevance';

    if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.textContent = '⏳ Loading…'; }

    var tbody = $('mandiTableBody');
    if (tbody && tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">Loading live Agmarknet mandi records…</td></tr>';
    }

    // Fetch from backend /api/mandi
    try {
      var queryParams = [];
      if (stateFilter && stateFilter !== 'all') queryParams.push('state=' + encodeURIComponent(stateFilter));
      if (keyword)      queryParams.push('q='     + encodeURIComponent(keyword));
      if (sortVal)      queryParams.push('sort='  + encodeURIComponent(sortVal));
      if (forceRefresh) queryParams.push('refresh=1');

      var endpoint = '/api/mandi' + (queryParams.length ? '?' + queryParams.join('&') : '');
      var res = await window.apiRequest(endpoint, 'GET');

      if (res && res.data && res.data.success && Array.isArray(res.data.records)) {
        renderMandiTableRows(res.data.records);

        var badge = $('badgeMandiSource');
        if (badge) {
          badge.textContent = res.data.isLive ? '⚡ Live Agmarknet' : 'Verified APMC Bulletins';
          badge.className   = res.data.isLive ? 'badge badge-ok' : 'badge';
        }

        var dateEl = $('mandiLatestDateText');
        if (dateEl && res.data.latestObservationDate) {
          dateEl.innerHTML = 'Latest Observation: <b>' + res.data.latestObservationDate + '</b>';
        }

        var srcEl = $('mandiSourceText');
        if (srcEl && res.data.source) { srcEl.textContent = '🏛️ Source: ' + res.data.source; }

        if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = '🔄 Refresh'; }
        return;
      }

      // Backend returned success:false — show honest error
      if (res && res.data && res.data.success === false) {
        var tbody2 = $('mandiTableBody');
        var msg = res.data.message || 'Live mandi price data is not available.';
        if (tbody2) {
          tbody2.innerHTML =
            '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted,#888);">' +
            '⚠️ ' + msg + '</td></tr>';
        }
        var badge2 = $('badgeMandiSource');
        if (badge2) { badge2.textContent = 'Live Data Unavailable'; badge2.className = 'badge'; }
        var srcEl2 = $('mandiSourceText');
        if (srcEl2) { srcEl2.textContent = ''; }
        if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = '🔄 Refresh'; }
        return;
      }

    } catch (e) {
      console.warn('[Mandi] Backend API error:', e.message);
    }

    // Both paths failed
    var tbodyFb = $('mandiTableBody');
    if (tbodyFb) {
      tbodyFb.innerHTML =
        '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted,#888);">' +
        '⚠️ Live mandi price data is currently unavailable. The server could not reach the government API. Please try again later.' +
        '</td></tr>';
    }
    var badgeFb = $('badgeMandiSource');
    if (badgeFb) { badgeFb.textContent = 'Data Unavailable'; badgeFb.className = 'badge'; }
    var srcFb = $('mandiSourceText');
    if (srcFb) { srcFb.textContent = ''; }
    if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = '🔄 Refresh'; }
  }

  // Export module
  window.MandiPrices = {
    fetchMandiPrices: fetchMandiPrices,
    renderMandiTableRows: renderMandiTableRows
  };
  window.fetchMandiPrices = fetchMandiPrices;

})(window);
