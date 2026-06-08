import React, { useState } from "react";

// ─── Supabase Public Storage Url Config ────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fixlafzekifpgmipjdum.supabase.co";

/** Gets the public URL of a brand SVG inside the `branding` bucket */
export const getBrandLogoUrl = (storagePath: string) =>
  `${supabaseUrl}/storage/v1/object/public/branding/${storagePath}`;

// ─── Bulletproof Image Loader with Inline SVG Fallback ──────────────────────────

export function BrandLogoImage({
  logoUrl,
  size,
  fallback,
}: {
  logoUrl: string;
  size: number;
  fallback: React.ReactNode;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return <>{fallback}</>;
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      className="flex items-center justify-center rounded-full bg-white overflow-hidden shadow-sm transition-transform duration-200 hover:scale-110"
    >
      <img
        src={logoUrl}
        alt="Brand Logo"
        className="w-full h-full object-contain p-[3px]"
        onError={() => setError(true)}
      />
    </div>
  );
}

// ─── Inline Fallback SVGs (Used if Storage SVG does not exist yet) ──────────────

export const StarbucksIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <line x1="6" x2="14" y1="2" y2="2" />
    <path
      d="M10 10.5l.6 1.2 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const GrabIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 10a6 6 0 1 0 0 4h-6v-2" />
    <path d="M15 7a9 9 0 1 0 0 10h-3" strokeWidth="1.5" />
  </svg>
);

export const SevenElevenIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
    <path d="M9 22V12h6v10" />
    <path d="M3 9h18" stroke="#EE2E24" strokeWidth="2.5" />
    <path d="M3 12h18" stroke="#F27F22" strokeWidth="1.5" />
    <path d="M11 14h2l-1 3.5" stroke="#008A50" strokeWidth="2" />
  </svg>
);

export const ShopeeIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" />
    <line x1="3" x2="21" y1="6" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
    <path d="M11 12.5c1 0 1.5.3 1.5.8s-.5.8-1.5.8-1.5-.3-1.5-.8.5-.8 1.5-.8z" fill="currentColor" stroke="none" />
  </svg>
);

export const LazadaIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />
    <path d="M12 5v14" strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

export const BTSIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Train front view */}
    <rect x="4" y="3" width="16" height="15" rx="3" />
    <path d="M4 11h16" />
    <path d="M12 3v8" />
    <path d="M8 15h8" />
    <path d="M6 18l-2 3" />
    <path d="M18 18l2 3" />
  </svg>
);

export const DefaultBrandIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

// ─── Brand Configurations & Detection System ──────────────────────────────────

export interface BrandConfig {
  id: string;
  name: string;
  keywords: RegExp;
  color: string;
  storagePath: string;
  icon: React.ComponentType<{ size: number }>;
}

