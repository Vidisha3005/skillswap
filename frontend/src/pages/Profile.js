import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  User as UserIcon, MapPin, BookOpen, PlusCircle, X, Save,
  Mail, FileText, Trash2, Camera, ExternalLink,
  ChevronLeft, Award, Star, Activity
} from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    skillsToTeach: [],
    skillsToLearn: [],
    avatar: ''
  });

  const [newSkill, setNewSkill] = useState({ teach: '', learn: '' });
  const [pdfs, setPdfs] = useState([]);
  const [newPdf, setNewPdf] = useState({ title: '', file: null });

  useEffect(() => {
    if (user) {
      console.log('User data loaded in Profile:', user);
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        skillsToTeach: user.skillsToTeach || [],
        skillsToLearn: user.skillsToLearn || [],
        avatar: user.avatar || ''
      });
      setPdfs(user.pdfs || []);

      if (!user.skillsToTeach?.length && !user.skillsToLearn?.length) {
        setIsEditing(true);
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      try {
        const base64 = await convertToBase64(file);
        setFormData(prev => ({ ...prev, avatar: base64 }));
      } catch (error) {
        console.error('Error converting image:', error);
      }
    }
  };

  const addSkill = (type) => {
    const skill = newSkill[type].trim();
    const listKey = type === 'teach' ? 'skillsToTeach' : 'skillsToLearn';

    if (skill && !formData[listKey].includes(skill)) {
      setFormData(prev => ({
        ...prev,
        [listKey]: [...prev[listKey], skill]
      }));
      setNewSkill(prev => ({ ...prev, [type]: '' }));
    }
  };

  const removeSkill = (type, skillToRemove) => {
    const listKey = type === 'teach' ? 'skillsToTeach' : 'skillsToLearn';
    setFormData(prev => ({
      ...prev,
      [listKey]: prev[listKey].filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      alert('Full Name is required');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending Profile Update:', { ...formData, pdfs });
      const result = await updateProfile({ ...formData, pdfs });
      if (result.success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        skillsToTeach: user.skillsToTeach || [],
        skillsToLearn: user.skillsToLearn || [],
        avatar: user.avatar || ''
      });
      setPdfs(user.pdfs || []);
    }
    setIsEditing(false);
  };

  const handleViewPDF = (pdfUrl) => {
    try {
      const parts = pdfUrl.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);

      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Error opening PDF:', err);
      window.open(pdfUrl, '_blank');
    }
  };

  if (!user) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="avatar-wrapper">
            <div className="profile-avatar">
              {formData.avatar ? (
                <img src={formData.avatar} alt={formData.name} />
              ) : (
                <div className="avatar-placeholder">{formData.name.charAt(0).toUpperCase()}</div>
              )}
            </div>
            {isEditing && (
              <div
                className="avatar-edit-overlay"
                onClick={() => fileInputRef.current.click()}
              >
                <Camera size={20} />
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>
            )}
          </div>

          <div className="profile-info">
            <h1>{formData.name}</h1>
            <div className="profile-email">
              <Mail size={18} />
              <span>{user.email}</span>
            </div>
            {formData.location && (
              <div className="profile-location">
                <MapPin size={16} />
                <span>{formData.location}</span>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="profile-actions">
              <button onClick={() => setIsEditing(true)} className="profile-btn profile-btn-primary">
                <UserIcon size={18} /> Edit Profile
              </button>
            </div>
          )}
        </div>

        <div className="profile-content">
          {isEditing ? (
            <div className="profile-form-container">
              <div className="content-card">
                <div className="card-header">
                  <h3><UserIcon size={20} /> Basic Information</h3>
                </div>
                <div className="card-body">
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Full Name*</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="profile-form-input"
                        placeholder="Your full name"
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="profile-form-input"
                        placeholder="City, Country"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      className="profile-form-input profile-textarea"
                      placeholder="Share your journey and expertise..."
                      maxLength={500}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="content-card">
                <div className="card-header">
                  <h3><BookOpen size={20} /> Skills</h3>
                </div>
                <div className="card-body">
                  <div className="skill-section">
                    <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Skills I Can Teach</label>
                    <div className="skill-input-group">
                      <input
                        type="text"
                        value={newSkill.teach}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, teach: e.target.value }))}
                        className="profile-form-input"
                        placeholder="Add skill..."
                        onKeyPress={(e) => e.key === 'Enter' && addSkill('teach')}
                      />
                      <button type="button" onClick={() => addSkill('teach')} className="profile-btn profile-btn-secondary">
                        Add
                      </button>
                    </div>
                    <div className="skills-container">
                      {formData.skillsToTeach.map((skill, index) => (
                        <div key={index} className="skill-tag teach">
                          <span>{skill}</span>
                          <span className="skill-remove" onClick={() => removeSkill('teach', skill)}>
                            <X size={14} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="skill-section" style={{ marginTop: '2rem' }}>
                    <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Skills I Want to Learn</label>
                    <div className="skill-input-group">
                      <input
                        type="text"
                        value={newSkill.learn}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, learn: e.target.value }))}
                        className="profile-form-input"
                        placeholder="Add skill..."
                        onKeyPress={(e) => e.key === 'Enter' && addSkill('learn')}
                      />
                      <button type="button" onClick={() => addSkill('learn')} className="profile-btn profile-btn-secondary">
                        Add
                      </button>
                    </div>
                    <div className="skills-container">
                      {formData.skillsToLearn.map((skill, index) => (
                        <div key={index} className="skill-tag learn">
                          <span>{skill}</span>
                          <span className="skill-remove" onClick={() => removeSkill('learn', skill)}>
                            <X size={14} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="content-card">
                <div className="card-header">
                  <h3><Award size={20} /> Portfolio</h3>
                </div>
                <div className="card-body">
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                      type="text"
                      placeholder="Certificate Title"
                      value={newPdf.title}
                      onChange={(e) => setNewPdf(prev => ({ ...prev, title: e.target.value }))}
                      className="profile-form-input"
                    />
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setNewPdf(prev => ({ ...prev, file: e.target.files[0] }))}
                      className="profile-form-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (newPdf.title && newPdf.file) {
                        if (newPdf.file.size > 5 * 1024 * 1024) {
                          alert('Certificate size should be less than 5MB');
                          return;
                        }
                        setLoading(true);
                        try {
                          const base64 = await convertToBase64(newPdf.file);
                          setPdfs(prev => [...prev, { title: newPdf.title, url: base64 }]);
                          setNewPdf({ title: '', file: null });
                          // Clear file input
                          if (document.querySelector('input[type="file"][accept="application/pdf"]')) {
                            document.querySelector('input[type="file"][accept="application/pdf"]').value = '';
                          }
                        } catch (err) {
                          console.error('File processing error:', err);
                          alert('Error processing file');
                        }
                        finally { setLoading(false); }
                      } else {
                        alert('Please provide a title and select a PDF file');
                      }
                    }}
                    className="profile-btn profile-btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Add Certificate'}
                  </button>

                  <div className="pdf-list" style={{ marginTop: '1.5rem' }}>
                    {pdfs.map((pdf, index) => (
                      <div key={index} className="pdf-item">
                        <div className="pdf-link">
                          <FileText size={20} color="#ef4444" />
                          <span>{pdf.title}</span>
                        </div>
                        <Trash2 className="skill-remove" size={18} onClick={() => setPdfs(prev => prev.filter((_, i) => i !== index))} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="floating-actions">
                <button onClick={handleCancel} className="profile-btn profile-btn-secondary" disabled={loading}>
                  Cancel
                </button>
                <button onClick={handleSubmit} className="profile-btn profile-btn-primary" disabled={loading}>
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-view-container">
              <div className="content-card">
                <div className="card-header">
                  <h3><Activity size={20} /> About</h3>
                </div>
                <div className="card-body">
                  <p className="profile-bio" style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#444', whiteSpace: 'pre-wrap' }}>
                    {formData.bio || 'No bio added yet.'}
                  </p>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="stat-value">{user.rating || 0}</span>
                      <span className="stat-label">Rating</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-value">{user.totalSessions || 0}</span>
                      <span className="stat-label">Sessions</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="content-card">
                  <div className="card-header"><h3>Teaching</h3></div>
                  <div className="card-body">
                    <div className="skills-container">
                      {formData.skillsToTeach.map((s, i) => <span key={i} className="skill-tag teach">{s}</span>)}
                    </div>
                  </div>
                </div>
                <div className="content-card">
                  <div className="card-header"><h3>Learning</h3></div>
                  <div className="card-body">
                    <div className="skills-container">
                      {formData.skillsToLearn.map((s, i) => <span key={i} className="skill-tag learn">{s}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="content-card">
                <div className="card-header"><h3>Portfolio</h3></div>
                <div className="card-body">
                  <div className="pdf-list">
                    {pdfs.map((pdf, index) => (
                      <div key={index} className="pdf-item">
                        <div className="pdf-link">
                          <FileText size={20} color="#ef4444" />
                          <span>{pdf.title}</span>
                        </div>
                        <div 
                          onClick={() => handleViewPDF(pdf.url)} 
                          style={{ color: 'inherit', display: 'flex', cursor: 'pointer' }}
                        >
                          <ExternalLink size={16} color="#666" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
