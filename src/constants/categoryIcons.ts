import { UserProfile } from '../types';

export const DEFAULT_INCOME_CATEGORIES = ["Lương", "Thưởng", "Bán hàng"];

export const EXPENSE_ICONS: Record<string, any> = {
  badminton: require("../../assets/expense_icon/badminton.png"),
  beer_mug: require("../../assets/expense_icon/beer-mug.png"),
  bicycle: require("../../assets/expense_icon/bicycle.png"),
  bill: require("../../assets/expense_icon/bill.png"),
  bill_1: require("../../assets/expense_icon/bill_1.png"),
  brand: require("../../assets/expense_icon/brand.png"),
  bus: require("../../assets/expense_icon/bus.png"),
  candies: require("../../assets/expense_icon/candies.png"),
  "card-games": require("../../assets/expense_icon/card-games.png"),
  "clean-clothes": require("../../assets/expense_icon/clean-clothes.png"),
  competitors: require("../../assets/expense_icon/competitors.png"),
  cooking: require("../../assets/expense_icon/cooking.png"),
  cosmetics: require("../../assets/expense_icon/cosmetics.png"),
  date: require("../../assets/expense_icon/date.png"),
  default: require("../../assets/expense_icon/default.png"),
  drink: require("../../assets/expense_icon/drink.png"),
  "electric-car": require("../../assets/expense_icon/electric-car.png"),
  "engine-oil": require("../../assets/expense_icon/engine-oil.png"),
  "flash-card": require("../../assets/expense_icon/flash-card.png"),
  fried_rice: require("../../assets/expense_icon/fried-rice.png"),
  "game-console": require("../../assets/expense_icon/game-console.png"),
  "gas-stove": require("../../assets/expense_icon/gas-stove.png"),
  "gift-card": require("../../assets/expense_icon/gift-card.png"),
  gift: require("../../assets/expense_icon/gift.png"),
  gloves: require("../../assets/expense_icon/gloves.png"),
  "hair-cut": require("../../assets/expense_icon/hair-cut.png"),
  http: require("../../assets/expense_icon/http.png"),
  "ice-cream": require("../../assets/expense_icon/ice-cream.png"),
  "interior-design": require("../../assets/expense_icon/interior-design.png"),
  maintenance: require("../../assets/expense_icon/maintenance.png"),
  internet: require("../../assets/expense_icon/internet.png"),
  internet_2: require("../../assets/expense_icon/internet_2.png"),
  invoice: require("../../assets/expense_icon/invoice.png"),
  iphone: require("../../assets/expense_icon/iphone.png"),
  jewelry: require("../../assets/expense_icon/jewelry.png"),
  keyboard: require("../../assets/expense_icon/keyboard.png"),
  kitchen: require("../../assets/expense_icon/kitchen.png"),
  lockers: require("../../assets/expense_icon/lockers.png"),
  main_meal: require("../../assets/expense_icon/main_meal.png"),
  moon: require("../../assets/expense_icon/moon.png"),
  motorbike: require("../../assets/expense_icon/motorbike.png"),
  motorbike_1: require("../../assets/expense_icon/motorbike_1.png"),
  motorcycle: require("../../assets/expense_icon/motorcycle.png"),
  napkin: require("../../assets/expense_icon/napkin.png"),
  noodle: require("../../assets/expense_icon/noodle.png"),
  other: require("../../assets/expense_icon/other.png"),
  outreach: require("../../assets/expense_icon/outreach.png"),
  "parking-car": require("../../assets/expense_icon/parking-car.png"),
  party: require("../../assets/expense_icon/party.png"),
  petrol: require("../../assets/expense_icon/petrol.png"),
  pizza: require("../../assets/expense_icon/pizza.png"),
  plugin: require("../../assets/expense_icon/plugin.png"),
  premium: require("../../assets/expense_icon/premium.png"),
  private: require("../../assets/expense_icon/private.png"),
  rent_house: require("../../assets/expense_icon/rent_house.png"),
  review: require("../../assets/expense_icon/review.png"),
  ring: require("../../assets/expense_icon/ring.png"),
  shampoo: require("../../assets/expense_icon/shampoo.png"),
  shoes: require("../../assets/expense_icon/shoes.png"),
  smoothie: require("../../assets/expense_icon/smoothie.png"),
  "strawberry-cake": require("../../assets/expense_icon/strawberry-cake.png"),
  sweets: require("../../assets/expense_icon/sweets.png"),
  "teddy-bear": require("../../assets/expense_icon/teddy-bear.png"),
  tent: require("../../assets/expense_icon/tent.png"),
  "travel-luggage": require("../../assets/expense_icon/travel-luggage.png"),
  tree: require("../../assets/expense_icon/tree.png"),
  trophy: require("../../assets/expense_icon/trophy.png"),
  "watching-a-movie": require("../../assets/expense_icon/watching-a-movie.png"),
  "water-tap": require("../../assets/expense_icon/water-tap.png"),
  wedding: require("../../assets/expense_icon/wedding.png"),
  wrench: require("../../assets/expense_icon/wrench.png"),
  wristwatch: require("../../assets/expense_icon/wristwatch.png"),
};

