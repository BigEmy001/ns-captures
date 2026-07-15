// Shared mock data for the NS CAPTURES platform.
// Images are real photography sourced from Unsplash with attribution.

export type License = "COMMERCIAL" | "EDITORIAL" | "ROYALTY FREE" | "EXCLUSIVE";
export type Orientation = "portrait" | "landscape" | "square";

export interface Photo {
  id: string;
  title: string;
  photographerId: string;
  photographer: string;
  license: License;
  category: string;
  location: string;
  color: string;
  orientation: Orientation;
  ratio: string; // tailwind aspect ratio class
  price: number;
  downloads: number;
  views: number;
  likes: number;
  camera: string;
  lens: string;
  iso: number;
  keywords: string[];
  image: string;
  createdAt?: string;
}

const u = (id: string, w = 1080) =>
  `https://images.unsplash.com/photo-${id}?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=${w}`;

const initialPhotos: Photo[] = [
  {
    id: "afro-earrings",
    title: "Afro, in gold",
    photographerId: "godfred-kwakye",
    photographer: "Godfred Kwakye",
    license: "EDITORIAL",
    category: "Portrait",
    location: "Accra, Ghana",
    color: "#9a6b3f",
    orientation: "portrait",
    ratio: "aspect-[4/5]",
    price: 240,
    downloads: 4120,
    views: 88200,
    likes: 3120,
    camera: "Canon EOS R5",
    lens: "85mm f/1.4",
    iso: 200,
    keywords: ["portrait", "afro", "editorial", "studio", "gold"],
    image: u("1713845784497-fe3d7ed176d8"),
  },
  {
    id: "smiling-black-top",
    title: "The in-between",
    photographerId: "jessica-felicio",
    photographer: "Jessica Felicio",
    license: "COMMERCIAL",
    category: "Lifestyle",
    location: "Lisbon, Portugal",
    color: "#6c5344",
    orientation: "portrait",
    ratio: "aspect-[4/5]",
    price: 320,
    downloads: 9210,
    views: 142000,
    likes: 6410,
    camera: "Sony A7 IV",
    lens: "50mm f/1.8",
    iso: 160,
    keywords: ["smile", "lifestyle", "commercial", "joy"],
    image: u("1527201987695-67c06571957e"),
  },
  {
    id: "flower-ear",
    title: "Bloom study",
    photographerId: "divine-effiong",
    photographer: "Divine Effiong",
    license: "ROYALTY FREE",
    category: "Portrait",
    location: "Lagos, Nigeria",
    color: "#7d8a5f",
    orientation: "portrait",
    ratio: "aspect-[3/4]",
    price: 180,
    downloads: 2870,
    views: 61200,
    likes: 2210,
    camera: "Nikon Z6",
    lens: "105mm f/2.8",
    iso: 100,
    keywords: ["flower", "portrait", "beauty", "nature"],
    image: u("1593351799227-75df2026356b"),
  },
  {
    id: "man-wall",
    title: "Against the wall",
    photographerId: "moon-bouy",
    photographer: "Moon Bouy",
    license: "COMMERCIAL",
    category: "Fashion",
    location: "Nairobi, Kenya",
    color: "#8a8577",
    orientation: "portrait",
    ratio: "aspect-[4/5]",
    price: 290,
    downloads: 3340,
    views: 70100,
    likes: 2540,
    camera: "Fujifilm X-T4",
    lens: "56mm f/1.2",
    iso: 320,
    keywords: ["fashion", "menswear", "street", "editorial"],
    image: u("1711464669343-2596d0f1b526"),
  },
  {
    id: "black-tank",
    title: "Quiet confidence",
    photographerId: "sinitta-leunen",
    photographer: "Sinitta Leunen",
    license: "EDITORIAL",
    category: "Portrait",
    location: "Amsterdam, NL",
    color: "#5f5750",
    orientation: "portrait",
    ratio: "aspect-[3/4]",
    price: 210,
    downloads: 1980,
    views: 44300,
    likes: 1610,
    camera: "Canon EOS R6",
    lens: "35mm f/1.8",
    iso: 250,
    keywords: ["portrait", "minimal", "studio"],
    image: u("1619694770795-e21c58464159"),
  },
  {
    id: "orange-headdress",
    title: "Ceremony",
    photographerId: "prince-akachi",
    photographer: "Prince Akachi",
    license: "EXCLUSIVE",
    category: "Culture",
    location: "Lagos, Nigeria",
    color: "#a55b2c",
    orientation: "portrait",
    ratio: "aspect-[2/3]",
    price: 680,
    downloads: 640,
    views: 33900,
    likes: 4020,
    camera: "Leica Q2",
    lens: "28mm f/1.7",
    iso: 400,
    keywords: ["culture", "tradition", "colour", "heritage"],
    image: u("1532076904124-d4e8fe7fbbec"),
  },
  {
    id: "floral-shirt",
    title: "Pattern language",
    photographerId: "tony-luginsland",
    photographer: "Tony Luginsland",
    license: "COMMERCIAL",
    category: "Fashion",
    location: "Berlin, Germany",
    color: "#767d78",
    orientation: "portrait",
    ratio: "aspect-[3/4]",
    price: 260,
    downloads: 2110,
    views: 51000,
    likes: 1880,
    camera: "Sony A7R V",
    lens: "85mm f/1.8",
    iso: 200,
    keywords: ["fashion", "pattern", "textile"],
    image: u("1584805164144-ab4169cea20d"),
  },
  {
    id: "young-boy-bw",
    title: "Boyhood, no. 4",
    photographerId: "leroy-skalstad",
    photographer: "Leroy Skalstad",
    license: "EDITORIAL",
    category: "Documentary",
    location: "Chicago, USA",
    color: "#6b6b6b",
    orientation: "portrait",
    ratio: "aspect-[4/5]",
    price: 300,
    downloads: 1440,
    views: 39800,
    likes: 2960,
    camera: "Leica M11",
    lens: "50mm f/2",
    iso: 800,
    keywords: ["documentary", "black and white", "childhood"],
    image: u("1699903905361-4d408679753f"),
  },
  {
    id: "lagos-skyline",
    title: "Light on Lagos",
    photographerId: "onaopemipo-oladipupo",
    photographer: "Onaopemipo Oladipupo",
    license: "ROYALTY FREE",
    category: "Architecture",
    location: "Lagos, Nigeria",
    color: "#8b96a0",
    orientation: "landscape",
    ratio: "aspect-[3/2]",
    price: 190,
    downloads: 5210,
    views: 96100,
    likes: 3410,
    camera: "DJI Mavic 3",
    lens: "24mm f/2.8",
    iso: 100,
    keywords: ["architecture", "city", "skyline", "lagos"],
    image: u("1749058387715-1efad0eadc8c"),
  },
  {
    id: "lagos-daytime",
    title: "Marina, midday",
    photographerId: "stephen-olatunde",
    photographer: "Stephen Olatunde",
    license: "COMMERCIAL",
    category: "Architecture",
    location: "Lagos, Nigeria",
    color: "#9aa3ab",
    orientation: "landscape",
    ratio: "aspect-[3/2]",
    price: 220,
    downloads: 3980,
    views: 71200,
    likes: 2210,
    camera: "Canon EOS R",
    lens: "16-35mm f/4",
    iso: 100,
    keywords: ["architecture", "city", "harbour"],
    image: u("1559833064-6f4573ec1ac9"),
  },
  {
    id: "lagos-bw-skyline",
    title: "Grid, monochrome",
    photographerId: "emmanuel-ikwuegbu",
    photographer: "Emmanuel Ikwuegbu",
    license: "EDITORIAL",
    category: "Architecture",
    location: "Lagos, Nigeria",
    color: "#7a7a7a",
    orientation: "portrait",
    ratio: "aspect-[2/3]",
    price: 250,
    downloads: 1720,
    views: 40200,
    likes: 1540,
    camera: "Sony A7 III",
    lens: "35mm f/1.4",
    iso: 200,
    keywords: ["architecture", "black and white", "urban"],
    image: u("1640475167310-9112316627fa"),
  },
  {
    id: "rooftop-city",
    title: "From the roof",
    photographerId: "zainab-lawal",
    photographer: "Zainab Lawal",
    license: "COMMERCIAL",
    category: "Architecture",
    location: "Lagos, Nigeria",
    color: "#95928a",
    orientation: "portrait",
    ratio: "aspect-[3/4]",
    price: 230,
    downloads: 2640,
    views: 55400,
    likes: 1990,
    camera: "iPhone 15 Pro",
    lens: "24mm f/1.78",
    iso: 50,
    keywords: ["architecture", "rooftop", "cityscape"],
    image: u("1658394818344-20f0f11a9121"),
  },
  {
    id: "desert-road",
    title: "Sands of Time",
    photographerId: "zainab-lawal",
    photographer: "Zainab Lawal",
    license: "ROYALTY FREE",
    category: "Landscape",
    location: "Namib Desert, Namibia",
    color: "#c29b6f",
    orientation: "landscape",
    ratio: "aspect-[3/2]",
    price: 210,
    downloads: 1420,
    views: 33000,
    likes: 1100,
    camera: "Sony A7R V",
    lens: "24-70mm f/2.8",
    iso: 100,
    keywords: ["desert", "sand", "namibia", "sunset", "landscape"],
    image: u("1509316975850-ff9c5deb0cd9"),
  },
  {
    id: "concrete-shadows",
    title: "Light & Angle",
    photographerId: "emmanuel-ikwuegbu",
    photographer: "Emmanuel Ikwuegbu",
    license: "COMMERCIAL",
    category: "Architecture",
    location: "Berlin, Germany",
    color: "#d5d5d3",
    orientation: "portrait",
    ratio: "aspect-[3/4]",
    price: 180,
    downloads: 2150,
    views: 48000,
    likes: 1670,
    camera: "Fujifilm GFX 100S",
    lens: "32-64mm f/4",
    iso: 100,
    keywords: ["architecture", "minimalism", "shadow", "concrete"],
    image: u("1600585154340-be6161a56a0c"),
  },
  {
    id: "yellow-studio",
    title: "Monochrome study in yellow",
    photographerId: "prince-akachi",
    photographer: "Prince Akachi",
    license: "EDITORIAL",
    category: "Portrait",
    location: "Accra, Ghana",
    color: "#e5b839",
    orientation: "portrait",
    ratio: "aspect-[4/5]",
    price: 340,
    downloads: 1980,
    views: 42100,
    likes: 2130,
    camera: "Canon EOS R3",
    lens: "50mm f/1.2",
    iso: 160,
    keywords: ["portrait", "yellow", "studio", "monochrome"],
    image: u("1508214751196-bcfd4ca60f91"),
  },
  {
    id: "coast-cliffs",
    title: "At the edge",
    photographerId: "sinitta-leunen",
    photographer: "Sinitta Leunen",
    license: "COMMERCIAL",
    category: "Landscape",
    location: "Madeira, Portugal",
    color: "#4e5d59",
    orientation: "landscape",
    ratio: "aspect-[3/2]",
    price: 280,
    downloads: 3100,
    views: 68000,
    likes: 2450,
    camera: "Sony A7R IV",
    lens: "16-35mm f/2.8",
    iso: 200,
    keywords: ["landscape", "ocean", "cliffs", "madeira"],
    image: u("1470071459604-3b5ec3a7fe05"),
  },
  {
    id: "retro-car",
    title: "Midnight cruiser",
    photographerId: "moon-bouy",
    photographer: "Moon Bouy",
    license: "EXCLUSIVE",
    category: "Lifestyle",
    location: "Nairobi, Kenya",
    color: "#232a35",
    orientation: "portrait",
    ratio: "aspect-[2/3]",
    price: 750,
    downloads: 120,
    views: 18900,
    likes: 980,
    camera: "Leica M11-P",
    lens: "35mm f/1.4",
    iso: 640,
    keywords: ["retro", "car", "vintage", "night", "street"],
    image: u("1525609004556-c46c7d6cf0a3"),
  },
  {
    id: "plant-leaf",
    title: "Ficus geometry",
    photographerId: "divine-effiong",
    photographer: "Divine Effiong",
    license: "ROYALTY FREE",
    category: "Lifestyle",
    location: "Lagos, Nigeria",
    color: "#3e5140",
    orientation: "square",
    ratio: "aspect-square",
    price: 150,
    downloads: 4900,
    views: 98000,
    likes: 3120,
    camera: "Nikon Z7 II",
    lens: "50mm f/2.8 Macro",
    iso: 64,
    keywords: ["plant", "leaf", "ficus", "botanical", "macro"],
    image: u("1497250681960-ef046c08a56e"),
  },
];

