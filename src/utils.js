export function escapeHtml(str) {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const SHOPPING_CATEGORIES = [
  {
    id: 'fresh',
    label: '🥦 Obst & Gemüse',
    shortLabel: 'Obst & Gemüse',
    keywords: ['apfel', 'äpfel', 'banane', 'tomate', 'gurke', 'salat', 'avocado', 'zwiebel', 'knoblauch', 'kartoffel', 'karotte', 'möhre', 'paprika', 'beeren', 'zitrone', 'pilze', 'champignon', 'brokkoli', 'zucchini', 'ingwer', 'kräuter', 'basilikum', 'obst', 'gemüse']
  },
  {
    id: 'bakery',
    label: '🥖 Brot & Backwaren',
    shortLabel: 'Bäckerei',
    keywords: ['brot', 'brötchen', 'semmel', 'toast', 'baguette', 'brezel', 'kuchen', 'croissant', 'vollkornbrot', 'sauerteig', 'tortilla', 'wraps', 'aufback']
  },
  {
    id: 'meat_fish',
    label: '🥩 Fleisch, Wurst & Fisch',
    shortLabel: 'Fleisch & Fisch',
    keywords: ['fleisch', 'hähnchen', 'pute', 'rind', 'schwein', 'hack', 'hackfleisch', 'steak', 'lachs', 'fisch', 'forelle', 'garnelen', 'wurst', 'schinken', 'salami', 'aufschnitt', 'bratwurst', 'speck', 'bacon']
  },
  {
    id: 'fridge',
    label: '🧀 Kühlregal, Milch & Käse',
    shortLabel: 'Kühlregal',
    keywords: ['milch', 'hafermilch', 'käse', 'gouda', 'mozzarella', 'parmesan', 'feta', 'frischkäse', 'butter', 'margarine', 'joghurt', 'quark', 'skyr', 'eier', 'hummus', 'sahne', 'schmand', 'tofu', 'gnocchi']
  },
  {
    id: 'dry_goods',
    label: '🍝 Trockenware, Nudeln & Reis',
    shortLabel: 'Trockenware & Nudeln',
    keywords: ['nudel', 'spaghetti', 'pasta', 'penne', 'fusilli', 'lasagne', 'reis', 'basmati', 'risotto', 'linsen', 'couscous', 'bulgur', 'quinoa', 'haferflocken', 'müsli', 'cornflakes', 'mehl', 'zucker', 'backpulver', 'hefe', 'paniermehl', 'trocken']
  },
  {
    id: 'canned',
    label: '🥫 Konserven, Gläser & Soßen',
    shortLabel: 'Konserven & Vorrat',
    keywords: ['konserve', 'dose', 'dosentomaten', 'tomatenmark', 'passierte', 'mais', 'bohnen', 'kidneybohnen', 'kichererbsen', 'erbsen', 'thunfisch', 'kokosmilch', 'pesto', 'soße', 'sauce', 'öl', 'olivenöl', 'sonnenblumenöl', 'essig', 'senf', 'ketchup', 'mayo', 'brühe', 'gewürz', 'salz', 'pfeffer', 'marmelade', 'honig', 'nutella', 'essiggurken', 'oliven']
  },
  {
    id: 'frozen',
    label: '🧊 Tiefkühltruhe (TK)',
    shortLabel: 'Tiefkühltruhe',
    keywords: ['tiefkühl', 'tk', 'pizza', 'tk-pizza', 'eis', 'eiscreme', 'pommes', 'spinat', 'rahmspinat', 'fischstäbchen', 'tk-gemüse', 'tk-beeren', 'aufbackbrötchen', 'baguettes', 'frosta', 'kroketten']
  },
  {
    id: 'snacks',
    label: '🍫 Snacks, Süßes & Nüsse',
    shortLabel: 'Snacks & Süßes',
    keywords: ['schokolade', 'schoki', 'chips', 'nüsse', 'mandeln', 'cashew', 'kekse', 'keks', 'haribo', 'gummibärchen', 'riegel', 'popcorn', 'salzstangen', 'cracker', 'snack']
  },
  {
    id: 'drinks',
    label: '🥤 Getränke, Kaffee & Tee',
    shortLabel: 'Getränke & Kaffee',
    keywords: ['wasser', 'sprudel', 'mineralwasser', 'kaffee', 'espresso', 'bohnen', 'tee', 'saft', 'apfelsaft', 'orangensaft', 'schorle', 'cola', 'limo', 'bier', 'wein', 'sekt', 'energy']
  },
  {
    id: 'household',
    label: '🧻 Haushalt, Putzen & Papier',
    shortLabel: 'Haushalt',
    keywords: ['spüli', 'spülmittel', 'tabs', 'spülmaschinentabs', 'klopapier', 'toilettenpapier', 'küchenrolle', 'taschentücher', 'waschmittel', 'weichspüler', 'müllbeutel', 'backpapier', 'alufolie', 'frischhaltefolie', 'schwamm', 'putzmittel', 'allzweckreiniger', 'batterien', 'blumenerde']
  },
  {
    id: 'drugstore',
    label: '🧴 Drogerie & Körperpflege',
    shortLabel: 'Drogerie',
    keywords: ['seife', 'shampoo', 'duschgel', 'zahnpasta', 'zahnbürste', 'deo', 'creme', 'bodylotion', 'rasierer', 'pflaster', 'wattestäbchen', 'sonnencreme']
  }
];

export function detectShoppingCategory(title) {
  if (!title) return 'dry_goods';
  const norm = title.toLowerCase().trim();
  if (norm.includes('tk ') || norm.startsWith('tk-') || norm.includes('tiefkühl')) {
    return 'frozen';
  }
  for (const cat of SHOPPING_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (norm.includes(kw)) return cat.id;
    }
  }
  return 'dry_goods';
}
