const mongoose = require("mongoose");

const connectDb = async (mongoUri) => {
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
  });
  console.log("MongoDB connected");
};

module.exports = { connectDb };
