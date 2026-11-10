export type CategoryId =
  | "medical"
  | "passport"
  | "national_id"
  | "driving_license"
  | "birth_certificate"
  | "marriage_certificate"
  | "education"
  | "bank"
  | "insurance"
  | "property"
  | "vehicle"
  | "tax"
  | "employment"
  | "visa"
  | "bills"
  | "legal"
  | "other";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  /** Tailwind gradient classes for the folder tile */
  gradient: string;
  /** Solid accent used for text/borders */
  accent: string;
  keywords: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: "medical",
    label: "Medical",
    emoji: "🩺",
    gradient: "from-rose-500 to-pink-600",
    accent: "text-rose-600 dark:text-rose-400",
    keywords: [
      "hospital", "medical", "patient", "diagnosis", "prescription", "doctor", "clinic",
      "laboratory", "lab report", "blood", "mbbs", "pharmacy", "rx", "discharge", "x-ray",
      "scan report", "cholesterol", "glucose", "ecg", "medicine",
    ],
  },
  {
    id: "passport",
    label: "Passport",
    emoji: "🛂",
    gradient: "from-indigo-500 to-blue-700",
    accent: "text-indigo-600 dark:text-indigo-400",
    keywords: ["passport", "p<", "nationality", "place of birth", "immigration", "visa"],
  },
  {
    id: "national_id",
    label: "National ID",
    emoji: "🪪",
    gradient: "from-sky-500 to-cyan-600",
    accent: "text-sky-600 dark:text-sky-400",
    keywords: [
      "national identity", "identity card", "nic", "id card", "registration of persons",
      "ජාතික හැඳුනුම්පත", "தேசிய அடையாள",
    ],
  },
  {
    id: "driving_license",
    label: "Driving License",
    emoji: "🚗",
    gradient: "from-amber-500 to-orange-600",
    accent: "text-amber-600 dark:text-amber-400",
    keywords: ["driving licence", "driving license", "motor traffic", "licence no", "dl no"],
  },
  {
    id: "birth_certificate",
    label: "Birth Certificate",
    emoji: "👶",
    gradient: "from-fuchsia-500 to-purple-600",
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    keywords: ["birth certificate", "certificate of birth", "registrar of births", "date of birth"],
  },
  {
    id: "marriage_certificate",
    label: "Marriage",
    emoji: "💍",
    gradient: "from-pink-400 to-rose-500",
    accent: "text-pink-600 dark:text-pink-400",
    keywords: ["marriage", "certificate of marriage", "bride", "bridegroom"],
  },
  {
    id: "education",
    label: "Education",
    emoji: "🎓",
    gradient: "from-emerald-500 to-green-600",
    accent: "text-emerald-600 dark:text-emerald-400",
    keywords: ["certificate", "university", "degree", "school", "examination", "g.c.e", "transcript", "diploma"],
  },
  {
    id: "bank",
    label: "Bank & Finance",
    emoji: "🏦",
    gradient: "from-teal-500 to-emerald-700",
    accent: "text-teal-600 dark:text-teal-400",
    keywords: ["bank", "account", "statement", "loan", "deposit", "cheque", "credit card"],
  },
  {
    id: "insurance",
    label: "Insurance",
    emoji: "🛡️",
    gradient: "from-blue-500 to-indigo-600",
    accent: "text-blue-600 dark:text-blue-400",
    keywords: ["insurance", "policy", "premium", "insured", "claim"],
  },
  {
    id: "property",
    label: "Property & Deeds",
    emoji: "🏠",
    gradient: "from-yellow-500 to-amber-600",
    accent: "text-yellow-700 dark:text-yellow-400",
    keywords: ["deed", "land", "property", "survey plan", "title", "assessment", "lease"],
  },
  {
    id: "vehicle",
    label: "Vehicle",
    emoji: "🏍️",
    gradient: "from-slate-500 to-slate-700",
    accent: "text-slate-600 dark:text-slate-300",
    keywords: ["vehicle", "registration certificate", "chassis", "engine no", "revenue licence", "emission"],
  },
  {
    id: "tax",
    label: "Tax",
    emoji: "🧾",
    gradient: "from-lime-500 to-green-600",
    accent: "text-lime-700 dark:text-lime-400",
    keywords: ["tax", "inland revenue", "tin", "vat", "assessment year"],
  },
  {
    id: "employment",
    label: "Work",
    emoji: "💼",
    gradient: "from-violet-500 to-indigo-600",
    accent: "text-violet-600 dark:text-violet-400",
    keywords: ["employment", "salary", "payslip", "appointment letter", "epf", "etf", "service letter"],
  },
  {
    id: "visa",
    label: "Visa & Travel",
    emoji: "✈️",
    gradient: "from-cyan-500 to-blue-600",
    accent: "text-cyan-600 dark:text-cyan-400",
    keywords: ["visa", "entry permit", "residence permit", "boarding pass", "e-ticket", "itinerary", "work permit"],
  },
  {
    id: "bills",
    label: "Bills & Utilities",
    emoji: "💡",
    gradient: "from-orange-400 to-amber-600",
    accent: "text-orange-600 dark:text-orange-400",
    keywords: ["electricity", "water bill", "ceb", "leco", "nwsdb", "telephone bill", "invoice", "receipt", "bill no", "dialog", "mobitel", "amount due"],
  },
  {
    id: "legal",
    label: "Legal",
    emoji: "⚖️",
    gradient: "from-stone-500 to-stone-700",
    accent: "text-stone-600 dark:text-stone-300",
    keywords: ["court", "affidavit", "power of attorney", "last will", "testament", "agreement", "notary", "attorney-at-law", "police report"],
  },
  {
    id: "other",
    label: "Other",
    emoji: "📁",
    gradient: "from-gray-500 to-gray-700",
    accent: "text-gray-600 dark:text-gray-300",
    keywords: [],
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function getCategory(id: string | undefined | null): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Very simple keyword classifier used when AI extraction is unavailable. */
export function guessCategory(text: string): CategoryId {
  const lower = text.toLowerCase();
  let best: { id: CategoryId; score: number } = { id: "other", score: 0 };
  for (const c of CATEGORIES) {
    let score = 0;
    for (const k of c.keywords) if (lower.includes(k)) score += k.length > 6 ? 2 : 1;
    if (score > best.score) best = { id: c.id, score };
  }
  return best.id;
}
