
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Updated import
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; 
// Removed: import { signOut } from 'firebase/auth';
import { auth, db_rtdb } from '../firebase'; 
import { ref, update, serverTimestamp as rtdbServerTimestamp, runTransaction, get } from 'firebase/database'; 
import LoadingSpinner from './LoadingSpinner';
import { UserProfile, NavbarProps as NavbarComponentExternalProps, FirebaseUser } from '../types'; // Changed alias, Added FirebaseUser
import { getBanterLevelInfo, DEFAULT_LEVEL } from '../utils/banterLevels'; 
import { BADGE_DEFINITIONS } from '../utils/badges'; 
import { UserProfileModal } from './UserProfileModal'; 
import ThemeSwitcher from './ThemeSwitcher';
import ProfilePhoto from './ProfilePhoto'; 
import { AVATAR_FRAMES, AVATAR_FLAIRS } from '../utils/avatarDecorations';
import NotificationBell from './notifications/NotificationBell'; // Added

// Extend NavbarComponentExternalProps to include openAuthPage and openChatModal
interface InternalNavbarProps extends Omit<NavbarComponentExternalProps, 'openAuthModal'> { // Renamed interface
  openAuthPage: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
  openChatModal: () => void; 
  openDmModal: () => void; // New prop for opening DM modal
}


