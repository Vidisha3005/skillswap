// manualRegister.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User'); // Adjust path if needed

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, 'backend.env') });

async function insertUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Create a new user
    const user = new User({
      name: 'Riya',
      email: 'riya@example.com',
      password: '123456', // Make sure your User model hashes it if needed
      bio: 'Hello, I am Riya',
      location: 'India',
      skillsToTeach: ['JavaScript', 'Node.js'],
      skillsToLearn: ['Python', 'React']
    });

    // Save the user to DB
    await user.save();
    console.log('User inserted successfully!');

    mongoose.disconnect();
  } catch (err) {
    console.error('Error inserting user:', err);
  }
}

insertUser();
