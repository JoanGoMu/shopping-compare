// Keep in sync with extension/src/normalize-specs.ts

// Maps raw spec key patterns (lowercased) to canonical English keys.
// Uses exact match first, then substring match.
const KEY_MAP: Record<string, string> = {
  // Brand
  'brand': 'Brand', 'marca': 'Brand', 'marque': 'Brand', 'marke': 'Brand', 'merk': 'Brand', 'brand name': 'Brand',
  // Color
  'color': 'Color', 'colour': 'Color', 'couleur': 'Color', 'farbe': 'Color', 'kleur': 'Color',
  'colore': 'Color', 'color name': 'Color', 'colour name': 'Color',
  // Material (outer/main fabric)
  'material': 'Material', 'materials': 'Material', 'matiere': 'Material', 'materiaal': 'Material',
  'materiale': 'Material', 'fabric type': 'Material', 'fabric': 'Material', 'outer': 'Material',
  'outer shell': 'Material', 'shell': 'Material', 'outer material': 'Material', 'upper': 'Material',
  'upper material': 'Material',
  'bovenmateriaal': 'Material', 'buitenmateriaal': 'Material', 'schachtmaterial': 'Material',
  // Composition (fiber breakdown, often percentage-based)
  'composition': 'Composition', 'composicion': 'Composition', 'zusammensetzung': 'Composition',
  'samenstelling': 'Composition', 'composizione': 'Composition', 'fiber content': 'Composition',
  'content': 'Composition',
  // Size
  'size': 'Size', 'taille': 'Size', 'grosse': 'Size', 'maat': 'Size', 'taglia': 'Size',
  'size type': 'Size', 'fit type': 'Size',
  // Fit / Cut
  'fit': 'Fit', 'coupe': 'Fit', 'schnitt': 'Fit', 'snit': 'Fit', 'taglio': 'Fit',
  // Sole (shoes)
  'sole': 'Sole', 'semelle': 'Sole', 'sohle': 'Sole', 'zool': 'Sole', 'suola': 'Sole',
  'sole material': 'Sole', 'outsole': 'Sole',
  'binnenzool': 'Sole', 'dekzool': 'Sole', 'buitenzool': 'Sole', 'inlegzool': 'Sole',
  // Lining
  'lining': 'Lining', 'doublure': 'Lining', 'futter': 'Lining', 'voering': 'Lining',
  'binnenmateriaal': 'Lining', 'binnenkant': 'Lining',
  // Weight
  'weight': 'Weight', 'poids': 'Weight', 'gewicht': 'Weight', 'gewigt': 'Weight', 'peso': 'Weight',
  // Volume / Size for beauty
  'volume': 'Volume', 'net weight': 'Volume', 'net content': 'Volume',
  // Care instructions
  'care': 'Care', 'care instructions': 'Care', 'pflegehinweise': 'Care', 'onderhoud': 'Care',
  'washing instructions': 'Care', 'lavage': 'Care',
  // Country of origin
  'country of origin': 'Country of Origin', 'made in': 'Country of Origin',
  'hergestellt in': 'Country of Origin', 'fabricado en': 'Country of Origin',
  'pays d\'origine': 'Country of Origin', 'land van herkomst': 'Country of Origin',
  // Season / Collection
  'season': 'Season', 'collection': 'Collection', 'saison': 'Season', 'temporada': 'Season',
  // Type / Category
  'type': 'Type', 'product type': 'Type', 'style': 'Style', 'style name': 'Style',
  // Gender
  'gender': 'Gender', 'department': 'Gender',
  // Pattern
  'pattern': 'Pattern', 'motif': 'Pattern', 'muster': 'Pattern',
  // Closure
  'closure': 'Closure', 'fastening': 'Closure', 'fermeture': 'Closure',
  // Neckline
  'neckline': 'Neckline', 'collar': 'Neckline', 'encolure': 'Neckline',
  // Sleeve
  'sleeve': 'Sleeve', 'sleeve length': 'Sleeve', 'manche': 'Sleeve',
  // Length
  'length': 'Length', 'longueur': 'Length', 'lange': 'Length',
  // Fragrance / Scent
  'scent': 'Scent', 'fragrance': 'Scent', 'parfum': 'Scent', 'fragrance family': 'Scent',
};

// Substring patterns: if the key *contains* one of these, map to canonical
const KEY_SUBSTRING_MAP: [string, string][] = [
  ['composic', 'Composition'], ['zusammensetz', 'Composition'], ['samenstell', 'Composition'],
  ['materiaal', 'Material'], ['material', 'Material'], ['fabric', 'Material'], ['fibre', 'Material'], ['fiber', 'Material'],
  ['colour', 'Color'], ['color', 'Color'], ['farbe', 'Color'], ['kleur', 'Color'],
  ['composition', 'Composition'], ['lining', 'Lining'], ['voering', 'Lining'],
  ['country of origin', 'Country of Origin'], ['made in', 'Country of Origin'],
  ['care', 'Care'], ['washing', 'Care'], ['lavage', 'Care'],
  ['zool', 'Sole'], ['sole', 'Sole'], ['brand', 'Brand'], ['weight', 'Weight'], ['volume', 'Volume'],
  ['season', 'Season'], ['closure', 'Closure'], ['neckline', 'Neckline'],
  ['sleeve', 'Sleeve'], ['pattern', 'Pattern'], ['gender', 'Gender'],
];

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function normalizeKey(raw: string): string {
  const lower = raw.toLowerCase().trim();
  // Exact match
  if (KEY_MAP[lower]) return KEY_MAP[lower];
  // Substring match
  for (const [pattern, canonical] of KEY_SUBSTRING_MAP) {
    if (lower.includes(pattern)) return canonical;
  }
  // Pass through with title-casing
  return toTitleCase(raw.trim());
}