const unsplashIds = [
  "1506744038136-46273834b3fb", // Yosemite
  "1470071459604-3b5ec3a7fe05", // Landscape
  "1472214222541-d510753a4907", // Green meadow
  "1501854140801-50d01698950b", // Mountain range
  "1441974231531-c6227db76b6e", // Forest trees
  "1447752875215-b2761acb3c5d", // Forest path
  "1461896836934-ffe607ba8211", // Runner street
  "1486406146926-c627a92ad1ab", // Skyscraper
  "1493612276216-ee3925520721", // Vintage typewriter
  "1505740420928-5e560c06d30e", // Headphones
  "1507525428034-b723cf961d3e", // Beach sunset
  "1511556532299-8f662fc26c06", // Abstract shapes
  "1513542789411-b6a5d4f31634", // Art drawing
  "1513694203232-719a280e022f", // Cozy bedroom
  "1518709268805-4e9042af9f23", // Minimal architecture
  "1523275335684-37898b6baf30", // White watch
  "1526170375885-4d8ecf77b99f", // Polaroid camera
  "1534447677768-be436bb09401", // Northern lights
  "1540553016722-983e48a2cd10", // Macbook desk
  "1542291026-7eec264c27ff", // Red Nike shoe
  "1551434678-e076c223a692", // Team working
  "1560343090-f0409e92791a", // Black boots
  "1564013799919-ab600027ffc6", // Modern living room
  "1583847268964-b28dc8f51f92", // Minimalist stool
  "1593642532842-98d0fd5ebc1a", // Dell laptop
  "1600185365483-26d7a4cc7519", // Modern kitchen
  "1600585154340-be6161a56a0c", // Berlin concrete
  "1618005182384-a83a8bd57fbe", // Abstract fluid art
  "1618221195710-dd6b41faaea6", // Luxury couch
  "1618221381711-42ca8ab6e908", // Clean bathroom
  "1628157582853-a796fa650a6a", // Portrait studio
  "1633356122544-f134324a6cee", // Coding monitor
  "1682687220063-4742bd7fd538", // Desert dunes
  "1682687220067-167e4167e416", // Canyon rocks
  "1682687220115-ff9c5deb0cd9", // Namibia sunset
  "1682687220742-147007145960", // Portugal cliffs
  "1707343843437-caacff5cfa74", // Abstract geometric structure
  "1517841905240-472988babdf9", // Street portrait girl
  "1539571696357-5a69c17a67c6", // Candid man laughing
  "1544005313-94ddf0286df2", // Close-up portrait woman
  "1506794778202-cad84cf45f1d", // Male studio profile
  "1522075469751-3a6694fb2f61", // Designer studio shot
  "1534528741775-53994a69daeb", // Professional woman portrait
  "1507003211169-0a1dd7228f2d", // Happy man headshot
  "1494790108377-be9c29b29330", // Smile woman model
  "1500648767791-00dcc994a43e", // Black model studio
  "1519085360753-af0119f7cbe7", // Executive portrait
  "1524504388940-b1c1722653e1", // Street style photo
  "1529626455594-4ff0802cfb72", // Model posing outdoors
  "1531746020798-e6953c6e8e04", // Studio portrait red background
];

