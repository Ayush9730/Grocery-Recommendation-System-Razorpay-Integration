export type Category =
  | "Fruits" | "Vegetables" | "Dairy" | "Bakery" | "Beverages"
  | "Snacks" | "Breakfast" | "Instant Food" | "Personal Care" | "Cleaning";

export type MealTime = "breakfast" | "snack" | "meal" | "home";

export interface Product {
  id: number;
  name: string;
  image: string;
  category: Category;
  price: number;
  healthy: boolean;
  sweet: boolean;
  readyToEat: boolean;
  dailyEssential: boolean;
  perishable: boolean;
  mealTime: MealTime;
}

// name, image, category, price (INR), flags: h healthy, s sweet, r ready-to-eat, d daily essential, p perishable; time
type Row = [string, string, Category, number, string, MealTime];

const rows: Row[] = [
  ["Apple", "apple", "Fruits", 180, "hsrdp", "snack"],
  ["Banana", "banana", "Fruits", 60, "hsrdp", "breakfast"],
  ["Orange", "orange", "Fruits", 120, "hsrp", "snack"],
  ["Grapes", "grapes", "Fruits", 140, "hsrp", "snack"],
  ["Guava", "guava", "Fruits", 90, "hsrp", "snack"],
  ["Mango", "mango", "Fruits", 220, "hsrp", "snack"],
  ["Papaya", "papaya", "Fruits", 70, "hsrp", "breakfast"],
  ["Pineapple", "pineapple", "Fruits", 110, "hsrp", "snack"],
  ["Pomegranate", "pomegranate", "Fruits", 200, "hsrp", "snack"],
  ["Watermelon", "watermelon", "Fruits", 80, "hsrp", "snack"],
  ["Tomato", "tomato", "Vegetables", 40, "hdp", "meal"],
  ["Potato", "potato", "Vegetables", 35, "dp", "meal"],
  ["Onion", "onion", "Vegetables", 45, "dp", "meal"],
  ["Carrot", "carrot", "Vegetables", 60, "hp", "meal"],
  ["Cabbage", "cabbage", "Vegetables", 40, "hp", "meal"],
  ["Cauliflower", "cauliflower", "Vegetables", 50, "hp", "meal"],
  ["Capsicum", "capsicum", "Vegetables", 80, "hp", "meal"],
  ["Brinjal", "brinjal", "Vegetables", 45, "hp", "meal"],
  ["Spinach", "spinach", "Vegetables", 30, "hp", "meal"],
  ["Green Peas", "peas", "Vegetables", 90, "hp", "meal"],
  ["Milk", "milk", "Dairy", 32, "hdp", "breakfast"],
  ["Curd", "curd", "Dairy", 45, "hrdp", "meal"],
  ["Yogurt", "yogurt", "Dairy", 60, "hrp", "snack"],
  ["Butter", "butter", "Dairy", 58, "dp", "breakfast"],
  ["Cheese", "cheese", "Dairy", 140, "rp", "snack"],
  ["Paneer", "paneer", "Dairy", 95, "hp", "meal"],
  ["Ghee", "ghee", "Dairy", 320, "d", "meal"],
  ["Fresh Cream", "cream", "Dairy", 70, "p", "meal"],
  ["Lassi", "lassi", "Dairy", 30, "srp", "snack"],
  ["Milkshake", "milkshake", "Dairy", 45, "srp", "snack"],
  ["White Bread", "bread", "Bakery", 40, "rdp", "breakfast"],
  ["Brown Bread", "brownbread", "Bakery", 55, "hrdp", "breakfast"],
  ["Multigrain Bread", "multigrain", "Bakery", 65, "hrp", "breakfast"],
  ["Buns", "buns", "Bakery", 35, "rp", "breakfast"],
  ["Pav", "pav", "Bakery", 30, "rp", "meal"],
  ["Croissant", "croissant", "Bakery", 90, "rp", "breakfast"],
  ["Cake", "cake", "Bakery", 350, "srp", "snack"],
  ["Cupcake", "cupcake", "Bakery", 60, "srp", "snack"],
  ["Donut", "donut", "Bakery", 70, "srp", "snack"],
  ["Garlic Bread", "garlicbread", "Bakery", 110, "rp", "snack"],
  ["Pizza Base", "pizzabase", "Bakery", 60, "p", "meal"],
  ["Rusk", "rusk", "Bakery", 50, "sr", "breakfast"],
  ["Coffee", "coffee", "Beverages", 260, "d", "breakfast"],
  ["Black Tea", "blacktea", "Beverages", 180, "d", "breakfast"],
  ["Green Tea", "greentea", "Beverages", 220, "h", "breakfast"],
  ["Iced Tea", "icedtea", "Beverages", 50, "sr", "snack"],
  ["Apple Juice", "applejuice", "Beverages", 120, "hsr", "breakfast"],
  ["Mango Juice", "mangojuice", "Beverages", 99, "sr", "snack"],
  ["Lemon Juice", "lemonjuice", "Beverages", 60, "hr", "snack"],
  ["Soft Drink", "softdrink", "Beverages", 45, "sr", "snack"],
  ["Soda", "soda", "Beverages", 25, "r", "snack"],
  ["Energy Drink", "energydrink", "Beverages", 110, "sr", "snack"],
  ["Mineral Water", "water", "Beverages", 20, "hrd", "home"],
  ["Biscuits", "biscuits", "Snacks", 30, "sr", "snack"],
  ["Cookies", "cookies", "Snacks", 80, "sr", "snack"],
  ["Chips", "chips", "Snacks", 20, "r", "snack"],
  ["Nachos", "nachos", "Snacks", 60, "r", "snack"],
  ["Namkeen", "namkeen", "Snacks", 55, "r", "snack"],
  ["Mixture", "mixture", "Snacks", 50, "r", "snack"],
  ["Sev", "sev", "Snacks", 45, "r", "snack"],
  ["Khakhra", "khakhra", "Snacks", 70, "hr", "snack"],
  ["Popcorn", "popcorn", "Snacks", 40, "r", "snack"],
  ["Chocolate", "chocolate", "Snacks", 100, "sr", "snack"],
  ["Energy Bar", "energybar", "Snacks", 50, "hsr", "snack"],
  ["Peanut Bar", "peanutbar", "Snacks", 30, "hsr", "snack"],
  ["Cornflakes", "cornflakes", "Breakfast", 190, "hs", "breakfast"],
  ["Oats", "oats", "Breakfast", 160, "h", "breakfast"],
  ["Muesli", "muesli", "Breakfast", 340, "hs", "breakfast"],
  ["Poha", "poha", "Breakfast", 60, "hd", "breakfast"],
  ["Upma Mix", "upma", "Breakfast", 70, "h", "breakfast"],
  ["Pancake Mix", "pancake", "Breakfast", 210, "s", "breakfast"],
  ["Noodles", "noodles", "Instant Food", 15, "", "meal"],
  ["Pasta", "pasta", "Instant Food", 90, "", "meal"],
  ["Pasta Kit", "pastakit", "Instant Food", 150, "", "meal"],
  ["Macaroni", "macaroni", "Instant Food", 80, "", "meal"],
  ["Instant Soup", "soup", "Instant Food", 50, "h", "meal"],
  ["Khichdi Mix", "khichdi", "Instant Food", 95, "h", "meal"],
  ["Toothpaste", "toothpaste", "Personal Care", 95, "d", "home"],
  ["Toothbrush", "toothbrush", "Personal Care", 40, "d", "home"],
  ["Soap", "soap", "Personal Care", 45, "d", "home"],
  ["Shampoo", "shampoo", "Personal Care", 180, "d", "home"],
  ["Face Wash", "facewash", "Personal Care", 150, "", "home"],
  ["Body Lotion", "lotion", "Personal Care", 220, "", "home"],
  ["Hair Oil", "hairoil", "Personal Care", 130, "", "home"],
  ["Deodorant", "deo", "Personal Care", 200, "", "home"],
  ["Razor", "razor", "Personal Care", 120, "", "home"],
  ["Hand Wash", "handwash", "Personal Care", 99, "d", "home"],
  ["Sanitizer", "sanitizer", "Personal Care", 60, "", "home"],
  ["Body Scrub", "scrub", "Personal Care", 250, "", "home"],
  ["Detergent", "detergent", "Cleaning", 210, "d", "home"],
  ["Dishwash Liquid", "dishwash", "Cleaning", 110, "d", "home"],
  ["Floor Cleaner", "floorcleaner", "Cleaning", 160, "", "home"],
  ["Toilet Cleaner", "toiletcleaner", "Cleaning", 95, "", "home"],
  ["Glass Cleaner", "glasscleaner", "Cleaning", 120, "", "home"],
  ["Phenyl", "phenyl", "Cleaning", 80, "", "home"],
  ["Room Freshener", "freshener", "Cleaning", 170, "", "home"],
  ["Garbage Bags", "garbage", "Cleaning", 90, "d", "home"],
  ["Tissue Roll", "tissue", "Cleaning", 70, "d", "home"],
  ["Broom", "broom", "Cleaning", 120, "", "home"],
  ["Mop", "mop", "Cleaning", 280, "", "home"],
];

export const PRODUCTS: Product[] = rows.map(([name, img, category, price, f, mealTime], i) => ({
  id: i + 1,
  name,
  image: `/images/${img}.png`,
  category,
  price,
  healthy: f.includes("h"),
  sweet: f.includes("s"),
  readyToEat: f.includes("r"),
  dailyEssential: f.includes("d"),
  perishable: f.includes("p"),
  mealTime,
}));

export const CATEGORIES: Category[] = [
  "Fruits", "Vegetables", "Dairy", "Bakery", "Beverages",
  "Snacks", "Breakfast", "Instant Food", "Personal Care", "Cleaning",
];
