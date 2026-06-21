/**
 * Seed Food and Drink Menu Items with Images
 * Run: node seed-menu-items.js
 */

import mongoose from 'mongoose';

// MongoDB Connection String
const MONGO_URI = 'mongodb+srv://fingecsmarthotels:WhqTOg0rGPib0FvE@cluster0.nfxzw.mongodb.net/test';

// Hotel ID to seed
const HOTEL_ID = '69d0eca53b2942a9fc4c58e2';

// Define RoomServiceMenuItem Schema inline
const RoomServiceMenuItemSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['appetizer', 'main', 'dessert', 'beverage', 'sides', 'breakfast', 'lunch', 'dinner'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountedPrice: {
    type: Number,
    default: null
  },
  image: String,
  availability: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'all-day'],
    default: 'all-day'
  },
  roomServiceEligible: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    default: 30
  },
  dietary: {
    type: [String],
    enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nuts-free', 'spicy']
  },
  available: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const RoomServiceMenuItem = mongoose.model('RoomServiceMenuItem', RoomServiceMenuItemSchema);

// Placeholder image data URLs (1x1 transparent PNG)
const PLACEHOLDER_IMAGES = {
  // Food images (using different base64 strings for variety)
  breakfast: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjRUZDMzhEIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSIjRkZGIiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+UpDwvdGV4dD48L3N2Zz4=',
  lunch: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjRkRCQjJEIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSIjRkZGIiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+UsIwvdGV4dD48L3N2Zz4=',
  dinner: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjRjA0QzMxIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSIjRkZGIiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+UtjwvdGV4dD48L3N2Zz4=',
  appetizer: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjODJFMEFBIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSIjRkZGIiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+TmjwvdGV4dD48L3N2Zz4=',
  dessert: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjRkJCMDEzIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSIjRkZGIiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+TmzwvdGV4dD48L3N2Zz4=',
  beverage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjRkY0NTA2IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSIjRkZGIiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+OuzwvdGV4dD48L3N2Zz4='
};

