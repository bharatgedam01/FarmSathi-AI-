// FarmSaathi AI — Complete All-India Geographic & Administrative Location Service
// Comprehensive coverage of all 28 States, 8 Union Territories, 780+ Districts,
// Authentic Talukas / Mandals / Tehsils, Village Directories with Local Language Support,
// Autocomplete search across India, and GPS Reverse Geocoding.

const https = require('https');
const http = require('http');

// -----------------------------------------------------------------------------
// 1. ALL 28 STATES AND 8 UNION TERRITORIES OF INDIA (100% COVERAGE)
// -----------------------------------------------------------------------------
const STATES_INDIA = [
  // 28 States
  { id: 'AP', name: 'Andhra Pradesh', name_hi: 'आन्ध्र प्रदेश', name_mr: 'आंध्र प्रदेश', name_te: 'ఆంధ్రప్రదేశ్', name_kn: 'ಆಂಧ್ರಪ್ರದೇಶ', name_ta: 'ஆந்திரப் பிரதேசம்', type: 'State', lat: 15.9129, lon: 79.7400, zoom: 7 },
  { id: 'AR', name: 'Arunachal Pradesh', name_hi: 'अरुणाचल प्रदेश', name_mr: 'अरुणाचल प्रदेश', type: 'State', lat: 28.2180, lon: 94.7278, zoom: 7 },
  { id: 'AS', name: 'Assam', name_hi: 'असम', name_mr: 'आसाम', name_bn: 'অসম', type: 'State', lat: 26.2006, lon: 92.9376, zoom: 7 },
  { id: 'BR', name: 'Bihar', name_hi: 'बिहार', name_mr: 'बिहार', name_ur: 'بہار', type: 'State', lat: 25.0961, lon: 85.3131, zoom: 7 },
  { id: 'CG', name: 'Chhattisgarh', name_hi: 'छत्तीसगढ़', name_mr: 'छत्तीसगड', type: 'State', lat: 21.2787, lon: 81.8661, zoom: 7 },
  { id: 'GA', name: 'Goa', name_hi: 'गोवा', name_mr: 'गोवा', type: 'State', lat: 15.2993, lon: 74.1240, zoom: 9 },
  { id: 'GJ', name: 'Gujarat', name_hi: 'गुजरात', name_mr: 'गुजरात', name_gu: 'ગુજરાત', type: 'State', lat: 22.2587, lon: 71.1924, zoom: 7 },
  { id: 'HR', name: 'Haryana', name_hi: 'हरियाणा', name_mr: 'हरियाणा', name_pa: 'ਹਰਿਆਣਾ', type: 'State', lat: 29.0588, lon: 76.0856, zoom: 7 },
  { id: 'HP', name: 'Himachal Pradesh', name_hi: 'हिमाचल प्रदेश', name_mr: 'हिमाचल प्रदेश', type: 'State', lat: 31.1048, lon: 77.1734, zoom: 7 },
  { id: 'JH', name: 'Jharkhand', name_hi: 'झारखण्ड', name_mr: 'झारखंड', type: 'State', lat: 23.6102, lon: 85.2799, zoom: 7 },
  { id: 'KA', name: 'Karnataka', name_hi: 'कर्नाटक', name_mr: 'कर्नाटक', name_kn: 'ಕರ್ನಾಟಕ', name_te: 'కర్ణాటక', name_ta: 'கர்நாடகா', type: 'State', lat: 15.3173, lon: 75.7139, zoom: 7 },
  { id: 'KL', name: 'Kerala', name_hi: 'केरल', name_mr: 'केरळ', name_ml: 'കേരളം', name_ta: 'கேரளா', type: 'State', lat: 10.8505, lon: 76.2711, zoom: 7 },
  { id: 'MP', name: 'Madhya Pradesh', name_hi: 'मध्य प्रदेश', name_mr: 'मध्य प्रदेश', name_ur: 'مدھیہ پردیش', type: 'State', lat: 22.9734, lon: 78.6569, zoom: 7 },
  { id: 'MH', name: 'Maharashtra', name_hi: 'महाराष्ट्र', name_mr: 'महाराष्ट्र', name_gu: 'મહારાષ્ટ્ર', name_kn: 'ಮಹಾರಾಷ್ಟ್ರ', type: 'State', lat: 19.7515, lon: 75.7139, zoom: 7 },
  { id: 'MN', name: 'Manipur', name_hi: 'मणिपुर', name_mr: 'मणिपूर', type: 'State', lat: 24.6637, lon: 93.9063, zoom: 8 },
  { id: 'ML', name: 'Meghalaya', name_hi: 'मेघालय', name_mr: 'मेघालय', type: 'State', lat: 25.4670, lon: 91.3662, zoom: 8 },
  { id: 'MZ', name: 'Mizoram', name_hi: 'मिज़ोरम', name_mr: 'मिझोरम', type: 'State', lat: 23.1645, lon: 92.9376, zoom: 8 },
  { id: 'NL', name: 'Nagaland', name_hi: 'नागालैंड', name_mr: 'नागालँड', type: 'State', lat: 26.1584, lon: 94.5624, zoom: 8 },
  { id: 'OD', name: 'Odisha', name_hi: 'ओडिशा', name_mr: 'ओडिशा', name_or: 'ଓଡ଼ିଶା', name_bn: 'ওড়িশা', type: 'State', lat: 20.9517, lon: 85.0985, zoom: 7 },
  { id: 'PB', name: 'Punjab', name_hi: 'पंजाब', name_mr: 'पंजाब', name_pa: 'ਪੰਜਾਬ', name_ur: 'پنجاب', type: 'State', lat: 31.1471, lon: 75.3412, zoom: 7 },
  { id: 'RJ', name: 'Rajasthan', name_hi: 'राजस्थान', name_mr: 'राजस्थान', name_gu: 'રાજસ્થાન', name_pa: 'ਰਾਜਸਥਾਨ', type: 'State', lat: 27.0238, lon: 74.2179, zoom: 7 },
  { id: 'SK', name: 'Sikkim', name_hi: 'सिक्किम', name_mr: 'सिक्कीम', type: 'State', lat: 27.5330, lon: 88.5122, zoom: 8 },
  { id: 'TN', name: 'Tamil Nadu', name_hi: 'तमिलनाडु', name_mr: 'तमिळनाडू', name_ta: 'தமிழ்நாடு', name_ml: 'തമിഴ്നാട്', name_kn: 'ತಮಿಳುನಾಡು', type: 'State', lat: 11.1271, lon: 78.6569, zoom: 7 },
  { id: 'TG', name: 'Telangana', name_hi: 'तेलंगाना', name_mr: 'तेलंगणा', name_te: 'తెలంగాణ', name_ur: 'تلنگانہ', name_kn: 'ತೆಲಂಗಾಣ', type: 'State', lat: 18.1124, lon: 79.0193, zoom: 7 },
  { id: 'TR', name: 'Tripura', name_hi: 'त्रिपुरा', name_mr: 'त्रिपुरा', name_bn: 'ত্রিপুরা', type: 'State', lat: 23.9408, lon: 91.9882, zoom: 8 },
  { id: 'UP', name: 'Uttar Pradesh', name_hi: 'उत्तर प्रदेश', name_mr: 'उत्तर प्रदेश', name_ur: 'اتر پردیش', type: 'State', lat: 26.8467, lon: 80.9462, zoom: 7 },
  { id: 'UK', name: 'Uttarakhand', name_hi: 'उत्तराखण्ड', name_mr: 'उत्तराखंड', type: 'State', lat: 30.0668, lon: 79.0193, zoom: 7 },
  { id: 'WB', name: 'West Bengal', name_hi: 'पश्चिम बंगाल', name_mr: 'पश्चिम बंगाल', name_bn: 'পশ্চিমবঙ্গ', name_or: 'ପଶ୍ଚିମ ବଙ୍ଗ', type: 'State', lat: 22.9868, lon: 87.8550, zoom: 7 },
  // 8 Union Territories
  { id: 'AN', name: 'Andaman and Nicobar Islands', name_hi: 'अण्डमान और निकोबार द्वीपसमूह', name_mr: 'अंदमान आणि निकोबार', type: 'UT', lat: 11.7401, lon: 92.6586, zoom: 7 },
  { id: 'CH', name: 'Chandigarh', name_hi: 'चण्डीगढ़', name_mr: 'चंदिगढ', name_pa: 'ਚੰਡੀਗੜ੍ਹ', type: 'UT', lat: 30.7333, lon: 76.7794, zoom: 11 },
  { id: 'DH', name: 'Dadra and Nagar Haveli and Daman and Diu', name_hi: 'दादरा और नगर हवेली और दमन और दीव', name_mr: 'दादरा आणि नगर हवेली आणि दमण आणि दीव', name_gu: 'દાદરા અને નગર હવેલી અને દમણ અને દીવ', type: 'UT', lat: 20.4283, lon: 72.8397, zoom: 10 },
  { id: 'DL', name: 'Delhi', name_hi: 'दिल्ली (राष्ट्रीय राजधानी क्षेत्र)', name_mr: 'दिल्ली', name_pa: 'ਦਿੱਲੀ', name_ur: 'دہلی', type: 'UT', lat: 28.7041, lon: 77.1025, zoom: 10 },
  { id: 'JK', name: 'Jammu and Kashmir', name_hi: 'जम्मू और कश्मीर', name_mr: 'जम्मू आणि काश्मीर', name_ur: 'جموں و کشمیر', type: 'UT', lat: 33.7782, lon: 76.5762, zoom: 7 },
  { id: 'LA', name: 'Ladakh', name_hi: 'लद्दाख', name_mr: 'लडाख', name_ur: 'لداخ', type: 'UT', lat: 34.1526, lon: 77.5771, zoom: 7 },
  { id: 'LD', name: 'Lakshadweep', name_hi: 'लक्षद्वीप', name_mr: 'लक्षद्वीप', name_ml: 'ലക്ഷദ്വീപ്', type: 'UT', lat: 10.5667, lon: 72.6417, zoom: 8 },
  { id: 'PY', name: 'Puducherry', name_hi: 'पुदुच्चेरी', name_mr: 'पुडुचेरी', name_ta: 'புதுச்சேரி', name_ml: 'പുതുച്ചേരി', type: 'UT', lat: 11.9416, lon: 79.8083, zoom: 10 }
];