const generatedPhotos: Photo[] = unsplashIds.map((uid, index) => {
  const categoriesList = ["Portrait", "Lifestyle", "Fashion", "Architecture", "Culture", "Landscape"];
  const cameras = ["Sony A7R V", "Canon EOS R5", "Nikon Z7 II", "Fujifilm GFX 100S", "Leica M11-P"];
  const lenses = ["50mm f/1.2", "85mm f/1.4", "24-70mm f/2.8", "35mm f/1.4", "90mm f/2.8 Macro"];
  const locations = [
    "Lagos, Nigeria", "Nairobi, Kenya", "Cape Town, South Africa", "Accra, Ghana",
    "Berlin, Germany", "Paris, France", "Tokyo, Japan", "New York, USA", "London, UK"
  ];
  const photographers = [
    "Namnso Ukpanah", "Moon Bouy", "Divine Effiong", "Sinitta Leunen",
    "Emmanuel Ikwuegbu", "Zainab Lawal", "Stephen Olatunde"
  ];

  const category = categoriesList[index % categoriesList.length];
  const photographer = photographers[index % photographers.length];
  const location = locations[index % locations.length];
  const camera = cameras[index % cameras.length];
  const lens = lenses[index % lenses.length];

  return {
    id: `generated-${uid}`,
    title: `Study in ${category} no. ${index + 1}`,
    photographerId: photographer.toLowerCase().replace(/\s+/g, "-"),
    photographer,
    license: (index % 3 === 0 ? "COMMERCIAL" : index % 3 === 1 ? "ROYALTY FREE" : "EDITORIAL") as License,
    category,
    location,
    color: "#555555",
    orientation: index % 2 === 0 ? ("portrait" as const) : ("landscape" as const),
    ratio: index % 2 === 0 ? "aspect-[3/4]" : "aspect-[3/2]",
    price: 150 + (index % 10) * 45,
    downloads: 120 + index * 45,
    views: 1800 + index * 600,
    likes: 45 + index * 12,
    camera,
    lens,
    iso: 100 + (index % 4) * 100,
    keywords: [category.toLowerCase(), "creative", "editorial", "global-release"],
    image: u(uid),
  };
});

