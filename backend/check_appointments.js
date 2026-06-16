const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const fs = require('fs');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillswap');
    const users = await User.find();
    const result = {};
    for (const u of users) {
      const apps = await Appointment.find({ $or: [{ teacherId: u._id }, { learnerId: u._id }] });
      result[u.name] = { 
        id: u._id,
        currentSessions: u.totalSessions,
        currentRating: u.rating,
        appointments: apps.map(a => ({ status: a.status, date: a.scheduledDate, rating: a.rating })) 
      };
    }
    fs.writeFileSync('output.json', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