// Load district and taluka hierarchies
const ALL_INDIA_DISTRICTS = require('./data/allIndiaDistricts');
const VILLAGE_DATABASE = require('./data/allIndiaVillages');

// Distance calculation
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getStates() {
  return STATES_INDIA;
}

function getDistricts(stateName) {
  if (!stateName) return [];
  const cleanState = String(stateName).trim().toLowerCase();

  for (const [stKey, distMap] of Object.entries(ALL_INDIA_DISTRICTS)) {
    if (stKey.toLowerCase() === cleanState) {
      return Object.keys(distMap).map(dName => {
        const d = distMap[dName];
        return {
          name: dName,
          name_mr: d.name_mr || dName,
          name_hi: d.name_hi || dName,
          name_te: d.name_te || null,
          name_kn: d.name_kn || null,
          name_gu: d.name_gu || null,
          name_pa: d.name_pa || null,
          name_ta: d.name_ta || null,
          lat: d.lat,
          lon: d.lon,
          state: stKey,
          talukasCount: Array.isArray(d.talukas) ? d.talukas.length : 1
        };
      });
    }
  }

  return [];
}

function getTalukas(stateName, districtName) {
  if (!districtName) return [];
  const cleanState = String(stateName || '').trim().toLowerCase();
  const cleanDist = String(districtName).trim().toLowerCase();

  for (const [stKey, distMap] of Object.entries(ALL_INDIA_DISTRICTS)) {
    if (!cleanState || stKey.toLowerCase() === cleanState) {
      for (const [dName, d] of Object.entries(distMap)) {
        if (dName.toLowerCase() === cleanDist) {
          return (d.talukas || []).map(t => {
            const tName = typeof t === 'string' ? t : t.name;
            return {
              name: tName,
              name_mr: (typeof t === 'object' && t.name_mr) || tName,
              name_hi: (typeof t === 'object' && t.name_hi) || tName,
              name_te: (typeof t === 'object' && t.name_te) || null,
              name_kn: (typeof t === 'object' && t.name_kn) || null,
              name_gu: (typeof t === 'object' && t.name_gu) || null,
              name_pa: (typeof t === 'object' && t.name_pa) || null,
              name_ta: (typeof t === 'object' && t.name_ta) || null,
              lat: (typeof t === 'object' && t.lat) || d.lat,
              lon: (typeof t === 'object' && t.lon) || d.lon,
              district: dName,
              state: stKey
            };
          });
        }
      }
    }
  }

  return [];
}

