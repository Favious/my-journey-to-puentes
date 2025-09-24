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

// Representative color palettes (hex) for each country's flag listed above.
// Arrays have exactly three colors. For two-color flags, the primary color may repeat
// or include a common emblem color for visual variety.
export const COUNTRY_FLAG_COLORS: Record<string, [string, string, string]> = {
  // North America
  'United States': ['#B22234', '#3C3B6E', '#FFFFFF'],
  'United States of America': ['#B22234', '#3C3B6E', '#FFFFFF'],
  Mexico: ['#006847', '#CE1126', '#FFFFFF'],

  // Central America
  Guatemala: ['#4997D0', '#007A3D', '#FFFFFF'],
  Belize: ['#003F87', '#CE1126', '#FFFFFF'],
  Honduras: ['#0073CF', '#0073CF', '#FFFFFF'],
  'El Salvador': ['#0047AB', '#FFD700', '#FFFFFF'],
  Nicaragua: ['#0067C6', '#FFD700', '#FFFFFF'],
  'Costa Rica': ['#CE1126', '#002B7F', '#FFFFFF'],
  Panama: ['#CE1126', '#005293', '#FFFFFF'],

  // South America
  Colombia: ['#FCD116', '#003893', '#CE1126'],
  Venezuela: ['#FCD116', '#003893', '#CE1126'],
  Ecuador: ['#FCD116', '#003893', '#CE1126'],
  Peru: ['#D91023', '#007A3D', '#FFFFFF'],
  Bolivia: ['#D52B1E', '#FFD700', '#007A3D'],
  'Plurinational State of Bolivia': ['#D52B1E', '#FFD700', '#007A3D'],
  Chile: ['#D52B1E', '#0039A6', '#FFFFFF'],
  Argentina: ['#74ACDF', '#F6B40E', '#FFFFFF',],
  Paraguay: ['#D52B1E', '#0033A0', '#FFFFFF'],
  Uruguay: ['#0038A8', '#F5D00F', '#FFFFFF'],
  Brazil: ['#009C3B', '#FFDF00', '#002776'],

  // Caribbean (LATAM focus)
  Cuba: ['#CF142B', '#002A8F', '#FFFFFF'],
  Haiti: ['#00209F', '#D21034', '#FFFFFF'],
  'Dominican Republic': ['#002D62', '#CE1126', '#FFFFFF'],
  'Puerto Rico': ['#ED0000', '#0050F0', '#FFFFFF'],
};

export function getColorsForCountry(countryName?: string): [string, string, string] {
  if (!countryName) return ['', '', ''];
  return COUNTRY_FLAG_COLORS[countryName] ?? ['', '', ''];
}


