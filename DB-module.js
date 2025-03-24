const mongodb = require('mongodb')
const mongoose = require('mongoose')

mongoose.Promise = global.Promise
const dbName = "SPCDB"

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // Increased timeout
      socketTimeoutMS: 45000,
      family: 4                       // Use IPv4, skip trying IPv6
    });
    console.log(`Connected to Database ${dbName}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Don't exit process on connection error, let it retry
    console.log('Retrying connection...');
  }
};

// Initial connection
connectDB();

const db = mongoose.connection;

db.on('error', err => {
  console.error('MongoDB error:', err.message);
});

db.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
  setTimeout(connectDB, 5000); // Try to reconnect after 5 seconds
});

db.on('connected', () => {
  console.log('MongoDB connected successfully');
});

process.on('SIGINT', () => {
  db.close(() => {
    console.log(`Closing connection to ${dbName}`);
    process.exit(0);
  });
});

module.exports = db;