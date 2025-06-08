
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom'; // Updated import
import { LeaderboardPageProps, UserProfile } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfilePhoto from '../components/ProfilePhoto';
import LevelProgressBar from '../components/LevelProgressBar';
import { getBanterLevelInfo } from '../utils/banterLevels';
import { BADGE_DEFINITIONS } from '../utils/badges';

const TOP_N_USERS = 10; // Number of top users to display

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  currentUser,
  userProfile,
  allUserProfiles,
  isLoadingUserProfiles,
}) => {
  const navigateHook = useNavigate(); // Updated usage

  const sortedUsersByPoints = useMemo(() => {
    if (!allUserProfiles) return [];
    return [...allUserProfiles]
      .filter(profile => profile.points > 0) // Optionally filter out users with 0 points
      .sort((a, b) => b.points - a.points);
  }, [allUserProfiles]);

  const topBanterers = useMemo(() => {
    return sortedUsersByPoints.slice(0, TOP_N_USERS);
  }, [sortedUsersByPoints]);

  const loggedInUserRank = useMemo(() => {
    if (!currentUser || !userProfile || sortedUsersByPoints.length === 0) return null;
    const rank = sortedUsersByPoints.findIndex(u => u.uid === currentUser.uid);
    return rank !== -1 ? rank + 1 : null;
  }, [currentUser, userProfile, sortedUsersByPoints]);

  const MyBanterSnapshot: React.FC = () => {
    if (!currentUser || !userProfile) return null;

    const level = getBanterLevelInfo(userProfile.points);
    const badgesEarnedCount = userProfile.badges?.length || 0;
    const totalPossibleBadges = Object.keys(BADGE_DEFINITIONS).length;

    return (
      <div className="card bg-base-200 shadow-lg mb-8 border border-secondary/30">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title text-xl sm:text-2xl text-secondary mb-3">
            <i className="fas fa-bullseye mr-2"></i>My Banter Snapshot
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ProfilePhoto
              currentUser={currentUser}
              userProfile={userProfile}
              onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here" })}
              size="md"
              editable={false}
              selectedFrameId={userProfile.selectedAvatarFrameId}
              selectedFlairId={userProfile.selectedAvatarFlairId}
            />
            <div className="flex-grow w-full">
              <Link to={`/user/${userProfile.username}`} className="text-lg font-semibold hover:underline text-secondary-focus truncate block"> {/* Updated usage */}
                {userProfile.username}
              </Link>
              <p className="text-sm text-base-content/80 mb-2">{level.name} - {userProfile.points.toLocaleString()} Banter Points</p>
              <LevelProgressBar currentPoints={userProfile.points} currentLevel={level} />
              <div className="text-xs mt-2 flex justify-between">
                <span>Badges: {badgesEarnedCount} / {totalPossibleBadges}</span>
                {loggedInUserRank && <span>Global Rank: #{loggedInUserRank}</span>}
              </div>
            </div>
          </div>
           <div className="card-actions justify-end mt-2">
             <Link to={`/user/${userProfile.username}`} className="btn btn-xs btn-outline btn-secondary"> {/* Updated usage */}
                View Full Profile
             </Link>
           </div>
        </div>
      </div>
    );
  };
  
  const LeaderboardListItem: React.FC<{ user: UserProfile, rank: number }> = React.memo(({ user, rank }) => {
    const level = getBanterLevelInfo(user.points);
    const displayUsername = user.username || user.displayName || 'Anon';
    return (
      <motion.li 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: rank * 0.05 }}
        className="flex items-center p-2.5 sm:p-3 bg-base-100 hover:bg-base-200 shadow-sm transition-colors border border-base-300/70"
      >
        <span className="text-lg font-bold text-primary w-8 sm:w-10 text-center mr-2 sm:mr-3">#{rank}</span>
        <ProfilePhoto
          currentUser={null}
          userProfile={user}
          onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here" })}
          size="sm"
          editable={false}
          className="!w-10 !h-10 mr-2 sm:mr-3"
          selectedFrameId={user.selectedAvatarFrameId}
          selectedFlairId={user.selectedAvatarFlairId}
        />
        <div className="flex-grow min-w-0">
          <Link  /* Updated usage */
            to={`/user/${user.username}`} 
            className="text-sm sm:text-base font-semibold link link-hover text-primary-focus hover:text-primary truncate block" 
            title={`View ${displayUsername}'s profile`}
          >
            {displayUsername}
          </Link>
          <p className="text-xs text-base-content/70">{level.name}</p>
        </div>
        <div className="text-right ml-2">
          <p className="text-sm sm:text-base font-bold text-accent">{user.points.toLocaleString()} pts</p>
          {user.badges && user.badges.length > 0 && (
            <div className="flex justify-end gap-1 mt-0.5">
              {user.badges.slice(0,3).map(badgeId => {
                const badgeDef = BADGE_DEFINITIONS[badgeId];
                return badgeDef ? <i key={badgeId} className={`${badgeDef.icon} text-xs opacity-70`} title={badgeDef.name}></i> : null;
              })}
            </div>
          )}
        </div>
      </motion.li>
    );
  });
  LeaderboardListItem.displayName = 'LeaderboardListItem';


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto py-4 sm:py-6 px-2 sm:px-4"
    >
      <div className="text-center mb-6 sm:mb-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1], y: [0, -3, 0] }}
            transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, delay: 0.2 }}
          >
            <i className="fas fa-trophy text-5xl sm:text-6xl text-warning mb-2"></i>
          </motion.div>
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">
          Hall of Fame & My Progress
        </h1>
        <p className="text-sm sm:text-base text-base-content/70 mt-1">See how you stack up against the B4NTER legends!</p>
      </div>

      {currentUser && userProfile && <MyBanterSnapshot />}

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6"> {/* Changed to 1 column for now, can be 2 for more leaderboards later */}
        <div className="card bg-base-100 shadow-xl border border-primary/20">
          <div className="card-body p-4 sm:p-5">
            <h2 className="card-title text-lg sm:text-xl text-primary mb-3">
              <i className="fas fa-users mr-2"></i>Top Banterers (By Points)
            </h2>
            {isLoadingUserProfiles ? (
              <div className="flex justify-center py-10"><LoadingSpinner size="md"/></div>
            ) : topBanterers.length > 0 ? (
              <ul className="space-y-2 sm:space-y-2.5">
                {topBanterers.map((user, index) => (
                  <LeaderboardListItem key={user.uid} user={user} rank={index + 1} />
                ))}
              </ul>
            ) : (
              <p className="text-base-content/60 text-center py-6">The leaderboard is currently empty. Go earn some points!</p>
            )}
            {sortedUsersByPoints.length > TOP_N_USERS && (
              <div className="text-center mt-4">
                <button className="btn btn-sm btn-ghost" onClick={() => navigateHook('/')}>(Show More - Coming Soon)</button>
              </div>
            )}
          </div>
        </div>

        {/* Placeholder for Most Popular Posts */}
        <div className="card bg-base-100 shadow-xl border border-info/20 opacity-70">
          <div className="card-body p-4 sm:p-5 items-center text-center">
            <i className="fas fa-fire-alt text-4xl text-info mb-3"></i>
            <h2 className="card-title text-lg sm:text-xl text-info">Most Popular Banters</h2>
            <p className="text-sm text-base-content/70">Coming Soon! Discover the week's hottest topics.</p>
          </div>
        </div>

        {/* Placeholder for Trending Now Champions */}
        <div className="card bg-base-100 shadow-xl border border-success/20 opacity-70">
          <div className="card-body p-4 sm:p-5 items-center text-center">
            <i className="fas fa-bolt text-4xl text-success mb-3"></i>
            <h2 className="card-title text-lg sm:text-xl text-success">"Trending Now" Champions</h2>
            <p className="text-sm text-base-content/70">Coming Soon! See who's mastering the trends.</p>
          </div>
        </div>
      </div>
      
       <div className="text-center mt-8">
          <Link to="/" className="btn btn-outline btn-primary btn-sm"> {/* Updated usage */}
            <i className="fas fa-arrow-left mr-2"></i> Back to the Main Feed
          </Link>
        </div>

    </motion.div>
  );
};

export default LeaderboardPage;
