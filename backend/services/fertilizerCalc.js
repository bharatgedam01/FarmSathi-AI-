/**
 * fertilizerCalc.js — Deterministic fertilizer nutrient math
 * No AI needed for these calculations. Used by /api/chat to pre-compute
 * and pass correct math context to the AI, preventing hallucination errors.
 *
 * Nutrient content (%) is based on BIS/FAI published fertilizer grades.
 * P is always shown as P2O5 (the standard Indian fertilizer label form).
 * K is shown as K2O (standard label form) and as elemental K.
 *
 * Area conversion: 1 hectare = 2.471 acres (exact per international standard)
 */

'use strict';

// Standard fertilizer compositions (% by weight, BIS/FAI grades)
const FERTILIZER_DB = {
  'Urea': { N: 46, P2O5: 0, K2O: 0, note: 'Straight nitrogen fertilizer (BIS grade)' },
  'DAP': { N: 18, P2O5: 46, K2O: 0, note: 'Di-ammonium Phosphate (18:46:00)' },
  'SSP': { N: 0, P2O5: 16, K2O: 0, note: 'Single Super Phosphate (0:16:0) — also contains 11% S and 19% Ca' },
  'TSP': { N: 0, P2O5: 46, K2O: 0, note: 'Triple Super Phosphate (0:46:0)' },
  'MOP': { N: 0, P2O5: 0, K2O: 60, note: 'Muriate of Potash (0:0:60)' },
  'SOP': { N: 0, P2O5: 0, K2O: 50, note: 'Sulphate of Potash (0:0:50) — contains 18% S' },
  '10-26-26': { N: 10, P2O5: 26, K2O: 26, note: 'Complex fertilizer 10:26:26' },
  '12-32-16': { N: 12, P2O5: 32, K2O: 16, note: 'Complex fertilizer 12:32:16' },
  '19-19-19': { N: 19, P2O5: 19, K2O: 19, note: 'Fully water-soluble complex 19:19:19' },
  '20-20-0': { N: 20, P2O5: 20, K2O: 0, note: 'Complex fertilizer 20:20:0' },
  '14-35-14': { N: 14, P2O5: 35, K2O: 14, note: 'Complex fertilizer 14:35:14' },
  'Ammonium Sulphate': { N: 20.6, P2O5: 0, K2O: 0, note: 'Ammonium Sulphate — also contains 23.7% S' },
  'CAN': { N: 25, P2O5: 0, K2O: 0, note: 'Calcium Ammonium Nitrate (25% N)' },
  'Potassium Nitrate': { N: 13, P2O5: 0, K2O: 46, note: 'Potassium Nitrate 13:0:46' }
};

// Area conversion factors (base unit: hectare)
const AREA_CONVERSIONS = {
  ha: 1,
  hectare: 1,
  acre: 1 / 2.471,
  bigha: 1 / 6.177,      // Approximate — varies by state (standard UP bigha)
  guntha: 1 / 101.17,    // 1 guntha = 0.025 acre (Maharashtra standard)
  kanal: 1 / 19.768      // 1 kanal ≈ 0.0505 ha (Punjab/HP standard)
};

/**
 * Convert area from one unit to another.
 * @param {number} value - Numeric area value
 * @param {string} fromUnit - Source unit: 'ha','acre','bigha','guntha','kanal'
 * @param {string} toUnit - Target unit
 * @returns {number} Converted area (rounded to 4 decimal places)
 */
function convertArea(value, fromUnit, toUnit) {
  const from = (fromUnit || 'ha').toLowerCase().trim();
  const to = (toUnit || 'ha').toLowerCase().trim();
  const factorFrom = AREA_CONVERSIONS[from];
  const factorTo = AREA_CONVERSIONS[to];
  if (!factorFrom || !factorTo) {
    throw new Error(`Unknown area unit: "${fromUnit}" or "${toUnit}". Supported: ${Object.keys(AREA_CONVERSIONS).join(', ')}`);
  }
  const ha = value * factorFrom;         // convert to hectares first
  return Math.round((ha / factorTo) * 10000) / 10000;
}

/**
 * Calculate nutrients supplied by a given fertilizer + quantity.
 * @param {string} fertName - Fertilizer name (case-insensitive, partial match ok)
 * @param {number} quantityKg - Quantity of fertilizer in kg
 * @returns {object} Nutrient amounts in kg: { N_kg, P2O5_kg, P_elemental_kg, K2O_kg, K_elemental_kg, composition, note }
 */
function calculateNutrients(fertName, quantityKg) {
  const nameNorm = String(fertName || '').trim().toUpperCase().replace(/[\s\-:]+/g, '-');

  // Find matching fertilizer (exact then partial)
  let found = null;
  for (const [key, val] of Object.entries(FERTILIZER_DB)) {
    if (key.toUpperCase().replace(/[\s\-:]+/g, '-') === nameNorm) {
      found = { name: key, ...val };
      break;
    }
  }
  if (!found) {
    // Partial match
    for (const [key, val] of Object.entries(FERTILIZER_DB)) {
      if (key.toUpperCase().includes(nameNorm) || nameNorm.includes(key.toUpperCase().replace(/[\s\-:]+/g, '-'))) {
        found = { name: key, ...val };
        break;
      }
    }
  }
  if (!found) {
    return {
      success: false,
      error: `Fertilizer "${fertName}" not found in database. Known fertilizers: ${Object.keys(FERTILIZER_DB).join(', ')}`
    };
  }

  const qty = parseFloat(quantityKg) || 0;
  // P conversion: P2O5 to elemental P: multiply by 0.4364 (43.64%)
  // K conversion: K2O to elemental K: multiply by 0.8302 (83.02%)
  const N_kg = Math.round(qty * found.N / 100 * 100) / 100;
  const P2O5_kg = Math.round(qty * found.P2O5 / 100 * 100) / 100;
  const P_elemental_kg = Math.round(P2O5_kg * 0.4364 * 100) / 100;
  const K2O_kg = Math.round(qty * found.K2O / 100 * 100) / 100;
  const K_elemental_kg = Math.round(K2O_kg * 0.8302 * 100) / 100;

  return {
    success: true,
    fertilizer: found.name,
    quantity_kg: qty,
    composition: `${found.N}:${found.P2O5}:${found.K2O} (N:P2O5:K2O)`,
    nutrients: {
      N_kg,
      P2O5_kg,
      P_elemental_kg,
      K2O_kg,
      K_elemental_kg
    },
    note: found.note,
    math_shown: `${qty} kg × ${found.N}% N = ${N_kg} kg N; ` +
      `${qty} kg × ${found.P2O5}% P₂O₅ = ${P2O5_kg} kg P₂O₅ (= ${P_elemental_kg} kg elemental P); ` +
      `${qty} kg × ${found.K2O}% K₂O = ${K2O_kg} kg K₂O (= ${K_elemental_kg} kg elemental K)`
  };
}

