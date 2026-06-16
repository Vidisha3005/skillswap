const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/security/detect-fake
// @desc    Detect fake or low-quality users using ML behavior analysis simulation
// @access  Private
router.get('/detect-fake', auth, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    
    const analysis = users.map(user => {
      let score = 0;
      let reasons = [];

      // 1. Profile Completeness Check
      if (!user.bio || user.bio.length < 10) {
        score += 20;
        reasons.push('Incomplete or very short bio');
      }
      
      if (!user.avatar) {
        score += 10;
        reasons.push('No avatar uploaded');
      }

      // 2. Skill Imbalance (suspicious if they want to teach/learn nothing)
      if (user.skillsToTeach.length === 0 && user.skillsToLearn.length === 0) {
        score += 40;
        reasons.push('No skills listed (inactive profile)');
      } else if (user.skillsToTeach.length > 20) {
        score += 20;
        reasons.push('Suspiciously high number of skills to teach (Spam Behavior)');
      }

      // 3. Rating & Session Verification
      if (user.rating === 0 && user.totalSessions === 0) {
        score += 15;
        reasons.push('No session activity');
      }
      
      // Calculate risk level based on ML simulation score thresholds
      let riskLevel = 'Low';
      if (score >= 70) riskLevel = 'Critical';
      else if (score >= 40) riskLevel = 'Moderate';

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        suspicionScore: Math.min(score, 100),
        riskLevel,
        flags: reasons
      };
    });

    const flaggedUsers = analysis
      .filter(u => u.suspicionScore > 20) // Only show somewhat suspicious profiles
      .sort((a, b) => b.suspicionScore - a.suspicionScore);

    res.json({
      success: true,
      data: flaggedUsers
    });

  } catch (error) {
    console.error('Security analysis error:', error);
    res.status(500).json({ success: false, message: 'Server error during ML analysis' });
  }
});

// @route   PUT /api/security/toggle-status/:id
// @desc    Toggle user active status (Suspend/Unsuspend user)
// @access  Private 
router.put('/toggle-status/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ success: true, isActive: user.isActive, message: user.isActive ? 'User reactivated' : 'User suspended' });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