export const photos: Photo[] = [...initialPhotos, ...generatedPhotos];

export const getPhoto = (id: string) => photos.find((p) => p.id === id);

export const categories = [
  "All",
  "Portrait",
  "Lifestyle",
  "Fashion",
  "Architecture",
  "Culture",
  "Documentary",
];

export const licenses: License[] = ["COMMERCIAL", "EDITORIAL", "ROYALTY FREE", "EXCLUSIVE"];

export interface Collection {
  id: string;
  title: string;
  curator: string;
  count: number;
  cover: string[];
  description: string;
}

export const collections: Collection[] = [
  {
    id: "west-africa-now",
    title: "West Africa, Now",
    curator: "NS Editorial",
    count: 148,
    description: "A living portrait of contemporary life across the region.",
    cover: [photos[8].image, photos[5].image, photos[2].image],
  },
  {
    id: "quiet-architecture",
    title: "Quiet Architecture",
    curator: "Studio Line",
    count: 92,
    description: "Structure, light and negative space in the built world.",
    cover: [photos[10].image, photos[9].image, photos[11].image],
  },
  {
    id: "new-perspectives",
    title: "New Perspectives",
    curator: "Namnso Ukpanah",
    count: 210,
    description: "Emerging photographers reframing the everyday.",
    cover: [photos[0].image, photos[3].image, photos[6].image],
  },
  {
    id: "human-documentary",
    title: "Human, Documentary",
    curator: "NS Editorial",
    count: 76,
    description: "Unhurried, honest imagery of people and place.",
    cover: [photos[7].image, photos[1].image, photos[4].image],
  },
];

