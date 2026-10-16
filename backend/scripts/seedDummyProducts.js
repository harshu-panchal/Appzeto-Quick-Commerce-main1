/**
 * Seed ~50 in-stock dummy products, owned by one seller, spread over the
 * existing header categories (Grocery, Electronics, Fashion, Kids, Pets) so
 * the customer app has data to show. Categories/sub-categories that don't
 * exist yet are created (slug ends in "-dummy").
 * Every product is tagged "dummy-seed" (SKU prefix DUMMY-) so everything can
 * be removed in one go.
 *
 * Usage (from backend/):
 *   node scripts/seedDummyProducts.js                          # add (skips ones that already exist)
 *   node scripts/seedDummyProducts.js --seller "Fooddelight"   # pick another seller (default: Appzeto Store)
 *   node scripts/seedDummyProducts.js --remove                 # delete dummy products + dummy categories
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Category from "../app/models/category.js";
import Product from "../app/models/product.js";
import Seller from "../app/models/seller.js";
import { buildKey, invalidate } from "../app/services/cacheService.js";

dotenv.config();

const TAG = "dummy-seed";
const DUMMY_SLUG_SUFFIX = "-dummy";

// header name -> category name -> sub-category name -> [name, brand, weight, price (MRP), salePrice]
const PLAN = {
  Grocery: {
    "Vegetables & Fruits": {
      "Fresh Fruits": [
        ["Fresh Banana Robusta", "FarmFresh", "1 dozen", 70, 55],
        ["Shimla Apple", "FarmFresh", "1 kg", 220, 179],
        ["Desi Tomato", "FarmFresh", "1 kg", 50, 39],
        ["Onion", "FarmFresh", "1 kg", 45, 35],
        ["Potato", "FarmFresh", "1 kg", 40, 32],
        ["Green Capsicum", "FarmFresh", "500 g", 60, 48],
      ],
    },
    "Dairy & Breads": {
      "Milk & Paneer": [
        ["Toned Milk", "Amul", "1 L", 68, 66],
        ["Fresh Paneer", "Amul", "200 g", 95, 85],
        ["Salted Butter", "Amul", "100 g", 60, 58],
        ["Brown Bread", "Britannia", "400 g", 55, 50],
        ["Farm Eggs", "EggsFresh", "6 pcs", 60, 54],
      ],
    },
    "Atta, Rice & Dal": {
      "Atta & Rice": [
        ["Chakki Fresh Atta", "Aashirvaad", "5 kg", 295, 259],
        ["Basmati Rice Classic", "India Gate", "1 kg", 180, 149],
        ["Toor Dal", "Tata Sampann", "1 kg", 199, 172],
        ["Moong Dal", "Tata Sampann", "500 g", 99, 89],
        ["Sona Masoori Rice", "Daawat", "5 kg", 450, 389],
      ],
    },
    "Masala & Spices": {
      "Powdered Spices": [
        ["Turmeric Powder", "Everest", "200 g", 70, 62],
        ["Red Chilli Powder", "MDH", "200 g", 95, 84],
        ["Garam Masala", "Everest", "100 g", 82, 74],
        ["Jeera Whole", "Catch", "200 g", 140, 119],
      ],
    },
    "Snacks & Drinks": {
      "Chips & Namkeen": [
        ["Classic Salted Chips", "Lay's", "52 g", 20, 20],
        ["Aloo Bhujia", "Haldiram's", "400 g", 110, 99],
        ["Cola Soft Drink", "Coca-Cola", "750 ml", 45, 40],
        ["Mango Fruit Drink", "Maaza", "600 ml", 40, 38],
        ["Marie Biscuits", "Parle", "250 g", 35, 32],
      ],
    },
  },
  Electronics: {
    "Mobiles & Accessories": {
      "Chargers & Cables": [
        ["Fast Charging Cable Type-C", "boAt", "1 m", 499, 249],
        ["20W USB-C Charger", "Ambrane", "1 unit", 899, 599],
        ["Wireless Earbuds", "boAt", "1 pair", 2999, 1299],
        ["10000mAh Power Bank", "Mi", "1 unit", 1499, 1099],
      ],
    },
    "Home Appliances": {
      "Kitchen & Cleaning": [
        ["Electric Kettle 1.5L", "Prestige", "1 unit", 1295, 899],
        ["Dry Iron 1000W", "Philips", "1 unit", 1095, 849],
        ["High Speed Table Fan", "Usha", "400 mm", 2499, 1899],
        ["Handheld Vacuum Cleaner", "Agaro", "1 unit", 2999, 2199],
      ],
    },
  },
  Fashion: {
    "Men's Clothing": {
      "T-Shirts & Shirts": [
        ["Cotton Round Neck T-Shirt", "Roadster", "Size M", 699, 399],
        ["Slim Fit Casual Shirt", "Peter England", "Size L", 1499, 999],
        ["Regular Fit Jeans", "Levi's", "Size 32", 2599, 1899],
        ["Sports Track Pants", "Puma", "Size L", 1799, 1199],
      ],
    },
    "Women's Clothing": {
      "Kurtas & Tops": [
        ["Printed Cotton Kurta", "Biba", "Size M", 1499, 999],
        ["Casual Crop Top", "Only", "Size S", 899, 549],
        ["Palazzo Pants", "W", "Size M", 1199, 799],
      ],
    },
  },
  Kids: {
    Toys: {
      "Games & Blocks": [
        ["Building Blocks Set", "BrickFun", "60 pcs", 799, 549],
        ["Remote Control Car", "SpeedKid", "1 unit", 1299, 899],
        ["Soft Teddy Bear", "Archies", "30 cm", 699, 499],
      ],
    },
    "Baby Care": {
      "Wipes & Diapers": [
        ["Baby Wipes", "Mamy Soft", "72 pcs", 199, 149],
        ["Diaper Pants Medium", "Pampers", "40 pcs", 899, 749],
        ["Kids Toothpaste Strawberry", "Colgate", "80 g", 85, 78],
      ],
    },
  },
  Pets: {
    "Pet Food": {
      "Dog & Cat Food": [
        ["Adult Dog Food Chicken", "Pedigree", "1.2 kg", 450, 399],
        ["Puppy Dog Food Milk", "Drools", "1 kg", 380, 335],
        ["Adult Cat Food Tuna", "Whiskas", "1.2 kg", 520, 465],
      ],
    },
    "Pet Care": {
      "Grooming & Toys": [
        ["Pet Shampoo Anti-Tick", "Himalaya", "200 ml", 245, 219],
        ["Rubber Chew Bone", "PetPlay", "1 unit", 299, 199],
      ],
    },
  },
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const argValue = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const placeholderImage = (name) =>
  `https://placehold.co/400x400/png?text=${encodeURIComponent(name)}`;

const clearCaches = async () => {
  await invalidate(buildKey("catalog", "productList", "*")).catch(() => {});
  await invalidate("cache:catalog:categories:*").catch(() => {});
  await invalidate("cache:offersections:public:*").catch(() => {});
};

/** Existing category (by name under the parent) or a new "-dummy" one. */
async function findOrCreateCategory(name, type, parentId, stats) {
  const existing = await Category.findOne({ name, type, parentId }).lean();
  if (existing) return existing;
  const created = await Category.create({
    name,
    slug: `${slugify(name)}${DUMMY_SLUG_SUFFIX}`,
    type,
    parentId,
    status: "active",
    description: "Dummy category for testing.",
  });
  stats.categories += 1;
  return created.toObject();
}

