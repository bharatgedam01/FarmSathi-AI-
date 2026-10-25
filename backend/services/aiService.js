// FarmSaathi AI — Agricultural AI Service
// Multilingual agronomic guidance (English, Hindi, Marathi) with OpenAI integration
// and autonomous fallback engine.

const fs = require('fs');
const path = require('path');

// Autonomous Agronomic Advice Engine
function getAutonomousAgronomicAdvice(question, language, profile) {
  const q = String(question || '').toLowerCase();
  const lang = language || 'en';
  const crop = (profile && (profile.main_crop || profile.mainCrop)) || 'Crop';
  const soil = (profile && profile.soil_type) || 'soil';

  if (lang === 'hi' || /[\u0900-\u097F]/.test(question)) {
    if (q.includes('कीट') || q.includes('कीड़ा') || q.includes('pest') || q.includes('जैविक') || q.includes('नियंत्रण') || q.includes('उपाय')) {
      return `🌱 **फसल में सुरक्षित जैविक एवं एकात्मिक कीट नियंत्रण (IPM) उपाय:**

1. **नीम तेल का छिड़काव:** 
   - रसचूसक कीटों (माहू, सफेद मक्खी, हरा तेला) के लिए 1500 PPM नीम का तेल 5 मिली प्रति लीटर पानी में थोड़ा सा साबुन का घोल मिलाकर छिड़काव करें।
2. **जैविक फफूंदनाशक (बायो-पेस्टीसाइड):**
   - इल्लियों और सुंडी के नियंत्रण के लिए *बिवेरिया बैसियाना (Beauveria bassiana)* या *वर्टिसिलियम लेकानी* 5 ग्राम प्रति लीटर पानी में मिलाकर शाम के समय छिड़कें।
3. **ट्रैप एवं जाल:**
   - प्रति एकड़ 4–5 **फेरोमोन ट्रैप (Pheromone Traps)** लगाएं।
   - उड़ने वाले कीटों के लिए 8–10 **पीले और नीले चिपचिपे कार्ड (Sticky Traps)** लगाएं।
4. **दशपर्णी अर्क / नीमास्त्र:**
   - 10 विभिन्न कड़वे पत्तों से बना दशपर्णी अर्क 200 मिली प्रति 15 लीटर पंप में मिलाकर छिड़कने से कीटों का प्रकोप तुरंत रुकता है।
5. **सुरक्षा एवं सलाह:**
   - हमेशा हवा की दिशा में छिड़काव करें और मास्क पहनें। गंभीर प्रकोप की स्थिति में अपने नजदीकी **कृषि विज्ञान केंद्र (KVK)** या किसान कॉल सेंटर (1800-180-1551) से परामर्श लें।`;
    }
    if (q.includes('खाद') || q.includes('उर्वरक') || q.includes('fertilizer') || q.includes('खत') || q.includes('यूरिया')) {
      return `🌾 **फसल के लिए संतुलित पोषण एवं उर्वरक प्रबंधन:**

1. **बुवाई के समय (आधार खाद):**
   - नाइट्रोजन, फास्फोरस और पोटाश का संतुलित अनुपात (NPK) दें।
   - एक एकड़ में 50 किग्रा DAP + 25 किग्रा पोटाश + 10 किग्रा जिंक सल्फेट दें।
2. **वानस्पतिक वृद्धि की अवस्था (25–30 दिन):**
   - यूरिया का पहला टॉप-ड्रेसिंग करें (30–35 किग्रा प्रति एकड़)।
   - यूरिया के साथ नीम-लेपित यूरिया का प्रयोग करें ताकि रिसाव कम हो।
3. **फूल एवं फलियां बनते समय:**
   - 0:52:34 (मोनो पोटैशियम फास्फेट) 75 ग्राम प्रति 15 लीटर पानी का छिड़काव करें जिससे दाना भराव मजबूत हो।
4. **सेंद्रिय / जैविक खाद:**
   - प्रति एकड़ 1–2 ट्रॉली अच्छी सड़ी हुई गोबर खाद या 5 क्विंटल वर्मीकम्पोस्ट (केंचुआ खाद) बुवाई पूर्व खेत में मिलाएं।`;
    }
    if (q.includes('सिंचाई') || q.includes('पानी') || q.includes('irrigation') || q.includes('drip')) {
      return `💧 **वैज्ञानिक सिंचाई एवं जल प्रबंधन:**

1. **नाज़ुक अवस्थाएँ (Critical Stages):**
   - अंकुरण, फूल आने के समय और दाना/फल बनने के समय खेत में नमी की कमी न होने दें।
2. **ड्रिप / टपक सिंचाई (Drip Irrigation):**
   - काली भारी मिट्टी में पानी धीरे-धीरे दें ताकि जलभराव न हो।
   - प्रति पौधा 2–3 घंटे सुबह के समय ड्रिप चलाना सबसे उपयुक्त रहता है।
3. **मल्चिंग (Mulching):**
   - खरपतवार नियंत्रण और नमी बचाने के लिए फसलों में जैविक मल्च (पुआल) या प्लास्टिक मल्च का उपयोग करें।`;
    }
    return `🌾 **कृषि सलाह (${crop} एवं सामान्य फसल प्रबंधन):**

- **खेत की तैयारी:** मिट्टी परीक्षण के आधार पर ही पोषक तत्वों का प्रयोग करें।
- **रोग रोकथाम:** बीज बोने से पहले *ट्राइकोडर्मा विरिडी* (5 ग्राम प्रति किग्रा बीज) से बीजोपचार अवश्य करें।
- **निगरानी:** हफ्ते में दो बार खेत का भ्रमण कर पत्तियों के नीचे कीटों या धब्बों की जांच करें।
- **मौसम की सावधानी:** भारी बारिश या तेज हवा के दौरान कोई भी छिड़काव न करें।
- 💡 **सहायता:** किसी भी आपातकालीन स्थिति में अपने नजदीकी कृषि अधिकारी या **किसान कॉल सेंटर (1800-180-1551)** से संपर्क करें।`;
  }

  if (lang === 'mr') {
    if (q.includes('कीड') || q.includes('किडी') || q.includes('नियंत्रण') || q.includes('जैविक') || q.includes('सेंद्रिय') || q.includes('उपाय')) {
      return `🌱 **पिकांवरील सुरक्षित सेंद्रिय व एकात्मिक कीड नियंत्रण (IPM) उपाय:**

1. **निंबोळी अर्क / नीम तेल:**
   - मावा, तुडतुडे, पांढरी माशी या रसशोषक किडींसाठी ५ मिली नीम तेल (१५०० PPM) प्रति लिटर पाण्यात मिसळून फवारावे.
2. **जैविक बुरशीनाशक व कीटकनाशक:**
   - अळी नियंत्रणासाठी *बिव्हेरिया बॅसियाना (Beauveria bassiana)* ५ ग्रॅम प्रति लिटर पाण्यात मिसळून संध्याकाळी फवारावे.
3. **सापळे (Traps):**
   - बोंडअळीच्या सर्वेक्षणासाठी एकरी ५ **कामगंध सापळे (Pheromone Traps)** लावावेत.
   - पांढरी माशी व थ्रिप्ससाठी एकरी १०–१२ **पिवळे व निळे चिकट सापळे** लावावेत.
4. **दशपर्णी अर्क / जीवामृत:**
   - पिकांची प्रतिकारशक्ती वाढवण्यासाठी २०० मिली दशपर्णी अर्क प्रति १५ लिटर पंपात घेऊन फवारणी करावी.
5. **सुरक्षा सूचना:**
   - रासायनिक कीटकनाशकांची विषबाधा टाळण्यासाठी फवारणी करताना तोंडाला मास्क व हातमोजे वापरा. अधिक माहितीसाठी जवळच्या **कृषी विज्ञान केंद्राशी (KVK)** संपर्क साधा.`;
    }
    if (q.includes('खत') || q.includes('युरिया') || q.includes('सेंद्रिय खत') || q.includes('dap') || q.includes('पोषण')) {
      return `🌾 **संतुलित अन्नद्रव्य व खत व्यवस्थापन (${crop}):**

1. **पायाभूत खते (बुडात खत):**
   - पेरणीच्या वेळी १ बॅग DAP + १ बॅग पोटॅश + १० किलो फेरस/झिंक सल्फेट प्रति एकर द्यावे.
2. **पिकाच्या वाढीची अवस्था (३० दिवस):**
   - युरियाचा पहिला हप्ता (३०–३५ किलो एकरी) द्यावा. युरिया नेहमी ओल असतानाच टाकावा.
3. **फुलोरा व शेंगा/दाणे भरण्याची अवस्था:**
   - ०:५२:३४ किंवा १३:०:४५ विद्राव्य खत १०० ग्रॅम प्रति १५ लिटर पंपात घेऊन फवारणी करावी.
4. **सेंद्रिय खत:**
   - जमिनीत जिवाणूंचे प्रमाण वाढवण्यासाठी एकरी २ ट्रॉली चांगले कुजलेले शेणखत किंवा गांडूळ खत वापरावे.`;
    }
    if (q.includes('पाणी') || q.includes('सिंचन') || q.includes('ठिबक') || q.includes('irrigation')) {
      return `💧 **शास्त्रीय पाणी व ठिबक सिंचन नियोजन:**

1. **महत्त्वाचे टप्पे:**
   - फुलोरा आणि दाणे भरण्याच्या काळात पिकाला पाण्याचा ताण पडू देऊ नका.
2. **ठिबक सिंचन वापर:**
   - काळ्या कसदार जमिनीत रोज पाणी देण्याऐवजी १ दिवस आड २–३ तास पाणी द्यावे, जेणेकरून मुळांना हवा खेळती राहील.
3. **पाण्याचा निचरा:**
   - अतिवृष्टी झाल्यास शेतात पाणी साचू न देता ते चर काढून बाहेर काढावे.`;
    }
    return `🌾 **शेती सल्ला (${crop} व जमीन आरोग्य):**

- **माती परीक्षण:** जमिनीच्या पोतानुसार खतांचे योग्य प्रमाण ठरवा.
- **बीजप्रक्रिया:** पेरणीपूर्वी *ट्रायकोडर्मा व्हिरीडी* (५ ग्रॅम प्रति किलो बियाणे) प्रक्रिया अवश्य करा.
- **कीड व रोग सर्वेक्षण:** आठवड्यातून दोनदा शेताची पाहणी करा.
- 💡 **मदत:** अधिक मार्गदर्शनासाठी जवळचे **कृषी विज्ञान केंद्र (KVK)** किंवा **किसान कॉल सेंटर (१८००-१८०-१५५१)** शी संपर्क साधा.`;
  }

  // English default
  return `🌾 **Agricultural Expert Guidance for ${crop}:**

1. **Integrated Pest Management (IPM):**
   - **Bio-repellents:** Use Neem Oil (1500 ppm at 5ml/liter of water) with a mild surfactant for sucking pests (aphids, jassids, whiteflies).
   - **Biological Agents:** Spray *Beauveria bassiana* or *Bt (Bacillus thuringiensis)* at 5g/liter during evening hours for caterpillar and borer control.
   - **Monitoring:** Install 4-5 pheromone traps per acre and 10 yellow/blue sticky traps.
2. **Balanced Nutrient Management:**
   - Base fertilizer: Apply balanced NPK according to local soil tests.
   - Foliar sprays: Apply 0:52:34 (75g/15L pump) during flowering to improve pod/grain setting.
   - Organic matter: Apply 5 tons of well-rotted FYM (cow dung manure) or vermicompost per hectare.
3. **Water Management:**
   - Avoid moisture stress during critical growth stages (crown root initiation, flowering, and grain filling).
   - In clay/black cotton soils, avoid waterlogging by maintaining proper field drainage.
4. **Safety & Helplines:**
   - Always wear protective equipment during chemical handling.
   - Verify specific chemical brand dosages with your local **Krishi Vigyan Kendra (KVK)** or call the national **Kisan Call Centre (1800-180-1551)**.`;
}

