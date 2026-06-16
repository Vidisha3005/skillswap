import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import {
  Users,
  MessageCircle,
  Calendar,
  Star,
  Filter,
  Search,
  BookOpen,
  CheckCircle,
  ExternalLink,
  FileText,
  Award,
  Activity,
  MapPin,
  Mail,
  Info,
  X
} from "lucide-react";
import BookingForm from "../components/BookingForm"; 
import "./Matches.css";

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("score");

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMatchProfile, setSelectedMatchProfile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortMatches();
  }, [matches, searchTerm, filterType, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching Matches and Recommendations...');
      console.log('Current user skills:', { teach: user?.skillsToTeach, learn: user?.skillsToLearn });

      // Fetch Matches
      try {
        const matchesRes = await axios.get("/matches");
        console.log('Matches fetched:', matchesRes.data.matches?.length || 0);
        setMatches(matchesRes.data.matches || []);
      } catch (err) {
        console.error("Error fetching matches:", err);
      }

      // Fetch Recommendations
      try {
        const recsRes = await axios.get("/matches/recommendations");
        console.log('Recommendations fetched:', recsRes.data.recommendations?.length || 0);
        setRecommendations(recsRes.data.recommendations || []);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      }

    } catch (error) {
      console.error("Global data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortMatches = () => {
    let filtered = [...matches];

    if (searchTerm) {
      filtered = filtered.filter(
        (match) =>
          match.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          match.commonSkills.some((skill) =>
            skill.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((match) => match.matchType === filterType);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
          return (b.matchScore || 0) - (a.matchScore || 0);
        case "rating":
          return (b.user.rating || 0) - (a.user.rating || 0);
        case "sessions":
          return (b.user.totalSessions || 0) - (a.user.totalSessions || 0);
        case "name":
          return a.user.name.localeCompare(b.user.name);
        default:
          return 0;
      }
    });

    setFilteredMatches(filtered);
  };

  const getMatchTypeInfo = (matchType) => {
    switch (matchType) {
      case "mutual":
        return {
          label: "Mutual Exchange",
          description: "Can teach you and wants to learn from you",
          color: "match-mutual",
          icon: "🤝",
        };
      case "teacher":
        return {
          label: "Can Teach You",
          description: "Has skills you want to learn",
          color: "match-teacher",
          icon: "👨‍🏫",
        };
      case "learner":
        return {
          label: "Wants to Learn",
          description: "Wants to learn skills you can teach",
          color: "match-learner",
          icon: "🎓",
        };
      default:
        return {
          label: "Match",
          description: "Skill exchange opportunity",
          color: "match-default",
          icon: "✨",
        };
    }
  };

  const handleBookSession = (match) => {
    setSelectedTeacher(match.user);
    setShowBookingModal(true);
  };

  const handleViewProfile = (match) => {
    setSelectedMatchProfile(match.user);
    setShowProfileModal(true);
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

  if (loading) {
    return <div className="loading-spinner">Finding the best matches for you...</div>;
  }

  return (
    <div className="matches-page">
      <div className="container">
        <div className="matches-header">
          <div className="header-content">
            <h1>
              <Users size={28} />
              Skill Partner Matches
            </h1>
            <p>
              Connect with people who can teach you new skills or learn from
              your expertise
            </p>
          </div>
        </div>

        {/* 🤖 Smart Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="recommendations-section">
            <div className="section-title">
              <Star className="star-icon" size={24} fill="#f59e0b" color="#f59e0b" />
              <h2>Recommended for You</h2>
              <span className="ai-badge">AI POWERED</span>
            </div>
            <div className="recommendations-scroll">
              {recommendations.map((rec, index) => (
                <div key={index} className="rec-card">
                  <div className="rec-badge">Best Choice</div>
                  <div className="match-percent-circle">
                    <span className="percent-val">{rec.matchPercentage}%</span>
                    <span className="percent-label">Match</span>
                  </div>
                  <div className="rec-avatar">
                    {rec.user.avatar ? <img src={rec.user.avatar} alt={rec.user.name} /> : rec.user.name.charAt(0)}
                  </div>
                  <h3>{rec.user.name}</h3>
                  <div className="rec-reasons">
                    {rec.reasons.map((reason, i) => (
                      <span key={i} className="reason-tag">
                        <CheckCircle size={12} /> {reason}
                      </span>
                    ))}
                  </div>
                  <div className="rec-skills">
                    {rec.commonSkills.slice(0, 2).map((s, i) => (
                      <span key={i} className="skill-pill">{s}</span>
                    ))}
                  </div>
                  <div className="rec-actions">
                    <button onClick={() => handleBookSession(rec)} className="btn btn-primary btn-sm">
                      Book
                    </button>
                    <button onClick={() => handleViewProfile(rec)} className="btn btn-outline btn-sm">
                      Profile
                    </button>
                    <Link to={`/chat/${rec.user._id}`} className="btn btn-secondary btn-sm">
                      Chat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!user?.skillsToTeach?.length || !user?.skillsToLearn?.length) && (
          <div className="setup-prompt">
            <BookOpen size={20} />
            <div>
              <h3>Complete your profile to find matches</h3>
              <p>Add skills you can teach and want to learn</p>
            </div>
            <Link to="/profile" className="btn btn-primary">
              Setup Profile
            </Link>
          </div>
        )}

        {matches.length > 0 && (
          <div className="matches-controls">
            <div className="search-bar">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by name or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filters">
              <div className="filter-group">
                <Filter size={16} />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Matches</option>
                  <option value="mutual">Mutual Exchange</option>
                  <option value="teacher">Can Teach Me</option>
                  <option value="learner">Wants to Learn</option>
                </select>
              </div>

              <div className="filter-group">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="score">Match Score</option>
                  <option value="rating">Rating</option>
                  <option value="sessions">Experience</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="matches-content">
          {filteredMatches.length > 0 ? (
            <div className="matches-grid">
              {filteredMatches.map((match, index) => {
                const matchInfo = getMatchTypeInfo(match.matchType);

                return (
                  <div key={index} className="match-card">
                    <div className="match-header">
                      <div className="match-avatar">
                        {match.user.avatar ? (
                          <img
                            src={match.user.avatar}
                            alt={match.user.name}
                          />
                        ) : (
                          match.user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="match-info">
                        <h3>{match.user.name}</h3>
                        <div className={`match-type ${matchInfo.color}`}>
                          <span className="match-icon">{matchInfo.icon}</span>
                          {matchInfo.label}
                        </div>
                        <p className="match-description">
                          {matchInfo.description}
                        </p>
                      </div>
                      <div className="match-stats">
                        {match.user.rating > 0 && (
                          <div className="stat">
                            <Star size={14} />
                            <span>{match.user.rating}</span>
                          </div>
                        )}
                        {match.user.totalSessions > 0 && (
                          <div className="stat">
                            <span className="stat-label">
                              {match.user.totalSessions} sessions
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="match-body">
                      <div className="skills-section">
                        <h4>Common Skills</h4>
                        <div className="skills-list">
                          {match.commonSkills.map((skill, skillIndex) => (
                            <span key={skillIndex} className="skill-tag">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {match.matchType === "mutual" && match.learnerSkills && (
                        <div className="skills-section">
                          <h4>They want to learn</h4>
                          <div className="skills-list">
                            {match.learnerSkills.map(
                              (skill, skillIndex) => (
                                <span
                                  key={skillIndex}
                                  className="skill-tag skill-secondary"
                                >
                                  {skill}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {match.user.bio && (
                        <div className="match-bio">
                          <p>{match.user.bio}</p>
                        </div>
                      )}
                    </div>

                    <div className="match-actions">
                      <button
                        onClick={() => handleViewProfile(match)}
                        className="btn btn-secondary"
                      >
                        <Info size={16} />
                        View Profile
                      </button>
                      <button
                        onClick={() => handleBookSession(match)}
                        className="btn btn-outline"
                      >
                        <Calendar size={16} />
                        Book Session
                      </button>
                      <Link
                        to={`/chat/${match.user._id}`}
                        className="btn btn-primary"
                      >
                        <MessageCircle size={16} />
                        Chat
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : matches.length > 0 ? (
            <div className="no-results">
              <Search size={48} />
              <h3>No {filterType !== 'all' ? filterType : ''} matches found</h3>
              <p>Try adjusting your search terms or filters</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                }}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <Users size={64} />
              <h3>No matches yet</h3>
              <p>
                {!user?.skillsToTeach?.length || !user?.skillsToLearn?.length
                  ? "Complete your profile to start finding skill exchange partners"
                  : "We'll find matches for you as more users join the platform"}
              </p>
              {(!user?.skillsToTeach?.length || !user?.skillsToLearn?.length) && (
                <Link to="/profile" className="btn btn-primary">
                  Complete Profile
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      {showBookingModal && (
        <BookingForm
          onClose={() => setShowBookingModal(false)}
          onBooked={() => {
            setShowBookingModal(false);
          }}
          teacher={selectedTeacher}
          learner={user}
        />
      )}

      {showProfileModal && selectedMatchProfile && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body profile-viewer">
              <div className="viewer-header">
                <div className="viewer-avatar">
                  {selectedMatchProfile.avatar ? (
                    <img src={selectedMatchProfile.avatar} alt={selectedMatchProfile.name} />
                  ) : (
                    selectedMatchProfile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="viewer-info">
                  <h3>{selectedMatchProfile.name}</h3>
                  <div className="viewer-meta">
                    <div className="meta-item"><Mail size={14} /> {selectedMatchProfile.email}</div>
                    {selectedMatchProfile.location && (
                      <div className="meta-item"><MapPin size={14} /> {selectedMatchProfile.location}</div>
                    )}
                  </div>
                  <div className="viewer-stats">
                    <div className="v-stat">
                      <Star size={16} />
                      <span>{selectedMatchProfile.rating || 0} Rating</span>
                    </div>
                    <div className="v-stat">
                      <Activity size={16} />
                      <span>{selectedMatchProfile.totalSessions || 0} Sessions</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="viewer-section">
                <h4><Info size={18} /> About</h4>
                <p className="viewer-bio">
                  {selectedMatchProfile.bio || "No bio information provided."}
                </p>
              </div>

              <div className="viewer-grid">
                <div className="viewer-section">
                  <h4><Award size={18} /> Skills to Teach</h4>
                  <div className="viewer-skills">
                    {selectedMatchProfile.skillsToTeach?.map((s, i) => (
                      <span key={i} className="v-skill teach">{s}</span>
                    )) || <p className="empty-msg">None listed</p>}
                  </div>
                </div>
                <div className="viewer-section">
                  <h4><BookOpen size={18} /> Skills to Learn</h4>
                  <div className="viewer-skills">
                    {selectedMatchProfile.skillsToLearn?.map((s, i) => (
                      <span key={i} className="v-skill learn">{s}</span>
                    )) || <p className="empty-msg">None listed</p>}
                  </div>
                </div>
              </div>

              {selectedMatchProfile.pdfs?.length > 0 && (
                <div className="viewer-section">
                  <h4><FileText size={18} /> Certificates & Portfolio</h4>
                  <div className="viewer-pdfs">
                    {selectedMatchProfile.pdfs.map((pdf, index) => (
                      <div key={index} className="v-pdf-item">
                        <div className="v-pdf-info">
                          <FileText size={20} color="#ef4444" />
                          <span>{pdf.title}</span>
                        </div>
                        <button 
                          onClick={() => handleViewPDF(pdf.url)}
                          className="view-pdf-btn"
                          title="View Document"
                        >
                          <ExternalLink size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <Link 
                to={`/chat/${selectedMatchProfile._id}`} 
                className="btn btn-primary"
                onClick={() => setShowProfileModal(false)}
              >
                <MessageCircle size={18} /> Start Chat
              </Link>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;