// Maps foreign-language material/color values to English equivalents.
// Handles values like "60% Algodon, 40% Poliester" -> "60% Cotton, 40% Polyester"
const VALUE_MAP: Record<string, string> = {
  // Materials - ES
  'algodon': 'Cotton', 'algodón': 'Cotton', 'poliester': 'Polyester', 'poliéster': 'Polyester',
  'cuero': 'Leather', 'lana': 'Wool', 'seda': 'Silk', 'nailon': 'Nylon', 'lino': 'Linen',
  'viscosa': 'Viscose', 'elastano': 'Elastane', 'acrilico': 'Acrylic', 'acrílico': 'Acrylic',
  'poliamida': 'Polyamide', 'ante': 'Suede', 'terciopelo': 'Velvet', 'denim': 'Denim',
  'goma': 'Rubber', 'caucho': 'Rubber', 'plastico': 'Plastic', 'plástico': 'Plastic',
  'sintetico': 'Synthetic', 'sintético': 'Synthetic',
  // Materials - FR
  'coton': 'Cotton', 'polyester': 'Polyester', 'cuir': 'Leather', 'laine': 'Wool',
  'soie': 'Silk', 'nylon': 'Nylon', 'lin': 'Linen', 'viscose': 'Viscose',
  'élasthanne': 'Elastane', 'elasthanne': 'Elastane', 'acrylique': 'Acrylic',
  'polyamide': 'Polyamide', 'daim': 'Suede', 'velours': 'Velvet', 'caoutchouc': 'Rubber',
  'synthétique': 'Synthetic', 'synthetique': 'Synthetic',
  // Materials - DE
  'baumwolle': 'Cotton', 'wolle': 'Wool', 'seide': 'Silk', 'leinen': 'Linen',
  'leder': 'Leather', 'wildleder': 'Suede', 'samt': 'Velvet', 'gummi': 'Rubber',
  'kunststoff': 'Plastic', 'synthetik': 'Synthetic', 'kunstfaser': 'Synthetic',
  // Materials - NL
  'katoen': 'Cotton', 'wol': 'Wool', 'zijde': 'Silk', 'linnen': 'Linen',
  'leer': 'Leather', 'suede': 'Suede', 'fluweel': 'Velvet', 'rubber': 'Rubber',
  // Materials - IT (lana/lino already in ES)
  'cotone': 'Cotton', 'poliestere': 'Polyester', 'pelle': 'Leather',
  'seta': 'Silk', 'gomma': 'Rubber',
  // Colors - ES
  'rojo': 'Red', 'azul': 'Blue', 'verde': 'Green', 'amarillo': 'Yellow',
  'negro': 'Black', 'blanco': 'White', 'gris': 'Grey', 'naranja': 'Orange',
  'rosa': 'Pink', 'morado': 'Purple', 'violeta': 'Purple', 'marron': 'Brown',
  'marrón': 'Brown', 'beige': 'Beige', 'crema': 'Cream', 'dorado': 'Gold',
  'plateado': 'Silver', 'marino': 'Navy', 'burdeos': 'Burgundy',
  // Colors - FR (gris/marron already in ES)
  'rouge': 'Red', 'bleu': 'Blue', 'vert': 'Green', 'jaune': 'Yellow',
  'noir': 'Black', 'blanc': 'White', 'orange': 'Orange',
  'rose': 'Pink', 'violet': 'Purple', 'or': 'Gold',
  'argent': 'Silver', 'marine': 'Navy', 'bordeaux': 'Burgundy',
  // Colors - DE (orange/rosa/marine already in FR/ES)
  'rot': 'Red', 'blau': 'Blue', 'grun': 'Green', 'grün': 'Green', 'gelb': 'Yellow',
  'schwarz': 'Black', 'weiss': 'White', 'weiß': 'White', 'grau': 'Grey',
  'lila': 'Purple', 'braun': 'Brown',
  'gold': 'Gold', 'silber': 'Silver',
  // Colors - NL
  'rood': 'Red', 'blauw': 'Blue', 'groen': 'Green', 'geel': 'Yellow',
  'zwart': 'Black', 'wit': 'White', 'grijs': 'Grey', 'roze': 'Pink',
  'paars': 'Purple', 'bruin': 'Brown', 'goud': 'Gold', 'zilver': 'Silver',
};

function normalizeValue(value: string, key: string): string {
  // Only translate for material/color/composition keys
  const isTranslateable = ['Material', 'Composition', 'Color', 'Sole', 'Lining', 'Upper'].includes(key);
  if (!isTranslateable) return value;

  // Replace foreign terms word-by-word, preserving percentages and punctuation
  return value.replace(/[a-záéíóúàèìòùâêîôûäëïöüñ]+/gi, (word) => {
    const lower = word.toLowerCase();
    return VALUE_MAP[lower] ?? word;
  });
}

export function normalizeSpecs(raw: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) continue;
    const canonicalKey = normalizeKey(rawKey);
    const canonicalValue = normalizeValue(trimmedValue, canonicalKey);
    // Last writer wins - store-specific overrides JSON-LD since caller merges in that order
    result[canonicalKey] = canonicalValue;
  }
  return result;
}
