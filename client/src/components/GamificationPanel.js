import React, { useState, useEffect } from 'react';
// import accessibilityService from '../services/accessibilityService';

const GamificationPanel = ({ 
  isOpen, 
  onClose, 
  isDarkMode 
}) => {
  const [userStats, setUserStats] = useState({
    totalReports: 0,
    totalPoints: 0,
    badges: [],
    communityImpact: {
      barriersReported: 0,
      routesContributed: 0,
      accessibilityScore: 0
    }
  });

  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('achievements');

  const badges = [
    { id: 'first_reporter', name: 'First Reporter', icon: '🥇', description: 'Report your first barrier', unlocked: false },
    { id: 'community_helper', name: 'Community Helper', icon: '🤝', description: 'Report 10 barriers', unlocked: false },
    { id: 'accessibility_champion', name: 'Accessibility Champion', icon: '🏆', description: 'Report 50 barriers', unlocked: false },
    { id: 'city_guardian', name: 'City Guardian', icon: '🛡️', description: 'Report 100 barriers', unlocked: false },
    { id: 'photo_documentarian', name: 'Photo Documentarian', icon: '📸', description: 'Include photos in 5 reports', unlocked: false },
    { id: 'detailed_reporter', name: 'Detailed Reporter', icon: '📝', description: 'Write detailed notes in 10 reports', unlocked: false },
    { id: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'Report barriers before 8 AM', unlocked: false },
    { id: 'night_watch', name: 'Night Watch', icon: '🌙', description: 'Report barriers after 10 PM', unlocked: false },
    { id: 'weather_warrior', name: 'Weather Warrior', icon: '🌨️', description: 'Report barriers in adverse weather', unlocked: false },
    { id: 'neighborhood_expert', name: 'Neighborhood Expert', icon: '🏘️', description: 'Report barriers in 5 different areas', unlocked: false }
  ];

  useEffect(() => {
    if (isOpen) {
      loadUserStats();
      loadLeaderboard();
    }
  }, [isOpen]);

  const loadUserStats = () => {
    const totalReports = parseInt(localStorage.getItem('totalBarrierReports') || '0');
    const totalPoints = parseInt(localStorage.getItem('totalPoints') || '0');
    const userBadges = JSON.parse(localStorage.getItem('userBadges') || '[]');
    
    // Calculate community impact
    const communityImpact = {
      barriersReported: totalReports,
      routesContributed: parseInt(localStorage.getItem('routesContributed') || '0'),
      accessibilityScore: Math.min(100, totalReports * 2) // Simple scoring
    };

    setUserStats({
      totalReports,
      totalPoints,
      badges: userBadges,
      communityImpact
    });
  };

  const loadLeaderboard = () => {
    // Mock leaderboard data - in a real app, this would come from the server
    const mockLeaderboard = [
      { name: 'Sarah M.', points: 1250, reports: 45, avatar: '👩' },
      { name: 'Mike R.', points: 980, reports: 32, avatar: '👨' },
      { name: 'Emma L.', points: 875, reports: 28, avatar: '👩' },
      { name: 'David K.', points: 720, reports: 24, avatar: '👨' },
      { name: 'Lisa P.', points: 650, reports: 22, avatar: '👩' }
    ];
    setLeaderboard(mockLeaderboard);
  };

  const getBadgeStatus = (badgeId) => {
    return userStats.badges.includes(badgeId);
  };

  const getProgressForBadge = (badgeId) => {
    switch (badgeId) {
      case 'first_reporter':
        return userStats.totalReports >= 1 ? 100 : 0;
      case 'community_helper':
        return Math.min(100, (userStats.totalReports / 10) * 100);
      case 'accessibility_champion':
        return Math.min(100, (userStats.totalReports / 50) * 100);
      case 'city_guardian':
        return Math.min(100, (userStats.totalReports / 100) * 100);
      default:
        return 0;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] modal-overlay">
      <div className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Community Impact & Achievements</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'hover:bg-gray-700' : ''
              }`}
              aria-label="Close achievements"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
            }`}>
              <div className="text-2xl font-bold text-blue-600">{userStats.totalReports}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Barriers Reported</div>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-green-50'
            }`}>
              <div className="text-2xl font-bold text-green-600">{userStats.totalPoints}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Community Points</div>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-purple-50'
            }`}>
              <div className="text-2xl font-bold text-purple-600">{userStats.communityImpact.accessibilityScore}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Accessibility Score</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'achievements'
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Achievements
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'leaderboard'
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('impact')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'impact'
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Community Impact
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Badges</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {badges.map(badge => {
                  const isUnlocked = getBadgeStatus(badge.id);
                  const progress = getProgressForBadge(badge.id);
                  
                  return (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isUnlocked
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900'
                          : isDarkMode
                          ? 'border-gray-600 bg-gray-700'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                          {badge.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium ${isUnlocked ? 'text-yellow-800 dark:text-yellow-200' : ''}`}>
                            {badge.name}
                          </h4>
                          <p className={`text-sm ${isUnlocked ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-600 dark:text-gray-400'}`}>
                            {badge.description}
                          </p>
                          {!isUnlocked && progress > 0 && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% complete</p>
                            </div>
                          )}
                        </div>
                        {isUnlocked && (
                          <div className="text-yellow-500">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Community Leaderboard</h3>
              <div className="space-y-3">
                {leaderboard.map((user, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-4 rounded-lg ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-2xl font-bold mr-4 ${getRankColor(index + 1)}`}>
                      #{index + 1}
                    </div>
                    <div className="text-2xl mr-4">{user.avatar}</div>
                    <div className="flex-1">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {user.reports} barriers reported
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{user.points}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'impact' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Your Community Impact</h3>
              
              {/* Impact Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
                }`}>
                  <h4 className="font-semibold mb-4">Accessibility Improvements</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Barriers reported</span>
                      <span className="font-bold">{userStats.communityImpact.barriersReported}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Routes contributed</span>
                      <span className="font-bold">{userStats.communityImpact.routesContributed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accessibility score</span>
                      <span className="font-bold">{userStats.communityImpact.accessibilityScore}/100</span>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-green-50'
                }`}>
                  <h4 className="font-semibold mb-4">Community Contribution</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total points earned</span>
                      <span className="font-bold">{userStats.totalPoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Badges unlocked</span>
                      <span className="font-bold">{userStats.badges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rank in community</span>
                      <span className="font-bold">#{leaderboard.findIndex(u => u.points === userStats.totalPoints) + 1 || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Message */}
              <div className={`p-6 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-purple-50'
              }`}>
                <h4 className="font-semibold mb-3">Thank You for Making Halifax More Accessible!</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your reports help the city identify and fix accessibility issues. 
                  Every barrier you report brings us closer to a more inclusive community.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamificationPanel;