export const INCOME_ICONS: Record<string, any> = {
  bag: require("../../assets/income_icon/bag.png"),
  bank: require("../../assets/income_icon/bank.png"),
  chess: require("../../assets/income_icon/chess.png"),
  coding: require("../../assets/income_icon/coding.png"),
  deal: require("../../assets/income_icon/deal.png"),
  default: require("../../assets/income_icon/default.png"),
  developer: require("../../assets/income_icon/developer.png"),
  driver: require("../../assets/income_icon/driver.png"),
  game: require("../../assets/income_icon/game.png"),
  "gas-pump": require("../../assets/income_icon/gas-pump.png"),
  gem: require("../../assets/income_icon/gem.png"),
  "gift-box": require("../../assets/income_icon/gift-box.png"),
  "gold-price": require("../../assets/income_icon/gold-price.png"),
  lease: require("../../assets/income_icon/lease.png"),
  "live-streaming": require("../../assets/income_icon/live-streaming.png"),
  lucky_money: require("../../assets/income_icon/lucky_money.png"),
  other: require("../../assets/income_icon/other.png"),
  profits: require("../../assets/income_icon/profits.png"),
  salary: require("../../assets/income_icon/salary.png"),
  salary_1: require("../../assets/income_icon/salary_1.png"),
  sell: require("../../assets/income_icon/sell.png"),
  selling: require("../../assets/income_icon/selling.png"),
  "social-media": require("../../assets/income_icon/social-media.png"),
  stock: require("../../assets/income_icon/stock.png"),
  support_4g: require("../../assets/income_icon/support_4g.png"),
  support_opening_dealer: require("../../assets/income_icon/support_opening_dealer.png"),
  surprise: require("../../assets/income_icon/surprise.png"),
  teacher: require("../../assets/income_icon/teacher.png"),
};

export const getIncomeIconSource = (
  catNameOrId: string,
  profile: UserProfile | null,
) => {
  const match = (profile?.incomeCategories || []).find(
    (c: any) =>
      typeof c === "object" && (c.id === catNameOrId || c.name === catNameOrId),
  ) as any;
  if (match && match.icon && INCOME_ICONS[match.icon]) {
    return INCOME_ICONS[match.icon];
  }

  const key = profile?.incomeCategoryIcons?.[catNameOrId];
  if (key && INCOME_ICONS[key]) {
    return INCOME_ICONS[key];
  }
  if (match) {
    const keyByMatch =
      profile?.incomeCategoryIcons?.[match.id] ||
      profile?.incomeCategoryIcons?.[match.name];
    if (keyByMatch && INCOME_ICONS[keyByMatch]) {
      return INCOME_ICONS[keyByMatch];
    }
    const catName = match.name;
    if (catName === "Lương") return INCOME_ICONS["salary"];
    if (catName === "Thưởng") return INCOME_ICONS["gift-box"];
    if (catName === "Bán hàng") return INCOME_ICONS["sell"];
  }

  if (catNameOrId === "Lương" || catNameOrId === "income_luong")
    return INCOME_ICONS["salary"];
  if (catNameOrId === "Thưởng" || catNameOrId === "income_thuong")
    return INCOME_ICONS["gift-box"];
  if (catNameOrId === "Bán hàng" || catNameOrId === "income_ban_hang")
    return INCOME_ICONS["sell"];
  return INCOME_ICONS["default"];
};