async function remove() {
  const { deletedCount } = await Product.deleteMany({ tags: TAG });
  // Dummy categories go too, but only when no real product still uses them
  const dummyCats = await Category.find({ slug: { $regex: `${DUMMY_SLUG_SUFFIX}$` } }).lean();
  let removedCats = 0;
  // sub-categories before their parents, so parents are free to delete
  const rank = (c) => (c.type === "subcategory" ? 0 : c.type === "category" ? 1 : 2);
  for (const cat of dummyCats.sort((a, b) => rank(a) - rank(b))) {
    const inUse = await Product.exists({
      $or: [{ headerId: cat._id }, { categoryId: cat._id }, { subcategoryId: cat._id }],
    });
    const hasChildren = await Category.exists({ parentId: cat._id });
    if (!inUse && !hasChildren) {
      await Category.deleteOne({ _id: cat._id });
      removedCats += 1;
    }
  }
  await clearCaches();
  console.log(`Removed ${deletedCount} dummy products and ${removedCats} dummy categories.`);
}

async function seed() {
  const sellerName = argValue("--seller") || "Appzeto Store";
  const seller = await Seller.findOne({ shopName: sellerName, isActive: true });
  if (!seller) throw new Error(`Active seller "${sellerName}" not found`);

  const stats = { created: 0, skipped: 0, categories: 0 };

  for (const [headerName, categories] of Object.entries(PLAN)) {
    const header = await Category.findOne({ name: headerName, type: "header" }).lean();
    if (!header) {
      console.warn(`! Skipping header "${headerName}": not found`);
      continue;
    }
    for (const [categoryName, subs] of Object.entries(categories)) {
      const category = await findOrCreateCategory(categoryName, "category", header._id, stats);
      for (const [subName, items] of Object.entries(subs)) {
        const sub = await findOrCreateCategory(subName, "subcategory", category._id, stats);
        for (const [name, brand, weight, price, salePrice] of items) {
          const slug = `${slugify(name)}${DUMMY_SLUG_SUFFIX}`;
          if (await Product.exists({ slug })) {
            stats.skipped += 1;
            continue;
          }
          await Product.create({
            name,
            slug,
            sku: `DUMMY-${slugify(name).toUpperCase()}`.slice(0, 40),
            description: `${brand} ${name} (${weight}). Dummy product for testing.`,
            price,
            salePrice,
            stock: 20 + Math.floor(Math.random() * 130),
            brand,
            weight,
            tags: [TAG],
            mainImage: placeholderImage(name),
            headerId: header._id,
            categoryId: category._id,
            subcategoryId: sub._id,
            sellerId: seller._id,
            status: "active",
            approvalStatus: "approved",
            lastSubmittedByRole: "admin",
          });
          stats.created += 1;
        }
      }
    }
  }

  await clearCaches();
  console.log(
    `Seller: ${seller.shopName}. Created ${stats.created} products (${stats.skipped} already existed) and ${stats.categories} categories.`,
  );
}

try {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  await (process.argv.includes("--remove") ? remove() : seed());
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  process.exit();
}
