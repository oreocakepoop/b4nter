import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { UserProfile, FirebaseUser, UserHoverTooltipProps } from '../types';
import ProfilePhoto from './ProfilePhoto';
import LoadingSpinner from './LoadingSpinner';
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } from '../utils/friendUtils';
import { startOrCreateDmConversation } from '../utils/dmUtils'; // For Send Message button

const UserHoverTooltip: React.FC<UserHoverTooltipProps> = ({
  targetUser,
  currentUser,
  currentUserProfile,
  children,
  onSendMessage, // This prop might be useful if the parent wants to handle DM initiation
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const showTooltip = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsVisible(true);
  };

  const hideTooltip = (immediate = false) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setActionError(null); // Clear error when hiding
    }, immediate ? 0 : 200); // Delay hiding to allow mouse travel to tooltip
  };

  useEffect(() => {
    const handleMouseEnterWrapper = () => showTooltip();
    const handleMouseLeaveWrapper = () => hideTooltip();
    
    const currentWrapperRef = wrapperRef.current;
    currentWrapperRef?.addEventListener('mouseenter', handleMouseEnterWrapper);
    currentWrapperRef?.addEventListener('mouseleave', handleMouseLeaveWrapper);
    
    return () => {
      currentWrapperRef?.removeEventListener('mouseenter', handleMouseEnterWrapper);
      currentWrapperRef?.removeEventListener('mouseleave', handleMouseLeaveWrapper);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleFriendAction = async () => {
    if (!currentUser || !currentUserProfile || !targetUser.username) return;
    setIsLoadingAction(true);
    setActionError(null);
    try {
      if (currentUserProfile.friends?.[targetUser.uid]) {
        // Unfriend logic (optional for now, can be a placeholder)
        // await removeFriend(currentUser.uid, targetUser.uid);
        console.log("Unfriend action placeholder");
      } else if (currentUserProfile.friendRequestsSent?.[targetUser.uid]) {
        // Cancel request logic (optional)
        console.log("Cancel friend request placeholder");
      } else if (currentUserProfile.friendRequestsReceived?.[targetUser.uid]) {
        // Accept request (for example)
        await acceptFriendRequest(currentUser.uid, targetUser.uid, currentUserProfile.username, currentUserProfile.photoURL);
      } else {
        await sendFriendRequest(currentUser.uid, currentUserProfile.username, currentUserProfile.photoURL, targetUser.uid);
      }
    } catch (err: any) {
      setActionError(err.message || "Action failed.");
    } finally {
      setIsLoadingAction(false);
    }
  };
  
  const handleSendMessageClick = async () => {
    if (!currentUser || !currentUserProfile || !targetUser) return;
    setIsLoadingAction(true);
    setActionError(null);
    try {
      if (onSendMessage) {
        onSendMessage(targetUser.uid);
      } else {
        const dmRoomId = await startOrCreateDmConversation(currentUser, currentUserProfile, targetUser);
        navigate(`/?roomId=${dmRoomId}`); // Navigate to the DM room via query param
      }
      hideTooltip(true); // Close tooltip after action
    } catch (err: any) {
      setActionError(err.message || "Could not open DM.");
      console.error("Error starting DM from tooltip:", err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  let friendButtonText = "Add Friend";
  let friendButtonIcon = <i className="fas fa-user-plus mr-1.5"></i>;
  let friendButtonDisabled = false;
  let friendButtonClass = "btn-primary";

  if (currentUserProfile && targetUser) {
    if (currentUserProfile.friends?.[targetUser.uid]) {
      friendButtonText = "Friends";
      friendButtonIcon = <i className="fas fa-user-check mr-1.5"></i>;
      friendButtonDisabled = true; // Or enable for "Unfriend"
      friendButtonClass = "btn-success btn-outline cursor-default";
    } else if (currentUserProfile.friendRequestsSent?.[targetUser.uid]) {
      friendButtonText = "Request Sent";
      friendButtonIcon = <i className="fas fa-paper-plane mr-1.5"></i>;
      friendButtonDisabled = true;
      friendButtonClass = "btn-info btn-outline cursor-default";
    } else if (currentUserProfile.friendRequestsReceived?.[targetUser.uid]) {
      friendButtonText = "Accept Request"; // Or "Respond"
      friendButtonIcon = <i className="fas fa-user-plus mr-1.5"></i>; // Or fa-reply
      friendButtonClass = "btn-secondary";
    }
  }
  
  if (!targetUser) return <>{children}</>; // Should not happen if used correctly

  return (
    <div ref={wrapperRef} className="relative inline-block">
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute z-50 mt-1 w-64 bg-base-100 rounded-lg shadow-xl border border-base-300/70 p-0 overflow-hidden"
            style={{
              // Basic positioning, can be improved with Popper.js or similar for complex scenarios
              bottom: 'calc(100% + 5px)', // Appears above the element
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            onMouseEnter={showTooltip} // Keep tooltip open if mouse moves onto it
            onMouseLeave={() => hideTooltip()}
          >
            <div className="p-3">
              <div className="flex items-center space-x-3 mb-2.5">
                <ProfilePhoto
                  currentUser={null}
                  userProfile={targetUser}
                  size="sm"
                  editable={false}
                  className="!w-12 !h-12"
                  onUpdateAvatarCustomization={async () => ({ success: false, error: "" })}
                />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-base-content truncate" title={targetUser.username}>
                    {targetUser.username}
                  </p>
                  <p className="text-xs text-accent">
                    <i className="fas fa-star fa-xs mr-1"></i>
                    {targetUser.points.toLocaleString()} Banter Points
                  </p>
                </div>
              </div>

              {actionError && <p className="text-xs text-error mb-2 text-center">{actionError}</p>}

              <div className="space-y-1.5">
                <Link
                  to={`/user/${targetUser.username}`}
                  onClick={() => hideTooltip(true)}
                  className="btn btn-sm btn-ghost w-full justify-start"
                >
                  <i className="fas fa-user-circle mr-1.5"></i>View Profile
                </Link>

                {currentUser && currentUser.uid !== targetUser.uid && (
                  <>
                    {currentUserProfile?.friends?.[targetUser.uid] && (
                         <button
                            onClick={handleSendMessageClick}
                            className="btn btn-sm btn-ghost w-full justify-start"
                            disabled={isLoadingAction}
                        >
                        {isLoadingAction ? <LoadingSpinner size="xs" /> : <><i className="fas fa-paper-plane mr-1.5"></i>Send Message</>}
                        </button>
                    )}
                    <button
                      onClick={handleFriendAction}
                      className={`btn btn-sm w-full ${friendButtonClass}`}
                      disabled={friendButtonDisabled || isLoadingAction}
                    >
                      {isLoadingAction && !friendButtonDisabled ? <LoadingSpinner size="xs" /> : friendButtonIcon}
                      {friendButtonText}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserHoverTooltip;