export interface Photographer {
  id: string;
  name: string;
  location: string;
  specialty: string;
  followers: string;
  images: number;
  avatar: string;
  bio?: string;
  cover?: string;
  verified?: boolean;
  gear?: string[];
}

export const photographers: Photographer[] = [
  { id: "namnso", name: "Namnso Ukpanah", location: "Lagos, Nigeria", specialty: "Editorial", followers: "24.1k", images: 412, avatar: photos[8].image, verified: true, cover: photos[8].image, gear: ["Sony A7 IV", "35mm f/1.4", "85mm f/1.8"], bio: "Editorial and documentary photographer based in Lagos, drawn to unhurried portraits of everyday life across West Africa." },
  { id: "jessica-felicio", name: "Jessica Felicio", location: "Lisbon, Portugal", specialty: "Lifestyle", followers: "31.6k", images: 508, avatar: photos[1].image, verified: true, cover: photos[1].image, gear: ["Sony A7 IV", "50mm f/1.8"], bio: "Lifestyle photographer capturing joy, movement and light. Believer in imagery that feels lived-in, not staged." },
  { id: "prince-akachi", name: "Prince Akachi", location: "Lagos, Nigeria", specialty: "Culture", followers: "18.9k", images: 287, avatar: photos[5].image, verified: true, cover: photos[5].image, gear: ["Leica Q2", "28mm f/1.7"], bio: "Documenting culture, tradition and colour across Nigeria. Every frame is a small act of preservation." },
  { id: "godfred-kwakye", name: "Godfred Kwakye", location: "Accra, Ghana", specialty: "Portrait", followers: "12.4k", images: 194, avatar: photos[0].image, verified: true, cover: photos[0].image, gear: ["Canon EOS R5", "85mm f/1.4"], bio: "Portrait photographer from Accra with a love for texture, gold light and quiet confidence." },
];

