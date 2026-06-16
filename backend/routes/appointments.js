const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/appointments
// @desc    Get user's appointments
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, type = 'all' } = req.query;

    let query = {
      $or: [
        { teacherId: userId },
        { learnerId: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('teacherId', 'name avatar skillsToTeach')
      .populate('learnerId', 'name avatar skillsToLearn')
      .sort({ scheduledDate: 1 });

    // Filter by type if specified
    let filteredAppointments = appointments;
    if (type === 'teaching') {
      filteredAppointments = appointments.filter(apt => apt.teacherId._id.toString() === userId.toString());
    } else if (type === 'learning') {
      filteredAppointments = appointments.filter(apt => apt.learnerId._id.toString() === userId.toString());
    }

    res.json({
      success: true,
      appointments: filteredAppointments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private
router.post('/', [
  auth,
  body('teacherId').notEmpty().withMessage('Teacher ID is required'),
  body('skill').trim().notEmpty().withMessage('Skill is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('scheduledDate').isISO8601().withMessage('Valid date is required'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teacherId, skill, title, description, scheduledDate, duration, meetingLink } = req.body;
    const learnerId = req.user._id;

    // Verify teacher exists and has the skill
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if teacher has the requested skill
    const hasSkill = teacher.skillsToTeach.some(teachSkill =>
      teachSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(teachSkill.toLowerCase())
    );

    if (!hasSkill) {
      return res.status(400).json({ message: 'Teacher does not offer this skill' });
    }

    // Check for scheduling conflicts
    const conflictingAppointment = await Appointment.findOne({
      teacherId,
      scheduledDate: new Date(scheduledDate),
      status: { $in: ['pending', 'accepted'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ message: 'Teacher has a conflicting appointment at this time' });
    }

    const appointment = new Appointment({
      teacherId,
      learnerId,
      skill,
      title,
      description,
      scheduledDate: new Date(scheduledDate),
      duration: duration || 60,
      meetingLink
    });

    await appointment.save();
    await appointment.populate('teacherId', 'name avatar skillsToTeach');
    await appointment.populate('learnerId', 'name avatar skillsToLearn');

    res.status(201).json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (accept/reject/complete)
// @access  Private
router.put('/:id/status', [
  auth,
  body('status').isIn(['accepted', 'rejected', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user._id;

    const appointment = await Appointment.findById(id)
      .populate('teacherId', 'name avatar')
      .populate('learnerId', 'name avatar');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is authorized to update this appointment
    const isTeacher = appointment.teacherId._id.toString() === userId.toString();
    const isLearner = appointment.learnerId._id.toString() === userId.toString();

    if (!isTeacher && !isLearner) {
      return res.status(403).json({ message: 'Not authorized to update this appointment' });
    }

    // Validate status change permissions
    if (status === 'accepted' || status === 'rejected') {
      if (!isTeacher) {
        return res.status(403).json({ message: 'Only teacher can accept or reject appointments' });
      }
    }

    if (status === 'accepted' && !appointment.meetingLink) {
      // Generate a unique Jitsi meeting link
      const meetingId = `SkillSwap-${appointment._id}-${Math.random().toString(36).substring(7)}`;
      appointment.meetingLink = `https://meet.jit.si/${meetingId}`;
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;

    await appointment.save();

    // If appointment is completed, update totalSessions for both teacher and learner
    if (status === 'completed') {
      const teacher = await User.findById(appointment.teacherId);
      const learner = await User.findById(appointment.learnerId);

      if (teacher) {
        const teacherCompletedCount = await Appointment.countDocuments({
          teacherId: teacher._id,
          status: 'completed'
        });
        teacher.totalSessions = teacherCompletedCount;
        await teacher.save();
      }

      if (learner) {
        const learnerCompletedCount = await Appointment.countDocuments({
          $or: [
            { teacherId: learner._id },
            { learnerId: learner._id }
          ],
          status: 'completed'
        });
        learner.totalSessions = learnerCompletedCount;
        await learner.save();
      }
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id/feedback
// @desc    Add feedback and rating to completed appointment
// @access  Private
router.put('/:id/feedback', [
  auth,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isLength({ max: 500 }).withMessage('Feedback must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user._id;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only learner can give feedback
    if (appointment.learnerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only learner can provide feedback' });
    }

    const isPastAccepted = appointment.status === 'accepted' && new Date(appointment.scheduledDate) < new Date();
    if (appointment.status !== 'completed' && !isPastAccepted) {
      return res.status(400).json({ message: 'Can only provide feedback for completed or past sessions' });
    }

    appointment.rating = rating;
    appointment.feedback = feedback;
    await appointment.save();

    // Update teacher's rating and total sessions using same logic as auth routes
    const now = new Date();
    const allTeacherAppts = await Appointment.find({
      $and: [
        { teacherId: appointment.teacherId },
        { $or: [
          { status: 'completed' },
          { status: 'accepted', scheduledDate: { $lt: now } }
        ]}
      ]
    });

    let ratedSum = 0;
    let ratedCount = 0;
    for (const a of allTeacherAppts) {
      if (a.rating) {
        ratedSum += a.rating;
        ratedCount++;
      }
    }

    const teacher = await User.findById(appointment.teacherId);
    if (teacher) {
      teacher.rating = ratedCount > 0 ? Math.round((ratedSum / ratedCount) * 10) / 10 : 0;
      teacher.totalSessions = allTeacherAppts.length;
      await teacher.save();
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;