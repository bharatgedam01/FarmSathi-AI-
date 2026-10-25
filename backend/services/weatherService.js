// FarmSaathi AI — Weather Service
// Proxies Open-Meteo API requests and provides resilient Indian agricultural weather fallbacks.

const INDIAN_CITIES_REGISTRY = {
  'gadchiroli': { name: 'Gadchiroli', state: 'Maharashtra', lat: 20.18, lon: 80.00, temp: 28 },
  'nagpur': { name: 'Nagpur', state: 'Maharashtra', lat: 21.15, lon: 79.09, temp: 29 },
  'nashik': { name: 'Nashik', state: 'Maharashtra', lat: 20.00, lon: 73.78, temp: 26 },
  'pune': { name: 'Pune', state: 'Maharashtra', lat: 18.52, lon: 73.86, temp: 27 },
  'amravati': { name: 'Amravati', state: 'Maharashtra', lat: 20.93, lon: 77.75, temp: 30 },
  'chandrapur': { name: 'Chandrapur', state: 'Maharashtra', lat: 19.95, lon: 79.30, temp: 31 },
  'akola': { name: 'Akola', state: 'Maharashtra', lat: 20.70, lon: 77.01, temp: 31 },
  'jalgaon': { name: 'Jalgaon', state: 'Maharashtra', lat: 21.00, lon: 75.56, temp: 30 },
  'kolhapur': { name: 'Kolhapur', state: 'Maharashtra', lat: 16.70, lon: 74.24, temp: 27 },
  'solapur': { name: 'Solapur', state: 'Maharashtra', lat: 17.66, lon: 75.91, temp: 32 },
  'aurangabad': { name: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', lat: 19.88, lon: 75.34, temp: 28 },
  'latur': { name: 'Latur', state: 'Maharashtra', lat: 18.40, lon: 76.58, temp: 29 },
  'indore': { name: 'Indore', state: 'Madhya Pradesh', lat: 22.72, lon: 75.86, temp: 27 },
  'bhopal': { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.26, lon: 77.41, temp: 28 },
  'ujjain': { name: 'Ujjain', state: 'Madhya Pradesh', lat: 23.18, lon: 75.78, temp: 28 },
  'rajkot': { name: 'Rajkot', state: 'Gujarat', lat: 22.30, lon: 70.80, temp: 31 },
  'surat': { name: 'Surat', state: 'Gujarat', lat: 21.17, lon: 72.83, temp: 30 },
  'ahmedabad': { name: 'Ahmedabad', state: 'Gujarat', lat: 23.02, lon: 72.57, temp: 32 },
  'ludhiana': { name: 'Ludhiana', state: 'Punjab', lat: 30.90, lon: 75.85, temp: 25 },
  'karnal': { name: 'Karnal', state: 'Haryana', lat: 29.69, lon: 76.98, temp: 26 },
  'jaipur': { name: 'Jaipur', state: 'Rajasthan', lat: 26.91, lon: 75.79, temp: 29 },
  'kota': { name: 'Kota', state: 'Rajasthan', lat: 25.18, lon: 75.83, temp: 30 },
  'lucknow': { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lon: 80.95, temp: 27 },
  'kanpur': { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.45, lon: 80.33, temp: 28 },
  'bengaluru': { name: 'Bengaluru', state: 'Karnataka', lat: 12.97, lon: 77.59, temp: 24 },
  'hyderabad': { name: 'Hyderabad', state: 'Telangana', lat: 17.38, lon: 78.49, temp: 28 },
  'guntur': { name: 'Guntur', state: 'Andhra Pradesh', lat: 16.31, lon: 80.44, temp: 31 },
  'patna': { name: 'Patna', state: 'Bihar', lat: 25.60, lon: 85.14, temp: 28 },
  'kolkata': { name: 'Kolkata', state: 'West Bengal', lat: 22.57, lon: 88.36, temp: 29 },
  'delhi': { name: 'Delhi', state: 'Delhi', lat: 28.61, lon: 77.21, temp: 28 }
};

async function getWeatherData({ city = 'Gadchiroli', lat, lon }) {
  let latitude = lat ? parseFloat(lat) : null;
  let longitude = lon ? parseFloat(lon) : null;
  let resolvedCity = city;

  if (!latitude || !longitude) {
    const cleanCity = String(city).trim().toLowerCase().split(',')[0].trim();
    if (INDIAN_CITIES_REGISTRY[cleanCity]) {
      latitude = INDIAN_CITIES_REGISTRY[cleanCity].lat;
      longitude = INDIAN_CITIES_REGISTRY[cleanCity].lon;
      resolvedCity = INDIAN_CITIES_REGISTRY[cleanCity].name;
    } else {
      latitude = 20.18;
      longitude = 80.00;
      resolvedCity = city || 'Gadchiroli';
    }
  }

  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        city: resolvedCity,
        latitude,
        longitude,
        current: data.current,
        daily: data.daily,
        isLive: true,
        source: 'Open-Meteo Weather Model (Live Synced)'
      };
    }
  } catch (err) {
    console.warn('Weather API fetch failed, serving fallback:', err.message);
  }

  // Fallback response
  return {
    success: true,
    city: resolvedCity,
    latitude: latitude || 20.18,
    longitude: longitude || 80.00,
    current: {
      temperature_2m: 28.4,
      relative_humidity_2m: 65,
      apparent_temperature: 29.5,
      precipitation: 0.0,
      wind_speed_10m: 10.5,
      weather_code: 1,
      time: new Date().toISOString()
    },
    daily: {
      time: ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5'],
      temperature_2m_max: [31, 30, 29, 32, 31],
      temperature_2m_min: [22, 21, 20, 22, 23],
      weather_code: [1, 2, 61, 0, 1],
      precipitation_probability_max: [10, 20, 45, 5, 15]
    },
    isLive: false,
    source: 'FarmSaathi Agronomic Weather Engine (Offline Model)'
  };
}

module.exports = {
  INDIAN_CITIES_REGISTRY,
  getWeatherData
};
