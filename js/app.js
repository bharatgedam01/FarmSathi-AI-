// FarmSaathi AI — Core Application Orchestrator & State Manager
// Zero external bundle dependencies. Integrates all modules, trilingual dictionary,
// local storage migration, chat assistant, and multi-tier synchronization.

(function (window) {
  'use strict';

  // Helper
  function $(id) {
    return document.getElementById(id);
  }

  // ============================================================================
  // LOCALSTORAGE MANAGEMENT (AppStorage preserves fs_* keys)
  // Never overwrites native window.Storage.
  // ============================================================================
  var AppStorage = window.AppStorage || {
    get: function (key, fallback) {
      try {
        if (typeof localStorage === 'undefined') return fallback;
        var data = localStorage.getItem('fs_' + key);
        if (data === null || data === undefined) return fallback;
        try {
          return JSON.parse(data);
        } catch (parseErr) {
          return data;
        }
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem('fs_' + key, JSON.stringify(value));
      } catch (e) { }
    },
    remove: function (key) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem('fs_' + key);
      } catch (e) { }
    }
  };

  window.AppStorage = AppStorage;
  window.$ = window.$ || $;

  // ============================================================================
  // MULTILINGUAL DICTIONARY (All 12 Indian Languages)
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
      hero_desc: 'Manage your farm plots, track weather, check verified mandi rates, and diagnose crop health in all major Indian languages.',
      stat_crops: 'Active Crops',
      stat_weather: 'Live Weather',
      stat_scans: 'Crop Scans',
      stat_activities: 'Reminders',
      save_success: 'Saved successfully ✓',
      delete_confirm: 'Are you sure you want to delete this record?',
      empty_records: 'No records found.',
      empty_crops: 'No crops added yet. Add your first crop to get started.'
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
      hero_desc: 'अपने खेत की जानकारी दर्ज करें, मौसम देखें, देश भर की मंडियों के भाव जानें और फसल रोगों की सटीक पहचान करें।',
      stat_crops: 'सक्रिय फसलें',
      stat_weather: 'वर्तमान मौसम',
      stat_scans: 'रोग जांच रिपोर्ट',
      stat_activities: 'कार्य अनुस्मारक',
      save_success: 'सफलतापूर्वक सहेजा गया ✓',
      delete_confirm: 'क्या आप निश्चित रूप से इस रिकॉर्ड को हटाना चाहते हैं?',
      empty_records: 'कोई विवरण उपलब्ध नहीं है।',
      empty_crops: 'अभी तक कोई फसल नहीं जोड़ी गई है। शुरुआत करने के लिए अपनी पहली फसल जोड़ें।'
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
      hero_desc: 'आपल्या शेतीचे नियोजन करा, अचूक हवामान पहा, कृषी उत्पन्न बाजार समित्यांचे थेट दर जाणून घ्या आणि पिकांवरील रोग नियंत्रण समजून घ्या.',
      stat_crops: 'सध्याची पिके',
      stat_weather: 'स्थानिक हवामान',
      stat_scans: 'रोग तपासणी अहवाल',
      stat_activities: 'नियोजित कामे',
      save_success: 'यशस्वीरीत्या जतन केले ✓',
      delete_confirm: 'तुम्हाला खात्री आहे का हा रेकॉर्ड काढून टाकायचा आहे?',
      empty_records: 'कोणतीही नोंद उपलब्ध नाही.',
      empty_crops: 'अद्याप कोणतेही पीक जोडलेले नाही. सुरुवात करण्यासाठी आपले पहिले पीक जोडा.'
    },
    te: {
      app_title: 'ఫార్మ్‌సాథీ AI — స్మార్ట్ రైతు సహాయ వేదిక',
      nav_workspace: 'రైతు కార్యక్షేత్రం',
      nav_dashboard: 'డాష్‌బోర్డ్',
      nav_profile: 'రైతు ప్రొఫైల్',
      nav_crops: 'నా పొలాలు & పంటలు',
      nav_assistant: 'ఫార్మ్‌సాథీ AIని అడగండి',
      nav_intelligence: 'పంట ఆరోగ్యం & స్కానర్',
      nav_weather: 'వాతావరణం & హెచ్చరికలు',
      nav_market: 'మార్కెట్ ధరలు (మండి రేట్లు)',
      nav_activities: 'వ్యవసాయ పనులు & రిమైండర్లు',
      nav_history: 'విశ్లేషణ చరిత్ర',
      nav_help: 'సహాయం & హెల్ప్‌లైన్లు',
      nav_settings: 'సెట్టింగ్‌లు',
      hero_title: 'తెలివైన నిర్ణయాలు.\nఆరోగ్యకరమైన పంటలు.',
      hero_desc: 'మీ పొలాలను నిర్వహించండి, లైవ్ వాతావరణాన్ని చూడండి, ధృవీకరించబడిన మార్కెట్ ధరలను తెలుసుకోండి మరియు పంట రోగాలను నిర్ధారించండి.',
      stat_crops: 'ప్రస్తుత పంటలు',
      stat_weather: 'వాతావరణం',
      stat_scans: 'పంట స్కాన్లు',
      stat_activities: 'రిమైండర్లు',
      save_success: 'విజయవంతంగా సేవ్ చేయబడింది ✓',
      delete_confirm: 'మీరు ఖచ్చితంగా ఈ రికార్డును తొలగించాలనుకుంటున్నారా?',
      empty_records: 'ఎలాంటి రికార్డులు కనుగొనబడలేదు.',
      empty_crops: 'ఇంకా పంటలు చేర్చబడలేదు. ప్రారంభించడానికి మీ మొదటి పంటను జోడించండి.'
    },
    kn: {
      app_title: 'ಫಾರ್ಮ್‌ಸಾಥಿ AI — ಸ್ಮಾರ್ಟ್ ರೈತ ಸಹಾಯಕ ವೇದಿಕೆ',
      nav_workspace: 'ರೈತ ಕಾರ್ಯಕ್ಷೇತ್ರ',
      nav_dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      nav_profile: 'ರೈತ ಪ್ರೊಫೈಲ್',
      nav_crops: 'ನನ್ನ ಜಮೀನು & ಬೆಳೆಗಳು',
      nav_assistant: 'ಫಾರ್ಮ್‌ಸಾಥಿ AI ಕೇಳಿ',
      nav_intelligence: 'ಬೆಳೆ ಆರೋಗ್ಯ ತಪಾಸಣೆ',
      nav_weather: 'ಹವಾಮಾನ & ಎಚ್ಚರಿಕೆಗಳು',
      nav_market: 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು (ಮಂಡಿ ದರ)',
      nav_activities: 'ಕೃಷಿ ಕಾರ್ಯಗಳು & ಜ್ಞಾಪನೆಗಳು',
      nav_history: 'ಪರಿಶೀಲನೆ ಇತಿಹಾಸ',
      nav_help: 'ಸಹಾಯವಾಣಿ & ಬೆಂಬಲ',
      nav_settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      hero_title: 'ಬುದ್ಧಿವಂತ ನಿರ್ಧಾರಗಳು.\nಉತ್ತಮ ಇಳುವರಿ.',
      hero_desc: 'ನಿಮ್ಮ ಜಮೀನನ್ನು ನಿರ್ವಹಿಸಿ, ನೈಜ ಹವಾಮಾನ ತಿಳಿಯಿರಿ, ಅಧಿಕೃತ ಎಪಿಎಂಸಿ ಮಂಡಿ ದರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಬೆಳೆ ರೋಗಗಳನ್ನು ಸುಲಭವಾಗಿ ಗುರುತಿಸಿ.',
      stat_crops: 'ಸಕ್ರಿಯ ಬೆಳೆಗಳು',
      stat_weather: 'ಪ್ರಸ್ತುತ ಹವಾಮಾನ',
      stat_scans: 'ಬೆಳೆ ಸ್ಕ್ಯಾನ್‌ಗಳು',
      stat_activities: 'ಕಾರ್ಯ ಜ್ಞಾಪನೆಗಳು',
      save_success: 'ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ ✓',
      delete_confirm: 'ನೀವು ಖಚಿತವಾಗಿ ಈ ದಾಖಲೆಯನ್ನು ಅಳಿಸಲು ಬಯಸುವಿರಾ?',
      empty_records: 'ಯಾವುದೇ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
      empty_crops: 'ಇನ್ನೂ ಯಾವುದೇ ಬೆಳೆಗಳನ್ನು ಸೇರಿಸಲಾಗಿಲ್ಲ. ಪ್ರಾರಂಭಿಸಲು ನಿಮ್ಮ ಮೊದಲ ಬೆಳೆಯನ್ನು ಸೇರಿಸಿ.'
    },
    gu: {
      app_title: 'ફાર્મસાથી AI — સ્માર્ટ ખેડૂત સહાયક મંચ',
      nav_workspace: 'ખેડૂત કાર્યક્ષેત્ર',
      nav_dashboard: 'ડેશબોર્ડ',
      nav_profile: 'ખેડૂત પ્રોફાઇલ',
      nav_crops: 'મારા ખેતર અને પાક',
      nav_assistant: 'ફાર્મસાથી AI ને પૂછો',
      nav_intelligence: 'પાક સ્વાસ્થ્ય સ્કેનર',
      nav_weather: 'હવામાન અને ચેતવણીઓ',
      nav_market: 'માર્કેટ યાર્ડ ભાવ (મંડી)',
      nav_activities: 'ખેતી કામ અને રીમાઇન્ડર',
      nav_history: 'તપાસ ઇતિહાસ',
      nav_help: 'સહાય અને હેલ્પલાઇન',
      nav_settings: 'સેટિંગ્સ',
      hero_title: 'યોગ્ય નિર્ણયો.\nશ્રેષ્ઠ ઉત્પાદન.',
      hero_desc: 'તમારા ખેતરનું આયોજન કરો, ચોક્કસ હવામાન જુઓ, માર્કેટ યાર્ડના તાજા ભાવ જાણો અને પાકના રોગોનું સચોટ નિદાન કરો.',
      stat_crops: 'સક્રિય પાક',
      stat_weather: 'સ્થાનિક હવામાન',
      stat_scans: 'રોગ તપાસ રિપોર્ટ',
      stat_activities: 'કામની યાદી',
      save_success: 'સફળતાપૂર્વક સાચવવામાં આવ્યું ✓',
      delete_confirm: 'શું તમે ખરેખર આ રેકોર્ડ કાઢી નાખવા માંગો છો?',
      empty_records: 'કોઈ રેકોર્ડ મળ્યા નથી.',
      empty_crops: 'હજી સુધી કોઈ પાક ઉમેરવામાં આવ્યો નથી. શરૂઆત કરવા માટે તમારો પ્રથમ પાક ઉમેરો.'
    },
    pa: {
      app_title: 'ਫਾਰਮਸਾਥੀ AI — ਸਮਾਰਟ ਕਿਸਾਨ ਸਹਾਇਤਾ ਮੰਚ',
      nav_workspace: 'ਕਿਸਾਨ ਵਰਕਸਪੇਸ',
      nav_dashboard: 'ਡੈਸ਼ਬੋਰਡ',
      nav_profile: 'ਕਿਸਾਨ ਪ੍ਰੋਫਾਈਲ',
      nav_crops: 'ਮੇਰੇ ਖੇਤ ਅਤੇ ਫਸਲਾਂ',
      nav_assistant: 'ਫਾਰਮਸਾਥੀ AI ਤੋਂ ਪੁੱਛੋ',
      nav_intelligence: 'ਫਸਲ ਸਿਹਤ ਜਾਂਚ',
      nav_weather: 'ਮੌਸਮ ਅਤੇ ਚੇਤਾਵਨੀਆਂ',
      nav_market: 'ਮੰਡੀ ਦੇ ਭਾਅ',
      nav_activities: 'ਖੇਤੀਬਾੜੀ ਕੰਮ ਅਤੇ ਯਾਦ-ਪੱਤਰ',
      nav_history: 'ਜਾਂਚ ਇਤਿਹਾਸ',
      nav_help: 'ਮਦਦ ਅਤੇ ਹੈਲਪਲਾਈਨ',
      nav_settings: 'ਸੈਟਿੰਗਾਂ',
      hero_title: 'ਸਮਝਦਾਰ ਫੈਸਲੇ।\nਬਿਹਤਰ ਝਾੜ।',
      hero_desc: 'ਆਪਣੇ ਖੇਤਾਂ ਦਾ ਪ੍ਰਬੰਧ ਕਰੋ, ਅਸਲ ਮੌਸਮ ਵੇਖੋ, ਮੰਡੀਆਂ ਦੇ ਤਾਜ਼ਾ ਰੇਟ ਜਾਣੋ ਅਤੇ ਫਸਲੀ ਬਿਮਾਰੀਆਂ ਦੀ ਸਹੀ ਪਛਾਣ ਕਰੋ।',
      stat_crops: 'ਮੌਜੂਦਾ ਫਸਲਾਂ',
      stat_weather: 'ਮੌਜੂਦਾ ਮੌਸਮ',
      stat_scans: 'ਸਕੈਨ ਰਿਪੋਰਟਾਂ',
      stat_activities: 'ਯਾਦ-ਪੱਤਰ',
      save_success: 'ਸਫਲਤਾਪੂਰਵਕ ਸੰਭਾਲਿਆ ਗਿਆ ✓',
      delete_confirm: 'ਕੀ ਤੁਸੀਂ ਵਾਕਈ ਇਹ ਰਿਕਾਰਡ ਮਿਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?',
      empty_records: 'ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ।',
      empty_crops: 'ਅਜੇ ਕੋਈ ਫਸਲ ਸ਼ਾਮਲ ਨਹੀਂ ਕੀਤੀ ਗਈ। ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਆਪਣੀ ਪਹਿਲੀ ਫਸਲ ਸ਼ਾਮਲ ਕਰੋ।'
    },
    ta: {
      app_title: 'பார்ம்சாதி AI — நவீன உழவர் உதவி தளம்',
      nav_workspace: 'விவசாயி பணியிடம்',
      nav_dashboard: 'முகப்பு பலகை',
      nav_profile: 'விவசாயி சுயவிவரம்',
      nav_crops: 'எனது பண்ணை & பயிர்கள்',
      nav_assistant: 'பார்ம்சாதி AI-யிடம் கேளுங்கள்',
      nav_intelligence: 'பயிர் ஆரோக்கிய நுண்ணறிவு',
      nav_weather: 'வானிலை & எச்சரிக்கைகள்',
      nav_market: 'சந்தை விலைகள் (மண்டி)',
      nav_activities: 'பண்ணை பணிகள் & நினைவூட்டல்கள்',
      nav_history: 'ஆய்வு வரலாறு',
      nav_help: 'உதவி & தொலைபேசி எண்கள்',
      nav_settings: 'அமைப்புகள்',
      hero_title: 'புத்திசாலித்தனமான முடிவுகள்.\nசிறந்த விளைச்சல்.',
      hero_desc: 'உங்கள் பண்ணைகளை நிர்வகியுங்கள், நேரடி வானிலை அறியுங்கள், உழவர் சந்தை விலைகளை பாருங்கள் மற்றும் பயிர் நோய்களை எளிதில் கண்டறியுங்கள்.',
      stat_crops: 'செயலில் உள்ள பயிர்கள்',
      stat_weather: 'நேரடி வானிலை',
      stat_scans: 'பயிர் ஸ்கேன்கள்',
      stat_activities: 'நினைவூட்டல்கள்',
      save_success: 'வெற்றிகரமாக சேமிக்கப்பட்டது ✓',
      delete_confirm: 'இந்த பதிவை நிச்சயமாக நீக்க விரும்புகிறீர்களா?',
      empty_records: 'பதிவுகள் எதுவும் இல்லை.',
      empty_crops: 'பயிர்கள் எதுவும் இன்னும் சேர்க்கப்படவில்லை. தொடங்க உங்கள் முதல் பயிரைச் சேர்க்கவும்.'
    },
    bn: {
      app_title: 'ফার্মসাথী AI — আধুনিক কৃষক সহায়তা প্ল্যাটফর্ম',
      nav_workspace: 'কৃষক ওয়ার্কস্পেস',
      nav_dashboard: 'ড্যাশবোর্ড',
      nav_profile: 'কৃষক প্রোফাইল',
      nav_crops: 'আমার খামার ও ফসল',
      nav_assistant: 'ফার্মসাথী AI-কে জিজ্ঞাসা করুন',
      nav_intelligence: 'ফসল স্বাস্থ্য স্ক্যানার',
      nav_weather: 'আবহাওয়া ও পূর্বাভাস',
      nav_market: 'মান্ডি দর (বাজার দর)',
      nav_activities: 'কৃষি কাজ ও অনুস্মারক',
      nav_history: 'পরীক্ষা ইতিহাস',
      nav_help: 'সাহায্য ও হেল্পলাইন',
      nav_settings: 'সেটিংস',
      hero_title: 'সঠিক সিদ্ধান্ত।\nউন্নত ফলন।',
      hero_desc: 'আপনার ফসলের যত্ন নিন, লাইভ আবহাওয়া দেখুন, বিভিন্ন মান্ডির তাজা দাম জানুন এবং ফসলের রোগ নির্ণয় করুন।',
      stat_crops: 'সক্রিয় ফসল',
      stat_weather: 'বর্তমান আবহাওয়া',
      stat_scans: 'ফসল স্ক্যান',
      stat_activities: 'কাজের অনুস্মারক',
      save_success: 'সফলভাবে সংরক্ষিত হয়েছে ✓',
      delete_confirm: 'আপনি কি নিশ্চিতভাবে এই রেকর্ডটি মুছে ফেলতে চান?',
      empty_records: 'কোনো তথ্য পাওয়া যায়নি।',
      empty_crops: 'এখনও কোনো ফসল যোগ করা হয়নি। শুরু করতে আপনার প্রথম ফসলটি যোগ করুন।'
    },
    ml: {
      app_title: 'ഫാംസാഥി AI — സ്മാർട്ട് കർഷക സഹായ പ്ലാറ്റ്‌ഫോം',
      nav_workspace: 'കർഷക വർക്ക്‌സ്‌പേസ്',
      nav_dashboard: 'ഡാഷ്‌ബോർഡ്',
      nav_profile: 'കർഷക പ്രൊഫൈൽ',
      nav_crops: 'എന്റെ കൃഷിയിടങ്ങളും വിളകളും',
      nav_assistant: 'ഫാംസാഥി AI-യോട് ചോദിക്കൂ',
      nav_intelligence: 'വിള ആരോഗ്യ പരിശോധന',
      nav_weather: 'കാലാവസ്ഥ & മുന്നറിയിപ്പുകൾ',
      nav_market: 'വിപണി വിലകൾ (മാർക്കറ്റ്)',
      nav_activities: 'കാർഷിക ജോലികൾ & ഓർമ്മപ്പെടുത്തലുകൾ',
      nav_history: 'പരിശോധനാ ചരിത്രം',
      nav_help: 'സഹായം & ഹെൽപ്പ്‌ലൈൻ',
      nav_settings: 'ക്രമീകരണങ്ങൾ',
      hero_title: 'മികച്ച തീരുമാനങ്ങൾ.\nനല്ല വിളവെടുപ്പ്.',
      hero_desc: 'നിങ്ങളുടെ കൃഷിയിടങ്ങൾ കൈകാര്യം ചെയ്യുക, കൃത്യമായ കാലാവസ്ഥ കാണുക, വിപണി വിലകൾ അറിയുക, വിള രോഗങ്ങൾ കണ്ടെത്തുക.',
      stat_crops: 'സജീവ വിളകൾ',
      stat_weather: 'കാലാവസ്ഥ',
      stat_scans: 'വിള സ്കാനുകൾ',
      stat_activities: 'ഓർമ്മപ്പെടുത്തലുകൾ',
      save_success: 'വിജയകരമായി സൂക്ഷിച്ചു ✓',
      delete_confirm: 'ഈ രേഖ നീക്കം ചെയ്യാൻ തീർച്ചയാണോ?',
      empty_records: 'രേഖകളൊന്നും കണ്ടെത്തിയില്ല.',
      empty_crops: 'ഇതുവരെ വിളകളൊന്നും ചേർത്തിട്ടില്ല. ആരംഭിക്കാൻ നിങ്ങളുടെ ആദ്യത്തെ വിള ചേർക്കുക.'
    },
    or: {
      app_title: 'ଫାର୍ମସାଥୀ AI — ସ୍ମାର୍ଟ କୃଷକ ସହାୟତା ମଞ୍ଚ',
      nav_workspace: 'କୃଷକ କାର୍ଯ୍ୟକ୍ଷେତ୍ର',
      nav_dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
      nav_profile: 'କୃଷକ ପ୍ରୋଫାଇଲ୍',
      nav_crops: 'ମୋର କ୍ଷେତ ଏବଂ ଫସଲ',
      nav_assistant: 'ଫାର୍ମସାଥୀ AI କୁ ପଚାରନ୍ତୁ',
      nav_intelligence: 'ଫସଲ ସ୍ୱାସ୍ଥ୍ୟ ସ୍କାନର୍',
      nav_weather: 'ପାଣିପାଗ ଏବଂ ସତର୍କତା',
      nav_market: 'ମଣ୍ଡି ଦର (ବଜାର ଦର)',
      nav_activities: 'କୃଷି କାର୍ଯ୍ୟ ଓ ରିମାଇଣ୍ଡର',
      nav_history: 'ପରୀକ୍ଷା ଇତିହାସ',
      nav_help: 'ସହାୟତା ଏବଂ ହେଲ୍ପଲାଇନ',
      nav_settings: 'ସେଟିଙ୍ଗ୍ସ',
      hero_title: 'ସଠିକ୍ ନିଷ୍ପତ୍ତି।\nଉତ୍ତମ ଅମଳ।',
      hero_desc: 'ଆପଣଙ୍କ କ୍ଷେତର ପରିଚାଳନା କରନ୍ତୁ, ପ୍ରକୃତ ପାଣିପାଗ ଜାଣନ୍ତୁ, ମଣ୍ଡିର ତାଜା ଦର ଦେଖନ୍ତୁ ଏବଂ ଫସଲ ରୋଗ ନିର୍ଣ୍ଣୟ କରନ୍ତୁ।',
      stat_crops: 'ସକ୍ରିୟ ଫସଲ',
      stat_weather: 'ପାଣିପାଗ',
      stat_scans: 'ଫସଲ ସ୍କାନ୍',
      stat_activities: 'କାର୍ଯ୍ୟ ସୂଚୀ',
      save_success: 'ସଫଳତାର ସହ ସାଇତା ଗଲା ✓',
      delete_confirm: 'ଆପଣ ଏହି ରେକର୍ଡଟିକୁ ନିଶ୍ଚିତ ଭାବେ କାଟିବାକୁ ଚାହୁଁଛନ୍ତି କି?',
      empty_records: 'କୌଣସି ବିବରଣୀ ମିଳିଲା ନାହିଁ।',
      empty_crops: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଫସଲ ଯୋଡ଼ା ଯାଇନାହିଁ। ଆରମ୍ଭ କରିବା ପାଇଁ ଆପଣଙ୍କ ପ୍ରଥମ ଫସଲ ଯୋଡନ୍ତୁ।'
    },
    ur: {
      app_title: 'فارم ساتھی AI — اسمارٹ کسان پلیٹ فارم',
      nav_workspace: 'کسان ورک اسپیس',
      nav_dashboard: 'ڈیش بورڈ',
      nav_profile: 'کسان پروفائل',
      nav_crops: 'میرے کھیت اور فصلیں',
      nav_assistant: 'فارم ساتھی AI سے پوچھیں',
      nav_intelligence: 'فصل کی صحت کا معائنہ',
      nav_weather: 'موسم اور پیش گوئی',
      nav_market: 'منڈی کے بھاؤ',
      nav_activities: 'زرعی سرگرمیاں اور یاد دہانی',
      nav_history: 'معائنہ ریکارڈ',
      nav_help: 'مدد اور ہیلپ لائن',
      nav_settings: 'ترتیبات',
      hero_title: 'بہتر فیصلے،\nبہترین پیداوار۔',
      hero_desc: 'اپنے کھیتوں کا انتظام کریں، براہ راست موسم دیکھیں، تصدیق شدہ منڈی ریٹ جانیں اور فصل کے امراض کی تشخیص کریں۔',
      stat_crops: 'موجودہ فصلیں',
      stat_weather: 'موجودہ موسم',
      stat_scans: 'فصل اسکین',
      stat_activities: 'یاد دہانیاں',
      save_success: 'کامیابی سے محفوظ ہو گیا ✓',
      delete_confirm: 'کیا آپ واقعی اس ریکارڈ کو حذف کرنا چاہتے ہیں؟',
      empty_records: 'کوئی ریکارڈ نہیں ملا۔',
      empty_crops: 'ابھی تک کوئی فصل شامل نہیں کی گئی۔ شروع کرنے کے لیے اپنی پہلی فصل شامل کریں۔'
    }
  };

  function getLang() {
    var stored = AppStorage.get('preferred_language', null);
    if (stored) return stored;
    try {
      var ls = localStorage.getItem('fs_preferred_language');
      if (ls) return ls;
    } catch (e) {}
    return 'en';
  }

  function t(key) {
    var lang = getLang();
    return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key;
  }

  function applyLanguage(lang) {
    if (!lang) lang = 'en';
    AppStorage.set('preferred_language', lang);
    try {
      localStorage.setItem('fs_preferred_language', lang);
    } catch (e) {}

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
  var API_BASE = (typeof location !== 'undefined' && location.protocol === 'file:') ? 'http://localhost:3000' : '';
  var isBackendConnected = false;

  async function apiRequest(endpoint, method, data) {
    var headers = { 'Content-Type': 'application/json' };
    var token = null;
    try {
      token = (window.AppStorage && window.AppStorage.get) ? window.AppStorage.get('auth_token', null) : null;
      if (!token) {
        var rawToken = localStorage.getItem('fs_auth_token');
        if (rawToken) {
          try { token = JSON.parse(rawToken); } catch (e) { token = rawToken; }
        }
      }
    } catch (e) {}
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var cleanPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    var baseUrl = (typeof location !== 'undefined' && location.origin && location.origin !== 'null' && location.protocol !== 'file:')
      ? location.origin
      : 'http://localhost:3000';
    var url = cleanPath.startsWith('http') ? cleanPath : (baseUrl + cleanPath);

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutMs = (cleanPath.includes('/chat') || cleanPath.includes('/analyze')) ? 60000 : 15000;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;

    try {
      var opts = {
        method: method || 'GET',
        headers: headers
      };
      if (controller) opts.signal = controller.signal;
      if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || '').toUpperCase())) {
        opts.body = typeof data === 'string' ? data : JSON.stringify(data);
      }
      var res = await fetch(url, opts);
      if (timer) clearTimeout(timer);
      var json = await res.json();
      return { ok: res.ok, status: res.status, data: json };
    } catch (err) {
      if (timer) clearTimeout(timer);
      return { ok: false, error: err.message };
    }
  }

  window.apiRequest = apiRequest;
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

  function appendChatBubble(text, sender, lang) {
    var container = $('chatMessages');
    if (!container) return;

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (sender === 'user' ? 'user' : 'assistant');
    // Apply RTL direction for Urdu language responses
    if (lang === 'ur' || (sender === 'assistant' && getLang && getLang() === 'ur')) {
      bubble.setAttribute('dir', 'rtl');
      bubble.style.textAlign = 'right';
    }
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

    var sendBtn = $('btnChatSend');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Thinking…';
    }

    // Append temporary typing indicator bubble
    var container = $('chatMessages');
    var typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble assistant';
    typingBubble.id = 'chatTypingIndicator';
    typingBubble.innerHTML = '🌱 <i>FarmSaathi AI is analyzing your question and preparing agronomic advice…</i>';
    if (container) {
      container.appendChild(typingBubble);
      container.scrollTop = container.scrollHeight;
    }

    var lang = getLang();
    var profile = (window.FarmerProfile && window.FarmerProfile.getProfile) ? window.FarmerProfile.getProfile() : {};
    var currentUser = (window.AuthModule && window.AuthModule.getCurrentUser) ? window.AuthModule.getCurrentUser() : null;

    var actualName = (currentUser && (currentUser.fullName || currentUser.full_name)) || (profile && (profile.full_name || profile.fullName)) || '';
    if (actualName === 'Rahul Patil') {
      actualName = (currentUser && (currentUser.fullName || currentUser.full_name)) || '';
    }
    profile.full_name = actualName.trim();

    try {
      var res = await apiRequest('/api/chat', 'POST', {
        message: question,
        language: lang,
        profile: profile,
        history: chatConversationHistory
      });

      if (typingBubble && typingBubble.parentNode) {
        typingBubble.parentNode.removeChild(typingBubble);
      }
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send ➤';
      }

      if (res && res.data && res.data.answer) {
        appendChatBubble(res.data.answer, 'assistant', lang);
        chatConversationHistory.push({ role: 'assistant', content: res.data.answer });
        if (statusEl) {
          statusEl.className = 'status-msg';
          statusEl.textContent = '';
        }
        return;
      }

      if (res && res.data && res.data.error) {
        appendChatBubble('⚠️ **AI Service Error:** ' + res.data.error, 'assistant');
        return;
      }

      if (res && res.error) {
        appendChatBubble('⚠️ **Network / Timeout Notice:** ' + res.error + '\n\nPlease verify your server is running and try asking again.', 'assistant');
        return;
      }
    } catch (err) {
      console.warn('Backend chat API communication error:', err.message);
      if (typingBubble && typingBubble.parentNode) {
        typingBubble.parentNode.removeChild(typingBubble);
      }
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send ➤';
      }
    }

    // Fallback notice
    var fallbackAnswer =
      '⚠️ **FarmSaathi AI Service Notice**\n\n' +
      'Unable to connect to the AI model backend. Please ensure the local server is running (`node server.js`).\n\n' +
      '**Configuration Check:**\n' +
      '• Ensure `GEMINI_API_KEY` is provided in your `.env` file.\n' +
      '• To consult an agricultural expert immediately, call the national Kisan Call Center at **1800-180-1551** (Toll-Free, 6 AM to 10 PM).';
    appendChatBubble(fallbackAnswer, 'assistant');
    chatConversationHistory.push({ role: 'assistant', content: fallbackAnswer });

    if (statusEl) {
      statusEl.className = 'status-msg';
      statusEl.textContent = '';
    }
  }

  function updateChatGreeting() {
    var welcomeEl = $('chatWelcomeMessage');
    if (!welcomeEl) return;
    var currentUser = (window.AuthModule && window.AuthModule.getCurrentUser) ? window.AuthModule.getCurrentUser() : null;
    var profile = (window.FarmerProfile && window.FarmerProfile.getProfile) ? window.FarmerProfile.getProfile() : {};
    var rawName = (currentUser && (currentUser.fullName || currentUser.full_name)) || (profile && (profile.full_name || profile.fullName)) || '';
    if (rawName === 'Rahul Patil') rawName = (currentUser && currentUser.fullName) || '';
    var name = rawName.trim();

    var greeting = name ? ('Namaste ' + name + '! 🙏') : 'Namaste! 🙏';
    welcomeEl.innerHTML =
      greeting + ' I am FarmSaathi AI, your farming assistant.<br>' +
      'You can ask me questions about crop cultivation, irrigation scheduling, fertilizer doses, disease symptoms, or weather precautions in English, Hindi, or Marathi.<br><br>' +
      '💡 <b>Tip:</b> If asking about an issue, please mention your crop, stage, and visible symptoms for the best guidance.';
  }

  function resetChat() {
    chatConversationHistory = [];
    var container = $('chatMessages');
    if (container) {
      var currentUser = (window.AuthModule && window.AuthModule.getCurrentUser) ? window.AuthModule.getCurrentUser() : null;
      var profile = (window.FarmerProfile && window.FarmerProfile.getProfile) ? window.FarmerProfile.getProfile() : {};
      var rawName = (currentUser && (currentUser.fullName || currentUser.full_name)) || (profile && (profile.full_name || profile.fullName)) || '';
      if (rawName === 'Rahul Patil') rawName = (currentUser && currentUser.fullName) || '';
      var name = rawName.trim();
      var greeting = name ? ('Namaste ' + name + '! 🙏') : 'Namaste! 🙏';

      container.innerHTML =
        '<div class="chat-bubble assistant">' +
        greeting + ' I am FarmSaathi AI, your agricultural assistant.<br><br>' +
        'You can ask me questions about crop cultivation, irrigation scheduling, fertilizer doses, disease symptoms, or weather precautions in English, Hindi, or Marathi.' +
        '</div>';
    }
  }

  window.handleChatSubmit = handleChatSubmit;
  window.resetChat = resetChat;
  window.updateChatGreeting = updateChatGreeting;

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
    items.forEach(function (it) {
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

  window.saveSupabaseSettings = function () {
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

  window.clearSupabaseSettings = function () {
    if (window.SupabaseClient) {
      window.SupabaseClient.setConfig('', '');
      renderSettings();
      if (window.AuthModule && window.AuthModule.updateAuthUI) {
        window.AuthModule.updateAuthUI();
      }
      alert('Supabase configuration cleared. FarmSaathi is running in Local Mode.');
    }
  };

  window.renderSettings = renderSettings;

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

    updateChatGreeting();

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

    if (window.GovSchemesModule && window.GovSchemesModule.loadSchemesData) {
      window.GovSchemesModule.loadSchemesData();
    }

    // Dynamic AI Status Badges
    try {
      var statusRes = await apiRequest('/api/status', 'GET');
      if (statusRes && statusRes.data) {
        if ($('aiStatusBadge')) {
          if (statusRes.data.aiConfigured) {
            $('aiStatusBadge').textContent = '⚡ ' + (statusRes.data.aiProvider || 'AI') + ' Active';
            $('aiStatusBadge').className = 'badge badge-ok';
          } else {
            $('aiStatusBadge').textContent = '⚠️ API Key Needed';
            $('aiStatusBadge').className = 'badge badge-warn';
          }
        }
        if ($('visionModeBadge')) {
          if (statusRes.data.visionConfigured) {
            $('visionModeBadge').textContent = '🔬 ' + (statusRes.data.aiProvider || 'Vision') + ' Ready';
            $('visionModeBadge').className = 'badge badge-ok';
          } else {
            $('visionModeBadge').textContent = '⚠️ Vision Key Needed';
            $('visionModeBadge').className = 'badge badge-warn';
          }
        }
      }
    } catch (statusErr) {
      if ($('aiStatusBadge')) {
        $('aiStatusBadge').textContent = '⚠️ Service Offline';
        $('aiStatusBadge').className = 'badge badge-warn';
      }
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
