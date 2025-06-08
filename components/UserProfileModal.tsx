
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Removed: import type { User as FirebaseUserType } from 'firebase/auth'; 
import { ref, update, get } from 'firebase/database';
import { UserProfile, UserProfileModalProps as UserProfileModalPropsType, ConfessionPost, BadgeId, AvatarFrameDefinition, AvatarFlairDefinition, FirebaseUser as FirebaseUserType, PostFlairDefinition } from '../types'; // Added FirebaseUserType, PostFlairDefinition
import { BADGE_DEFINITIONS } from '../utils/badges';
import { getBanterLevelInfo } from '../utils/banterLevels';
import LevelProgressBar from './LevelProgressBar';
import { formatRelativeTime } from '../utils/dateUtils';
import LoadingSpinner from './LoadingSpinner';
import ProfilePhoto from './ProfilePhoto'; 
import { db_rtdb } from '../firebase';
import { updateAuthorPhotoURLsInContent, updateAuthorDecorationsInContent, checkAndUnlockAvatarItemsIfNeeded, checkAndUnlockPostFlairsIfNeeded } from '../utils/firebaseUtils'; // Added checkAndUnlockPostFlairsIfNeeded
import { AVATAR_FRAMES, AVATAR_FLAIRS } from '../utils/avatarDecorations';
import { POST_FLAIRS } from '../utils/postFlairDecorations'; // Import POST_FLAIRS


const MAX_RECENT_BANTERS = 3;
const WORDSMITH_POST_COUNT_TARGET = 50;

