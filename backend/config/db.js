const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('FATAL: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEOUT')) {
      console.error('\n🔧 Troubleshooting steps:');
      console.error('1. Go to MongoDB Atlas → Network Access → Add IP Address');
      console.error('2. Allow "0.0.0.0/0" for Render (Render IPs change dynamically)');
      console.error('3. Ensure MONGODB_URI is correctly set in Render dashboard');
    }
    process.exit(1);  // ← crash loudly instead of silently falling back
  }
};

module.exports = connectDB;