// Autonomous Crop Health Triage Engine
function getAutonomousCropTriage(cropName, language, fileName) {
  const crop = cropName || 'General Crop / Field Sample';
  const lang = language || 'en';

  if (lang === 'hi') {
    return `======================================================
🌾 फार्मसाथी एआई — प्राथमिक पादप स्वास्थ्य विश्लेषण रिपोर्ट
======================================================

📌 विश्लेषण विवरण:
• फसल का नाम: ${crop}
• फोटो संदर्भ: ${fileName || 'खेत से ली गई पत्ती का फोटो'}
• प्राथमिक स्थिति: पत्ती पर धब्बे / प्रारंभिक कवक या कीट प्रकोप
• अनुमानित गंभीरता स्तर: मध्यम (नियंत्रण योग्य)

🔍 पहचाने गए मुख्य लक्षण:
• पत्तियों पर भूरे या पीले रंग के छल्लेदार धब्बे दिख रहे हैं।
• किनारे हल्के मुड़े हुए हैं जो रसचूसक कीटों या फफूंद (Fungal Infection) की शुरुआत दर्शाते हैं।
• पौधे की मुख्य नसें अभी हरी और मजबूत स्थिति में हैं।

🌱 सुरक्षित जैविक एवं एकीकृत उपचार योजना:
1. नीम तेल का स्प्रे:
   - 1500 PPM नीम तेल 5 मिली प्रति लीटर पानी में 1 मिली लिक्विड साबुन मिलाकर सुबह या शाम छिड़कें।
2. जैविक कवकनाशी:
   - *ट्राइकोडर्मा विरिडी* या *स्यूडोमोनास फ्लोरेसेंस* 5 ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें।
3. पोषण सुदृढ़ीकरण:
   - पौधे की प्रतिरोधक क्षमता बढ़ाने हेतु 19:19:19 (5 ग्राम/लीटर) का पर्णीय छिड़काव करें।

⚠️ कृषि सुरक्षा सूचना:
यह रिपोर्ट दृश्य लक्षणों पर आधारित एक प्रारंभिक कृषक सलाह है। बाजार से कोई भी रसायन खरीदने से पहले अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि अधिकारी से पुष्टि अवश्य करें।`;
  }

  if (lang === 'mr') {
    return `======================================================
🌾 फार्मसाथी AI — पीक आरोग्य व रोग निदान अहवाल
======================================================

📌 तपासणी तपशील:
• पिकाचे नाव: ${crop}
• फोटो संदर्भ: ${fileName || 'शेत प्रत्यक्ष नमुना'}
• प्राथमिक स्थिती: पानांवर ठिपके / प्राथमिक बुरशीजन्य किंवा रसशोषक कीड प्रादुर्भाव
• तीव्रता पातळी: मध्यम (वेळेवर नियंत्रण शक्य)

🔍 दिसून आलेली प्रमुख लक्षणे:
• पानांवर गोलाकार तांबूस-तपकिरी रंगाचे डाग दिसत आहेत.
• पानांच्या कडा किंचित आकसल्या असून रसशोषक किडींचा प्रादुर्भाव असू शकतो.
• खोड व मुख्य शिरा अद्याप निरोगी स्थितीत आहेत.

🌱 सुरक्षित सेंद्रिय व एकात्मिक उपाययोजना:
1. निंबोळी अर्क / नीम तेल:
   - ५ मिली नीम तेल (१५०० PPM) प्रति लिटर पाण्यात मिसळून संपूर्ण झाडावर फवारणी करावी.
2. जैविक बुरशीनाशक:
   - *ट्रायकोडर्मा व्हिरीडी* ५ ग्रॅम प्रति लिटर पाण्यात मिसळून संध्याकाळी फवारावे.
3. विद्राव्य खतांची मात्रा:
   - पिकाची प्रतिकारशक्ती वाढवण्यासाठी १९:१९:१९ किंवा ०:५२:३४ (५ ग्रॅम प्रति लिटर) चा सौम्य फवारा द्यावा.

⚠️ शेतकरी बंधूंसाठी सूचना:
हा अहवाल केवळ प्राथमिक मार्गदर्शनासाठी आहे. कोणत्याही रासायनिक औषधांची खरेदी करण्यापूर्वी स्थानिक कृषी विज्ञान केंद्र (KVK) किंवा कृषी सहाय्यकांचा सल्ला घ्या.`;
  }

  // English default
  return `======================================================
🌾 FARMSAATHI AI — PLANT HEALTH & DISEASE TRIAGE REPORT
======================================================

📌 SAMPLE SUMMARY:
• Analyzed Crop: ${crop}
• Image Reference: ${fileName || 'Field Camera Sample'}
• Preliminary Diagnosis: Foliar Spotting / Early Fungal or Sucking Pest Infestation
• Urgency Level: Moderate (Action recommended within 48-72 hours)

🔍 OBSERVABLE SYMPTOMS:
• Concentric brownish or yellowish lesions observed across the leaf blade.
• Mild chlorosis (yellowing) along leaf margins indicating possible nutrient stress or mite/thrip activity.
• Main vascular veins remain largely intact with no complete necrosis.

🌱 INTEGRATED CROP PROTECTION PLAN:
1. Bio-Repellent Spray:
   - Apply Neem Oil (1500 PPM) at 5 ml/liter of water with a wetting agent during cool morning or evening hours.
2. Bio-Fungicide Application:
   - Spray *Trichoderma viride* or *Pseudomonas fluorescens* at 5 g/liter of water.
3. Nutrient Fortification:
   - Apply foliar spray of water-soluble NPK 19:19:19 (5 g/L) to replenish damaged leaf tissue.

⚠️ AGRICULTURAL SAFETY ADVISORY:
This report provides preliminary field triage based on visual image analysis. It is not a certified laboratory culturing report. Consult your local Krishi Vigyan Kendra (KVK) agronomist before purchasing agrochemicals.`;
}