export const UserProfileModal: React.FC<UserProfileModalPropsType> = ({
  isOpen, onClose, user, userProfile, onLogout, allConfessions, onUsernameUpdate, onAvatarCustomizationUpdate,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const modalTitleId = "user-profile-modal-title";

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);


  useEffect(() => {
    if (isOpen) {
      setIsEditingUsername(false);
      setNewUsername(userProfile?.username || '');
      setEditError(null);
      setIsUpdatingAvatar(false);
      if (user && userProfile) { 
        checkAndUnlockAvatarItemsIfNeeded(user.uid, userProfile.points, userProfile.unlockedAvatarFrames, userProfile.unlockedAvatarFlairs);
        checkAndUnlockPostFlairsIfNeeded(user.uid, userProfile.points, userProfile.unlockedPostFlairs); // Check for post flairs
      }
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, userProfile?.username, user, userProfile?.points, userProfile?.unlockedAvatarFrames, userProfile?.unlockedAvatarFlairs, userProfile?.unlockedPostFlairs]); // Added dependencies

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleDialogCloseEvent = () => { if (isOpen && onClose) onClose(); };
    dialog?.addEventListener('close', handleDialogCloseEvent);
    return () => { dialog?.removeEventListener('close', handleDialogCloseEvent); };
  }, [onClose, isOpen]);

  const handleLogoutClick = async () => { 
    if (onLogout) {
      await onLogout();
      if (onClose) onClose(); 
    }
  };
  
  const handleEditUsernameToggle = () => {
    if (isEditingUsername) { setNewUsername(userProfile?.username || ''); setEditError(null); }
    else { setNewUsername(userProfile?.username || ''); }
    setIsEditingUsername(!isEditingUsername);
  };

  const handleSaveUsername = async () => {
    setEditError(null);
    if (!userProfile) { setEditError("Profile data not loaded."); return;}
    if (!newUsername.trim()) { setEditError("Username cannot be empty."); return; }
    if (newUsername.trim().length < 3 || newUsername.trim().length > 20) { setEditError("Username must be 3-20 characters."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername.trim())) { setEditError("Username: letters, numbers, underscores only."); return; }
    if (newUsername.trim() === userProfile?.username) { setIsEditingUsername(false); return; }

    setIsSavingUsername(true);
    try {
      const usernameToUidRef = ref(db_rtdb, `usernameToUid/${newUsername.trim().toLowerCase()}`);
      const usernameSnapshot = await get(usernameToUidRef);
      if (usernameSnapshot.exists() && usernameSnapshot.val() !== userProfile.uid) {
        throw new Error("This username is already taken. Please choose another one.");
      }
      
      await onUsernameUpdate(newUsername.trim(), userProfile.username); 
      setIsEditingUsername(false);
    } catch (error: any) { setEditError(error.message || "Failed to save username."); }
    finally { setIsSavingUsername(false); }
  };

  const handleAvatarUpdate = useCallback(async (customization: { photoURL?: string; frameId?: string | null; flairId?: string | null }): Promise<{ success: boolean; error?: string }> => {
    if (!user || !userProfile) {
      return { success: false, error: "User or profile not available." };
    }
    setIsUpdatingAvatar(true);
    setEditError(null);
    
    const updates: Partial<UserProfile> = {};
    if (customization.photoURL !== undefined) updates.photoURL = customization.photoURL;
    if (customization.frameId !== undefined) updates.selectedAvatarFrameId = customization.frameId;
    if (customization.flairId !== undefined) updates.selectedAvatarFlairId = customization.flairId;

    try {
      const result = await onAvatarCustomizationUpdate(customization);
      if (!result.success) {
          throw new Error(result.error || "Avatar customization update failed at parent level.");
      }

      const tasks = [];
      if (customization.photoURL) {
        tasks.push(updateAuthorPhotoURLsInContent(user.uid, customization.photoURL));
      }
      if (customization.frameId !== undefined || customization.flairId !== undefined) {
        const currentFrame = customization.frameId === undefined ? userProfile.selectedAvatarFrameId : customization.frameId;
        const currentFlair = customization.flairId === undefined ? userProfile.selectedAvatarFlairId : customization.flairId;
        tasks.push(updateAuthorDecorationsInContent(user.uid, currentFrame, currentFlair));
      }
      
      Promise.all(tasks)
        .then(() => console.log("Successfully updated avatar customizations in content."))
        .catch(err => console.error("Failed to update avatar customizations in content (background):", err));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating avatar customization:", error);
      setEditError(error.message || "Failed to update avatar. Please try again.");
      return { success: false, error: error.message || "Failed to update avatar." };
    } finally {
      setIsUpdatingAvatar(false);
    }
  }, [user, userProfile, onAvatarCustomizationUpdate]);


  const userRecentBanter = useMemo(() => {
    if (!user || !allConfessions || allConfessions.length === 0) return [];
    return allConfessions.filter(post => post.userId === user.uid).slice(0, MAX_RECENT_BANTERS);
  }, [allConfessions, user]);

  if (!user || !userProfile) return null; 

  const currentUserLevel = getBanterLevelInfo(userProfile.points);
  const userDisplayNameForProfile = userProfile.username || userProfile.displayName || user.email?.split('@')[0] || "Banter User";
  const avgReactionsPerBanter = (userProfile.postsAuthoredCount ?? 0) > 0 ? ((userProfile.reactionsReceivedCount ?? 0) / (userProfile.postsAuthoredCount ?? 1)).toFixed(1) : "0.0";
  const wordsmithProgress = WORDSMITH_POST_COUNT_TARGET - (userProfile.postsAuthoredCount || 0);
  const hasWordsmithBadge = userProfile.badges?.includes('wordsmith');
  
  const unlockedPostFlairsList = useMemo(() => {
    return POST_FLAIRS.filter(flairDef => 
      flairDef.unlockAtPoints === 0 || 
      (userProfile.unlockedPostFlairs || []).includes(flairDef.id) ||
      userProfile.points >= flairDef.unlockAtPoints
    ).sort((a,b) => a.unlockAtPoints - b.unlockAtPoints);
  }, [userProfile.unlockedPostFlairs, userProfile.points]);


  return (
    <dialog id="user_profile_modal" className="modal modal-bottom sm:modal-middle" ref={dialogRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div className="modal-box w-11/12 max-w-2xl p-0" initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
            <div className="p-4 sm:p-5 border-b border-base-300 flex justify-between items-start">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <ProfilePhoto
                    currentUser={user}
                    userProfile={userProfile}
                    onUpdateAvatarCustomization={handleAvatarUpdate}
                    size="md" 
                    editable={false} 
                    className="shadow-md"
                    selectedFrameId={userProfile.selectedAvatarFrameId}
                    selectedFlairId={userProfile.selectedAvatarFlairId}
                />
                <div className="flex-1 min-w-0">
                  {isEditingUsername ? (
                    <div className="space-y-1">
                      <div className="join w-full max-w-xs">
                        <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="input input-sm input-bordered join-item flex-grow text-lg font-semibold" placeholder="New Username" disabled={isSavingUsername} aria-label="Edit Username"/>
                        <button onClick={handleSaveUsername} className="btn btn-sm btn-primary join-item" disabled={isSavingUsername}>{isSavingUsername ? <LoadingSpinner size="xs" /> : <i className="fas fa-save"></i>}</button>
                      </div>
                      {editError && editError.includes("username") && <p className="text-error text-xs mt-0.5">{editError}</p>}
                      <button onClick={handleEditUsernameToggle} className="btn btn-xs btn-ghost text-base-content/70" disabled={isSavingUsername}>Cancel</button>
                    </div>
                  ) : (
                    <h3 id={modalTitleId} className="font-bold text-xl sm:text-2xl text-primary leading-tight flex items-center">
                      <span title={userDisplayNameForProfile} className="truncate max-w-[200px] sm:max-w-[300px]">{userDisplayNameForProfile}</span>
                      <button onClick={handleEditUsernameToggle} className="btn btn-xs btn-ghost ml-1.5 text-base-content/60 hover:text-primary" aria-label="Edit username" title="Edit Username"><i className="fas fa-pencil-alt"></i></button>
                    </h3>
                  )}
                  {!isEditingUsername && <p className="text-xs sm:text-sm text-base-content/70">Joined: {new Date(userProfile.createdAt).toLocaleDateString()}</p>}
                </div>
              </div>
              <form method="dialog">
                <button 
                    className="btn btn-sm btn-circle btn-ghost" 
                    aria-label="Close profile modal" 
                    onClick={onClose} 
                    disabled={isSavingUsername || isUpdatingAvatar}>
                        ✕
                </button>
              </form>
            </div>

            <div className="p-4 sm:p-5 max-h-[60vh] sm:max-h-[65vh] overflow-y-auto space-y-4 sm:space-y-5 custom-scrollbar">
              <section>
                <h4 className="divider divider-start text-md sm:text-lg font-semibold text-primary my-0"><i className="fas fa-user-astronaut mr-2 opacity-70"></i>Avatar Customization</h4>
                 {editError && !editError.includes("username") && <p className="text-error text-xs mt-1 text-center">{editError}</p>}
                 <div className="pt-3 flex flex-col items-center">
                    <ProfilePhoto
                        currentUser={user}
                        userProfile={userProfile}
                        onUpdateAvatarCustomization={handleAvatarUpdate}
                        size="lg" 
                        editable={true} // This enables the modal inside ProfilePhoto
                        className="mb-3"
                        selectedFrameId={userProfile.selectedAvatarFrameId}
                        selectedFlairId={userProfile.selectedAvatarFlairId}
                        availableFrames={AVATAR_FRAMES}
                        availableFlairs={AVATAR_FLAIRS}
                        unlockedFrameIds={userProfile.unlockedAvatarFrames}
                        unlockedFlairIds={userProfile.unlockedAvatarFlairs}
                    />
                    {isUpdatingAvatar && <div className="flex items-center text-sm text-secondary"><LoadingSpinner size="sm" className="mr-2"/>Updating your look across B4NTER...</div>}
                 </div>
              </section>

              <section className="p-3 sm:p-4 bg-base-200 shadow">
                 <div className="flex justify-between items-center mb-1.5">
                    <h4 className="text-sm sm:text-base font-semibold text-primary flex items-center"><i className={`${currentUserLevel.icon} mr-2 text-lg sm:text-xl`}></i>{currentUserLevel.name}</h4>
                    <p className="text-sm sm:text-base font-semibold text-accent"><i className="fas fa-star mr-1.5 text-yellow-400"></i>{userProfile.points.toLocaleString()} Banter Points</p>
                </div>
                <LevelProgressBar currentPoints={userProfile.points} currentLevel={currentUserLevel} />
                 {(userProfile.chatStreak && userProfile.chatStreak > 0) && (
                  <div className="mt-2 text-center text-xs text-orange-500 font-medium">
                    <i className="fas fa-fire-alt mr-1"></i> Current Chat Streak: {userProfile.chatStreak} days
                    {userProfile.longestChatStreak && userProfile.longestChatStreak > 0 && ` (Longest: ${userProfile.longestChatStreak} days)`}
                  </div>
                )}
              </section>
              
              <section>
                <h4 className="divider divider-start text-md sm:text-lg font-semibold text-primary my-0"><i className="fas fa-chart-pie mr-2 opacity-70"></i>Activity Snapshot</h4>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm pt-2">
                  {[ {label: "Banter Posted", value: userProfile.postsAuthoredCount || 0}, {label: "Comments Made", value: userProfile.commentsAuthoredCount || 0}, {label: "Reactions Received", value: userProfile.reactionsReceivedCount || 0}, {label: "Avg. Reactions/Banter", value: avgReactionsPerBanter} ].map(stat => (
                    <div key={stat.label} className="stat p-2 bg-base-200 shadow place-items-center">
                      <div className="stat-value text-lg sm:text-xl text-neutral">{stat.value}</div>
                      <div className="stat-desc text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="divider divider-start text-md sm:text-lg font-semibold text-primary my-0"><i className="fas fa-medal mr-2 opacity-70"></i>Achievements & Badges</h4>
                {userProfile && userProfile.points !== undefined && !hasWordsmithBadge && wordsmithProgress > 0 && (<div role="alert" className="alert alert-info text-xs mt-2 py-1 px-2"><i className="fas fa-pen-nib mr-1"></i> {wordsmithProgress} more posts to earn 'Wordsmith'!</div>)}
                {userProfile.badges && userProfile.badges.length > 0 ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {userProfile.badges.map(badgeId => {
                      const badge = BADGE_DEFINITIONS[badgeId];
                      return badge ? (
                        <li key={badgeId} className="flex items-start p-2 sm:p-2.5 bg-base-200 shadow hover:bg-base-300/70 transition-colors">
                          <i className={`${badge.icon} text-xl sm:text-2xl w-8 sm:w-9 text-center mr-2.5 sm:mr-3 mt-0.5`}></i>
                          <div><h5 className="font-semibold text-sm sm:text-base">{badge.name}</h5><p className="text-xs sm:text-sm text-base-content/70">{badge.description}</p></div>
                        </li>
                      ) : null;
                    })}
                  </ul>
                ) : (<p className="text-sm text-base-content/60 py-3 text-center"><i className="fas fa-box-open mr-2 opacity-70"></i>No badges yet. Keep bantering!</p>)}
              </section>

              <section>
                <h4 className="divider divider-start text-md sm:text-lg font-semibold text-primary my-0"><i className="fas fa-flame mr-2 opacity-70"></i>My Post Flairs</h4>
                {unlockedPostFlairsList.length > 0 ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {POST_FLAIRS.map(flairDef => {
                      const isUnlocked = unlockedPostFlairsList.some(unlocked => unlocked.id === flairDef.id);
                      const displayClass = isUnlocked ? "hover:bg-base-300/70" : "opacity-50 cursor-not-allowed";
                      const tooltipText = isUnlocked ? flairDef.description : `Unlock at ${flairDef.unlockAtPoints} Banter Points. ${flairDef.description}`;
                      return (
                        <li key={flairDef.id} className={`flex items-start p-2 sm:p-2.5 bg-base-200 shadow transition-colors ${displayClass}`} title={tooltipText}>
                          <i className={`${flairDef.icon} ${flairDef.iconColorClass} text-xl sm:text-2xl w-8 sm:w-9 text-center mr-2.5 sm:mr-3 mt-0.5`}></i>
                          <div>
                            <h5 className="font-semibold text-sm sm:text-base">{flairDef.name}</h5>
                            <p className="text-xs sm:text-sm text-base-content/70">{flairDef.description}</p>
                            {!isUnlocked && <p className="text-xs text-warning mt-0.5">Unlock at {flairDef.unlockAtPoints} points</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (<p className="text-sm text-base-content/60 py-3 text-center"><i className="fas fa-stream mr-2 opacity-70"></i>No post flairs unlocked yet. Keep bantering!</p>)}
              </section>

              <section>
                <h4 className="divider divider-start text-md sm:text-lg font-semibold text-primary my-0"><i className="fas fa-history mr-2 opacity-70"></i>My Recent Banters</h4>
                {userRecentBanter.length > 0 ? (
                  <ul className="space-y-2 pt-2">
                    {userRecentBanter.map(post => {
                      const title = post.customTitle || post.wittyDisplayName || post.text.substring(0,40) + (post.text.length > 40 ? '...' : '');
                      const totalReactions = Object.values(post.reactionSummary || {}).reduce((acc, val) => acc + (val || 0), 0);
                      return (
                        <li key={post.id} className="p-2 bg-base-200 shadow text-sm hover:bg-base-300/70 transition-colors">
                          <p className="font-medium text-base-content truncate" title={title}>{title}</p>
                          <div className="text-xs text-base-content/60 flex justify-between items-center mt-0.5"><span>{formatRelativeTime(post.createdAt)}</span><div className="flex items-center gap-2"><span><i className="far fa-comment-dots fa-xs mr-0.5"></i>{post.commentCount || 0}</span><span><i className="far fa-heart fa-xs mr-0.5"></i>{totalReactions}</span></div></div>
                        </li>);})}
                  </ul>
                ) : (<p className="text-sm text-base-content/60 py-3 text-center"><i className="fas fa-feather-alt mr-2 opacity-70"></i>No banters posted yet. Go share your wit!</p>)}
              </section>
            </div>
             <div className="modal-action p-3 sm:p-4 border-t border-base-300">
                <button onClick={handleLogoutClick} className="btn btn-outline btn-error btn-sm" aria-label="Logout" disabled={isSavingUsername || isUpdatingAvatar}><i className="fas fa-sign-out-alt mr-1.5"></i>Logout</button>
                <form method="dialog">
                    <button className="btn btn-primary btn-sm" onClick={onClose} disabled={isSavingUsername || isUpdatingAvatar}>
                        Close
                    </button>
                </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
       <form method="dialog" className="modal-backdrop"><button type="button" onClick={onClose}>close</button></form>
    </dialog>
  );
};