export const BRANDS: BrandConfig[] = [
  // ─── Transportation ───
  {
    id: "bts",
    name: "BTS Skytrain",
    keywords: /bts|บีทีเอส/i,
    color: "#00843D",
    storagePath: "Transportation/BTS.svg",
    icon: BTSIcon,
  },
  {
    id: "mrt",
    name: "MRT Bangkok",
    keywords: /mrt|เอ็มอาร์ที/i,
    color: "#002D62",
    storagePath: "Transportation/MRT.svg",
    icon: BTSIcon,
  },
  {
    id: "exat",
    name: "EXAT",
    keywords: /exat|ทางด่วน/i,
    color: "#003D7C",
    storagePath: "Transportation/Exat.svg",
    icon: BTSIcon,
  },
  {
    id: "grab",
    name: "Grab",
    keywords: /grab|แกร็บ/i,
    color: "#00B14F",
    storagePath: "Food&Drink/grab.svg",
    icon: GrabIcon,
  },

  // ─── Food&Drink ───
  {
    id: "starbucks",
    name: "Starbucks",
    keywords: /starbuck|สตาร์บัคส์|สตาร์บัค/i,
    color: "#006241",
    storagePath: "Food&Drink/Starbucks.svg",
    icon: StarbucksIcon,
  },
  {
    id: "chagee",
    name: "Chagee",
    keywords: /chagee|ชาจี/i,
    color: "#A2252A",
    storagePath: "Food&Drink/chagee.jpeg",
    icon: StarbucksIcon,
  },
  {
    id: "seven_eleven",
    name: "7-Eleven",
    keywords: /7\s*[-–—]?\s*11|7\s*eleven|เซเว่น|seven\s*eleven/i,
    color: "#008A50",
    storagePath: "Food&Drink/7-11.jpeg",
    icon: SevenElevenIcon,
  },
  {
    id: "amazon",
    name: "Cafe Amazon",
    keywords: /amazon|อเมซอน/i,
    color: "#00492C",
    storagePath: "Food&Drink/Cafe-Amazon.svg",
    icon: StarbucksIcon, // fallback to coffee icon
  },
  {
    id: "mk_suki",
    name: "MK Restaurants",
    keywords: /mk|เอ็มเค/i,
    color: "#E10B17",
    storagePath: "Food&Drink/MK.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "barbq_plaza",
    name: "Bar-B-Q Plaza",
    keywords: /barbq|บาร์บีคิว|ก้อน/i,
    color: "#006D44",
    storagePath: "Food&Drink/Bar-B-Q-Plaza.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "chatramue",
    name: "ChaTraMue",
    keywords: /chatramue|ชาตรามือ/i,
    color: "#C41230",
    storagePath: "Food&Drink/ChaTraMue.svg",
    icon: StarbucksIcon,
  },
  {
    id: "swensens",
    name: "Swensen's",
    keywords: /swensens|สเวนเซ่นส์/i,
    color: "#E10A14",
    storagePath: "Food&Drink/Swensens.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "sushiro",
    name: "Sushiro",
    keywords: /sushiro|susiro|ซูชิโระ|ซูชิโร่|ซูชิโร/i,
    color: "#E60012",
    storagePath: "Food&Drink/Sushiro.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "kfc",
    name: "KFC",
    keywords: /kfc|เคเอฟซี/i,
    color: "#C41230",
    storagePath: "Food&Drink/kfc.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "mcdonalds",
    name: "McDonald's",
    keywords: /mcdonald|แมคโดนัลด์/i,
    color: "#DD1021",
    storagePath: "Food&Drink/McDonalds.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "foodpanda",
    name: "Foodpanda",
    keywords: /foodpanda|ฟู้ดแพนด้า/i,
    color: "#D61355",
    storagePath: "Food&Drink/Foodpanda.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "lineman",
    name: "Lineman",
    keywords: /lineman|ไลน์แมน/i,
    color: "#06C755",
    storagePath: "Food&Drink/Lineman.svg",
    icon: GrabIcon,
  },
  {
    id: "subway",
    name: "Subway",
    keywords: /subway|ซับเวย์/i,
    color: "#028940",
    storagePath: "Food&Drink/Subway Hi-Res Logo.png.png",
    icon: DefaultBrandIcon,
  },
  {
    id: "katsumidori",
    name: "Katsumidori",
    keywords: /katsumidori|คัตสึมิโดริ/i,
    color: "#b42d1f",
    storagePath: "Food&Drink/katsumidori.jpg",
    icon: DefaultBrandIcon,
  },
  {
    id: "taobin",
    name: "Tao Bin",
    keywords: /taobin|เต่าบิน/i,
    color: "#E25B26",
    storagePath: "Food&Drink/taobin.png",
    icon: StarbucksIcon,
  },

  // ─── Shopping ───
  {
    id: "shopee",
    name: "Shopee",
    keywords: /shopee|ช้อปปี้/i,
    color: "#EE4D2D",
    storagePath: "Shopping/shoppee.jpeg",
    icon: ShopeeIcon,
  },
  {
    id: "lazada",
    name: "Lazada",
    keywords: /lazada|ลาซาด้า/i,
    color: "#0F146D",
    storagePath: "Shopping/Lazada.svg",
    icon: LazadaIcon,
  },
  {
    id: "tiktok_shop",
    name: "TikTok Shop",
    keywords: /tiktok/i,
    color: "#000000",
    storagePath: "Shopping/TikTok.svg",
    icon: ShopeeIcon,
  },
  {
    id: "lotus",
    name: "Lotus's",
    keywords: /lotus|โลตัส/i,
    color: "#00A99D",
    storagePath: "Shopping/Lotuss.svg",
    icon: ShopeeIcon,
  },
  {
    id: "bigc",
    name: "Big C",
    keywords: /bigc|บิ๊กซี/i,
    color: "#ED1C24",
    storagePath: "Shopping/BigC.svg",
    icon: ShopeeIcon,
  },
  {
    id: "cj_more",
    name: "CJ More",
    keywords: /cj|ซีเจ/i,
    color: "#009E49",
    storagePath: "Shopping/CJ-More.svg",
    icon: ShopeeIcon,
  },
  {
    id: "makro",
    name: "Makro",
    keywords: /makro|แมคโคร/i,
    color: "#E30613",
    storagePath: "Mart/Makro.webp",
    icon: DefaultBrandIcon,
  },

  // ─── Subscription ───
  {
    id: "truemoney",
    name: "TrueMoney Wallet",
    keywords: /truemoney|tmn|ทรูมันนี่/i,
    color: "#FF5A00",
    storagePath: "Subscription/TrueMoney.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "netflix",
    name: "Netflix",
    keywords: /netflix|เน็ตฟลิกซ์/i,
    color: "#E50914",
    storagePath: "Subscription/netflix.jpeg",
    icon: DefaultBrandIcon,
  },
  {
    id: "claude",
    name: "Claude",
    keywords: /claude|โคลด/i,
    color: "#CC9C80",
    storagePath: "Subscription/claude.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "spotify",
    name: "Spotify",
    keywords: /spotify|สปอติฟาย/i,
    color: "#1DB954",
    storagePath: "Subscription/Spotify.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "youtube",
    name: "YouTube",
    keywords: /youtube|ยูทูป/i,
    color: "#FF0000",
    storagePath: "Subscription/YouTube.svg",
    icon: DefaultBrandIcon,
  },
  {
    id: "ais",
    name: "AIS",
    keywords: /ais|เอไอเอส/i,
    color: "#71b200",
    storagePath: "Subscription/Advanced_Info_Service_logo.svg",
    icon: DefaultBrandIcon,
  },
];

/** Matches a transaction note string to a brand config */
export function matchBrand(note?: string | null): BrandConfig | null {
  if (!note) return null;
  for (const brand of BRANDS) {
    if (brand.keywords.test(note)) {
      return brand;
    }
  }
  return null;
}
