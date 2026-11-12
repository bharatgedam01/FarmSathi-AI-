// FarmSaathi AI — High-Precision Indian Agricultural Weather Service
// Direct integration with Open-Meteo High-Resolution NWP models (ECMWF, ICON, GFS)
// Strict rules:
// 1. NEVER return fabricated or static default temperatures (zero fake fallback).
// 2. NEVER silently substitute Gadchiroli or default city coordinates.
// 3. Always provide model transparency, IST timestamps, and model estimate disclaimers.
// 4. Generate farmer-centric agricultural advisories based on real meteorological parameters.

const https = require('https');
const http = require('http');

// In-memory weather cache (15-minute TTL per ~1km coordinate grid)
const weatherCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// Compass direction calculation from degrees (0° - 360°)
function getCompassDirection(degrees) {
  if (degrees === undefined || degrees === null) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return directions[index];
}

// WMO Weather Interpretation Codes (WMO Code 4677)
const WMO_WEATHER_CODES = {
  0: { description: 'Clear sky', icon: '☀️', condition: 'Sunny' },
  1: { description: 'Mainly clear', icon: '🌤️', condition: 'Mostly Sunny' },
  2: { description: 'Partly cloudy', icon: '⛅', condition: 'Partly Cloudy' },
  3: { description: 'Overcast', icon: '☁️', condition: 'Overcast' },
  45: { description: 'Fog', icon: '🌫️', condition: 'Foggy' },
  48: { description: 'Depositing rime fog', icon: '🌫️', condition: 'Rime Fog' },
  51: { description: 'Light drizzle', icon: '🌦️', condition: 'Light Drizzle' },
  53: { description: 'Moderate drizzle', icon: '🌧️', condition: 'Drizzle' },
  55: { description: 'Dense drizzle', icon: '🌧️', condition: 'Heavy Drizzle' },
  56: { description: 'Light freezing drizzle', icon: '🌨️', condition: 'Freezing Drizzle' },
  57: { description: 'Dense freezing drizzle', icon: '🌨️', condition: 'Dense Freezing Drizzle' },
  61: { description: 'Slight rain', icon: '🌦️', condition: 'Light Rain' },
  63: { description: 'Moderate rain', icon: '🌧️', condition: 'Moderate Rain' },
  65: { description: 'Heavy rain', icon: '🌧️', condition: 'Heavy Rain' },
  66: { description: 'Light freezing rain', icon: '🌨️', condition: 'Freezing Rain' },
  67: { description: 'Heavy freezing rain', icon: '🌨️', condition: 'Freezing Rain' },
  71: { description: 'Slight snow fall', icon: '🌨️', condition: 'Light Snow' },
  73: { description: 'Moderate snow fall', icon: '❄️', condition: 'Snow' },
  75: { description: 'Heavy snow fall', icon: '❄️', condition: 'Heavy Snow' },
  77: { description: 'Snow grains', icon: '❄️', condition: 'Snow Grains' },
  80: { description: 'Slight rain showers', icon: '🌦️', condition: 'Passing Showers' },
  81: { description: 'Moderate rain showers', icon: '🌧️', condition: 'Rain Showers' },
  82: { description: 'Violent rain showers', icon: '⛈️', condition: 'Heavy Showers' },
  85: { description: 'Slight snow showers', icon: '🌨️', condition: 'Snow Showers' },
  86: { description: 'Heavy snow showers', icon: '❄️', condition: 'Heavy Snow' },
  95: { description: 'Thunderstorm', icon: '⛈️', condition: 'Thunderstorm' },
  96: { description: 'Thunderstorm with slight hail', icon: '⛈️', condition: 'Thunderstorm with Hail' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️', condition: 'Severe Thunderstorm with Hail' }
};

// Generate farmer-centric agricultural advisories from actual weather data
function generateAgroAdvisories(current, daily, hourlyNext24) {
  const advisories = [];

  // 1. Chemical Spraying Advisory
  const windSpeed = current.wind_speed_10m || 0;
  const rainNext12h = hourlyNext24 ? hourlyNext24.slice(0, 12).some(h => (h.precipitation || 0) > 0.5 || (h.precipitation_probability || 0) > 40) : false;

  if (windSpeed > 18) {
    advisories.push({
      type: 'warning',
      category: 'Spraying',
      title: 'High Wind Spraying Hazard',
      message: `Wind speed is ${windSpeed.toFixed(1)} km/h. Avoid pesticide/fertilizer spraying due to high chemical drift risk. Optimal spray window requires wind under 15 km/h.`,
      icon: '💨'
    });
  } else if (rainNext12h) {
    advisories.push({
      type: 'caution',
      category: 'Spraying',
      title: 'Rain Expected – Delay Foliar Sprays',
      message: 'Rain showers predicted within the next 12 hours. Chemical foliar sprays may wash off. Postpone application until clear skies.',
      icon: '🌧️'
    });
  } else {
    advisories.push({
      type: 'positive',
      category: 'Spraying',
      title: 'Favorable Spraying Conditions',
      message: `Gentle winds (${windSpeed.toFixed(1)} km/h) and low rain probability make current conditions suitable for foliar spraying.`,
      icon: '✅'
    });
  }

  // 2. Irrigation Management
  const currentPrecip = current.precipitation || 0;
  const maxRainProb = (daily && daily.precipitation_probability_max && daily.precipitation_probability_max[0]) || 0;
  const rainSumToday = (daily && daily.precipitation_sum && daily.precipitation_sum[0]) || 0;

  if (currentPrecip > 5 || rainSumToday > 15 || maxRainProb > 70) {
    advisories.push({
      type: 'info',
      category: 'Irrigation',
      title: 'Suspend Irrigation',
      message: `Substantial rainfall (${rainSumToday} mm expected, ${maxRainProb}% probability). Turn off drip/furrow irrigation systems to avoid waterlogging and root rot.`,
      icon: '💧'
    });
  } else if (current.temperature_2m > 36) {
    advisories.push({
      type: 'warning',
      category: 'Irrigation',
      title: 'High Heat Evaporation Warning',
      message: `Current temp is ${current.temperature_2m}°C. Soil moisture will deplete quickly. Apply light irrigation during late afternoon or evening to protect crops from heat shock.`,
      icon: '🔥'
    });
  }

  // 3. Disease & Pest Risk
  const humidity = current.relative_humidity_2m || 0;
  const temp = current.temperature_2m || 0;
  if (humidity > 80 && temp >= 22 && temp <= 32) {
    advisories.push({
      type: 'warning',
      category: 'Crop Protection',
      title: 'High Fungal Disease Risk',
      message: `High relative humidity (${humidity}%) combined with warm temperature (${temp}°C) creates favorable microclimate for fungal blights, downy mildew, and powdery mildew. Inspect crops frequently.`,
      icon: '🍄'
    });
  }

  // 4. Cold / Frost Alert (Rabi Season)
  const minTempToday = (daily && daily.temperature_2m_min && daily.temperature_2m_min[0]) || current.temperature_2m;
  if (minTempToday < 8) {
    advisories.push({
      type: 'caution',
      category: 'Frost Warning',
      title: 'Low Temperature / Frost Risk',
      message: `Night temperatures dropping to ${minTempToday}°C. Young seedlings and horticultural crops (vegetables, grapes, pomegranate) need protective light mulching or night irrigation.`,
      icon: '❄️'
    });
  }

  return advisories;
}

// Fetch helper with timeout
function fetchJson(urlStr, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.get(urlStr, {
      headers: {
        'User-Agent': 'FarmSaathi-AI/2.0 (Agricultural Intelligence Platform; contact: support@farmsaathi.ai)',
        'Accept': 'application/json'
      },
      timeout: timeoutMs
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON received from weather service (${e.message})`));
          }
        } else {
          reject(new Error(`Weather provider responded with HTTP ${res.statusCode}: ${data.slice(0, 150)}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Weather provider request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(new Error(`Weather provider network error: ${err.message}`));
    });
  });
}

