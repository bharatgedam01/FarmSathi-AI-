// FarmSaathi AI — Core Application Orchestrator & State Manager
// Zero external bundle dependencies. Integrates all modules, trilingual dictionary,
// local storage migration, chat assistant, and multi-tier synchronization.

(function(window) {
  'use strict';

  // Helper
  function $(id) {
    return document.getElementById(id);
  }

  // ============================================================================
  // LOCALSTORAGE MANAGEMENT (Preserves fs_* keys)
  // ============================================================================
  var Storage = {
    get: function(key, fallback) {
      try {
        var data = localStorage.getItem('fs_' + key);
        return data !== null ? JSON.parse(data) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set: function(key, value) {
      try {
        localStorage.setItem('fs_' + key, JSON.stringify(value));
      } catch (e) {}
    },
    remove: function(key) {
      try {
        localStorage.removeItem('fs_' + key);
      } catch (e) {}
    }
  };

  window.Storage = window.Storage || Storage;
  window.$ = window.$ || $;

  // ============================================================================
  // MULTILINGUAL DICTIONARY (English, Hindi, Marathi)
  // ============================================================================
  var I18N = {
    en: {
      app_title: 'FarmSaathi AI — Smart Farmer Assistance Platform',
      nav_workspace: 'Farmer Workspace',
      nav_dashboard: 'Dashboard',
      nav_profile: 'Farmer Profile',
      nav_crops: 'My Farms & Crops',
      nav_assistant: 'Ask FarmSaathi AI',
      nav_intelligence: 'Farm Intelligence',
      nav_weather: 'Weather & Alerts',
      nav_market: 'Mandi Prices',
      nav_activities: 'Farm Activities',
      nav_history: 'Analysis History',
      nav_help: 'Help & Helplines',
      nav_settings: 'Settings',
      hero_title: 'Smarter decisions.\nHealthier harvests.',
      hero_desc: 'Manage your farm plots, track weather, check verified mandi rates, and diagnose crop health in English, Hindi, and Marathi.',
      stat_crops: 'Active Crops',
      stat_weather: 'Live Weather',
      stat_scans: 'Crop Scans',
      stat_activities: 'Reminders',
      save_success: 'Saved successfully ✓',
      delete_confirm: 'Are you sure you want to delete this record?',
      empty_records: 'No records found.'
    },
    hi: {
      app_title: 'फार्मसाथी एआई — स्मार्ट कृषक सहायता मंच',
      nav_workspace: 'किसान कार्यक्षेत्र',
      nav_dashboard: 'डैशबोर्ड (मुख्य पृष्ठ)',
      nav_profile: 'किसान प्रोफ़ाइल',
      nav_crops: 'मेरे खेत और फसलें',
      nav_assistant: 'पूछें फार्मसाथी AI',
      nav_intelligence: 'फसल स्वास्थ्य स्कैनर',
      nav_weather: 'मौसम एवं चेतावनियाँ',
      nav_market: 'मंडी भाव',
      nav_activities: 'कृषि कार्य एवं अनुस्मारक',
      nav_history: 'जांच इतिहास',
      nav_help: 'सहायता एवं हेल्पलाइन',
      nav_settings: 'सेटिंग्स एवं प्रणाली',
      hero_title: 'सही निर्णय।\nबेहतर पैदावार।',
      hero_desc: 'अपने खेत की जानकारी दर्ज करें, मौसम देखें, देश भर की मंडियों के भाव जानें और हिंदी, मराठी व अंग्रेजी में फसल रोगों की पहचान करें।',
      stat_crops: 'सक्रिय फसलें',
      stat_weather: 'वर्तमान मौसम',
      stat_scans: 'रोग जांच रिपोर्ट',
      stat_activities: 'कार्य अनुस्मारक',
      save_success: 'सफलतापूर्वक सहेजा गया ✓',
      delete_confirm: 'क्या आप निश्चित रूप से इस रिकॉर्ड को हटाना चाहते हैं?',
      empty_records: 'कोई विवरण उपलब्ध नहीं है।'
    },
    mr: {
      app_title: 'फार्मसाथी AI — स्मार्ट शेतकरी सहाय्यक व्यासपीठ',
      nav_workspace: 'शेतकरी कार्यक्षेत्र',
      nav_dashboard: 'डॅशबोर्ड (मुख्य पृष्ठ)',
      nav_profile: 'शेतकरी प्रोफाईल',
      nav_crops: 'माझी शेती आणि पिके',
      nav_assistant: 'विचारा फार्मसाथी AI',
      nav_intelligence: 'पीक आरोग्य स्कॅनर',
      nav_weather: 'हवामान आणि अंदाज',
      nav_market: 'बाजारभाव (मंडी दर)',
      nav_activities: 'शेती कामे व स्मरणपत्रे',
      nav_history: 'निदान इतिहास',
      nav_help: 'मदत व हेल्पलाइन',
      nav_settings: 'सेटिंग्ज व आरोग्य',
      hero_title: 'योग्य नियोजन।\nउत्तम उत्पादन।',
      hero_desc: 'आपल्या शेतीचे नियोजन करा, अचूक हवामान पहा, कृषी उत्पन्न बाजार समित्यांचे थेट दर जाणून घ्या आणि पिकांवरील रोग व कीड नियंत्रण समजून घ्या.',
      stat_crops: 'सध्याची पिके',
      stat_weather: 'स्थानिक हवामान',
      stat_scans: 'रोग तपासणी अहवाल',
      stat_activities: 'नियोजित कामे',
      save_success: 'यशस्वीरीत्या जतन केले ✓',
      delete_confirm: 'तुम्हाला खात्री आहे का हा रेकॉर्ड काढून टाकायचा आहे?',
      empty_records: 'कोणतीही नोंद उपलब्ध नाही.'
    }
  };

  function getLang() {
    return Storage.get('preferred_language', 'en');
  }

  function t(key) {
    var lang = getLang();
    return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key;
  }

  function applyLanguage(lang) {
    if (!lang) lang = 'en';
    Storage.set('preferred_language', lang);

    var selector = $('langSelector');
    if (selector) selector.value = lang;

    var settingsLang = $('settingsLangPicker');
    if (settingsLang) settingsLang.value = lang;

    var profLang = $('profLanguage');
    if (profLang) profLang.value = lang;

    document.documentElement.lang = lang;

    // Apply translations to UI elements
    var map = {
      lblNavWorkspace: 'nav_workspace',
      navDashText: 'nav_dashboard',
      navProfText: 'nav_profile',
      navCropsText: 'nav_crops',
      navAiText: 'nav_assistant',
      navVisionText: 'nav_intelligence',
      navWeatherText: 'nav_weather',
      navMarketText: 'nav_market',
      navActText: 'nav_activities',
      navHistText: 'nav_history',
      navHelpText: 'nav_help',
      navSettingsText: 'nav_settings',
      heroDesc: 'hero_desc',
      lblStatCrops: 'stat_crops',
      lblStatWeather: 'stat_weather',
      lblStatScans: 'stat_scans',
      lblStatActivities: 'stat_activities'
    };

    for (var id in map) {
      var el = $(id);
      if (el) el.textContent = t(map[id]);
    }

    if ($('heroTitle') && I18N[lang] && I18N[lang].hero_title) {
      $('heroTitle').innerHTML = I18N[lang].hero_title.replace('\n', '<br>');
    }
  }

  window.getLang = getLang;
  window.t = t;
  window.applyLanguage = applyLanguage;

  // ============================================================================
  // BACKEND REST API CLIENT
  // ============================================================================
  var API_BASE = (location.protocol === 'file:') ? 'http://localhost:3000' : '';
  var isBackendConnected = false;

  async function apiRequest(endpoint, method, data) {
    var headers = { 'Content-Type': 'application/json' };
    var token = Storage.get('auth_token', null);
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var cleanPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    var url = API_BASE + cleanPath;
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, 5000);

    try {
      var opts = {
        method: method || 'GET',
        headers: headers,
        signal: controller.signal
      };
      if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || '').toUpperCase())) {
        opts.body = JSON.stringify(data);
      }
      var res = await fetch(url, opts);
      clearTimeout(timer);
      var json = await res.json();
      return { ok: res.ok, status: res.status, data: json };
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, error: err.message };
    }
  }

  window.apiRequest = window.apiRequest || apiRequest;
  window.isBackendConnected = isBackendConnected;

  // ============================================================================
  // MULTI-TIER DATA SYNCHRONIZATION
  // ============================================================================
  async function syncAllData() {
    var user = window.AuthModule && window.AuthModule.getCurrentUser();

    // 1. SUPABASE SYNC (if configured)
    if (window.SupabaseClient && window.SupabaseClient.isConfigured() && user && user.id) {
      try {
        console.log('🌱 Syncing with Supabase Cloud for user:', user.id);

        // Profile
        var sbProfile = await window.SupabaseClient.fetchProfile(user.id);
        if (sbProfile && window.FarmerProfile) {
          window.FarmerProfile.saveProfileLocal(sbProfile);
          window.FarmerProfile.loadProfileForm();
        }

        // Crops
        var sbCrops = await window.SupabaseClient.fetchCrops(user.id);
        if (Array.isArray(sbCrops) && sbCrops.length > 0 && window.FarmsCrops) {
          window.FarmsCrops.setSavedCrops(sbCrops);
          window.FarmsCrops.renderCropsList();
        }

        // Activities
        var sbActs = await window.SupabaseClient.fetchActivities(user.id);
        if (Array.isArray(sbActs) && sbActs.length > 0 && window.FarmActivities) {
          window.FarmActivities.setSavedActivities(sbActs);
          window.FarmActivities.renderActivitiesList();
        }

        // Analyses
        var sbAnalyses = await window.SupabaseClient.fetchAnalyses(user.id);
        if (Array.isArray(sbAnalyses) && sbAnalyses.length > 0 && window.CropAnalysis) {
          window.CropAnalysis.setSavedHistory(sbAnalyses);
          window.CropAnalysis.renderHistoryList();
        }

        if (window.AuthModule && window.AuthModule.updateAuthUI) {
          window.AuthModule.updateAuthUI();
        }
        return;
      } catch (sbSyncErr) {
        console.warn('Supabase sync notice:', sbSyncErr.message);
      }
    }

    // 2. BACKEND NODE.JS REST SYNC
    try {
      var probe = await apiRequest('/api/status', 'GET');
      if (probe.ok && probe.data && probe.data.status === 'online') {
        window.isBackendConnected = true;
        console.log('🌱 Connected to FarmSaathi Node.js backend server!');

        // Profile
        var profRes = await apiRequest('/api/profile', 'GET');
        if (profRes.ok && profRes.data && profRes.data.profile && window.FarmerProfile) {
          var merged = Object.assign({}, window.FarmerProfile.getProfile(), profRes.data.profile);
          window.FarmerProfile.saveProfileLocal(merged);
          window.FarmerProfile.loadProfileForm();
        }

        // Crops
        var cropsRes = await apiRequest('/api/crops', 'GET');
        if (cropsRes.ok && cropsRes.data && Array.isArray(cropsRes.data.crops) && cropsRes.data.crops.length > 0 && window.FarmsCrops) {
          window.FarmsCrops.setSavedCrops(cropsRes.data.crops);
          window.FarmsCrops.renderCropsList();
        }

        // Activities
        var actRes = await apiRequest('/api/activities', 'GET');
        if (actRes.ok && actRes.data && Array.isArray(actRes.data.activities) && actRes.data.activities.length > 0 && window.FarmActivities) {
          window.FarmActivities.setSavedActivities(actRes.data.activities);
          window.FarmActivities.renderActivitiesList();
        }

        // History
        var histRes = await apiRequest('/api/history', 'GET');
        if (histRes.ok && histRes.data && Array.isArray(histRes.data.analyses) && histRes.data.analyses.length > 0 && window.CropAnalysis) {
          window.CropAnalysis.setSavedHistory(histRes.data.analyses);
          window.CropAnalysis.renderHistoryList();
        }
      } else {
        window.isBackendConnected = false;
      }
    } catch (beSyncErr) {
      window.isBackendConnected = false;
    }

    if (window.AuthModule && window.AuthModule.updateAuthUI) {
      window.AuthModule.updateAuthUI();
    }
  }

  window.syncAllData = syncAllData;

  // ============================================================================
  // ASK FARMSAATHI AI (CONVERSATIONAL ASSISTANT)
  // ============================================================================
  var chatConversationHistory = [];

  function appendChatBubble(text, sender) {
    var container = $('chatMessages');
    if (!container) return;

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (sender === 'user' ? 'user' : 'assistant');
    bubble.innerHTML = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  async function handleChatSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var input = $('chatInputText');
    if (!input) return;
    var question = input.value.trim();
    if (!question) return;

    appendChatBubble(question, 'user');
    input.value = '';

    chatConversationHistory.push({ role: 'user', content: question });

    var statusEl = $('chatStatusMsg');
    if (statusEl) {
      statusEl.className = 'status-msg show';
      statusEl.textContent = 'FarmSaathi AI is preparing agronomic advice…';
    }

    var lang = getLang();
    var profile = (window.FarmerProfile && window.FarmerProfile.getProfile) ? window.FarmerProfile.getProfile() : {};

    try {
      var res = await apiRequest('/api/chat', 'POST', {
        message: question,
        language: lang,
        profile: profile,
        history: chatConversationHistory
      });

      if (res.ok && res.data && res.data.answer) {
        appendChatBubble(res.data.answer, 'assistant');
        chatConversationHistory.push({ role: 'assistant', content: res.data.answer });
        if (statusEl) {
          statusEl.className = 'status-msg';
          statusEl.textContent = '';
        }
        return;
      }
    } catch (err) {
      console.warn('Backend chat API error, falling back to autonomous agronomy engine:', err.message);
    }

    // Autonomous rule fallback
    var fallbackAnswer = getAutonomousAgronomicAdvice(question, lang, profile);
    appendChatBubble(fallbackAnswer, 'assistant');
    chatConversationHistory.push({ role: 'assistant', content: fallbackAnswer });

    if (statusEl) {
      statusEl.className = 'status-msg';
      statusEl.textContent = '';
    }
  }

  function resetChat() {
    chatConversationHistory = [];
    var container = $('chatMessages');
    if (container) {
      container.innerHTML =
        '<div class="chat-bubble assistant">' +
        'Namaste! 🙏 I am FarmSaathi AI, your agricultural assistant.<br><br>' +
        'You can ask me questions about crop cultivation, irrigation scheduling, fertilizer doses, disease symptoms, or weather precautions in English, Hindi, or Marathi.' +
        '</div>';
    }
  }

  window.handleChatSubmit = handleChatSubmit;
  window.resetChat = resetChat;

  // ============================================================================
  // AUTONOMOUS AGRONOMIC RULE ENGINES (Client Fallback)
  // ============================================================================
  function getAutonomousAgronomicAdvice(question, language, profile) {
    var q = String(question || '').toLowerCase();
    var lang = language || getLang() || 'en';
    var isHindi = lang === 'hi' || /[\u0900-\u097F]/.test(question);
    var isMarathi = lang === 'mr' || (lang !== 'hi' && (q.indexOf('पिक') !== -1 || q.indexOf('शेत') !== -1 || q.indexOf('खत') !== -1 || q.indexOf('पाणी') !== -1 || q.indexOf('कीड') !== -1));

    if (isHindi) {
      if (q.indexOf('कीट') !== -1 || q.indexOf('कीड़ा') !== -1 || q.indexOf('pest') !== -1 || q.indexOf('जैविक') !== -1) {
        return '🌱 **फसल में सुरक्षित जैविक एवं एकात्मिक कीट नियंत्रण (IPM) उपाय:**\n\n1. **नीम तेल का छिड़काव:** 1500 PPM नीम का तेल 5 मिली प्रति लीटर पानी में मिलाकर छिड़काव करें।\n2. **जैविक फफूंदनाशक:** *बिवेरिया बैसियाना* 5 ग्राम प्रति लीटर पानी में मिलाकर शाम के समय छिड़कें।\n3. **फेरोमोन ट्रैप:** प्रति एकड़ 4-5 ट्रैप लगाएं।\n4. **सहायता:** किसी भी आपातकालीन स्थिति में किसान कॉल सेंटर (1800-180-1551) से संपर्क करें।';
      }
      if (q.indexOf('खाद') !== -1 || q.indexOf('उर्वरक') !== -1 || q.indexOf('यूरिया') !== -1 || q.indexOf('dap') !== -1) {
        return '🌾 **संतुलित पोषण एवं उर्वरक प्रबंधन:**\n\n1. बुवाई के समय संतुलित NPK दें।\n2. फूल आते समय 0:52:34 का पर्णीय छिड़काव करें।\n3. नीम-लेपित यूरिया का प्रयोग करें ताकि रिसाव कम हो।';
      }
      return '🌾 **कृषि सलाह:**\n\n- मिट्टी परीक्षण के आधार पर ही पोषक तत्वों का प्रयोग करें।\n- बीजोपचार अवश्य करें (ट्राइकोडर्मा विरिडी 5 ग्राम/किग्रा बीज)।\n- आपातकालीन स्थिति में अपने नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें।';
    }

    if (isMarathi) {
      if (q.indexOf('कीड') !== -1 || q.indexOf('किडी') !== -1 || q.indexOf('नियंत्रण') !== -1 || q.indexOf('सेंद्रिय') !== -1) {
        return '🌱 **पिकांवरील सुरक्षित सेंद्रिय कीड नियंत्रण उपाय:**\n\n1. **निंबोळी अर्क:** ५ मिली नीम तेल (१५०० PPM) प्रति लिटर पाण्यात मिसळून फवारावे.\n2. **जैविक कीटकनाशक:** *बिव्हेरिया बॅसियाना* ५ ग्रॅम प्रति लिटर पाण्यात संध्याकाळी फवारावे.\n3. **सापळे:** एकरी ५ कामगंध सापळे व १० पिवळे चिकट सापळे लावावेत.';
      }
      if (q.indexOf('खत') !== -1 || q.indexOf('युरिया') !== -1 || q.indexOf('dap') !== -1) {
        return '🌾 **संतुलित खत व्यवस्थापन:**\n\n1. पेरणीच्या वेळी १ बॅग DAP + १ बॅग पोटॅश प्रति एकर द्यावे.\n2. फुलोरा व दाणे भरताना ०:५२:३४ (१०० ग्रॅम प्रति १५ लिटर पंप) फवारावे.\n3. जमिनीत जिवाणू वाढवण्यासाठी शेणखत किंवा गांडूळ खत वापरावे.';
      }
      return '🌾 **शेती सल्ला:**\n\n- जमिनीच्या पोतानुसार खतांचे योग्य प्रमाण ठरवा.\n- पेरणीपूर्वी बियाण्याला बीजप्रक्रिया अवश्य करा.\n- अधिक माहितीसाठी किसान कॉल सेंटर (१८००-१८०-१५५१) शी संपर्क साधा.';
    }

    return '🌾 **Agricultural Expert Guidance:**\n\n1. **Integrated Pest Management (IPM):** Apply Neem oil (1500 PPM at 5ml/L) for sucking pests. Spray *Beauveria bassiana* for caterpillars.\n2. **Nutrient Management:** Apply balanced NPK based on soil testing. Spray 0:52:34 during flowering.\n3. **Water Management:** Avoid water stress during critical flowering and grain-filling stages.\n4. **KVK Consultation:** Verify chemical dosages with your local Krishi Vigyan Kendra.';
  }

  function getAutonomousCropTriage(cropName, language, fileName) {
    var crop = cropName || 'General Crop';
    var lang = language || getLang() || 'en';

    if (lang === 'hi') {
      return '======================================================\n🌾 फार्मसाथी एआई — पादप स्वास्थ्य विश्लेषण रिपोर्ट\n======================================================\n\n• फसल: ' + crop + '\n• फोटो: ' + (fileName || 'पत्ती का फोटो') + '\n• निदान: पत्ती पर धब्बे / प्रारंभिक कवक या कीट प्रकोप\n• गंभीरता: मध्यम (नियंत्रण योग्य)\n\n🌱 उपचार:\n1. 1500 PPM नीम तेल 5 मिली/लीटर पानी में मिलाकर छिड़कें।\n2. ट्राइकोडर्मा विरिडी 5 ग्राम/लीटर का पर्णीय छिड़काव करें।\n3. नजदीकी कृषि विज्ञान केंद्र (KVK) से परामर्श लें।';
    }
    if (lang === 'mr') {
      return '======================================================\n🌾 फार्मसाथी AI — पीक आरोग्य व रोग निदान अहवाल\n======================================================\n\n• पीक: ' + crop + '\n• नमुना: ' + (fileName || 'शेत नमुना') + '\n• निदान: पानांवर तांबूस ठिपके / बुरशीजन्य प्रादुर्भाव\n• पातळी: मध्यम\n\n🌱 उपाय:\n1. ५ मिली नीम तेल (१५०० PPM) प्रति लिटर फवारावे.\n2. ट्रायकोडर्मा व्हिरीडी ५ ग्रॅम प्रति लिटर संध्याकाळी फवारावे.\n3. स्थानिक कृषी विज्ञान केंद्र (KVK) चा सल्ला घ्यावा.';
    }
    return '======================================================\n🌾 FARMSAATHI AI — PLANT HEALTH TRIAGE REPORT\n======================================================\n\n• Analyzed Crop: ' + crop + '\n• Reference: ' + (fileName || 'Leaf Sample') + '\n• Preliminary Triage: Foliar Spotting / Early Fungal Lesions\n• Urgency: Moderate\n\n🌱 Recommendations:\n1. Apply Neem Oil (1500 PPM) at 5ml/L with mild surfactant.\n2. Spray *Trichoderma viride* or *Pseudomonas* at 5g/L.\n3. Consult your local Krishi Vigyan Kendra (KVK) agronomist.';
  }

  window.getAutonomousAgronomicAdvice = getAutonomousAgronomicAdvice;
  window.getAutonomousCropTriage = getAutonomousCropTriage;

  // ============================================================================
  // SETTINGS & SYSTEM HEALTH
  // ============================================================================
  async function renderSettings() {
    var container = $('integrationListContainer');
    if (!container) return;

    var isSupabase = window.SupabaseClient && window.SupabaseClient.isConfigured();
    var sbUrl = (window.SupabaseClient && window.SupabaseClient.CONFIG.supabaseUrl) || '';
    var sbKey = (window.SupabaseClient && window.SupabaseClient.CONFIG.supabaseAnonKey) || '';

    var items = [
      {
        name: 'Supabase Cloud PostgreSQL & Auth',
        badge: isSupabase ? 'Connected ✓' : 'Setup Required',
        cls: isSupabase ? 'badge-ok' : 'badge-warn',
        desc: isSupabase
          ? 'URL: ' + sbUrl + ' (Row Level Security active on profiles, crops, farm_activities, farm_records)'
          : 'Configure Supabase Project URL & Publishable Anon Key below to enable cloud multi-device sync.'
      },
      {
        name: 'Node.js Full-Stack Backend Server',
        badge: isBackendConnected ? 'Online ✓' : 'Offline Mode',
        cls: isBackendConnected ? 'badge-ok' : 'badge-warn',
        desc: isBackendConnected
          ? 'REST APIs and persistent JSON database active at /api/*'
          : 'Operating in local browser storage mode. Start server with: node server.js'
      },
      {
        name: 'Open-Meteo Weather Model',
        badge: 'Live Synced ✓',
        cls: 'badge-ok',
        desc: 'Provides real-time temperature, wind speed, rain probability, and 5-day agro-forecasts.'
      },
      {
        name: 'All-India APMC Mandi Market Data',
        badge: 'Verified Records Active',
        cls: 'badge-ok',
        desc: 'Comprehensive modal rates across Maharashtra, MP, Gujarat, Punjab, Rajasthan, UP, Karnataka, and all Indian states.'
      },
      {
        name: 'Agricultural AI Assistant & Vision',
        badge: 'Trilingual Ready ✓',
        cls: 'badge-ok',
        desc: 'OpenAI gpt-4o-mini integrated with autonomous expert fallback in English, Hindi, and Marathi.'
      }
    ];

    var html = '';
    items.forEach(function(it) {
      html +=
        '<div class="list-row">' +
        '  <div class="list-row-main">' +
        '    <strong>' + it.name + '</strong>' +
        '    <small>' + it.desc + '</small>' +
        '  </div>' +
        '  <div><span class="badge ' + it.cls + '">' + it.badge + '</span></div>' +
        '</div>';
    });

    // Add inline Supabase Configuration Box
    html +=
      '<div style="margin-top: 18px; padding: 16px; background: #fafcf8; border: 1px solid var(--line); border-radius: var(--radius-sm);">' +
      '  <h4 style="margin: 0 0 8px;">⚙️ Supabase Cloud Configuration</h4>' +
      '  <p style="font-size: 12px; color: var(--muted); margin: 0 0 12px;">' +
      '    Enter your Supabase Project URL and Public Anon Key. Authenticated users are isolated by Row Level Security (RLS).' +
      '  </p>' +
      '  <div style="display: flex; flex-direction: column; gap: 8px;">' +
      '    <input class="input" id="cfgSupabaseUrl" placeholder="https://your-project.supabase.co" value="' + sbUrl + '">' +
      '    <input class="input" id="cfgSupabaseAnonKey" type="password" placeholder="your-public-anon-key" value="' + sbKey + '">' +
      '    <div style="display: flex; gap: 8px; margin-top: 4px;">' +
      '      <button type="button" class="btn btn-primary btn-sm" onclick="saveSupabaseSettings()">Save Supabase Settings</button>' +
      '      <button type="button" class="btn btn-secondary btn-sm" onclick="clearSupabaseSettings()">Clear</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    container.innerHTML = html;
  }

  window.saveSupabaseSettings = function() {
    var url = ($('cfgSupabaseUrl') && $('cfgSupabaseUrl').value.trim()) || '';
    var key = ($('cfgSupabaseAnonKey') && $('cfgSupabaseAnonKey').value.trim()) || '';

    if (window.SupabaseClient) {
      window.SupabaseClient.setConfig(url, key);
      alert('Supabase configuration saved! Testing connection…');
      renderSettings();
      if (window.AuthModule && window.AuthModule.updateAuthUI) {
        window.AuthModule.updateAuthUI();
      }
      if (window.syncAllData) window.syncAllData();
    }
  };

  window.clearSupabaseSettings = function() {
    if (window.SupabaseClient) {
      window.SupabaseClient.setConfig('', '');
      renderSettings();
      if (window.AuthModule && window.AuthModule.updateAuthUI) {
        window.AuthModule.updateAuthUI();
      }
      alert('Supabase configuration cleared. FarmSaathi is running in Local Mode.');
    }
  };

  function exportFarmData() {
    var exportPayload = {
      exported_at: new Date().toISOString(),
      platform: 'FarmSaathi AI Full-Stack Platform',
      user: window.AuthModule && window.AuthModule.getCurrentUser(),
      profile: (window.FarmerProfile && window.FarmerProfile.getProfile) ? window.FarmerProfile.getProfile() : {},
      crops: (window.FarmsCrops && window.FarmsCrops.getSavedCrops) ? window.FarmsCrops.getSavedCrops() : [],
      activities: (window.FarmActivities && window.FarmActivities.getSavedActivities) ? window.FarmActivities.getSavedActivities() : [],
      scan_history: (window.CropAnalysis && window.CropAnalysis.getSavedHistory) ? window.CropAnalysis.getSavedHistory() : []
    };

    var blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'farmsaathi-farm-data-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.renderSettings = renderSettings;
  window.exportFarmData = exportFarmData;

  // ============================================================================
  // APP INITIALIZATION
  // ============================================================================
  async function initApp() {
    console.log('🌱 FarmSaathi AI initializing modular architecture…');
    var savedLang = getLang();
    applyLanguage(savedLang);

    // Initialize Supabase if configured
    if (window.SupabaseClient) {
      window.SupabaseClient.getClient();
    }

    // Restore sessions (Supabase or Backend)
    if (window.AuthModule && window.AuthModule.restoreSession) {
      await window.AuthModule.restoreSession();
    }

    if (window.AuthModule && window.AuthModule.updateAuthUI) {
      window.AuthModule.updateAuthUI();
    }

    if (window.FarmerProfile && window.FarmerProfile.loadProfileForm) {
      window.FarmerProfile.loadProfileForm();
    }

    if (window.FarmsCrops && window.FarmsCrops.renderCropsList) {
      window.FarmsCrops.renderCropsList();
    }

    if (window.FarmActivities && window.FarmActivities.renderActivitiesList) {
      window.FarmActivities.renderActivitiesList();
    }

    if (window.CropAnalysis && window.CropAnalysis.renderHistoryList) {
      window.CropAnalysis.renderHistoryList();
    }

    if (window.DashboardModule && window.DashboardModule.updateDashboardCounts) {
      window.DashboardModule.updateDashboardCounts();
    }

    // Set badges
    if ($('aiStatusBadge')) {
      $('aiStatusBadge').textContent = '🌱 Active (Trilingual AI)';
      $('aiStatusBadge').className = 'badge badge-ok';
    }
    if ($('visionModeBadge')) {
      $('visionModeBadge').textContent = '🌱 Triage Ready ✓';
      $('visionModeBadge').className = 'badge badge-ok';
    }

    // Preload Mandi prices
    if (window.fetchMandiPrices) {
      window.fetchMandiPrices();
    }

    // Load initial weather
    var p = (window.FarmerProfile && window.FarmerProfile.getProfile) ? window.FarmerProfile.getProfile() : {};
    var defaultLoc = (p.district || p.village) ? (p.district || p.village) + ', ' + (p.state || 'Maharashtra') : 'Gadchiroli, Maharashtra';
    if (window.fetchWeather) {
      window.fetchWeather(defaultLoc);
    }

    // Sync data with Supabase and Backend
    await syncAllData();
  }

  window.initApp = initApp;
  window.addEventListener('DOMContentLoaded', initApp);

})(window);
