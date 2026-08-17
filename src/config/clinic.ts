/**
 * Single source of truth for all clinic facts. The receptionist engine must
 * ONLY ever answer from this object — never from AI-generated text and never
 * from anything a patient claims in chat. See src/receptionist/safety.ts and
 * src/receptionist/intents.ts for how facts are matched and injected.
 *
 * Every value below is sourced directly from verified material supplied for
 * the Skin Center domain migration (Facebook business page listing, Google
 * Business listing, and the clinic's own published service/price list).
 * Nothing here is invented — where a fact (a price, a weekly schedule, a
 * branch, a second location) was not present in that verified material, it
 * is deliberately left unset rather than guessed. See README.md → "Verified
 * vs. unverified clinic data" for the full accounting.
 */

export type PriceType = "from" | "fixed" | "unverified";

/**
 * How cautious the receptionist's wording needs to be for a given service —
 * kept as a small, reusable set of caution levels (rather than 25 hand-
 * written safety notes) so every service response consistently avoids
 * guaranteeing outcomes or giving procedural medical instructions.
 */
export type CautionLevel = "injectable" | "surgical" | "device" | "general";

export interface ServiceEntry {
  id: string;
  canonicalName: string;
  category:
    | "medical-dermatology"
    | "injectables"
    | "lasers"
    | "facial-aesthetic"
    | "hair"
    | "body-contouring"
    | "surgery"
    | "other";
  /** Lowercase phrases (English/Roman Urdu) matched against patient messages. */
  aliases: string[];
  description: string;
  technology?: string;
  priceType: PriceType;
  /** Human-facing price label exactly as verified, e.g. "From PKR 18,000", "PKR 4,000". Null when priceType is "unverified". */
  priceLabel: string | null;
  caution: CautionLevel;
}

export const CLINIC = {
  businessName: "Skin Center",
  tagline: "Dermatology • Skin • Hair • Aesthetic Care",

  doctor: {
    name: "Dr. Syed Bilal Shams",
    specialty: "Dermatologist",
    positioning: "Skin Specialist & Cosmetologist"
  },

  // Only the Quetta location is verified. Kept as an array (rather than a
  // single object) so a genuinely verified second branch can be added later
  // without a data-model change — see README for how to add one.
  branches: [
    {
      id: "quetta",
      name: "Skin Center Quetta",
      city: "Quetta",
      country: "Pakistan",
      address: "Skin Center, Jinnah Road corner Quarry Road, Quetta, Pakistan, 87300",
      postalCode: "87300",
      phone: "(081) 2823571"
    }
  ] as const,

  // Contact details as published on the clinic's own Facebook business page.
  // Distinct from WHATSAPP_PHONE_NUMBER_ID in .env, which is the number this
  // AI receptionist itself sends/receives WhatsApp messages through — this
  // whatsappDisplay value is the clinic's own publicly listed WhatsApp
  // contact, shown to patients as information, not used by the app to send.
  phone: "(081) 2823571",
  email: "skincenter.pk@gmail.com",
  website: "skincenter.pk",
  whatsappDisplay: "+92 346 9790506",

  // Deliberately sparse — only what was actually verified. The Google
  // listing showed a live "Open now · Closes 10 PM" status (and, in an
  // earlier snapshot, "Opening Soon"), which is a momentary status
  // indicator, NOT a per-day schedule. No weekly hours are configured.
  hours: {
    closingTimeVerified: "10 PM",
    weeklyScheduleVerified: false
  },

  consultation: {
    priceType: "from" as PriceType,
    priceLabel: "From PKR 1,000",
    description: "Dermatology consultation covering skin, hair, nail, allergy, and STD-related concerns."
  },

  ratings: [
    { source: "Google", score: "4.6/5", detail: "245 reviews" },
    { source: "Facebook", score: null, detail: "3 reviews" }
  ],

  timezone: "Asia/Karachi"
} as const;

export type Clinic = typeof CLINIC;

