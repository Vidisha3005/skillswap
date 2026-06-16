const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const Appointment = require('../models/Appointment');
    
    // Recalculate stats for the current user
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

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('location').optional().trim(),
  body('skillsToTeach').optional().isArray().withMessage('Skills to teach must be an array'),
  body('skillsToLearn').optional().isArray().withMessage('Skills to learn must be an array'),
  body('pdfs').optional().isArray().withMessage('PDFs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, bio, location, skillsToTeach, skillsToLearn, avatar, pdfs } = req.body;

    console.log('--- Profile Update Attempt ---');
    console.log('User:', req.user._id);
    console.log('Data keys:', Object.keys(req.body));
    if (pdfs) {
      console.log('PDFs to save:', pdfs.length);
      pdfs.forEach((p, i) => console.log(`PDF ${i}: ${p.title} (URL length: ${p.url?.length})`));
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;
    if (location !== undefined) updateFields.location = location;
    if (skillsToTeach) updateFields.skillsToTeach = skillsToTeach;
    if (skillsToLearn) updateFields.skillsToLearn = skillsToLearn;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (pdfs !== undefined) updateFields.pdfs = pdfs;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log('User not found during update');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('Update Successful');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('--- CRITICAL UPDATE ERROR ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        details: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
      details: error.message
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users by skills
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { skill, page = 1, limit = 10 } = req.query;

    let query = { _id: { $ne: req.user._id }, isActive: true };

    if (skill) {
      query.skillsToTeach = { $regex: skill, $options: 'i' };
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
// @route   GET /api/users/matches
// @desc    Find mutual skill matches
// @access  Private
router.get('/matches', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find users where:
    // 1. Their skillsToTeach intersect with my skillsToLearn
    // 2. My skillsToTeach intersect with their skillsToLearn
    const matches = await User.find({
      _id: { $ne: currentUser._id }, // not myself
      isActive: true,
      $or: [
        { skillsToTeach: { $in: currentUser.skillsToLearn } },
        { skillsToLearn: { $in: currentUser.skillsToTeach } }
      ]
    }).select('-password');

    res.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/learning-path
// @desc    Get personalized learning path (Sequence Learning Simulation)
// @access  Private
router.get('/learning-path', auth, async (req, res) => {
  try {
    const currentUser = req.user;
    const allUsers = await User.find({ isActive: true });

    // Identify what "People who know [My Teach Skills] also want to learn [X]"
    const mySkills = currentUser.skillsToTeach.map(s => s.toLowerCase().trim());

    const suggestions = {};

    allUsers.forEach(otherUser => {
      const otherTeachSkills = otherUser.skillsToTeach.map(s => s.toLowerCase().trim());
      const otherLearnSkills = otherUser.skillsToLearn.map(s => s.toLowerCase().trim());

      // If other user knows similar things as current user
      const hasSimilarExpertise = otherTeachSkills.some(s => mySkills.includes(s));

      if (hasSimilarExpertise) {
        otherLearnSkills.forEach(skill => {
          // If I don't already know or want to learn this
          if (!mySkills.includes(skill) && !currentUser.skillsToLearn.map(s => s.toLowerCase().trim()).includes(skill)) {
            suggestions[skill] = (suggestions[skill] || 0) + 1;
          }
        });
      }
    });

    const recommendedPath = Object.entries(suggestions)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // If no data, suggest general emerging skills
    if (recommendedPath.length === 0) {
      recommendedPath.push({ name: 'Project Management', count: 1 });
      recommendedPath.push({ name: 'Public Speaking', count: 1 });
    }

    res.json({
      success: true,
      path: recommendedPath,
      currentExpertise: currentUser.skillsToTeach
    });

  } catch (error) {
    console.error('Learning path error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