/**
 * Detect fertilizer-related questions in a user message.
 * Returns structured pre-calculated context if fertilizer + quantity found.
 * @param {string} message - User chat message
 * @returns {string|null} Pre-calculated context string to prepend to AI prompt, or null
 */
function buildFertilizerContext(message) {
  if (!message) return null;
  const msg = String(message).toLowerCase();

  // Check if it's a fertilizer question
  const fertKeywords = ['fertilizer', 'fertiliser', 'khad', 'urea', 'dap', 'ssp', 'mop', 'npk',
    'nitrogen', 'phosphorus', 'potassium', 'p2o5', 'k2o', 'kg', 'quintal', 'dose', 'apply'];
  const isFertQuestion = fertKeywords.some(kw => msg.includes(kw));
  if (!isFertQuestion) return null;

  // Try to extract fertilizer name and quantity from natural language
  const results = [];
  const seen = new Set();

  // Patterns in order of specificity:
  // 1. "100 kg of DAP" or "100 kg DAP"
  // 2. "DAP @ 100 kg" or "DAP@100kg"
  // 3. "50 kg urea" (fert name after quantity)
  // 4. "100kg of DAP" (no space before kg)
  // 5. "apply 80 kg MOP" or "use 50kg urea"
  const quantityPatterns = [
    /(\d+(?:\.\d+)?)\s*kgs?\s+(?:of\s+)?([a-z0-9][a-z0-9\s\-:]{1,20}?)(?:\s+(?:per|for|in|on|to|fertilizer|gives|will|how)|[,.]|$)/gi,
    /([a-z0-9][a-z0-9\s\-:]{1,20}?)\s*@\s*(\d+(?:\.\d+)?)\s*kgs?/gi,
    /(?:apply|use|using|applied|adding|add)\s+(\d+(?:\.\d+)?)\s*kgs?\s+(?:of\s+)?([a-z0-9][a-z0-9\s\-:]{1,20}?)(?:\s|[,.]|$)/gi,
    /(\d+(?:\.\d+)?)\s*(?:bag|bags)\s+(?:of\s+)?([a-z0-9][a-z0-9\s\-:]{1,20}?)(?:\s|[,.]|$)/gi,
    /(?:from|of)\s+(\d+(?:\.\d+)?)\s*kgs?\s+(?:of\s+)?([a-z0-9][a-z0-9\s\-:]{1,20}?)(?:[?.!, ]|$)/gi
  ];

  for (const pattern of quantityPatterns) {
    let match;
    while ((match = pattern.exec(msg)) !== null) {
      // Swap if pattern puts fert name first
      let qtyStr = match[1], fertStr = match[2] || '';
      // Some patterns have (fert, qty) order — detect by trying parseFloat
      if (isNaN(parseFloat(qtyStr)) && !isNaN(parseFloat(fertStr))) {
        [qtyStr, fertStr] = [fertStr, qtyStr];
      }
      const qty = parseFloat(qtyStr);
      fertStr = fertStr.trim().replace(/\s+/g, ' ').replace(/[?.!,]+$/, '');
      if (qty > 0 && fertStr.length > 1) {
        const key = fertStr.toLowerCase() + ':' + qty;
        if (!seen.has(key)) {
          const result = calculateNutrients(fertStr, qty);
          if (result.success) {
            seen.add(key);
            results.push(result);
          }
        }
      }
    }
    pattern.lastIndex = 0;
  }

  if (results.length === 0) return null;

  let context = '\n[SYSTEM PRE-CALCULATED FERTILIZER MATH — Use these exact figures in your response]:\n';
  for (const r of results) {
    context += `• ${r.fertilizer} (${r.composition}): ${r.quantity_kg} kg supplies → ` +
      `N: ${r.nutrients.N_kg} kg, P₂O₅: ${r.nutrients.P2O5_kg} kg (= ${r.nutrients.P_elemental_kg} kg elemental P), ` +
      `K₂O: ${r.nutrients.K2O_kg} kg (= ${r.nutrients.K_elemental_kg} kg elemental K). ` +
      `Composition note: ${r.note}\n`;
    context += `  Calculation: ${r.math_shown}\n`;
  }
  context += '[END PRE-CALCULATED MATH — Do not invent different numbers]\n';

  return context;
}

/**
 * List all known fertilizers in the database.
 * @returns {string[]} Array of fertilizer names
 */
function listKnownFertilizers() {
  return Object.keys(FERTILIZER_DB);
}

module.exports = {
  FERTILIZER_DB,
  AREA_CONVERSIONS,
  calculateNutrients,
  convertArea,
  buildFertilizerContext,
  listKnownFertilizers
};

