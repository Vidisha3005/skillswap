const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
require('dotenv').config();

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillswap');
    const users = await User.find();
    
    for (const u of users) {
      const allAppts = await Appointment.find({
        $or: [{ teacherId: u._id }, { learnerId: u._id }]
      });

      let completedCount = 0;
      let ratedSum = 0;
      let ratedCount = 0;
      const now = new Date();

      for (const a of allAppts) {
        const isPastAccepted = a.status === 'accepted' && new Date(a.scheduledDate) < now;
        if (a.status === 'completed' || isPastAccepted) {
          completedCount++;
        }
        
        // Rating is based ONLY on when they are the TEACHER
        if (a.teacherId.toString() === u._id.toString() && a.rating && (a.status === 'completed' || isPastAccepted)) {
          ratedSum += a.rating;
          ratedCount++;
        }
      }

      const avgRating = ratedCount > 0 ? Math.round((ratedSum / ratedCount) * 10) / 10 : 0;

      console.log(`User ${u.name}: Updating to sessions=${completedCount}, rating=${avgRating}`);
      
      u.totalSessions = completedCount;
      u.rating = avgRating;
      await u.save();
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