export const SERVICES: ServiceEntry[] = [
  {
    id: "botox",
    canonicalName: "Botox",
    category: "injectables",
    aliases: ["botox", "botox injection", "botox treatment", "anti-wrinkle injection", "inj botox"],
    description: "Listed for wrinkles, eyebrow lifting, nose reshaping, Nefertiti's lift, platysmal bands, migraine, hyperhidrosis, and blepharospasm.",
    priceType: "from",
    priceLabel: "From PKR 18,000",
    caution: "injectable"
  },
  {
    id: "fillers",
    canonicalName: "Dermal Fillers",
    category: "injectables",
    aliases: ["fillers", "dermal fillers", "lip fillers", "facial fillers", "nose filler"],
    description: "Listed for laugh lines, lip augmentation, nose reshaping (liquid rhinoplasty), and treatment of scars.",
    priceType: "from",
    priceLabel: "From PKR 16,000",
    caution: "injectable"
  },
  {
    id: "prp",
    canonicalName: "PRP",
    category: "injectables",
    aliases: ["prp", "platelet rich plasma", "vampire facial", "prp hair treatment", "prp for hair"],
    description: "Listed for hair fall, acne scars, and facelift (vampire facelift).",
    priceType: "from",
    priceLabel: "From PKR 5,000",
    caution: "injectable"
  },
  {
    id: "whitening-injections",
    canonicalName: "Whitening Injections",
    category: "injectables",
    aliases: ["whitening injection", "whitening injections", "skin whitening injection"],
    description: "Clinic listing shows weekly injections for 14 weeks.",
    priceType: "fixed",
    priceLabel: "PKR 5,000 per injection",
    caution: "injectable"
  },
  {
    id: "mesotherapy",
    canonicalName: "Mesotherapy",
    category: "injectables",
    aliases: ["mesotherapy"],
    description: "Whitening cocktail injections via mesogun.",
    technology: "Mesogun",
    priceType: "from",
    priceLabel: "From PKR 10,000",
    caution: "injectable"
  },
  {
    id: "charcoal-laser-facial",
    canonicalName: "Charcoal Laser Facial",
    category: "facial-aesthetic",
    aliases: ["charcoal laser facial", "carbon laser facial", "black doll facial", "hollywood facial"],
    description: "Also listed as Carbon laser facial, Black Doll facial, and Hollywood facial.",
    priceType: "from",
    priceLabel: "From PKR 10,000",
    caution: "device"
  },
  {
    id: "hydrafacial",
    canonicalName: "HydraFacial MD EDGE",
    category: "facial-aesthetic",
    aliases: ["hydrafacial", "hydra facial"],
    description: "Facial treatment using the HydraFacial MD EDGE system.",
    technology: "HydraFacial MD EDGE system (USA)",
    priceType: "from",
    priceLabel: "From PKR 10,000",
    caution: "device"
  },
  {
    id: "cryofacial",
    canonicalName: "Cryofacial",
    category: "facial-aesthetic",
    aliases: ["cryofacial", "cryo facial"],
    description: "Listed for whitening, instant glow, skin tightening, and rejuvenation.",
    technology: "Cryopenguin",
    priceType: "from",
    priceLabel: "From PKR 15,000",
    caution: "device"
  },
  {
    id: "dark-circles",
    canonicalName: "Dark Circles Treatment",
    category: "facial-aesthetic",
    aliases: ["dark circles", "dark circles treatment"],
    description: "Uses PicoWay laser, carboxy therapy, and mesotherapy.",
    priceType: "from",
    priceLabel: "From PKR 6,000",
    caution: "device"
  },
  {
    id: "acne-scar-treatment",
    canonicalName: "Acne Scar Treatment",
    category: "medical-dermatology",
    aliases: ["acne scar", "acne scars", "acne scar treatment"],
    description: "Uses lasers, microdermabrasion, Dermapen, Dermaroller, RF microneedling, subcision, PRP, and injection filler.",
    priceType: "from",
    priceLabel: "From PKR 7,000",
    caution: "device"
  },
  {
    id: "melasma-laser",
    canonicalName: "Melasma Laser Treatment",
    category: "lasers",
    aliases: ["melasma", "melasma laser", "melasma treatment"],
    description: "Picotoning for melasma, uneven skin tone, and pigmentation.",
    technology: "PicoWay laser (Candela, USA)",
    priceType: "from",
    priceLabel: "From PKR 10,000",
    caution: "device"
  },
  {
    id: "laser-hair-removal",
    canonicalName: "Laser Hair Removal",
    category: "lasers",
    aliases: ["laser hair removal", "hair removal laser"],
    description: "Laser hair removal treatment.",
    technology: "GentleMax Pro laser (Candela, USA)",
    priceType: "unverified",
    priceLabel: null,
    caution: "device"
  },
  {
    id: "laser-tattoo-removal",
    canonicalName: "Laser Tattoo Removal",
    category: "lasers",
    aliases: ["tattoo removal", "laser tattoo removal"],
    description: "Laser tattoo removal treatment.",
    technology: "PicoWay laser (Candela, USA)",
    priceType: "unverified",
    priceLabel: null,
    caution: "device"
  },
  {
    id: "mole-freckle-laser",
    canonicalName: "Laser Removal of Moles, Freckles and Lentigines",
    category: "lasers",
    aliases: ["mole removal", "freckle removal", "lentigines", "mole laser", "freckle laser"],
    description: "Laser removal for moles, freckles, and lentigines.",
    technology: "PicoWay laser (Candela, USA)",
    priceType: "unverified",
    priceLabel: null,
    caution: "device"
  },
  {
    id: "birthmark-laser",
    canonicalName: "Laser Treatment for Birthmarks",
    category: "lasers",
    aliases: ["birthmark", "birthmark laser", "haemangioma", "port-wine stain", "port wine stain"],
    description: "For birthmarks such as infantile haemangioma and port-wine stain.",
    technology: "Pulsed Dye Laser V BEAM Perfecta (Candela, USA)",
    priceType: "unverified",
    priceLabel: null,
    caution: "device"
  },
  {
    id: "dark-lips",
    canonicalName: "Dark Lips Treatment",
    category: "lasers",
    aliases: ["dark lips", "dark lips treatment"],
    description: "Treatment for dark lips.",
    technology: "Picosecond Laser",
    priceType: "fixed",
    priceLabel: "PKR 4,000",
    caution: "device"
  },
  {
    id: "dark-underparts",
    canonicalName: "Dark Underarms + Pubic Area Treatment",
    category: "lasers",
    aliases: ["dark underarms", "dark armpits", "dark pubic area", "dark underparts"],
    description: "Treatment for dark armpits and pubic area.",
    technology: "Picosecond laser",
    priceType: "fixed",
    priceLabel: "PKR 16,000",
    caution: "device"
  },
  {
    id: "microblading",
    canonicalName: "Microblading / Micropigmentation for Eyebrows",
    category: "other",
    aliases: ["microblading", "micropigmentation", "eyebrow microblading", "pmu brows"],
    description: "Microblading / micropigmentation for eyebrows.",
    priceType: "from",
    priceLabel: "From PKR 25,000",
    caution: "device"
  },
  {
    id: "photodynamic-therapy",
    canonicalName: "Photodynamic Therapy",
    category: "medical-dermatology",
    aliases: ["photodynamic therapy", "pdt"],
    description: "Listed for acne and related concerns.",
    priceType: "from",
    priceLabel: "From PKR 5,000",
    caution: "device"
  },
  {
    id: "hair-transplant",
    canonicalName: "Hair Transplantation",
    category: "hair",
    aliases: ["hair transplant", "hair transplantation"],
    description: "Hair transplantation is listed as a clinic service.",
    priceType: "unverified",
    priceLabel: null,
    caution: "surgical"
  },
  {
    id: "double-chin",
    canonicalName: "Double Chin Treatment",
    category: "body-contouring",
    aliases: ["double chin", "double chin treatment"],
    description: "Methods listed include HIFU, lipolytic injections (Kybella), RF microneedling, liposuction, and surgery.",
    priceType: "unverified",
    priceLabel: null,
    caution: "surgical"
  },
  {
    id: "skin-tightening",
    canonicalName: "Skin Tightening",
    category: "body-contouring",
    aliases: ["skin tightening"],
    description: "Methods listed include threads, RF microneedling, HIFU, PRP, and Cryofacial.",
    priceType: "unverified",
    priceLabel: null,
    caution: "device"
  },
  {
    id: "hifu",
    canonicalName: "HIFU",
    category: "body-contouring",
    aliases: ["hifu"],
    description: "Listed for double chin, love handles, body shaping, and skin sagging.",
    priceType: "from",
    priceLabel: "From PKR 35,000",
    caution: "device"
  },
  {
    id: "vitiligo-psoriasis-alopecia",
    canonicalName: "Vitiligo / Psoriasis / Alopecia Areata Treatment",
    category: "medical-dermatology",
    aliases: ["vitiligo", "psoriasis", "alopecia", "alopecia areata"],
    description: "Uses NB UVB phototherapy, PUVA therapy, and Excimer laser.",
    priceType: "from",
    priceLabel: "From PKR 7,000",
    caution: "device"
  },
  {
    id: "warts-skin-tags",
    canonicalName: "Removal of Warts and Skin Tags",
    category: "other",
    aliases: ["wart removal", "skin tag removal", "warts", "skin tags"],
    description: "Uses electrocautery, cryotherapy, and CO2 laser.",
    priceType: "unverified",
    priceLabel: null,
    caution: "device"
  },
  {
    id: "skin-surgery",
    canonicalName: "Skin Surgery / Dermatosurgery",
    category: "surgery",
    aliases: ["skin surgery", "dermatosurgery"],
    description: "For cysts, lipomas, skin cancers, and scar revision.",
    priceType: "unverified",
    priceLabel: null,
    caution: "surgical"
  },
  {
    id: "blepharoplasty",
    canonicalName: "Blepharoplasty",
    category: "surgery",
    aliases: ["blepharoplasty", "eyelid surgery"],
    description: "Eyelid surgery.",
    priceType: "from",
    priceLabel: "From PKR 60,000",
    caution: "surgical"
  },
  {
    id: "liquid-rhinoplasty",
    canonicalName: "Nose Job / Liquid Rhinoplasty",
    category: "surgery",
    aliases: ["liquid rhinoplasty", "nose job", "nose reshaping"],
    description: "Non-surgical nose reshaping via fillers.",
    priceType: "from",
    priceLabel: "From PKR 25,000",
    caution: "injectable"
  },
  {
    id: "breast-augmentation",
    canonicalName: "Breast Augmentation",
    category: "surgery",
    aliases: ["breast augmentation"],
    description: "Methods listed include fillers and silicone breast implants.",
    priceType: "unverified",
    priceLabel: null,
    caution: "surgical"
  },
  {
    id: "thread-lift",
    canonicalName: "Thread Lift",
    category: "surgery",
    aliases: ["thread lift"],
    description: "Thread lift procedure.",
    priceType: "from",
    priceLabel: "From PKR 60,000",
    caution: "surgical"
  },
  {
    id: "surgical-facelift",
    canonicalName: "Surgical Facelift",
    category: "surgery",
    aliases: ["surgical facelift", "facelift"],
    description: "Surgical facelift procedure.",
    priceType: "from",
    priceLabel: "From PKR 150,000",
    caution: "surgical"
  },
  {
    id: "otoplasty",
    canonicalName: "Otoplasty",
    category: "surgery",
    aliases: ["otoplasty", "ear surgery"],
    description: "Ear surgery.",
    priceType: "from",
    priceLabel: "From PKR 60,000",
    caution: "surgical"
  }
];

export function findServiceByAlias(text: string): ServiceEntry | null {
  const lower = text.toLowerCase();
  for (const service of SERVICES) {
    for (const alias of service.aliases) {
      if (lower.includes(alias)) return service;
    }
  }
  return null;
}
