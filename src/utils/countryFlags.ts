// Country name (English) → emoji flag
// Keys are intended to match Nominatim/OSM country names commonly returned in this app
export const COUNTRY_FLAG_EMOJI: Record<string, string> = {
  // North America (focus: US + Mexico, Central America, Caribbean LATAM)
  'United States': '🇺🇸',
  'United States of America': '🇺🇸',
  Mexico: '🇲🇽',

  // Central America
  Guatemala: '🇬🇹',
  Belize: '🇧🇿',
  Honduras: '🇭🇳',
  'El Salvador': '🇸🇻',
  Nicaragua: '🇳🇮',
  'Costa Rica': '🇨🇷',
  Panama: '🇵🇦',

  // South America
  Colombia: '🇨🇴',
  Venezuela: '🇻🇪',
  Ecuador: '🇪🇨',
  Peru: '🇵🇪',
  Bolivia: '🇧🇴',
  'Plurinational State of Bolivia': '🇧🇴',
  Chile: '🇨🇱',
  Argentina: '🇦🇷',
  Paraguay: '🇵🇾',
  Uruguay: '🇺🇾',
  Brazil: '🇧🇷',

  // Caribbean (LATAM focus)
  Cuba: '🇨🇺',
  Haiti: '🇭🇹',
  'Dominican Republic': '🇩🇴',
  'Puerto Rico': '🇵🇷', // U.S. territory but Spanish-speaking LATAM context
};

export function getFlagForCountry(countryName?: string): string {
  if (!countryName) return '';
  return COUNTRY_FLAG_EMOJI[countryName] ?? '';
}