export const getPhotosByPhotographer = (id: string) =>
  photos.filter((p) => p.photographerId === id);

// Returns a profile for any photographerId — enriched if editorial, otherwise
// derived from their photos so every credited creator has a page.
export function getPhotographer(id: string): Photographer | undefined {
  const known = photographers.find((p) => p.id === id);
  const shots = getPhotosByPhotographer(id);
  if (known) return { ...known, images: shots.length || known.images };
  if (shots.length === 0) return undefined;
  const first = shots[0];
  const totalLikes = shots.reduce((s, p) => s + p.likes, 0);
  return {
    id,
    name: first.photographer,
    location: first.location,
    specialty: first.category,
    followers: `${(totalLikes / 1000).toFixed(1)}k`,
    images: shots.length,
    avatar: first.image,
    cover: first.image,
    verified: true,
    gear: [first.camera, first.lens],
    bio: `${first.category} photographer based in ${first.location}, contributing to the NS CAPTURES archive.`,
  };
}

export interface Brief {
  id: string;
  title: string;
  location: string;
  license: License;
  budget: number;
  delivery: string;
  status: "MATCHING" | "IN PROGRESS" | "DELIVERED";
  description: string;
}

export const briefs: Brief[] = [
  { id: "047", title: "River work, Lagos", location: "Lagos, Nigeria", license: "COMMERCIAL", budget: 600, delivery: "72 hours", status: "MATCHING", description: "Traditional fishermen on the water at daybreak — human, documentary, unhurried." },
  { id: "046", title: "Fintech office, Lagos", location: "Lagos, Nigeria", license: "COMMERCIAL", budget: 1200, delivery: "5 days", status: "IN PROGRESS", description: "A young African entrepreneur working inside a modern fintech office." },
  { id: "045", title: "Market colour study", location: "Kano, Nigeria", license: "EDITORIAL", budget: 450, delivery: "48 hours", status: "DELIVERED", description: "Textiles and produce, saturated and close, in an open-air market." },
];

// The signed-in user (buyer) — powers the account/profile area.
export interface Purchase {
  id: string;
  photoId: string;
  license: string;
  price: number;
  date: string;
}

export const currentUser = {
  name: "Amara Okafor",
  email: "amara@mainlandstudio.co",
  plan: "Studio",
  role: "Art Director",
  company: "Mainland Studio",
  avatar: photos[2].image,
  memberSince: "Mar 2025",
  downloadsLeft: "Unlimited",
};

export const userPurchases: Purchase[] = [
  { id: "INV-2041", photoId: "lagos-skyline", license: "COMMERCIAL", price: 190, date: "Jul 09, 2026" },
  { id: "INV-2038", photoId: "smiling-black-top", license: "EXTENDED", price: 768, date: "Jul 02, 2026" },
  { id: "INV-2033", photoId: "orange-headdress", license: "EDITORIAL", price: 476, date: "Jun 21, 2026" },
];

export const userCollections = [
  { id: "brand-2026", name: "Brand Refresh 2026", count: 24, cover: [photos[1].image, photos[0].image, photos[8].image] },
  { id: "mood-warmth", name: "Mood — Warmth", count: 12, cover: [photos[5].image, photos[2].image, photos[6].image] },
  { id: "cityscapes", name: "Cityscapes", count: 18, cover: [photos[8].image, photos[9].image, photos[11].image] },
];