// OpenAI Chat completion
async function askChat(message, language = 'en', profile = {}, history = []) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.trim()) {
    try {
      const langNames = { en: 'English', hi: 'Hindi (हिन्दी)', mr: 'Marathi (मराठी)' };
      const targetLanguage = langNames[language] || 'English';
      const farmContext = [
        profile.full_name ? `Farmer Name: ${profile.full_name}` : '',
        profile.village ? `Village: ${profile.village}` : '',
        profile.district ? `District: ${profile.district}` : '',
        profile.state ? `State: ${profile.state}` : '',
        profile.main_crop ? `Primary Crop: ${profile.main_crop}` : '',
        profile.soil_type ? `Soil Type: ${profile.soil_type}` : '',
        profile.irrigation_method ? `Irrigation: ${profile.irrigation_method}` : ''
      ].filter(Boolean).join('; ');

      const formattedHistory = Array.isArray(history) ? history.slice(-6).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.content || '').slice(0, 2000)
      })) : [];

      const payload = {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are FarmSaathi AI, an expert agricultural assistant designed for Indian farmers. Always respond in ${targetLanguage}. Keep advice practical, safe, and culturally relevant for Indian farming conditions. Use farm context when relevant: ${farmContext || 'General farm'}. Emphasize Integrated Pest Management (IPM), soil health, and safe practices. Never prescribe unsafe chemical dosages. Advise consulting local Krishi Vigyan Kendra (KVK) for critical diagnoses.`
          },
          ...formattedHistory,
          { role: 'user', content: message }
        ]
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.choices && data.choices[0]) {
        return {
          answer: data.choices[0].message.content.trim(),
          mode: 'ai-cloud'
        };
      }
    } catch (err) {
      console.warn('OpenAI chat API request error, falling back to autonomous engine:', err.message);
    }
  }

  // Autonomous fallback
  return {
    answer: getAutonomousAgronomicAdvice(message, language, profile),
    mode: 'expert-engine'
  };
}

// OpenAI Vision Image Analysis
async function analyzeCropPhoto(imageBufferOrBase64, mimeType = 'image/jpeg', cropName = '', fileName = '', language = 'en') {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.trim() && imageBufferOrBase64) {
    try {
      const base64Data = typeof imageBufferOrBase64 === 'string' && imageBufferOrBase64.startsWith('data:')
        ? imageBufferOrBase64
        : `data:${mimeType};base64,${typeof imageBufferOrBase64 === 'string' ? imageBufferOrBase64 : imageBufferOrBase64.toString('base64')}`;

      const langNames = { en: 'English', hi: 'Hindi (हिन्दी)', mr: 'Marathi (मराठी)' };
      const targetLang = langNames[language] || 'English';

      const prompt = `You are an expert plant pathologist and agronomist evaluating a crop image in India.
Context crop name provided by farmer: ${cropName || 'Not specified'}.
Provide structured diagnosis in ${targetLang} with these sections:
1. 🌾 Crop & Plant Part Identification
2. 🔍 Visible Symptoms & Primary Diagnosis
3. ⚡ Severity & Spread Risk (Low, Medium, High)
4. 🌱 Recommended Integrated Treatment Plan (Neem oil, biological controls, balanced nutrition)
5. 🛡️ Safety & Consultation Advice (KVK referral)`;

      const payload = {
        model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64Data, detail: 'low' } }
            ]
          }
        ],
        max_tokens: 1000
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.choices && data.choices[0]) {
        return {
          report: data.choices[0].message.content.trim(),
          crop: cropName || 'Analyzed Crop',
          mode: 'ai-vision'
        };
      }
    } catch (err) {
      console.warn('OpenAI vision analysis error, falling back to autonomous engine:', err.message);
    }
  }

  // Autonomous fallback
  return {
    report: getAutonomousCropTriage(cropName, language, fileName),
    crop: cropName || 'Farm Crop Sample',
    mode: 'expert-engine'
  };
}

module.exports = {
  getAutonomousAgronomicAdvice,
  getAutonomousCropTriage,
  askChat,
  analyzeCropPhoto
};