// Sample Menu Items
const menuItems = [
  // ===== BREAKFAST ITEMS =====
  {
    name: 'Continental Breakfast',
    description: 'Fresh croissant, pastries, butter, jam, and fresh juice',
    category: 'breakfast',
    price: 12.99,
    availability: 'breakfast',
    preparationTime: 15,
    dietary: ['vegetarian'],
    image: PLACEHOLDER_IMAGES.breakfast
  },
  {
    name: 'Full English Breakfast',
    description: 'Eggs, bacon, sausage, beans, toast and coffee',
    category: 'breakfast',
    price: 18.99,
    availability: 'breakfast',
    preparationTime: 20,
    image: PLACEHOLDER_IMAGES.breakfast
  },
  {
    name: 'Pancakes with Maple Syrup',
    description: 'Fluffy pancakes served with butter, maple syrup and fresh berries',
    category: 'breakfast',
    price: 14.99,
    availability: 'breakfast',
    preparationTime: 15,
    dietary: ['vegetarian'],
    image: PLACEHOLDER_IMAGES.breakfast
  },

  // ===== APPETIZERS =====
  {
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce, croutons, parmesan, and our signature Caesar dressing',
    category: 'appetizer',
    price: 12.99,
    availability: 'all-day',
    preparationTime: 10,
    dietary: ['vegetarian'],
    image: PLACEHOLDER_IMAGES.appetizer
  },
  {
    name: 'Chicken Wings',
    description: 'Buffalo wings with blue cheese dip and celery sticks',
    category: 'appetizer',
    price: 10.99,
    availability: 'all-day',
    preparationTime: 12,
    image: PLACEHOLDER_IMAGES.appetizer
  },
  {
    name: 'Garlic Bread',
    description: 'Crispy Italian bread with garlic butter and fresh parsley',
    category: 'appetizer',
    price: 8.99,
    availability: 'all-day',
    preparationTime: 8,
    dietary: ['vegetarian'],
    image: PLACEHOLDER_IMAGES.appetizer
  },

  // ===== LUNCH ITEMS =====
  {
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon with lemon butter sauce and seasonal vegetables',
    category: 'lunch',
    price: 22.99,
    availability: 'lunch',
    preparationTime: 25,
    image: PLACEHOLDER_IMAGES.lunch
  },
  {
    name: 'Beef Burger',
    description: 'Premium angus beef patty, lettuce, tomato, onion, pickles and special sauce',
    category: 'lunch',
    price: 15.99,
    availability: 'lunch',
    preparationTime: 15,
    image: PLACEHOLDER_IMAGES.lunch
  },
  {
    name: 'Vegetable Stir-Fry',
    description: 'Mixed fresh vegetables in a light ginger sauce served with rice',
    category: 'lunch',
    price: 14.99,
    availability: 'lunch',
    preparationTime: 15,
    dietary: ['vegetarian', 'vegan'],
    image: PLACEHOLDER_IMAGES.lunch
  },

  // ===== DINNER ITEMS =====
  {
    name: 'Filet Mignon',
    description: 'Premium 8oz filet mignon with truffle sauce and mashed potatoes',
    category: 'dinner',
    price: 35.99,
    availability: 'dinner',
    preparationTime: 30,
    image: PLACEHOLDER_IMAGES.dinner
  },
  {
    name: 'Lobster Tail',
    description: 'Fresh lobster tail with drawn butter, asparagus and garlic bread',
    category: 'dinner',
    price: 38.99,
    availability: 'dinner',
    preparationTime: 28,
    image: PLACEHOLDER_IMAGES.dinner
  },
  {
    name: 'Pan-Seared Duck Breast',
    description: 'Crispy duck breast with orange glaze and roasted root vegetables',
    category: 'dinner',
    price: 28.99,
    availability: 'dinner',
    preparationTime: 25,
    image: PLACEHOLDER_IMAGES.dinner
  },

  // ===== DESSERTS =====
  {
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with molten center, vanilla ice cream',
    category: 'dessert',
    price: 9.99,
    availability: 'all-day',
    preparationTime: 10,
    dietary: ['vegetarian'],
    image: PLACEHOLDER_IMAGES.dessert
  },
  {
    name: 'Tiramisu',
    description: 'Italian classic with layers of espresso-soaked sponge, mascarpone cream',
    category: 'dessert',
    price: 8.99,
    availability: 'all-day',
    preparationTime: 5,
    dietary: ['vegetarian'],
    image: PLACEHOLDER_IMAGES.dessert
  },
  {
    name: 'Cheesecake',
    description: 'New York style cheesecake with berry compote',
    category: 'dessert',
    price: 9.99,
    availability: 'all-day',
    preparationTime: 5,
    dietary: ['vegetarian'],
    image: PLACEHOLDER_IMAGES.dessert
  },

  // ===== BEVERAGES =====
  {
    name: 'Espresso',
    description: 'Rich and bold Italian coffee',
    category: 'beverage',
    price: 4.99,
    availability: 'all-day',
    preparationTime: 3,
    image: PLACEHOLDER_IMAGES.beverage
  },
  {
    name: 'Iced Tea',
    description: 'Refreshing iced tea with lemon and fresh mint',
    category: 'beverage',
    price: 5.99,
    availability: 'all-day',
    preparationTime: 5,
    dietary: ['vegan'],
    image: PLACEHOLDER_IMAGES.beverage
  },
  {
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice',
    category: 'beverage',
    price: 5.99,
    availability: 'all-day',
    preparationTime: 3,
    dietary: ['vegan'],
    image: PLACEHOLDER_IMAGES.beverage
  },
  {
    name: 'Cappuccino',
    description: 'Creamy cappuccino with cinnamon',
    category: 'beverage',
    price: 5.99,
    availability: 'all-day',
    preparationTime: 5,
    image: PLACEHOLDER_IMAGES.beverage
  },
  {
    name: 'Mojito',
    description: 'Refreshing cocktail with rum, mint, lime and soda water',
    category: 'beverage',
    price: 8.99,
    availability: 'all-day',
    preparationTime: 5,
    image: PLACEHOLDER_IMAGES.beverage
  },
  {
    name: 'Margarita',
    description: 'Classic margarita with tequila, triple sec and fresh lime',
    category: 'beverage',
    price: 8.99,
    availability: 'all-day',
    preparationTime: 5,
    image: PLACEHOLDER_IMAGES.beverage
  }
];

// Function to seed data
async function seedMenuItems() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Delete existing items for this hotel
    const deleteResult = await RoomServiceMenuItem.deleteMany({ hotel: HOTEL_ID });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing menu items`);

    // Add hotelId to all items
    const itemsToInsert = menuItems.map(item => ({
      ...item,
      hotel: HOTEL_ID
    }));

    // Insert new items
    const insertedItems = await RoomServiceMenuItem.insertMany(itemsToInsert);
    console.log(`✅ Successfully seeded ${insertedItems.length} menu items`);

    // Log summary by category
    const categories = [...new Set(insertedItems.map(item => item.category))];
    console.log('\n📊 Menu Items by Category:');
    for (const category of categories) {
      const count = insertedItems.filter(item => item.category === category).length;
      console.log(`  • ${category}: ${count} items`);
    }

    // List all items
    console.log('\n📖 Complete Menu:');
    for (const item of insertedItems) {
      console.log(`  • ${item.name} (${item.category}) - ₦${item.price} - ${item.preparationTime}min`);
    }

    console.log(`\n✨ Seeding completed for hotel ID: ${HOTEL_ID}`);

  } catch (error) {
    console.error('❌ Error seeding menu items:', error.message);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the seeding function
seedMenuItems();