function getVillages(stateName, districtName, talukaName, page = 1, limit = 50) {
  const s = String(stateName || '').trim().toLowerCase();
  const d = String(districtName || '').trim().toLowerCase();
  const t = String(talukaName || '').trim().toLowerCase();

  // 1. Search in verified Census / LGD pre-indexed database
  let matches = VILLAGE_DATABASE.filter(v => {
    if (s && v.state.toLowerCase() !== s) return false;
    if (d && v.district.toLowerCase() !== d) return false;
    if (t && v.taluka.toLowerCase() !== t) return false;
    return true;
  });

  // 2. No sufficient pre-indexed villages — return honest "not available" response
  // Do NOT generate synthetic Gram Panchayat names as substitute for official LGD records
  if (matches.length < 5 && talukaName) {
    return {
      total: matches.length,
      page: 1,
      limit: 50,
      totalPages: matches.length > 0 ? 1 : 0,
      villages: matches,
      dataUnavailable: true,
      message: 'Official village records for ' + talukaName + ' taluka are not available in the current database. Please enter your village name manually or use GPS coordinates for accurate location. (Official LGD village data integration is pending.)'
    };
  }

  const p = Math.max(1, parseInt(page, 10) || 1);

  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (p - 1) * l;
  const paginated = matches.slice(offset, offset + l);

  return {
    total: matches.length,
    page: p,
    limit: l,
    totalPages: Math.ceil(matches.length / l),
    villages: paginated
  };
}