// Account page extended mock data
export interface LicenseRecord {
  id: string;
  photoId: string;
  title: string;
  license: string;
  price: number;
  date: string;
  expires: string;
  downloads: number;
}

export const mockLicenses: LicenseRecord[] = [
  { id: "LIC-001", photoId: "lagos-skyline", title: "Light on Lagos", license: "COMMERCIAL", price: 190, date: "Jul 09, 2026", expires: "Perpetual", downloads: 3 },
  { id: "LIC-002", photoId: "smiling-black-top", title: "The in-between", license: "EXTENDED", price: 768, date: "Jul 02, 2026", expires: "Perpetual", downloads: 1 },
  { id: "LIC-003", photoId: "orange-headdress", title: "Ceremony", license: "EDITORIAL", price: 476, date: "Jun 21, 2026", expires: "Perpetual", downloads: 2 },
  { id: "LIC-004", photoId: "lagos-daytime", title: "Marina, midday", license: "COMMERCIAL", price: 220, date: "May 15, 2026", expires: "Perpetual", downloads: 0 },
  { id: "LIC-005", photoId: "flower-ear", title: "Bloom study", license: "ROYALTY FREE", price: 180, date: "Apr 28, 2026", expires: "Perpetual", downloads: 1 },
];

export interface ActivityItem {
  id: string;
  type: "download" | "purchase" | "collection" | "like" | "login" | "plan";
  title: string;
  date: Date;
  desc: string;
}

export const mockActivity: ActivityItem[] = [
  { id: "a1", type: "download", title: "Downloaded: Light on Lagos", date: new Date("2026-07-11"), desc: "COMMERCIAL license · $190" },
  { id: "a2", type: "purchase", title: "License purchased: Bloom study", date: new Date("2026-07-08"), desc: "ROYALTY FREE license · $180" },
  { id: "a3", type: "collection", title: "Created collection: Cityscapes", date: new Date("2026-07-01"), desc: "18 images added" },
  { id: "a4", type: "like", title: "Liked: The in-between", date: new Date("2026-06-25"), desc: "Added to your favorites" },
  { id: "a5", type: "login", title: "New sign-in from Lagos, Nigeria", date: new Date("2026-06-21"), desc: "Chrome on macOS" },
  { id: "a6", type: "plan", title: "Plan renewed: Studio ($49/mo)", date: new Date("2026-06-08"), desc: "Next billing: Sep 1, 2026" },
];

// Admin console mock data.
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Buyer" | "Photographer" | "Enterprise" | "Admin";
  status: "Active" | "Pending" | "Suspended";
  joined: string;
}

export const adminUsers: AdminUser[] = [
  { id: "U-1042", name: "Amara Okafor", email: "amara@mainlandstudio.co", role: "Enterprise", status: "Active", joined: "Mar 2025" },
  { id: "U-1044", name: "Namnso Ukpanah", email: "namnso@ns.co", role: "Photographer", status: "Active", joined: "Jan 2024" },
  { id: "U-1051", name: "Divine Effiong", email: "divine@studio.ng", role: "Photographer", status: "Pending", joined: "Jul 2026" },
  { id: "U-1067", name: "Daniel Okoro", email: "daniel@paystack.co", role: "Buyer", status: "Active", joined: "Feb 2026" },
  { id: "U-1088", name: "Spam Account", email: "noreply@bots.io", role: "Buyer", status: "Suspended", joined: "Jun 2026" },
];

export interface ModerationItem {
  id: string;
  photoId: string;
  photographer: string;
  reason: string;
  submitted: string;
}

export const moderationQueue: ModerationItem[] = [
  { id: "M-301", photoId: "flower-ear", photographer: "Divine Effiong", reason: "New contributor — first upload", submitted: "2h ago" },
  { id: "M-302", photoId: "man-wall", photographer: "Moon Bouy", reason: "Keyword review", submitted: "5h ago" },
  { id: "M-303", photoId: "floral-shirt", photographer: "Tony Luginsland", reason: "License change request", submitted: "1d ago" },
];
