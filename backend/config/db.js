const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // We will use a local MongoDB database by default
    // Or you can provide MONGODB_URI in .env
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/job-execution-portal');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
