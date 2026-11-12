// FarmSaathi AI — All India Agricultural Weather Module v2
// GPS + All-India city search via Open-Meteo Geocoding API (no key required).
// Map, cascading dropdowns, and village directory REMOVED per user request.
// Strict rules:
// - Zero fabricated fallback temperatures.
// - Zero default city substitutions (no silent Gadchiroli/Pune assumptions).
// - Transparent model labeling, timestamps, and farmer agronomic advisories.
// - NWP disclaimer always visible.

(function(window) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  // State variables
  var searchDebounceTimer = null;
  var currentLat = null;
  var currentLon = null;
  var currentLocationName = '';

  // WMO Weather code metadata
  var WEATHER_CODES = {
    0: { label: 'Clear Sky / Sunny', icon: '☀️' },
    1: { label: 'Mainly Clear', icon: '🌤️' },
    2: { label: 'Partly Cloudy', icon: '⛅' },
    3: { label: 'Overcast', icon: '☁️' },
    45: { label: 'Foggy / Mist', icon: '🌫️' },
    48: { label: 'Depositing Rime Fog', icon: '🌫️' },
    51: { label: 'Light Drizzle', icon: '🌦️' },
    53: { label: 'Moderate Drizzle', icon: '🌧️' },
    55: { label: 'Dense Drizzle', icon: '🌧️' },
    56: { label: 'Freezing Drizzle', icon: '🌨️' },
    57: { label: 'Dense Freezing Drizzle', icon: '🌨️' },
    61: { label: 'Slight Rain', icon: '🌦️' },
    63: { label: 'Moderate Rain', icon: '🌧️' },
    65: { label: 'Heavy Rain', icon: '⛈️' },
    66: { label: 'Freezing Rain', icon: '🌨️' },
    67: { label: 'Heavy Freezing Rain', icon: '🌨️' },
    71: { label: 'Light Snow', icon: '🌨️' },
    73: { label: 'Moderate Snow', icon: '❄️' },
    75: { label: 'Heavy Snow', icon: '❄️' },
    77: { label: 'Snow Grains', icon: '❄️' },
    80: { label: 'Passing Rain Showers', icon: '🌦️' },
    81: { label: 'Moderate Rain Showers', icon: '🌧️' },
    82: { label: 'Violent Rain Showers', icon: '⛈️' },
    85: { label: 'Light Snow Showers', icon: '🌨️' },
    86: { label: 'Heavy Snow Showers', icon: '❄️' },
    95: { label: 'Thunderstorm', icon: '⛈️' },
    96: { label: 'Thunderstorm with Hail', icon: '⛈️' },
    99: { label: 'Severe Thunderstorm with Hail', icon: '⛈️' }
  };

  // ---------------------------------------------------------------------------
  // 1. ALL-INDIA CITY SEARCH (Open-Meteo Geocoding API via backend proxy)
  // ---------------------------------------------------------------------------
  function initCitySearch() {
    var input = $('weatherCitySearch');
    var resultsBox = $('weatherCityResults');
    if (!input || !resultsBox) return;

    input.addEventListener('input', function() {
      var query = input.value.trim();
      clearTimeout(searchDebounceTimer);

      if (query.length < 2) {
        resultsBox.innerHTML = '';
        resultsBox.classList.remove('show');
        return;
      }

      searchDebounceTimer = setTimeout(async function() {
        try {
          var res = await window.apiRequest('/api/geocode?q=' + encodeURIComponent(query) + '&limit=8', 'GET');
          if (res.ok && res.data && res.data.results && res.data.results.length > 0) {
            renderCityResults(res.data.results, resultsBox, input);
          } else {
            resultsBox.innerHTML = '<div style="padding: 10px 14px; font-size: 12px; color: var(--muted);">No cities found for "' + query + '". Try a different spelling or city name.</div>';
            resultsBox.classList.add('show');
          }
        } catch (err) {
          // Ignore transient search error — don't block user
          console.warn('[Weather] City search error:', err.message);
        }
      }, 300);
    });

    // Enter key submits first result or lat,lon
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var firstItem = resultsBox.querySelector('.weather-autocomplete-item');
        if (firstItem) firstItem.click();
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !resultsBox.contains(e.target)) {
        resultsBox.classList.remove('show');
      }
    });
  }

  function renderCityResults(results, resultsBox, input) {
    resultsBox.innerHTML = '';

    results.forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'weather-autocomplete-item';

      // Show: "City · State, Country" or just Indian info
      var subParts = [];
      if (item.admin2 && item.admin2 !== item.name) subParts.push(item.admin2);
      if (item.admin1 && item.admin1 !== item.name) subParts.push(item.admin1);
      if (item.country_code !== 'IN' && item.country) subParts.push(item.country);
      var latLonStr = item.lat.toFixed(3) + '°N, ' + item.lon.toFixed(3) + '°E';

      div.innerHTML =
        '<div><strong>' + item.name + '</strong></div>' +
        '<small style="color: var(--muted);">' + (subParts.join(', ') || item.country || '') + ' · ' + latLonStr + '</small>';

      div.addEventListener('click', function() {
        resultsBox.classList.remove('show');
        input.value = item.display || (item.name + (item.admin1 ? ', ' + item.admin1 : ''));

        currentLat = item.lat;
        currentLon = item.lon;
        currentLocationName = item.display || item.name;

        fetchWeatherByCoords(currentLat, currentLon, currentLocationName);
      });

      resultsBox.appendChild(div);
    });

    resultsBox.classList.add('show');
  }

  // Search button handler
  async function handleWeatherSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    var input = $('weatherCitySearch');
    var val = (input && input.value.trim()) || '';
    if (!val) {
      showStatus('Please enter a city or location name to search.', 'error');
      return;
    }

    // Check if input is "lat, lon"
    if (val.includes(',')) {
      var parts = val.split(',');
      if (parts.length === 2 && !isNaN(parts[0].trim()) && !isNaN(parts[1].trim())) {
        var lat = parseFloat(parts[0].trim());
        var lon = parseFloat(parts[1].trim());
        fetchWeatherByCoords(lat, lon, 'Coordinates ' + lat.toFixed(3) + '°N, ' + lon.toFixed(3) + '°E');
        return;
      }
    }

    showStatus('Searching for "' + val + '" across Indian cities…', 'info');
    try {
      var res = await window.apiRequest('/api/geocode?q=' + encodeURIComponent(val) + '&limit=1', 'GET');
      if (res.ok && res.data && res.data.results && res.data.results.length > 0) {
        var match = res.data.results[0];
        currentLat = match.lat;
        currentLon = match.lon;
        currentLocationName = match.display || match.name;
        if (input) input.value = currentLocationName;
        fetchWeatherByCoords(currentLat, currentLon, currentLocationName);
      } else {
        showStatus('⚠️ Location "' + val + '" not found. Try a district or city name. Example: Nagpur, Pune, Ludhiana.', 'error');
      }
    } catch (err) {
      showStatus('⚠️ City search failed: ' + err.message, 'error');
    }
  }

  // Quick city select from optional quick-select dropdown
  function onQuickCitySelect(cityName) {
    if (!cityName) return;
    var input = $('weatherCitySearch');
    if (input) input.value = cityName;
    handleWeatherSearch();
  }

  // ---------------------------------------------------------------------------
  // 2. LIVE GPS LOCATION WORKFLOW
  // ---------------------------------------------------------------------------
  function getWeatherByGps() {
    var gpsBtn = $('btnWeatherGps');
    var gpsAccuracyBadge = $('weatherGpsAccuracyBadge');

    if (!navigator.geolocation) {
      showStatus('⚠️ Geolocation is not supported by your browser. Please search for your city using the search box above.', 'error');
      return;
    }

    if (gpsBtn) {
      gpsBtn.disabled = true;
      gpsBtn.innerHTML = '⏳ Reading GPS…';
    }
    showStatus('Requesting device GPS coordinates with high accuracy…', 'info');

    navigator.geolocation.getCurrentPosition(
      async function(pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        var accuracyMeters = Math.round(pos.coords.accuracy || 0);

        if (gpsBtn) {
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = '📍 Use My Live Location (GPS)';
        }

        if (gpsAccuracyBadge) {
          gpsAccuracyBadge.style.display = 'inline-block';
          gpsAccuracyBadge.textContent = '📍 GPS Active (±' + accuracyMeters + 'm)';
          gpsAccuracyBadge.style.background = accuracyMeters < 50 ? '#e8f5e9' : '#fff3e0';
          gpsAccuracyBadge.style.color = accuracyMeters < 50 ? '#1b5e20' : '#e65100';
        }

        currentLat = lat;
        currentLon = lon;

        showStatus('GPS acquired [' + lat.toFixed(4) + '°N, ' + lon.toFixed(4) + '°E · ±' + accuracyMeters + 'm]. Fetching forecast…', 'info');

        // Try to resolve location name via Open-Meteo geocoding (reverse lookup by coords via /api/location)
        var identifiedName = 'GPS Location (' + lat.toFixed(4) + '°N, ' + lon.toFixed(4) + '°E)';
        try {
          var rev = await window.apiRequest('/api/location?action=reverse&lat=' + lat + '&lon=' + lon, 'GET');
          if (rev.ok && rev.data && rev.data.success) {
            var info = rev.data;
            identifiedName = info.name +
              (info.taluka ? ', ' + info.taluka : '') +
              (info.district ? ', ' + info.district : '') +
              (info.state ? ', ' + info.state : '');
            if (info.isApproximate) identifiedName += ' (Nearest)';
          }
        } catch (e) {
          // Keep coordinates-based name if reverse geocode fails
        }

        currentLocationName = identifiedName;
        var input = $('weatherCitySearch');
        if (input) input.value = identifiedName;

        fetchWeatherByCoords(lat, lon, identifiedName, true);
      },
      function(err) {
        if (gpsBtn) {
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = '📍 Use My Live Location (GPS)';
        }
        var msg;
        if (err.code === 1) {
          msg = '📍 Location permission denied. Please allow location access in your browser, or search for your city in the box above.';
        } else if (err.code === 2) {
          msg = '📍 GPS signal unavailable. Please ensure device location is enabled, or search for your city above.';
        } else if (err.code === 3) {
          msg = '📍 GPS request timed out. Please retry, or search for your city above.';
        } else {
          msg = '📍 Could not acquire GPS position. Please search for your city above.';
        }
        showStatus(msg, 'error');
        // STRICT RULE: DO NOT DEFAULT TO PUNE, GADCHIROLI OR ANY HARDCODED CITY.
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 3. FETCH WEATHER BY COORDINATES (via backend → Open-Meteo Forecast API)
  // ---------------------------------------------------------------------------
  async function fetchWeatherByCoords(lat, lon, label, isGps) {
    if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
      showStatus('Valid coordinates are required to fetch weather. Please use GPS or search for your city.', 'error');
      return;
    }

    showStatus('Pulling high-resolution forecast from Open-Meteo NWP models…', 'info');

    try {
      var queryParams = [
        'lat=' + encodeURIComponent(lat),
        'lon=' + encodeURIComponent(lon),
        'city=' + encodeURIComponent(label || 'Farm Location'),
        'isGps=' + (isGps ? 'true' : 'false')
      ].join('&');

      var res = await window.apiRequest('/api/weather?' + queryParams, 'GET');

      if (res.ok && res.data && res.data.success) {
        renderWeatherDisplay(res.data);
        showStatus('✓ Forecast updated for ' + (res.data.location ? res.data.location.name : label), 'ok');
      } else {
        var errMsg = (res.data && res.data.error) || 'Failed to fetch meteorological forecast.';
        showStatus('⚠️ Weather Service Error: ' + errMsg + ' — Please retry.', 'error');
      }
    } catch (err) {
      showStatus('⚠️ Network error: ' + err.message + '. Please check your connection and retry.', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // 4. RENDER FULL WEATHER DISPLAY
  // ---------------------------------------------------------------------------
  function renderWeatherDisplay(data) {
    var cur = data.current;
    var loc = data.location || {};
    var model = data.model_info || {};
    var daily = data.daily || [];
    var hourly = data.hourly || [];
    var advisories = data.advisories || [];

    // Header & Location Info
    if ($('wTemp')) $('wTemp').textContent = Math.round(cur.temperature) + '°C';
    if ($('wLocation')) $('wLocation').textContent = loc.name || 'Selected Location';
    if ($('wCondition')) $('wCondition').textContent = cur.condition + ' (' + cur.description + ')';
    if ($('wIcon')) $('wIcon').textContent = cur.icon || '🌤️';

    // Lat/Lon & Elevation
    if ($('wCoords')) {
      var elevStr = loc.elevation_meters ? ' · Elevation: ' + loc.elevation_meters + 'm' : '';
      $('wCoords').textContent = 'Coordinates: ' + loc.lat.toFixed(4) + '°N, ' + loc.lon.toFixed(4) + '°E' + elevStr;
    }

    // Agro-Meteorology Stats Grid
    if ($('wFeelsLike')) $('wFeelsLike').textContent = Math.round(cur.feels_like) + '°C';
    if ($('wHumidity')) $('wHumidity').textContent = cur.humidity + '%';
    if ($('wWind')) $('wWind').textContent = cur.wind_speed.toFixed(1) + ' km/h (' + cur.wind_direction_compass + ')';
    if ($('wGusts')) $('wGusts').textContent = cur.wind_gusts ? cur.wind_gusts.toFixed(1) + ' km/h' : '--';
    if ($('wCloudCover')) $('wCloudCover').textContent = cur.cloud_cover + '%';
    if ($('wPressure')) $('wPressure').textContent = cur.pressure_msl ? Math.round(cur.pressure_msl) + ' hPa' : '--';

    // Precipitation & Rain Probability
    var todayRainProb = (daily.length > 0 && daily[0].precipitation_probability_max) || 0;
    if ($('wPrecip')) {
      $('wPrecip').textContent = (cur.precipitation || 0) + ' mm / ' + todayRainProb + '%';
    }

    // Temperature Range (Max/Min today)
    if ($('wTempRange') && daily.length > 0) {
      $('wTempRange').textContent = Math.round(daily[0].temp_max) + '° / ' + Math.round(daily[0].temp_min) + '°C';
    }

    // Sunrise & Sunset
    if ($('wSunTimes') && daily.length > 0 && daily[0].sunrise) {
      var sunriseTime = daily[0].sunrise.slice(11, 16);
      var sunsetTime = daily[0].sunset.slice(11, 16);
      $('wSunTimes').textContent = sunriseTime + ' / ' + sunsetTime;
    }

    // Update Dashboard Overview Quick Stat
    if ($('statTemp')) {
      $('statTemp').textContent = Math.round(cur.temperature) + '°C';
    }

    // Pressure (optional field)
    if ($('wPressure')) $('wPressure').textContent = cur.pressure_msl ? Math.round(cur.pressure_msl) + ' hPa' : '--';

    // Badges & Transparency
    var badgeState = $('weatherBadgeState');
    if (badgeState) {
      badgeState.textContent = data.isLive ? 'Live NWP Synced ✓' : (data.isCached ? 'Cached (' + (data.cacheAgeSeconds || 0) + 's ago)' : 'Model Forecast');
      badgeState.className = data.isLive ? 'badge badge-ok' : 'badge badge-warn';
    }

    var badgeModel = $('weatherBadgeModel');
    if (badgeModel && model.provider) {
      badgeModel.textContent = model.provider;
    }

    if ($('wModelUpdated') && model.observation_updated_at) {
      $('wModelUpdated').textContent = model.observation_updated_at;
    }
    if ($('wGridRes') && model.grid_resolution_km) {
      $('wGridRes').textContent = model.grid_resolution_km;
    }

    // Observation timestamp from API
    if ($('wObservedTime') && cur.observed_time) {
      $('wObservedTime').textContent = cur.observed_time + ' IST';
    }

    // Last fetched wall clock time (local)
    if ($('wLastFetched')) {
      $('wLastFetched').textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' (device time)';
    }

    // Render Agronomic Advisories
    renderAgroAdvisories(advisories);

    // Render 24-Hour Hourly Weather Carousel
    renderHourlyForecast(hourly);

    // Render 7-Day Precision Agricultural Forecast
    renderDailyForecast(daily);
  }

  function renderAgroAdvisories(advisories) {
    var container = $('weatherAdvisoriesContainer');
    if (!container) return;

    if (!advisories || advisories.length === 0) {
      container.innerHTML = '<div style="font-size: 12px; color: var(--muted); padding: 8px;">No critical weather advisories at this time. Standard seasonal practices apply.</div>';
      return;
    }

    container.innerHTML = '';
    advisories.forEach(function(adv) {
      var card = document.createElement('div');
      card.className = 'agro-advisory-card ' + (adv.type || 'info');
      card.innerHTML =
        '<div class="agro-advisory-icon">' + (adv.icon || '🌾') + '</div>' +
        '<div>' +
        '  <strong style="display: block; font-size: 13px; color: var(--text); margin-bottom: 2px;">' + adv.title + '</strong>' +
        '  <span style="color: #444; line-height: 1.4;">' + adv.message + '</span>' +
        '</div>';
      container.appendChild(card);
    });
  }

  function renderHourlyForecast(hourly) {
    var track = $('hourlyForecastTrack');
    if (!track) return;

    track.innerHTML = '';
    if (!hourly || hourly.length === 0) {
      track.innerHTML = '<div style="font-size: 12px; color: var(--muted); padding: 8px;">Hourly breakdown unavailable.</div>';
      return;
    }

    hourly.forEach(function(h) {
      var hourStr = h.time ? h.time.slice(11, 16) : '--:--';
      var card = document.createElement('div');
      card.className = 'hourly-card';
      card.innerHTML =
        '<div class="hour-time">' + hourStr + '</div>' +
        '<div class="hour-icon">' + (h.icon || '🌤️') + '</div>' +
        '<div class="hour-temp">' + (h.temperature !== null ? Math.round(h.temperature) + '°' : '--') + '</div>' +
        '<div class="hour-rain">💧 ' + (h.precipitation_probability || 0) + '%</div>' +
        '<div style="font-size: 10px; color: var(--muted); margin-top: 2px;">' + (h.wind_speed ? Math.round(h.wind_speed) + ' km/h' : '') + '</div>';
      track.appendChild(card);
    });
  }

  function renderDailyForecast(daily) {
    var grid = $('dailyForecastGrid');
    if (!grid) return;

    grid.innerHTML = '';
    if (!daily || daily.length === 0) {
      grid.innerHTML = '<div style="font-size: 12px; color: var(--muted); padding: 8px;">Daily forecast unavailable.</div>';
      return;
    }

    daily.forEach(function(d, idx) {
      var dayName = 'Day ' + (idx + 1);
      if (d.date) {
        var dateObj = new Date(d.date);
        dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }

      var sprayStatus = (d.precipitation_probability_max > 40 || (d.wind_speed_max || 0) > 18)
        ? '<span style="font-size: 10px; color: #c62828; font-weight: 700;">⚠️ Spray Drift Risk</span>'
        : '<span style="font-size: 10px; color: #2e7d32; font-weight: 700;">✓ Spray Safe</span>';

      var card = document.createElement('div');
      card.className = 'daily-card';
      card.innerHTML =
        '<div class="day-date">' + dayName + '</div>' +
        '<div class="day-icon">' + (d.icon || '🌤️') + '</div>' +
        '<div class="day-temp">' + Math.round(d.temp_max) + '° <span>/ ' + Math.round(d.temp_min) + '°</span></div>' +
        '<div class="day-rain">💧 ' + (d.precipitation_probability_max || 0) + '% (' + (d.precipitation_sum || 0) + 'mm)</div>' +
        '<div style="font-size: 10px; color: var(--muted); margin-top: 4px;">💨 ' + (d.wind_speed_max ? Math.round(d.wind_speed_max) : '--') + ' km/h</div>' +
        '<div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed var(--line);">' + sprayStatus + '</div>';
      grid.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // 5. STATUS MESSAGES
  // ---------------------------------------------------------------------------
  function showStatus(text, type) {
    var statusEl = $('weatherStatusMsg');
    if (!statusEl) return;
    statusEl.className = 'status-msg show ' + (type || '');

    // For errors, show a retry button alongside the message
    if (type === 'error' && currentLat !== null && currentLon !== null) {
      statusEl.innerHTML = text +
        ' <button onclick="fetchWeatherByCoords(' + currentLat + ',' + currentLon + ',\'' + (currentLocationName.replace(/'/g, '') || 'Location') + '\')" ' +
        'style="margin-left:8px;padding:2px 8px;font-size:11px;cursor:pointer;border:1px solid currentColor;border-radius:4px;background:transparent;color:inherit;">🔄 Retry</button>';
    } else {
      statusEl.textContent = text;
    }

    if (type === 'ok') {
      setTimeout(function() {
        if (statusEl.textContent.startsWith(text.slice(0, 20))) statusEl.className = 'status-msg';
      }, 5000);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. INITIALIZATION ON DOCUMENT READY
  // ---------------------------------------------------------------------------
  function init() {
    // Initialize city search (Open-Meteo Geocoding API, all India)
    initCitySearch();

    // Check if user has saved farm location in profile or local storage
    var profile = (window.AppStorage && window.AppStorage.get && window.AppStorage.get('farmer_profile', null)) || null;

    if (profile && profile.farm_lat && profile.farm_lon && !isNaN(profile.farm_lat) && !isNaN(profile.farm_lon)) {
      var pLat = parseFloat(profile.farm_lat);
      var pLon = parseFloat(profile.farm_lon);
      var pName = profile.village
        ? (profile.village + (profile.district ? ', ' + profile.district : ''))
        : (profile.district || 'My Saved Farm');
      currentLat = pLat;
      currentLon = pLon;
      currentLocationName = pName;
      var inp = $('weatherCitySearch');
      if (inp) inp.value = pName;
      fetchWeatherByCoords(pLat, pLon, pName);
    } else if (navigator.geolocation) {
      // Auto-request GPS position
      getWeatherByGps();
    } else {
      showStatus('📍 Geolocation not supported. Please search for your city or village in the search box above.', 'info');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }

  // Export module to window
  window.WeatherModule = {
    init: init,
    fetchWeatherByCoords: fetchWeatherByCoords,
    handleWeatherSearch: handleWeatherSearch,
    onQuickCitySelect: onQuickCitySelect,
    getWeatherByGps: getWeatherByGps
  };

  // Direct global bindings (for inline onclick handlers in HTML)
  window.fetchWeather = function(locationQuery) {
    if (locationQuery && locationQuery.includes(',')) {
      var parts = locationQuery.split(',');
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        fetchWeatherByCoords(parseFloat(parts[0]), parseFloat(parts[1]), locationQuery);
        return;
      }
    }
    var inp = $('weatherCitySearch');
    if (inp) inp.value = locationQuery;
    handleWeatherSearch();
  };
  window.handleWeatherSearch = handleWeatherSearch;
  window.getWeatherByGps = getWeatherByGps;

})(window);