/**
 * Fetch Comprehensive Agricultural Weather from Open-Meteo
 * @param {Object} options
 * @param {number|string} options.lat - Latitude
 * @param {number|string} options.lon - Longitude
 * @param {string} [options.city] - Display name of location
 * @param {string} [options.taluka] - Sub-district/taluka
 * @param {string} [options.district] - District
 * @param {string} [options.state] - State
 * @param {boolean} [options.isGps] - Whether requested via live device GPS
 */
async function getWeatherData({ lat, lon, city = '', taluka = '', district = '', state = '', isGps = false }) {
  // Validate coordinates
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return {
      success: false,
      error: 'Missing or invalid latitude/longitude. Coordinates are required to query weather models without default assumptions.',
      isLive: false,
      timestamp: new Date().toISOString()
    };
  }

  // Bounds check for India (+ surrounding marine regions)
  if (latitude < 6.0 || latitude > 38.0 || longitude < 68.0 || longitude > 98.0) {
    // Note: still allow query, but log geographic warning
    console.warn(`Query coordinates [${latitude}, ${longitude}] fall outside typical continental India boundaries.`);
  }

  // Cache lookup (key rounded to 2 decimal places ~1.1km grid)
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
    return {
      ...cached.data,
      isCached: true,
      cacheAgeSeconds: Math.round((now - cached.cachedAt) / 1000)
    };
  }

  const queryParams = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m'
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'cloud_cover'
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'precipitation_sum',
      'rain_sum',
      'precipitation_hours',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant'
    ].join(','),
    timezone: 'Asia/Kolkata',
    forecast_days: '7'
  });

  const apiUrl = `https://api.open-meteo.com/v1/forecast?${queryParams.toString()}`;

  try {
    const rawData = await fetchJson(apiUrl, 8000);

    if (!rawData || !rawData.current) {
      return {
        success: false,
        error: 'Open-Meteo returned an empty or malformed weather payload.',
        isLive: false,
        timestamp: new Date().toISOString()
      };
    }

    // Process Current Weather
    const curr = rawData.current;
    const weatherMeta = WMO_WEATHER_CODES[curr.weather_code] || { description: 'Weather', icon: '🌤️', condition: 'Fair' };
    const windDirectionCompass = getCompassDirection(curr.wind_direction_10m);

    // Process Hourly Forecast (Slice next 24-36 hours starting from current hour)
    const hourlyList = [];
    if (rawData.hourly && rawData.hourly.time && Array.isArray(rawData.hourly.time)) {
      const currentIsoHour = curr.time ? curr.time.slice(0, 13) : '';
      let startIndex = 0;
      if (currentIsoHour) {
        const idx = rawData.hourly.time.findIndex(t => t.startsWith(currentIsoHour));
        if (idx !== -1) startIndex = idx;
      }

      const maxHourly = Math.min(startIndex + 24, rawData.hourly.time.length);
      for (let i = startIndex; i < maxHourly; i++) {
        const code = rawData.hourly.weather_code ? rawData.hourly.weather_code[i] : 0;
        const meta = WMO_WEATHER_CODES[code] || { description: 'Clear', icon: '☀️', condition: 'Clear' };
        hourlyList.push({
          time: rawData.hourly.time[i],
          temperature: rawData.hourly.temperature_2m ? rawData.hourly.temperature_2m[i] : null,
          humidity: rawData.hourly.relative_humidity_2m ? rawData.hourly.relative_humidity_2m[i] : null,
          precipitation_probability: rawData.hourly.precipitation_probability ? rawData.hourly.precipitation_probability[i] : 0,
          precipitation: rawData.hourly.precipitation ? rawData.hourly.precipitation[i] : 0,
          weather_code: code,
          condition: meta.condition,
          icon: meta.icon,
          wind_speed: rawData.hourly.wind_speed_10m ? rawData.hourly.wind_speed_10m[i] : null,
          wind_direction_compass: getCompassDirection(rawData.hourly.wind_direction_10m ? rawData.hourly.wind_direction_10m[i] : 0)
        });
      }
    }

    // Process 7-Day Daily Forecast
    const dailyList = [];
    if (rawData.daily && rawData.daily.time && Array.isArray(rawData.daily.time)) {
      for (let i = 0; i < rawData.daily.time.length; i++) {
        const code = rawData.daily.weather_code ? rawData.daily.weather_code[i] : 0;
        const meta = WMO_WEATHER_CODES[code] || { description: 'Clear', icon: '☀️', condition: 'Clear' };
        dailyList.push({
          date: rawData.daily.time[i],
          temp_max: rawData.daily.temperature_2m_max ? rawData.daily.temperature_2m_max[i] : null,
          temp_min: rawData.daily.temperature_2m_min ? rawData.daily.temperature_2m_min[i] : null,
          apparent_max: rawData.daily.apparent_temperature_max ? rawData.daily.apparent_temperature_max[i] : null,
          apparent_min: rawData.daily.apparent_temperature_min ? rawData.daily.apparent_temperature_min[i] : null,
          sunrise: rawData.daily.sunrise ? rawData.daily.sunrise[i] : null,
          sunset: rawData.daily.sunset ? rawData.daily.sunset[i] : null,
          precipitation_sum: rawData.daily.precipitation_sum ? rawData.daily.precipitation_sum[i] : 0,
          rain_sum: rawData.daily.rain_sum ? rawData.daily.rain_sum[i] : 0,
          precipitation_probability_max: rawData.daily.precipitation_probability_max ? rawData.daily.precipitation_probability_max[i] : 0,
          wind_speed_max: rawData.daily.wind_speed_10m_max ? rawData.daily.wind_speed_10m_max[i] : null,
          wind_direction_dominant: getCompassDirection(rawData.daily.wind_direction_10m_dominant ? rawData.daily.wind_direction_10m_dominant[i] : null),
          weather_code: code,
          condition: meta.condition,
          icon: meta.icon
        });
      }
    }

    // Generate Agro Advisories
    const advisories = generateAgroAdvisories(curr, rawData.daily, hourlyList);

    // Build Formatted Result
    const result = {
      success: true,
      location: {
        name: city || 'Farm Location',
        taluka: taluka || '',
        district: district || '',
        state: state || '',
        lat: latitude,
        lon: longitude,
        elevation_meters: rawData.elevation || 0,
        isGps: Boolean(isGps)
      },
      current: {
        temperature: curr.temperature_2m,
        feels_like: curr.apparent_temperature,
        humidity: curr.relative_humidity_2m,
        precipitation: curr.precipitation || 0,
        rain: curr.rain || 0,
        cloud_cover: curr.cloud_cover !== undefined ? curr.cloud_cover : 0,
        pressure_msl: curr.pressure_msl || curr.surface_pressure || null,
        wind_speed: curr.wind_speed_10m || 0,
        wind_direction_deg: curr.wind_direction_10m,
        wind_direction_compass: windDirectionCompass,
        wind_gusts: curr.wind_gusts_10m || 0,
        is_day: Boolean(curr.is_day),
        weather_code: curr.weather_code,
        condition: weatherMeta.condition,
        description: weatherMeta.description,
        icon: weatherMeta.icon,
        observed_time: curr.time
      },
      daily: dailyList,
      hourly: hourlyList,
      advisories: advisories,
      model_info: {
        provider: 'Open-Meteo High-Resolution Weather API',
        nwp_models: 'ECMWF IFS (9km) / DWD ICON-EU (7km) / GFS Global Blend',
        grid_resolution_km: '~11 km NWP grid cell',
        observation_updated_at: `${curr.time} IST`,
        generation_time_ms: rawData.generationtime_ms || 0,
        utc_offset_seconds: rawData.utc_offset_seconds || 19800,
        disclaimer: 'Numerical Weather Prediction (NWP) model-based estimate. Local convective showers, micro-climates, and topography may cause localized variations. Never assume 100% weather certainty.'
      },
      isLive: true,
      timestamp: new Date().toISOString()
    };

    // Store in cache
    weatherCache.set(cacheKey, {
      cachedAt: now,
      data: result
    });

    return result;
  } catch (err) {
    // Explicitly FAIL with clear error. NEVER return fabricated default numbers.
    console.error('Open-Meteo Weather API Call Failed:', err.message);
    return {
      success: false,
      error: `Live weather service unavailable (${err.message}). Unable to retrieve accurate meteorological forecast for coordinates [${latitude}, ${longitude}]. Please check internet connection or retry in a moment.`,
      isLive: false,
      location: {
        name: city || 'Selected Location',
        lat: latitude,
        lon: longitude
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  getWeatherData,
  WMO_WEATHER_CODES,
  getCompassDirection
};
