import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AlertTriangle, ShieldAlert, CheckCircle, Search, Power } from 'lucide-react';
import './SecurityDashboard.css';

const SecurityDashboard = () => {
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSecurityData = async () => {
    try {
      const res = await axios.get('/security/detect-fake');
      setFlaggedUsers(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load security analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleToggleStatus = async (userId) => {
    try {
      const res = await axios.put(`/security/toggle-status/${userId}`);
      toast.success(res.data.message);
      fetchSecurityData(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const filteredUsers = flaggedUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="security-container">
      <div className="security-header">
        <div className="header-title">
          <ShieldAlert className="header-icon" size={32} />
          <h1>Security & Quality Control</h1>
        </div>
        <p>ML-Based Behavior Analysis detecting fake, spam or low-quality profiles.</p>
      </div>

      <div className="security-controls">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search flagged users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-box">
          <span className="stats-label">Flagged Profiles:</span>
          <span className="stats-value">{flaggedUsers.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Analyzing profiles...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="no-flags">
          <CheckCircle size={48} className="success-icon" />
          <h3>All Clear!</h3>
          <p>No suspicious or low-quality profiles detected by the system.</p>
        </div>
      ) : (
        <div className="flags-grid">
          {filteredUsers.map(user => (
            <div key={user._id} className={`flag-card risk-${user.riskLevel.toLowerCase()}`}>
              <div className="card-header">
                <div>
                  <h3 className="user-name">{user.name}</h3>
                  <span className="user-email">{user.email}</span>
                </div>
                <div className="risk-badge">
                  <AlertTriangle size={16} />
                  {user.riskLevel} Risk
                </div>
              </div>
              
              <div className="card-body">
                <div className="score-row">
                  <span className="label">Suspicion Score:</span>
                  <span className="score-value">{user.suspicionScore}/100</span>
                </div>
                
                <div className="flags-list">
                  <strong>Detected Anomalies:</strong>
                  <ul>
                    {user.flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="status-row">
                  <span className="label">Current Status:</span>
                  <span className={user.isActive ? 'status-active' : 'status-banned'}>
                    {user.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
              
              <div className="card-actions">
                <button 
                  onClick={() => handleToggleStatus(user._id)} 
                  className={`btn ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                >
                  <Power size={18} />
                  {user.isActive ? 'Suspend User' : 'Reactivate User'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;
