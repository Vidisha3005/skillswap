const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  // Make sure expiresIn is a string
  const expiresIn = process.env.JWT_EXPIRE || '1h';
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: expiresIn.toString() });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    user = new User({ name, email, password });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        rating: user.rating,
        totalSessions: user.totalSessions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        location: user.location,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
        pdfs: user.pdfs,
        rating: user.rating,
        totalSessions: user.totalSessions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const Appointment = require('../models/Appointment');
    
    // Recalculate stats whenever user checks auth
    // First, find all appointments.
    const allAppts = await Appointment.find({
      $or: [{ teacherId: req.user._id }, { learnerId: req.user._id }]
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
      if (a.teacherId.toString() === req.user._id.toString() && a.rating && (a.status === 'completed' || isPastAccepted)) {
        ratedSum += a.rating;
        ratedCount++;
      }
    }

    const avgRating = ratedCount > 0 ? Math.round((ratedSum / ratedCount) * 10) / 10 : 0;
    const updateFields = { totalSessions: completedCount, rating: avgRating };

    // Explicitly update and re-fetch to ensure fresh data
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    console.error('Auth/Me Sync Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
