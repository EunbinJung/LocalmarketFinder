/**
 * Shared market filtering logic used by discover scripts.
 * - Exclude hotels, resorts, supermarkets, malls
 * - Include only real local markets using keyword/type matching
 */

const STRONG_MARKET_REGEXES = [
  /\bfarmers?\s+market\b/i,
  /\bfarmer's\s+market\b/i,
  /\bcommunity\s+market\b/i,
  /\bweekend\s+market\b/i,
  /\bartisan\s+market\b/i,
  /\bcraft\s+market\b/i,
  /\bflea\s+market\b/i,
  /\bvillage\s+market\b/i,
  /\bgrowers?\s+market\b/i,
  /\bmakers?\s+market\b/i,
  /\bhandmade\s+market\b/i,
  /\bnight\s+market\b/i,
  /\bsunday\s+market\b/i,
  /\bsaturday\s+market\b/i,
  /\bpopup\s+market\b/i,
  /\bpop-up\s+market\b/i,
];

const MARKET_WORD_REGEX = /\bmarkets?\b/i;

const GROCERY_NAME_REGEXES = [
  /\b(supermarket|grocery|grocer|groceries)\b/i,
  /\b(woolworths|coles|aldi|costco|iga|foodworks|spudshed|drakes|foodland|spar)\b/i,
  /\b(harris\s*farm)\b/i,
  /\b(bottle\s*shop|liquor)\b/i,
  /\b(mini\s*mart|minimart|convenience)\b/i,
];

const EXCLUDE_KEYWORDS = [
  'shopping centre',
  'shopping center',
  'community_centre',
  'city_hall',
  'local_government_office',
  'mall',
];

function hasStrongMarketSignal(nameLower) {
  return STRONG_MARKET_REGEXES.some(r => r.test(nameLower));
}

function hasMarketWord(nameLower) {
  return MARKET_WORD_REGEX.test(nameLower);
}

function looksLikeGroceryName(nameLower) {
  return GROCERY_NAME_REGEXES.some(r => r.test(nameLower));
}

function countOpenDaysFromWeekdayText(weekdayText) {
  if (!Array.isArray(weekdayText)) return null;
  let openDays = 0;
  for (const line of weekdayText) {
    const lower = String(line || '').toLowerCase();
    if (!lower) continue;
    if (lower.includes('closed')) continue;
    openDays += 1;
  }
  return openDays;
}

function looksLikeGroceryFromDetails(place) {
  const nameLower = (place?.name || '').toLowerCase();
  const types = (place?.types || []).map(t => String(t).toLowerCase());

  if (looksLikeGroceryName(nameLower)) return true;

  const groceryTypes = [
    'grocery_or_supermarket',
    'supermarket',
    'convenience_store',
    'department_store',
    'liquor_store',
    'shopping_mall',
  ];
  if (groceryTypes.some(t => types.includes(t))) return true;

  if (hasMarketWord(nameLower) && !hasStrongMarketSignal(nameLower)) {
    const openDays = countOpenDaysFromWeekdayText(place?.opening_hours?.weekday_text);
    if (typeof openDays === 'number' && openDays >= 6) return true;
  }

  return false;
}

function isLocalMarket(place) {
  const name = (place.name || '').toLowerCase();
  const types = (place.types || []).map(t => t.toLowerCase());

  if (EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) return false;
  if (looksLikeGroceryName(name)) return false;

  const excludeTypes = [
    'lodging',
    'hotel',
    'shopping_mall',
    'supermarket',
    'grocery_or_supermarket',
    'convenience_store',
    'department_store',
    'liquor_store',
  ];
  if (excludeTypes.some(type => types.includes(type))) return false;

  if (hasStrongMarketSignal(name)) return true;
  return hasMarketWord(name);
}

module.exports = {
  isLocalMarket,
  looksLikeGroceryFromDetails,
  looksLikeGroceryName,
};
