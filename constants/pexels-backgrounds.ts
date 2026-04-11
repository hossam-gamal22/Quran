// constants/pexels-backgrounds.ts
// Curated Pexels backgrounds for Islamic app — NO PEOPLE, CLEAN & MINIMAL
// Categories: مساجد، شجر/خضرة، سحاب، سماء، غروب، شروق
// VERIFIED: All image IDs tested - clean architectural/nature shots without people
// Last updated: March 2026

export interface PexelsBackground {
  id: number;
  src: { large2x: string; small: string; portrait: string };
  photographer: string;
  avgColor: string;
  alt: string;
  isPremium: boolean;
  category: 'islamic' | 'nature' | 'clouds' | 'sky' | 'sunset' | 'sunrise';
}

// Helper to build Pexels URLs
const pexels = (id: number) => ({
  large2x: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940`,
  small: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=130`,
  portrait: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800`,
});

// ════════════════════════════════════════════════════════════════════════════
// FREE BACKGROUNDS (12 items) — مجانية
// ════════════════════════════════════════════════════════════════════════════
export const FREE_PEXELS_BACKGROUNDS: PexelsBackground[] = [
  // ═══════════ 🕌 مساجد (3) — Clean architecture, no people ═══════════
  {
    id: 2079705,
    src: pexels(2079705),
    photographer: "Konevi",
    avgColor: "#8B9EAB",
    alt: "Mosque exterior architecture",
    isPremium: false,
    category: 'islamic',
  },
  {
    id: 2475725,
    src: pexels(2475725),
    photographer: "Konevi",
    avgColor: "#6B8BA4",
    alt: "White and blue mosque with minarets",
    isPremium: false,
    category: 'islamic',
  },
  {
    id: 337897,
    src: pexels(337897),
    photographer: "Konevi",
    avgColor: "#E8E4DC",
    alt: "Sheikh Zayed Mosque clear sky",
    isPremium: false,
    category: 'islamic',
  },

  // ═══════════ 🌳 شجر وخضرة (2) ═══════════
  {
    id: 1179229,
    src: pexels(1179229),
    photographer: "Matthew Montrone",
    avgColor: "#228B22",
    alt: "Green pine trees aerial view",
    isPremium: false,
    category: 'nature',
  },
  {
    id: 189298,
    src: pexels(189298),
    photographer: "Donald Tong",
    avgColor: "#2E8B57",
    alt: "Sunlight through forest trees",
    isPremium: false,
    category: 'nature',
  },

  // ═══════════ ☁️ سحاب (2) ═══════════
  {
    id: 531767,
    src: pexels(531767),
    photographer: "Pixabay",
    avgColor: "#87CEFA",
    alt: "Peaceful white clouds in blue sky",
    isPremium: false,
    category: 'clouds',
  },
  {
    id: 216597,
    src: pexels(216597),
    photographer: "icon0",
    avgColor: "#87CEEB",
    alt: "Beautiful white clouds blue sky",
    isPremium: false,
    category: 'clouds',
  },

  // ═══════════ 🌤️ سماء صافية (1) ═══════════
  {
    id: 91216,
    src: pexels(91216),
    photographer: "Pixabay",
    avgColor: "#87CEEB",
    alt: "Clear blue sky",
    isPremium: false,
    category: 'sky',
  },

  // ═══════════ 🌅 غروب (2) ═══════════
  {
    id: 4699016,
    src: pexels(4699016),
    photographer: "Allec Gomes",
    avgColor: "#FF8C00",
    alt: "Amazing sunset sky gradient",
    isPremium: false,
    category: 'sunset',
  },
  {
    id: 3812773,
    src: pexels(3812773),
    photographer: "Pixelcop",
    avgColor: "#2F4F4F",
    alt: "Minimalist dark sky at sunset",
    isPremium: false,
    category: 'sunset',
  },

  // ═══════════ 🌄 شروق (2) ═══════════
  {
    id: 1905054,
    src: pexels(1905054),
    photographer: "Time Grocery",
    avgColor: "#FF6347",
    alt: "Dramatic sunrise orange blue hues",
    isPremium: false,
    category: 'sunrise',
  },
  {
    id: 917317,
    src: pexels(917317),
    photographer: "Lan Yao",
    avgColor: "#FFD700",
    alt: "Golden hour sunrise clouds",
    isPremium: false,
    category: 'sunrise',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// PREMIUM BACKGROUNDS (28 items) — مميزة
// ════════════════════════════════════════════════════════════════════════════
export const PREMIUM_PEXELS_BACKGROUNDS: PexelsBackground[] = [
  // ═══════════ 🕌 Premium مساجد (10) — Stunning architecture, no people ═══════════
  {
    id: 5075096,
    src: pexels(5075096),
    photographer: "Konevi",
    avgColor: "#F5F5F5",
    alt: "Sheikh Zayed Grand Mosque exterior Abu Dhabi",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 2900796,
    src: pexels(2900796),
    photographer: "Konevi",
    avgColor: "#4A5568",
    alt: "Sheikh Zayed Mosque twilight reflection",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 36615787,
    src: pexels(36615787),
    photographer: "Konevi",
    avgColor: "#8B9EAB",
    alt: "Süleymaniye Mosque Istanbul Ottoman design",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 36471022,
    src: pexels(36471022),
    photographer: "Konevi",
    avgColor: "#6B8BA4",
    alt: "Iconic Ottoman mosque dome Istanbul",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 36402393,
    src: pexels(36402393),
    photographer: "Konevi",
    avgColor: "#5A7A94",
    alt: "Stunning mosque dome with twin minarets",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 36279260,
    src: pexels(36279260),
    photographer: "Konevi",
    avgColor: "#4A6FA5",
    alt: "Intricate mosque dome geometric patterns Indonesia",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 36338169,
    src: pexels(36338169),
    photographer: "Konevi",
    avgColor: "#C4B89E",
    alt: "Historic mosque domes and minaret",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 36025129,
    src: pexels(36025129),
    photographer: "Konevi",
    avgColor: "#E8E4DC",
    alt: "Majestic mosque interior elegant archways",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 5854322,
    src: pexels(5854322),
    photographer: "Konevi",
    avgColor: "#006400",
    alt: "Green Dome and minaret Al-Masjid Medina",
    isPremium: true,
    category: 'islamic',
  },
  {
    id: 36463798,
    src: pexels(36463798),
    photographer: "Konevi",
    avgColor: "#F5F5F5",
    alt: "Sheikh Zayed Grand Mosque domes",
    isPremium: true,
    category: 'islamic',
  },

  // ═══════════ 🌳 Premium شجر وخضرة (5) — Serene nature ═══════════
  {
    id: 7581409,
    src: pexels(7581409),
    photographer: "Qaarif",
    avgColor: "#228B22",
    alt: "Aerial view dense evergreen forest",
    isPremium: true,
    category: 'nature',
  },
  {
    id: 1179156,
    src: pexels(1179156),
    photographer: "Sohail Na",
    avgColor: "#006400",
    alt: "Dense green forest canopy",
    isPremium: true,
    category: 'nature',
  },
  {
    id: 6294476,
    src: pexels(6294476),
    photographer: "Shashwat Goyar",
    avgColor: "#2E8B57",
    alt: "Aerial view green tree Norway",
    isPremium: true,
    category: 'nature',
  },
  {
    id: 230978,
    src: pexels(230978),
    photographer: "Solliefoto",
    avgColor: "#228B22",
    alt: "Green leafed trees forest",
    isPremium: true,
    category: 'nature',
  },
  {
    id: 3655865,
    src: pexels(3655865),
    photographer: "Mark Neal",
    avgColor: "#006400",
    alt: "Green pine trees untouched beauty",
    isPremium: true,
    category: 'nature',
  },

  // ═══════════ ☁️ Premium سحاب (4) — Dramatic skies ═══════════
  {
    id: 36161257,
    src: pexels(36161257),
    photographer: "Saud Aloufi",
    avgColor: "#87CEFA",
    alt: "Fluffy white clouds bright blue sky",
    isPremium: true,
    category: 'clouds',
  },
  {
    id: 6059474,
    src: pexels(6059474),
    photographer: "Jonathan Borba",
    avgColor: "#87CEEB",
    alt: "White fluffy cloud in sky",
    isPremium: true,
    category: 'clouds',
  },
  {
    id: 3289880,
    src: pexels(3289880),
    photographer: "Andre Moura",
    avgColor: "#6A5ACD",
    alt: "Blue and white cloudy sky dramatic",
    isPremium: true,
    category: 'clouds',
  },
  {
    id: 5005185,
    src: pexels(5005185),
    photographer: "Jokassis",
    avgColor: "#B0C4DE",
    alt: "White clouds under blue sky peaceful",
    isPremium: true,
    category: 'clouds',
  },

  // ═══════════ 🌤️ Premium سماء صافية (2) ═══════════
  {
    id: 281260,
    src: pexels(281260),
    photographer: "Francesco Ungaro",
    avgColor: "#4169E1",
    alt: "Deep blue clear sky",
    isPremium: true,
    category: 'sky',
  },
  {
    id: 96622,
    src: pexels(96622),
    photographer: "Pixabay",
    avgColor: "#7CB9E8",
    alt: "Blue sky with few clouds",
    isPremium: true,
    category: 'sky',
  },

  // ═══════════ 🌅 Premium غروب (4) — Stunning sunsets ═══════════
  {
    id: 7540553,
    src: pexels(7540553),
    photographer: "Technobulka",
    avgColor: "#FF8C00",
    alt: "Captivating sunset vibrant colors",
    isPremium: true,
    category: 'sunset',
  },
  {
    id: 925742,
    src: pexels(925742),
    photographer: "João Jesus Design",
    avgColor: "#FF6347",
    alt: "Lone tree silhouette sunset gradient",
    isPremium: true,
    category: 'sunset',
  },
  {
    id: 36460916,
    src: pexels(36460916),
    photographer: "Will Chen",
    avgColor: "#FF4500",
    alt: "Solitary tree silhouette twilight sky Taiwan",
    isPremium: true,
    category: 'sunset',
  },
  {
    id: 92664,
    src: pexels(92664),
    photographer: "David McEachan",
    avgColor: "#FF7F50",
    alt: "Mountain silhouette vivid gradient sunset",
    isPremium: true,
    category: 'sunset',
  },

  // ═══════════ 🌄 Premium شروق (3) — Beautiful sunrises ═══════════
  {
    id: 36617875,
    src: pexels(36617875),
    photographer: "Ian Panelo",
    avgColor: "#FFA07A",
    alt: "Vibrant sunrise sky pastel clouds",
    isPremium: true,
    category: 'sunrise',
  },
  {
    id: 146231,
    src: pexels(146231),
    photographer: "Eye4dtail",
    avgColor: "#FF8C00",
    alt: "City buildings silhouette orange sunrise",
    isPremium: true,
    category: 'sunrise',
  },
  {
    id: 106132,
    src: pexels(106132),
    photographer: "Snapwire",
    avgColor: "#FFD700",
    alt: "Sea sunrise peaceful morning",
    isPremium: true,
    category: 'sunrise',
  },
];

// All backgrounds for iteration
export const ALL_PEXELS_BACKGROUNDS = [...FREE_PEXELS_BACKGROUNDS, ...PREMIUM_PEXELS_BACKGROUNDS];

// Get backgrounds by category
export const getBackgroundsByCategory = (category: PexelsBackground['category']) =>
  ALL_PEXELS_BACKGROUNDS.filter(bg => bg.category === category);

// Category display names
export const BACKGROUND_CATEGORIES: { key: PexelsBackground['category']; labelAr: string; labelEn: string; icon: string }[] = [
  { key: 'islamic', labelAr: 'مساجد', labelEn: 'Mosques', icon: 'mosque' },
  { key: 'nature', labelAr: 'شجر', labelEn: 'Trees', icon: 'pine-tree' },
  { key: 'clouds', labelAr: 'سحاب', labelEn: 'Clouds', icon: 'weather-cloudy' },
  { key: 'sky', labelAr: 'سماء', labelEn: 'Sky', icon: 'weather-sunny' },
  { key: 'sunset', labelAr: 'غروب', labelEn: 'Sunset', icon: 'weather-sunset-down' },
  { key: 'sunrise', labelAr: 'شروق', labelEn: 'Sunrise', icon: 'weather-sunset-up' },
];
