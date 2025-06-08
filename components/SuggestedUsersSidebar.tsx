
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { SuggestedUsersSidebarProps, UserProfile } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ProfilePhoto from './ProfilePhoto';
import { sendFriendRequest } from '../utils/friendUtils'; // Import the utility

const MAX_SUGGESTIONS = 5;

const SuggestedUsersSidebar: React.FC<SuggestedUsersSidebarProps> = ({
  currentUser,
  currentUserProfile,
  allUserProfiles,
  isLoadingUserProfiles,
}) => {
  const [requestStatus, setRequestStatus] = useState<Record<string, 'sending' | 'sent' | 'error'>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const navigate = useNavigate(); // Initialize useNavigate

  const suggestedUsers = useMemo(() => {
    if (!currentUser || !currentUserProfile || isLoadingUserProfiles || !allUserProfiles.length) {
      return [];
    }

    const friendsUids = Object.keys(currentUserProfile.friends || {});
    const sentRequestsUids = Object.keys(currentUserProfile.friendRequestsSent || {});
    // const receivedRequestsUids = Object.keys(currentUserProfile.friendRequestsReceived || {}); // Not strictly needed for filtering suggestions if we only suggest those we haven't interacted with

    return allUserProfiles
      .filter(
        (user) =>
          user.uid !== currentUser.uid && // Not self
          !friendsUids.includes(user.uid) && // Not already friends
          !sentRequestsUids.includes(user.uid) // No pending request sent to this user
          // && !receivedRequestsUids.includes(user.uid) // Optional: don't suggest if they sent you a request
      )
      .sort(() => 0.5 - Math.random()) // Basic shuffle for variety
      .slice(0, MAX_SUGGESTIONS);
  }, [currentUser, currentUserProfile, allUserProfiles, isLoadingUserProfiles]);

  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!currentUser || !currentUserProfile || !targetUser.username) return;

    setRequestStatus(prev => ({ ...prev, [targetUser.uid]: 'sending' }));
    setErrorMessages(prev => ({ ...prev, [targetUser.uid]: '' }));

    try {
      await sendFriendRequest(
        currentUser.uid,
        currentUserProfile.username,
        currentUserProfile.photoURL,
        targetUser.uid
      );
      setRequestStatus(prev => ({ ...prev, [targetUser.uid]: 'sent' }));
    } catch (error: any) {
      console.error(`Error sending friend request to ${targetUser.username}:`, error);
      setRequestStatus(prev => ({ ...prev, [targetUser.uid]: 'error' }));
      setErrorMessages(prev => ({ ...prev, [targetUser.uid]: error.message || "Failed to send request." }));
    }
  };
  
  const sidebarVariants = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "circOut", delay: 0.2 } } }; // Added delay
  const itemVariants = { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } };

  const renderEmptyState = () => (
    <motion.div variants={itemVariants} className="text-center py-6 px-2 text-base-content/60">
      <i className="fas fa-user-friends text-3xl mb-2 text-info opacity-60"></i>
      <p className="text-sm text-info">Discover New Banterers!</p>
      <p className="text-xs mt-1">Suggestions will appear here once more users join the fun.</p>
    </motion.div>
  );

  return (
    <motion.aside
      className="hidden md:block md:w-64 lg:w-72 xl:w-80 self-start shrink-0 print:hidden" // Matches TrendingBanterSidebar styling
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      aria-labelledby="suggested-users-header"
    >
      <div className="card card-compact bg-base-100 shadow-lg border border-base-300/60"> {/* Matches TrendingBanterSidebar styling */}
        <div className="card-body p-3">
          <div className="flex items-center mb-2 pb-1.5 border-b border-primary/30 min-w-0">
             <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, ease: "linear", repeat: Infinity, repeatDelay: 1 }}>
              <i className="fas fa-users-medical text-primary text-lg mr-2"></i>
            </motion.div>
            <h2 id="suggested-users-header" className="text-base font-semibold text-primary !pb-0 truncate flex-1 min-w-0" title="Connect & Discover">Connect & Discover</h2>
          </div>
          <div className="min-h-[150px] max-h-[calc(100vh-25rem)] overflow-y-auto pr-0.5 custom-scrollbar" role="region" aria-label="Suggested Users">
            <AnimatePresence mode="wait">
              <motion.div key="suggested-list-content" variants={itemVariants} initial="initial" animate="animate" exit="initial">
                {isLoadingUserProfiles ? (
                  <div className="flex justify-center items-center h-24" role="status" aria-live="polite">
                    <LoadingSpinner className="text-primary" size="sm" />
                    <span className="sr-only">Loading suggestions...</span>
                  </div>
                ) : suggestedUsers.length === 0 ? renderEmptyState() : (
                  <ul className="space-y-2">
                    {suggestedUsers.map((user, index) => {
                      const status = requestStatus[user.uid];
                      const errorMsg = errorMessages[user.uid];
                      const isSent = currentUserProfile?.friendRequestsSent?.[user.uid] || status === 'sent';
                      const isReceived = currentUserProfile?.friendRequestsReceived?.[user.uid];
                      const isFriend = currentUserProfile?.friends?.[user.uid];
                      
                      let buttonContent;
                      let buttonDisabled = false;
                      let buttonClass = 'btn-xs btn-outline btn-primary hover:bg-primary hover:text-primary-content';

                      if (isFriend) {
                        buttonContent = <><i className="fas fa-user-check mr-1"></i>Friends</>;
                        buttonDisabled = true;
                        buttonClass = 'btn-xs btn-ghost text-success opacity-70 cursor-default';
                      } else if (isSent) {
                        buttonContent = <><i className="fas fa-paper-plane mr-1"></i>Request Sent</>;
                        buttonDisabled = true;
                        buttonClass = 'btn-xs btn-ghost text-info opacity-70 cursor-default';
                      } else if (isReceived) {
                        buttonContent = <><i className="fas fa-reply mr-1"></i>Respond</>;
                        buttonClass = 'btn-xs btn-outline btn-secondary hover:bg-secondary hover:text-secondary-content';
                        // Action for respond would typically go to profile or notifications, for now, links to profile.
                      } else if (status === 'sending') {
                        buttonContent = <LoadingSpinner size="xs" />;
                        buttonDisabled = true;
                      } else if (status === 'error') {
                        buttonContent = <><i className="fas fa-exclamation-triangle mr-1"></i>Retry</>;
                         buttonClass = 'btn-xs btn-outline btn-error hover:bg-error hover:text-error-content';
                      } else {
                        buttonContent = <><i className="fas fa-user-plus mr-1"></i>Add Friend</>;
                      }

                      return (
                        <motion.li
                          key={user.uid}
                          variants={itemVariants}
                          className="p-2 bg-base-100 hover:bg-base-200/60 transition-colors duration-150 rounded-md border border-transparent hover:border-base-300"
                        >
                          <div className="flex items-center space-x-2">
                            <ProfilePhoto
                              currentUser={null}
                              userProfile={user}
                              size="sm"
                              editable={false}
                              className="!w-9 !h-9 flex-shrink-0"
                              onUpdateAvatarCustomization={async () => ({ success: false, error: "" })}
                            />
                            <div className="flex-grow min-w-0">
                              <Link to={`/user/${user.username}`} className="text-sm font-medium text-base-content hover:text-primary hover:underline truncate block" title={user.username}>
                                {user.username}
                              </Link>
                              <p className="text-xs text-base-content/60 truncate" title={`${user.points} Banter Points`}>{user.points} pts</p>
                            </div>
                            <button
                              className={`btn ${buttonClass} flex-shrink-0 min-w-[90px]`}
                              onClick={() => {
                                if (isReceived) navigate(`/user/${user.username}`); // Navigate to profile to respond
                                else if (!isFriend && !isSent && status !== 'sending') handleSendRequest(user);
                              }}
                              disabled={buttonDisabled}
                              title={isFriend ? "You are friends" : isSent ? "Friend request already sent" : isReceived ? "Respond to friend request" : `Send friend request to ${user.username}`}
                            >
                              {buttonContent}
                            </button>
                          </div>
                           {errorMsg && status === 'error' && <p className="text-xs text-error mt-1 ml-11">{errorMsg}</p>}
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default SuggestedUsersSidebar;