const Navbar: React.FC<InternalNavbarProps> = ({ // Use renamed interface
  user, 
  userProfile, 
  isLoading, 
  openAuthPage, 
  openChatModal,
  openDmModal, // New prop
  allConfessions,
  isLoadingConfessions,
  unreadNotificationsCount, 
}) => {
  const navigateHook = useNavigate(); // Updated usage, aliased to avoid conflict
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000); 
    return () => clearInterval(timerId);
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut(); // Use auth object method
      setIsUserProfileModalOpen(false); 
      navigateHook('/'); 
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleUsernameUpdate = useCallback(async (newUsername: string, oldUsername: string) => {
    if (!user || !userProfile) {
      throw new Error("User not logged in or profile not available for username update.");
    }
    
    const newUsernameLower = newUsername.toLowerCase();
    const oldUsernameLower = oldUsername.toLowerCase();

    const newUsernameToUidRef = ref(db_rtdb, `usernameToUid/${newUsernameLower}`);
    const usernameSnapshot = await get(newUsernameToUidRef);
    if (usernameSnapshot.exists() && usernameSnapshot.val() !== user.uid) {
        throw new Error("This username is already taken. Please choose another one.");
    }

    const updates: { [key: string]: any } = {};
    updates[`userProfiles/${user.uid}/username`] = newUsername; 
    updates[`userProfiles/${user.uid}/displayName`] = newUsername; 
    updates[`userProfiles/${user.uid}/lastActivityAt`] = rtdbServerTimestamp();

    if (oldUsernameLower !== newUsernameLower) {
        updates[`usernameToUid/${oldUsernameLower}`] = null; 
        updates[`usernameToUid/${newUsernameLower}`] = user.uid; 
    }
    
    try {
      await update(ref(db_rtdb), updates);
    } catch (error) {
      console.error("Error updating username and index:", error);
      throw new Error("Failed to update username. Please try again.");
    }
  }, [user, userProfile]);
  
  const handleAvatarCustomizationUpdate = useCallback(async (customization: { photoURL?: string; frameId?: string | null; flairId?: string | null }): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not logged in. Cannot update avatar." };
    }
    const userProfileRef = ref(db_rtdb, `userProfiles/${user.uid}`);
    try {
      const updates: Partial<UserProfile> = {};
      if (customization.photoURL !== undefined) updates.photoURL = customization.photoURL;
      if (customization.frameId !== undefined) updates.selectedAvatarFrameId = customization.frameId;
      if (customization.flairId !== undefined) updates.selectedAvatarFlairId = customization.flairId;

      if (Object.keys(updates).length > 0) {
        await update(userProfileRef, updates);
      }
      return { success: true };
    } catch (error) {
      console.error("Error updating avatar customization in Navbar's handler:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update avatar. Please try again.";
      return { success: false, error: errorMessage };
    }
  }, [user]);


  const month = currentDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = currentDate.getDate();
  const year = currentDate.toLocaleDateString('en-US', { year: '2-digit' });

  const userDisplayIdentifier = userProfile?.username || userProfile?.displayName || user?.email?.split('@')[0] || "User";
  const currentUserLevel = userProfile ? getBanterLevelInfo(userProfile.points) : DEFAULT_LEVEL;
  
  const navIsLoading = isLoading;

  return (
    <>
      <div className="navbar bg-base-100 text-base-content shadow-md sticky top-0 z-50 border-b border-base-content/10 print:hidden">
        <div className="navbar-start items-center">
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-ghost lg:hidden" aria-label="Open menu">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[100] p-2 shadow bg-base-200 rounded-box w-64">
              {!navIsLoading && !user && (
                <>
                  <li><Link to="/login" className="w-full text-left justify-start">Login</Link></li> 
                  <li><Link to="/register" className="w-full text-left justify-start">Register</Link></li> 
                </>
              )}
               {user && !navIsLoading && userProfile && (
                  <>
                      <li><Link to="/leaderboards" className="w-full text-left justify-start"><i className="fas fa-trophy mr-2"></i>View Leaderboards</Link></li> 
                      <li><button onClick={openChatModal} className="w-full text-left justify-start"><i className="fas fa-comments mr-2"></i>Global Chat</button></li>
                      <li><button onClick={openDmModal} className="w-full text-left justify-start"><i className="fas fa-paper-plane mr-2"></i>Messages</button></li>
                      <li><button onClick={() => setIsUserProfileModalOpen(true)} className="w-full text-left justify-start"><i className="fas fa-edit mr-2"></i>Edit Profile</button></li>
                      {userProfile.isAdmin && (
                        <li><Link to="/admin" className="w-full text-left justify-start"><i className="fas fa-user-shield mr-2"></i>Admin Panel</Link></li>
                      )}
                      <li className="menu-title pt-2">
                          <span className="text-xs text-primary flex items-center">
                              <i className={`${currentUserLevel.icon} mr-1.5`}></i>
                              {currentUserLevel.name}
                          </span>
                      </li>
                      <li className="px-4 py-1 text-xs">
                          <i className="fas fa-star mr-1.5 text-yellow-400"></i>{userProfile.points} Banter Points
                      </li>
                      {userProfile.badges && userProfile.badges.length > 0 && (
                          <>
                          <li className="menu-title text-xs"><span>Badges:</span></li>
                          {userProfile.badges.map(badgeId => {
                              const badge = BADGE_DEFINITIONS[badgeId];
                              return badge ? (
                              <li key={badgeId} className="text-xs" title={badge.description}>
                                  <span className="flex items-center"><i className={`${badge.icon} mr-1.5 w-3 text-center`}></i>{badge.name}</span>
                              </li>
                              ) : null;
                          })}
                          </>
                      )}
                  </>
              )}
              {!(user && !navIsLoading && userProfile) && ( 
                <>
                  <li><Link to="/leaderboards" className="w-full text-left justify-start"><i className="fas fa-trophy mr-2"></i>Leaderboards</Link></li> 
                  <li><button onClick={openChatModal} className="w-full text-left justify-start"><i className="fas fa-comments mr-2"></i>Global Chat</button></li>
                </>
              )}
              <li><ThemeSwitcher isMobile={true} currentUser={user} /></li> 
              {user && !navIsLoading && (
                <li><button onClick={handleLogout} className="btn btn-ghost btn-sm w-full text-left justify-start text-error hover:bg-error hover:text-error-content"><i className="fas fa-sign-out-alt mr-2"></i>Logout</button></li>
              )}
            </ul>
          </div>
          <Link 
            to="/"
            className="btn btn-ghost text-2xl lg:text-3xl font-bold text-primary normal-case focus:bg-transparent hover:bg-transparent px-2 sm:px-3"
            aria-label="B4NTER Homepage"
          >
            B4NTER
          </Link>
        </div>

        <div className="navbar-center hidden lg:flex">
           <Link to="/leaderboards" className="btn btn-ghost btn-sm"><i className="fas fa-trophy mr-1.5"></i>Leaderboards</Link> 
           <button onClick={openChatModal} className="btn btn-ghost btn-sm"><i className="fas fa-comments mr-1.5"></i>Global Chat</button>
           {user && <button onClick={openDmModal} className="btn btn-ghost btn-sm"><i className="fas fa-paper-plane mr-1.5"></i>Messages</button>}
           {user && userProfile?.isAdmin && <Link to="/admin" className="btn btn-ghost btn-sm"><i className="fas fa-user-shield mr-1.5"></i>Admin Panel</Link>}
        </div>

        <div className="navbar-end flex items-center space-x-1 sm:space-x-2">
          <div className="hidden sm:flex items-baseline space-x-0.5 sm:space-x-1" aria-label={`Current date: ${month} ${day}, ${year}`}>
            <span className="font-bold text-lg sm:text-xl text-base-content/80 uppercase tracking-wide">{month}</span>
            <div className="badge badge-primary badge-md sm:badge-lg font-bold shadow-sm">{day}</div>
            <div className="badge badge-accent badge-md sm:badge-lg font-bold shadow-sm">{year}</div>
          </div>
          
          {user && !isLoading && <NotificationBell currentUser={user} unreadCount={unreadNotificationsCount || 0} />}

          <div className="hidden md:block"><ThemeSwitcher currentUser={user} /></div>

          {navIsLoading ? (
            <div className="pl-1 sm:pl-2"> 
              <LoadingSpinner size="sm" />
            </div>
          ) : user && userProfile ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-sm md:btn-md rounded-btn flex items-center space-x-1 normal-case px-2 md:px-3" aria-label="Open user profile menu">
                <div className="hidden sm:inline-flex mr-1">
                    <ProfilePhoto
                        currentUser={user}
                        userProfile={userProfile}
                        onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})} 
                        size="sm"
                        editable={false}
                        selectedFrameId={userProfile.selectedAvatarFrameId}
                        selectedFlairId={userProfile.selectedAvatarFlairId} 
                    />
                </div>
                <span className="text-xs sm:text-sm truncate max-w-[70px] md:max-w-[100px]" title={userDisplayIdentifier}>
                  {userDisplayIdentifier}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </label>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[100] p-2 shadow bg-base-200 rounded-box w-56">
                <li className="menu-title"><span>{userDisplayIdentifier}</span></li>
                <li><Link to="/leaderboards"><i className="fas fa-trophy mr-2"></i>Leaderboards</Link></li> 
                <li><button onClick={openChatModal}><i className="fas fa-comments mr-2"></i>Global Chat</button></li>
                <li><button onClick={openDmModal}><i className="fas fa-paper-plane mr-2"></i>Messages</button></li>
                <li><button onClick={() => setIsUserProfileModalOpen(true)}><i className="fas fa-edit mr-2"></i>Edit Profile</button></li>
                {userProfile.isAdmin && (
                  <li><Link to="/admin"><i className="fas fa-user-shield mr-2"></i>Admin Panel</Link></li>
                )}
                <li className="lg:hidden"><ThemeSwitcher isMobile={true} currentUser={user} /></li>
                <li><button onClick={handleLogout} className="text-error hover:bg-error hover:text-error-content"><i className="fas fa-sign-out-alt mr-2"></i>Logout</button></li>
              </ul>
            </div>
          ) : (
            <div className="hidden sm:flex gap-2">
              <Link to="/login" className="btn btn-outline btn-sm">Login</Link> 
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </div>
          )}
        </div>
      </div>
      {isUserProfileModalOpen && user && userProfile && (
        <UserProfileModal 
          isOpen={isUserProfileModalOpen} 
          onClose={() => setIsUserProfileModalOpen(false)}
          user={user}
          userProfile={userProfile}
          onLogout={handleLogout}
          allConfessions={allConfessions}
          onUsernameUpdate={handleUsernameUpdate}
          onAvatarCustomizationUpdate={handleAvatarCustomizationUpdate}
        />
      )}
    </>
  );
};

export default Navbar;