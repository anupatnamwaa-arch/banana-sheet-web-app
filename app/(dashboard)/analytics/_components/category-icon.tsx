import React from "react";
import {
  Utensils as LcUtensils,
  Coffee as LcCoffee,
  Soup as LcSoup,
  Wine as LcWine,
  Beef as LcBeef,
  Cake as LcCake,
  Cookie as LcCookie,
  ShoppingBag as LcShoppingBag,
  ShoppingCart as LcShoppingCart,
  CreditCard as LcCreditCard,
  Shirt as LcShirt,
  Gift as LcGift,
  Home as LcHome,
  Receipt as LcReceipt,
  Car as LcCar,
  Plane as LcPlane,
  Train as LcTrain,
  Bike as LcBike,
  Fuel as LcFuel,
  MapPin as LcMapPin,
  Ticket as LcTicket,
  Gamepad2 as LcGamepad,
  Clapperboard as LcClapperboard,
  Music as LcMusic,
  PawPrint as LcPawPrint,
  Cat as LcCat,
  Dog as LcDog,
  Dumbbell as LcDumbbell,
  TrendingUp as LcTrendingUp,
  TrendingDown as LcTrendingDown,
  Coins as LcCoins,
  Landmark as LcLandmark,
  PiggyBank as LcPiggyBank,
  Briefcase as LcBriefcase,
  Sparkles as LcSparkles,
  Heart as LcHeart,
  Smile as LcSmile,
  User as LcUser,
  type LucideIcon,
} from "lucide-react";

import {
  Coffee as PhCoffee,
  Hamburger as PhHamburger,
  Pizza as PhPizza,
  BeerBottle as PhBeerBottle,
  Cake as PhCake,
  IceCream as PhIceCream,
  Cookie as PhCookie,
  ShoppingBag as PhShoppingBag,
  ShoppingCart as PhShoppingCart,
  CreditCard as PhCreditCard,
  TShirt as PhTShirt,
  Gift as PhGift,
  House as PhHouse,
  Receipt as PhReceipt,
  Car as PhCar,
  Airplane as PhAirplane,
  Train as PhTrain,
  Bicycle as PhBicycle,
  GasPump as PhGasPump,
  MapPin as PhMapPin,
  Ticket as PhTicket,
  GameController as PhGameController,
  FilmScript as PhFilmScript,
  MusicNotes as PhMusicNotes,
  PawPrint as PhPawPrint,
  Cat as PhCat,
  Dog as PhDog,
  Barbell as PhBarbell,
  TrendUp as PhTrendingUp,
  TrendDown as PhTrendingDown,
  Coins as PhCoins,
  Bank as PhBank,
  PiggyBank as PhPiggyBank,
  Briefcase as PhBriefcase,
  Sparkle as PhSparkles,
  Heart as PhHeart,
  Smiley as PhSmile,
  User as PhUser,
} from "@phosphor-icons/react";

// Best-effort lucide icon for a category name (Thai or English). Falls back to
// a neutral icon. Order matters: more specific rules first (e.g. grocery before
// the generic food rule, coffee before drink).
const RULES: [RegExp, LucideIcon][] = [
  // Thai
  [/อาหาร|กิน|ข้าว|ร้าน/, LcUtensils],
  [/กาแฟ|เครื่องดื่ม|ชา/, LcCoffee],
  [/เดินทาง|รถ|ขนส่ง|น้ำมัน|แท็กซี่|รถไฟ/, LcCar],
  [/ช้อป|ซื้อของ|เสื้อผ้า|แฟชั่น/, LcShoppingBag],
  [/บ้าน|เช่า|บิล|ค่าน้ำ|ค่าไฟ|ที่พัก/, LcHome],
  [/สุขภาพ|ยา|หมอ|โรงพยาบาล/, LcHeart],
  [/บันเทิง|หนัง|เกม|เที่ยว/, LcGamepad],
  [/การศึกษา|เรียน|หนังสือ/, LcUtensils],
  [/ลงทุน|หุ้น|ออม/, LcTrendingUp],
  [/ของใช้|ในบ้าน|ทำความสะอาด/, LcShoppingBag],
  // English (case-insensitive)
  [/grocer|supermarket|market/i, LcShoppingCart],
  [/coffee|cafe|tea/i, LcCoffee],
  [/food|drink|dining|restaurant|eat|meal|snack/i, LcUtensils],
  [/transport|travel|taxi|bts|mrt|train|bus|fuel|gas|petrol|car|grab|muvmi/i, LcCar],
  [/shop|clothes|fashion|apparel|shopee|lazada/i, LcShoppingBag],
  [/home|rent|bill|utilit|water|electric|internet|phone/i, LcHome],
  [/health|medic|pharmac|doctor|hospital|gym|fitness/i, LcHeart],
  [/entertain|movie|game|fun|trip|vacation/i, LcGamepad],
  [/invest|stock|saving|fund/i, LcTrendingUp],
  [/gift|donat|charity/i, LcGift],
  [/pet|dog|cat/i, LcPawPrint],
];

