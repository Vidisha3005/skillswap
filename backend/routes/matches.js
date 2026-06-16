const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/matches
// @desc    Get skill matches for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const currentUser = req.user;

    if ((!currentUser.skillsToLearn || currentUser.skillsToLearn.length === 0) &&
      (!currentUser.skillsToTeach || currentUser.skillsToTeach.length === 0)) {
      return res.json({
        success: true,
        matches: [],
        message: 'Add skills to your profile to find matches'
      });
    }

    // Find users who can teach what current user wants to learn
    const teacherMatches = await User.find({
      _id: { $ne: currentUser._id },
      isActive: true,
      skillsToTeach: {
        $in: currentUser.skillsToLearn.map(skill => new RegExp(skill, 'i'))
      }
    }).select('-password').sort({ rating: -1, totalSessions: -1 });

    // Find users who want to learn what current user can teach
    const learnerMatches = await User.find({
      _id: { $ne: currentUser._id },
      isActive: true,
      skillsToLearn: {
        $in: currentUser.skillsToTeach.map(skill => new RegExp(skill, 'i'))
      }
    }).select('-password').sort({ createdAt: -1 });

    // Calculate match scores and combine results
    const matches = [];

    // Process teacher matches (users who can teach what I want to learn)
    teacherMatches.forEach(teacher => {
      const commonSkills = teacher.skillsToTeach.filter(teachSkill =>
        currentUser.skillsToLearn.some(learnSkill =>
          teachSkill.toLowerCase().includes(learnSkill.toLowerCase()) ||
          learnSkill.toLowerCase().includes(teachSkill.toLowerCase())
        )
      );

      if (commonSkills.length > 0) {
        matches.push({
          user: teacher,
          matchType: 'teacher',
          commonSkills,
          matchScore: commonSkills.length + (teacher.rating || 0) + (teacher.totalSessions || 0) * 0.1
        });
      }
    });

    // Process learner matches (users who want to learn what I can teach)
    learnerMatches.forEach(learner => {
      const commonSkills = learner.skillsToLearn.filter(learnSkill =>
        currentUser.skillsToTeach.some(teachSkill =>
          teachSkill.toLowerCase().includes(learnSkill.toLowerCase()) ||
          learnSkill.toLowerCase().includes(teachSkill.toLowerCase())
        )
      );

      if (commonSkills.length > 0) {
        // Check if this user is already in matches as a teacher
        const existingMatch = matches.find(match =>
          match.user._id.toString() === learner._id.toString()
        );

        if (existingMatch) {
          existingMatch.matchType = 'mutual';
          existingMatch.learnerSkills = commonSkills;
          existingMatch.matchScore += commonSkills.length;
        } else {
          matches.push({
            user: learner,
            matchType: 'learner',
            commonSkills,
            matchScore: commonSkills.length
          });
        }
      }
    });

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      matches: matches.slice(0, 20), // Limit to top 20 matches
      totalMatches: matches.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/matches/recommendations
// @desc    Get AI-enhanced skill partner recommendations
// @access  Private
router.get('/recommendations', auth, async (req, res) => {
  try {
    const currentUser = req.user;

    // Validating profile needs
    if (!currentUser.skillsToLearn?.length && !currentUser.skillsToTeach?.length) {
      return res.json({
        success: true,
        recommendations: [],
        message: 'Complete your skills profile to get personalized recommendations'
      });
    }

    // Basic pool: Users who are NOT me and are active
    const potentialPartners = await User.find({
      _id: { $ne: currentUser._id },
      isActive: true
    }).select('-password');

    const recommendations = potentialPartners.map(partner => {
      let score = 0;
      let reasons = [];

      // 1. Skill Overlap Matching (Fuzzy/Substring)
      const teachMatch = partner.skillsToTeach.filter(partnerSkill =>
        currentUser.skillsToLearn.some(myNeed =>
          partnerSkill.toLowerCase().includes(myNeed.toLowerCase()) ||
          myNeed.toLowerCase().includes(partnerSkill.toLowerCase())
        )
      );

      const learnMatch = partner.skillsToLearn.filter(partnerNeed =>
        currentUser.skillsToTeach.some(mySkill =>
          partnerNeed.toLowerCase().includes(mySkill.toLowerCase()) ||
          mySkill.toLowerCase().includes(partnerNeed.toLowerCase())
        )
      );

      // Scoring Logic:
      // High Weight for Mutual Exchange
      if (teachMatch.length > 0 && learnMatch.length > 0) {
        score += 50;
        reasons.push('Perfect Mutual Match');
      } else if (teachMatch.length > 0) {
        score += 30;
        reasons.push('Can teach you what you want to learn');
      } else if (learnMatch.length > 0) {
        score += 15;
        reasons.push('Wants to learn from your expertise');
      }

      // Bonus for quantity of skills
      score += (teachMatch.length + learnMatch.length) * 5;

      // 2. Reputation & Reliability (Rating Weight)
      if (partner.rating > 0) {
        score += partner.rating * 4; // Max 20 points
      }

      // 3. Experience Weight (Sessions completed)
      if (partner.totalSessions > 0) {
        score += Math.min(partner.totalSessions * 0.5, 10); // Max 10 points
      }

      // 4. Activity/Recency (New users get a small boost)
      const daysSinceJoined = (Date.now() - new Date(partner.createdAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceJoined < 7) {
        score += 5;
        reasons.push('Community Newcomer');
      }

      // Calculate Match Percentage (Max score is roughly 100-110)
      const matchPercentage = Math.min(Math.round((score / 90) * 100), 100);

      return {
        user: partner,
        score,
        matchPercentage,
        reasons,
        matchType: teachMatch.length > 0 && learnMatch.length > 0 ? 'mutual' : (teachMatch.length > 0 ? 'teacher' : 'learner'),
        commonSkills: [...new Set([...teachMatch, ...learnMatch])]
      };
    });

    // Filter out recommendations with zero score and sort by high score
    const filteredRecs = recommendations
      .filter(rec => rec.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10

    res.json({
      success: true,
      recommendations: filteredRecs
    });

  } catch (error) {
    console.error('Recommendation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate recommendations' });
  }
});

module.exports = router;