// Search locations with autocomplete across All-India registry
async function searchLocations(query, limit = 10) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const results = [];
  const maxLimit = Math.min(25, Math.max(1, limit));

  // 1. Search in village database
  for (const v of VILLAGE_DATABASE) {
    if (v.name.toLowerCase().includes(q) ||
        (v.name_mr && v.name_mr.includes(q)) ||
        (v.name_hi && v.name_hi.includes(q)) ||
        (v.pin && v.pin.startsWith(q))) {
      results.push({
        type: 'village',
        name: v.name,
        name_mr: v.name_mr,
        name_hi: v.name_hi,
        name_te: v.name_te,
        taluka: v.taluka,
        district: v.district,
        state: v.state,
        lat: v.lat,
        lon: v.lon,
        pin: v.pin,
        displayName: `${v.name}, ${v.taluka}, ${v.district}, ${v.state}`
      });
      if (results.length >= maxLimit) return results;
    }
  }

  // 2. Search in district & taluka directory
  for (const [stKey, distMap] of Object.entries(ALL_INDIA_DISTRICTS)) {
    for (const [dName, d] of Object.entries(distMap)) {
      if (dName.toLowerCase().includes(q) ||
          (d.name_hi && d.name_hi.includes(q)) ||
          (d.name_mr && d.name_mr.includes(q))) {
        results.push({
          type: 'district',
          name: dName,
          name_mr: d.name_mr,
          name_hi: d.name_hi,
          taluka: '',
          district: dName,
          state: stKey,
          lat: d.lat,
          lon: d.lon,
          displayName: `${dName} (District), ${stKey}`
        });
        if (results.length >= maxLimit) return results;
      }

      for (const t of (d.talukas || [])) {
        const tName = typeof t === 'string' ? t : t.name;
        if (tName.toLowerCase().includes(q)) {
          results.push({
            type: 'taluka',
            name: tName,
            taluka: tName,
            district: dName,
            state: stKey,
            lat: (typeof t === 'object' && t.lat) || d.lat,
            lon: (typeof t === 'object' && t.lon) || d.lon,
            displayName: `${tName} (Taluka), ${dName}, ${stKey}`
          });
          if (results.length >= maxLimit) return results;
        }
      }
    }
  }

  // 3. Search in states
  for (const s of STATES_INDIA) {
    if (s.name.toLowerCase().includes(q) || (s.name_hi && s.name_hi.includes(q))) {
      results.push({
        type: 'state',
        name: s.name,
        name_hi: s.name_hi,
        name_mr: s.name_mr,
        state: s.name,
        lat: s.lat,
        lon: s.lon,
        displayName: `${s.name} (State), India`
      });
      if (results.length >= maxLimit) return results;
    }
  }

  return results;
}

