import mongoose from 'mongoose';
import User from '../models/User.js';
import * as dotenv from 'dotenv';

dotenv.config();

const restaurantImages = [
  {
    email: 'fine@diningrestaurant.com',
    businessImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23FF6B35" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3EFine Dining%3C/text%3E%3C/svg%3E',
    cuisineType: ['French', 'International'],
    address: '123 Upscale Street, Downtown',
    city: 'Lagos'
  },
  {
    email: 'taste@africarestaurant.com',
    businessImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23F4A261" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3ETaste Africa%3C/text%3E%3C/svg%3E',
    cuisineType: ['African', 'Nigerian'],
    address: '456 Heritage Avenue, Lekki',
    city: 'Lagos'
  },
  {
    email: 'bites@quickcafe.com',
    businessImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%232A9D8F" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3EQuick Bites%3C/text%3E%3C/svg%3E',
    cuisineType: ['Fast Food', 'Healthy'],
    address: '789 Quick Lane, VI',
    city: 'Lagos'
  }
];

async function updateRestaurants() {
  try {
    const mongoUrl = 'mongodb+srv://fingecsmarthotels:WhqTOg0rGPib0FvE@cluster0.nfxzw.mongodb.net/test';

    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    let updated = 0;
    for (const data of restaurantImages) {
      const result = await User.findOneAndUpdate(
        { email: data.email },
        { 
          businessImage: data.businessImage,
          cuisineType: data.cuisineType,
          address: data.address,
          city: data.city
        },
        { new: true }
      );
      if (result) {
        console.log(`✅ Updated: ${result.businessName}`);
        updated++;
      } else {
        console.log(`⚠️  Restaurant not found: ${data.email}`);
      }
    }

    console.log(`\n✅ Updated ${updated} restaurants with images`);
    
    // Fetch all restaurants
    const restaurants = await User.find({
      userType: 'vendor',
      vendorType: 'restaurant'
    }).select('businessName email businessImage cuisineType');

    console.log('\n📋 All Restaurants:');
    restaurants.forEach(r => {
      console.log(`  • ${r.businessName} - Image: ${r.businessImage ? '✅' : '❌'} - Cuisine: ${r.cuisineType || 'Not set'}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Update completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating restaurants:', error);
    process.exit(1);
  }
}

updateRestaurants();
