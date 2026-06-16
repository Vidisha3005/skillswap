import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import axios from 'axios';
import './BookingForm.css';

const BookingForm = ({ teacher, onClose, onBooked }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skill: teacher?.skillsToTeach?.[0] || '',
    scheduledDate: '',
    duration: 60
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/appointments', {
        teacherId: teacher._id,
        ...formData
      });
      if (onBooked) onBooked(); // 🔹 tell Appointments to refresh
      onClose(); // 🔹 close modal
    } catch (error) {
      console.error('Error booking session:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Book Session with {teacher?.name}</h3>
          <button onClick={onClose} className="modal-close">
            <XCircle size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label>Skill</label>
            <input
              type="text"
              name="skill"
              value={formData.skill}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Session Title"
            />
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Date & Time</label>
            <input
              type="datetime-local"
              name="scheduledDate"
              value={formData.scheduledDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Duration (minutes)</label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="15"
              step="15"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Book Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;