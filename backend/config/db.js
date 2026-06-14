const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && !uri.includes('placeholder')) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB connection failed: ${error.message}`);
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEOUT')) {
        console.error('\n🔧 Troubleshooting steps:');
        console.error('1. Go to MongoDB Atlas → Network Access → Add IP Address');
        console.error('2. Allow your current IP (or "0.0.0.0/0" for any IP - not recommended for production)');
        console.error('3. Ensure the connection string is correct (copy from Atlas → Clusters → Connect → Drivers → Node.js)');
        console.error('4. Try using the standard connection string (mongodb://) instead of SRV (mongodb+srv://) if DNS lookup fails\n');
      }
      console.warn('Falling back to in-memory database...');
    }
  }

  // Fallback to in-memory MongoDB for development/demo
  const { MongoMemoryServer } = require('mongodb-memory-server');
  try {
    const mongoServer = await MongoMemoryServer.create();
    const memUri = mongoServer.getUri();
    const conn = await mongoose.connect(memUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected (in-memory): ${conn.connection.host}`);
    console.log('  Note: Data will be lost when the server restarts.');
  } catch (error) {
    console.error(`In-memory MongoDB failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;