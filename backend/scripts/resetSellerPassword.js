import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Seller from '../app/models/seller.js';

dotenv.config();

const resetSellerPassword = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    const email = 'harsh@appzeto.com';
    const newPassword = 'Admin!@#123';

    const seller = await Seller.findOne({ email });

    if (!seller) {
      console.log('❌ Seller not found with email:', email);
      console.log('\nListing all sellers in database:');
      const allSellers = await Seller.find({}).select('email name');
      allSellers.forEach(s => {
        console.log(`  - Email: ${s.email}, Name: ${s.name}`);
      });
      process.exit(1);
    }

    console.log('✓ Seller found:');
    console.log('  Name:', seller.name);
    console.log('  Email:', seller.email);
    console.log('\nResetting password to:', newPassword);

    seller.password = newPassword;
    if (typeof seller.tokenVersion === 'number') {
      seller.tokenVersion += 1;
    }
    await seller.save();

    console.log('\n✅ Password reset successfully!');
    console.log('\nYou can now log in with:');
    console.log('  Email:', email);
    console.log('  Password:', newPassword);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error resetting password:', error.message);
    process.exit(1);
  }
};

resetSellerPassword();