// Reverse Geocoding: match exact GPS coordinates to closest authentic administrative unit
async function reverseGeocode(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Invalid latitude/longitude coordinates for reverse geocoding.');
  }

  let closestLocation = null;
  let minDistanceKm = Infinity;

  // 1. Check verified villages first
  for (const v of VILLAGE_DATABASE) {
    const dist = haversineDistanceKm(latitude, longitude, v.lat, v.lon);
    if (dist < minDistanceKm) {
      minDistanceKm = dist;
      closestLocation = {
        type: 'village',
        name: v.name,
        name_mr: v.name_mr,
        name_hi: v.name_hi,
        taluka: v.taluka,
        district: v.district,
        state: v.state,
        lat: v.lat,
        lon: v.lon,
        distanceKm: Math.round(dist * 10) / 10
      };
    }
  }

  if (closestLocation && minDistanceKm <= 15) {
    return {
      success: true,
      ...closestLocation,
      isApproximate: minDistanceKm > 3,
      queryLat: latitude,
      queryLon: longitude
    };
  }

  // 2. Nearest district center
  for (const [stKey, distMap] of Object.entries(ALL_INDIA_DISTRICTS)) {
    for (const [dName, d] of Object.entries(distMap)) {
      const dist = haversineDistanceKm(latitude, longitude, d.lat, d.lon);
      if (dist < minDistanceKm) {
        minDistanceKm = dist;
        closestLocation = {
          type: 'district',
          name: dName,
          name_mr: d.name_mr,
          name_hi: d.name_hi,
          taluka: (d.talukas && d.talukas[0] && (typeof d.talukas[0] === 'string' ? d.talukas[0] : d.talukas[0].name)) || dName,
          district: dName,
          state: stKey,
          lat: d.lat,
          lon: d.lon,
          distanceKm: Math.round(dist * 10) / 10
        };
      }
    }
  }

  if (closestLocation) {
    return {
      success: true,
      ...closestLocation,
      isApproximate: true,
      queryLat: latitude,
      queryLon: longitude
    };
  }

  return {
    success: false,
    name: 'GPS Farm Location',
    lat: latitude,
    lon: longitude
  };
}

const MAHARASHTRA_DISTRICTS_AND_TALUKAS = ALL_INDIA_DISTRICTS['Maharashtra'] || {};

module.exports = {
  STATES_INDIA,
  ALL_INDIA_DISTRICTS,
  MAHARASHTRA_DISTRICTS_AND_TALUKAS,
  VILLAGE_DATABASE,
  getStates,
  getDistricts,
  getTalukas,
  getVillages,
  searchLocations,
  reverseGeocode,
  haversineDistanceKm
};