/** Dynamic lookup maps for Phosphor and Lucide curated cute icons */
export const PH_ICON_MAP: Record<string, React.ElementType> = {
  Coffee: PhCoffee,
  Hamburger: PhHamburger,
  Pizza: PhPizza,
  BeerBottle: PhBeerBottle,
  Cake: PhCake,
  IceCream: PhIceCream,
  Cookie: PhCookie,
  ShoppingBag: PhShoppingBag,
  ShoppingCart: PhShoppingCart,
  CreditCard: PhCreditCard,
  TShirt: PhTShirt,
  Gift: PhGift,
  House: PhHouse,
  Receipt: PhReceipt,
  Car: PhCar,
  Airplane: PhAirplane,
  Train: PhTrain,
  Bicycle: PhBicycle,
  GasPump: PhGasPump,
  MapPin: PhMapPin,
  Ticket: PhTicket,
  GameController: PhGameController,
  FilmScript: PhFilmScript,
  MusicNotes: PhMusicNotes,
  PawPrint: PhPawPrint,
  Cat: PhCat,
  Dog: PhDog,
  Barbell: PhBarbell,
  TrendingUp: PhTrendingUp,
  TrendingDown: PhTrendingDown,
  Coins: PhCoins,
  Bank: PhBank,
  PiggyBank: PhPiggyBank,
  Safe: PhCoins,
  Briefcase: PhBriefcase,
  Sparkles: PhSparkles,
  Heart: PhHeart,
  Smile: PhSmile,
  User: PhUser,
};

export const LC_ICON_MAP: Record<string, React.ElementType> = {
  Utensils: LcUtensils,
  Coffee: LcCoffee,
  Soup: LcSoup,
  Wine: LcWine,
  Beef: LcBeef,
  Cake: LcCake,
  Cookie: LcCookie,
  ShoppingBag: LcShoppingBag,
  ShoppingCart: LcShoppingCart,
  CreditCard: LcCreditCard,
  Shirt: LcShirt,
  Gift: LcGift,
  Home: LcHome,
  Receipt: LcReceipt,
  Car: LcCar,
  Plane: LcPlane,
  Train: LcTrain,
  Bike: LcBike,
  Fuel: LcFuel,
  MapPin: LcMapPin,
  Ticket: LcTicket,
  Gamepad2: LcGamepad,
  Clapperboard: LcClapperboard,
  Music: LcMusic,
  PawPrint: LcPawPrint,
  Cat: LcCat,
  Dog: LcDog,
  Dumbbell: LcDumbbell,
  TrendingUp: LcTrendingUp,
  TrendingDown: LcTrendingDown,
  Coins: LcCoins,
  Landmark: LcLandmark,
  PiggyBank: LcPiggyBank,
  Safe: LcCoins,
  Briefcase: LcBriefcase,
  Sparkles: LcSparkles,
  Heart: LcHeart,
  Smile: LcSmile,
  User: LcUser,
};

/** Resolve a category name to its lucide icon component. */
export function categoryIcon(name: string): LucideIcon {
  for (const [re, icon] of RULES) if (re.test(name)) return icon;
  return LcCoins;
}

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number; className?: string };

/** Render the lucide icon, phosphor icon or a cute emoji for a category name. Forwards props (size, className…). */
export function CategoryIcon({
  name,
  emoji,
  ...props
}: { name: string; emoji?: string | null } & IconProps) {
  if (emoji && emoji.trim().length > 0) {
    if (emoji.startsWith("ph:")) {
      const phKey = emoji.substring(3);
      const PhIconComponent = PH_ICON_MAP[phKey];
      if (PhIconComponent) {
        return <PhIconComponent {...props} />;
      }
    } else if (emoji.startsWith("lucide:")) {
      const lcKey = emoji.substring(7);
      const LcIconComponent = LC_ICON_MAP[lcKey];
      if (LcIconComponent) {
        return <LcIconComponent {...props} />;
      }
    } else {
      return (
        <span
          className={props.className}
          style={{
            fontSize: props.size ? `${props.size}px` : "16px",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {emoji}
        </span>
      );
    }
  }

  return React.createElement(categoryIcon(name), props);
}

export const CATEGORY_BAR_COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#34d399",
  "#38bdf8",
];

