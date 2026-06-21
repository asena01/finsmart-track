#!/usr/bin/env node
import mongoose from 'mongoose';
import Hotel from './models/Hotel.js';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const hotel = await Hotel.findOne().lean();
    if (hotel) {
      console.log(JSON.stringify({
        id: hotel._id.toString(),
        name: hotel.name,
        owner: hotel.owner
      }, null, 2));
    } else {
      console.error('No hotels found');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
