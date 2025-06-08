


import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'; // Updated import
import { AnimatePresence, motion } from 'framer-motion';
import { ref, onValue, Unsubscribe as RTDBUnsubscribe, query as rtdbQuery, orderByChild, DataSnapshot, runTransaction, update, get } from 'firebase/database'; 

import { auth, db_rtdb } from './firebase';
import HomePage from './pages/HomePage';
import UserProfilePage from './pages/UserProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage'; // Added AdminPage import
import LoginPage from './pages/LoginPage'; 
import RegisterPage from './pages/RegisterPage'; 
import LandingPage from './pages/LandingPage'; 
// Removed: import DirectMessagesPage from './pages/DirectMessagesPage'; 
import DirectMessagesModal from './components/DirectMessagesModal'; // Added DM Modal
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import CommentModal from './components/CommentModal';
import ReadMoreModal from './components/ReadMoreModal';
import ChatModal from './components/ChatModal'; 
import AuthorProfileModal from './components/AuthorProfileModal'; // Added AuthorProfileModal
import { UserProfile, ConfessionPost, FirebaseUser, ReactionType, BadgeId } from './types'; // Added ReactionType, BadgeId
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { generateDefaultDicebear7xAvatarUrl, checkAndUnlockAvatarItemsIfNeeded, checkAndUnlockPostFlairsIfNeeded, awardPoints, ensureBadgeAwarded, awardTrendingMilestone, clearExpiredTempBan } from './utils/firebaseUtils'; 
import { getUTCDateString } from './utils/dateUtils'; 
import PostCardSkeleton from './components/skeletons/PostCardSkeleton';
import UserProfilePageSkeleton from './components/skeletons/UserProfilePageSkeleton';
import LeaderboardPageSkeleton from './components/skeletons/LeaderboardPageSkeleton';
import HomePageSkeleton from './components/skeletons/HomePageSkeleton'; 
import { createNotification } from './utils/notificationUtils'; // Added

const pageVariants = {
  initial: { opacity: 0, y: 15, scale: 0.995 }, 
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -15, scale: 0.995 } 
};

const pageTransition = { type: "tween", ease: "anticipate", duration: 0.4 }; 
const NEW_USER_PROFILE_GRACE_PERIOD_MS = 5000; 

const wittyLoadingMessages = [
  "Brewing Banter...", "Warming up the Wit Engines...", "Polishing Punchlines...",
  "Summoning the Sass...", "Charging Chuckle Capacitors...", "Assembling Awesomeness...",
  "Generating Giggles...", "Tuning the Tomfoolery...", "Unleashing the LOLs...",
  "Crafting Chuckles..."
];

const RouteLoadingIndicator: React.FC<{ type: 'fullScreen' | 'pageArea'; children?: React.ReactNode }> = ({ type, children }) => {
  const [message, setMessage] = useState(wittyLoadingMessages[0]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type === 'fullScreen') {
      const intervalId = setInterval(() => {
        setVisible(false); 
        setTimeout(() => {
          setMessage(wittyLoadingMessages[Math.floor(Math.random() * wittyLoadingMessages.length)]);
          setVisible(true); 
        }, 300); 
      }, 2800); 
      return () => clearInterval(intervalId);
    }
  }, [type]);

  if (type === 'fullScreen') {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen animated-gradient-bg text-neutral-content p-4">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.1 }}>
          <LoadingSpinner size="lg" className="!w-20 !h-20 text-white opacity-90" /> 
        </motion.div>
        <AnimatePresence mode="wait">
          {visible && (
            <motion.p key={message} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15, transition: {duration: 0.2} }} transition={{ duration: 0.3, ease: "circOut" }} className="mt-6 text-xl font-medium text-shadow-md tracking-wide">
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
  if (children) return <>{children}</>;
  return <div className="flex justify-center items-center h-[calc(100vh-150px)]"><LoadingSpinner size="lg" /></div>;
};

const AppContentInternal = (): JSX.Element => {
  // Removed Firebase initialization check as config is now hardcoded
  // If Firebase fails for other reasons (e.g. invalid config), app might not work as expected.

  const location = useLocation(); 
  const navigateHook = useNavigate(); 
  const { theme: currentGlobalTheme, applyTheme } = useTheme(); 

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null); 
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); 
  
  const [allConfessions, setAllConfessions] = useState<ConfessionPost[]>([]);
  const [isLoadingConfessions, setIsLoadingConfessions] = useState(true); 
  const [allUserProfiles, setAllUserProfiles] = useState<UserProfile[]>([]);
  const [isLoadingUserProfiles, setIsLoadingUserProfiles] = useState(true); 
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isDmModalOpen, setIsDmModalOpen] = useState(false); // State for DM Modal
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // State for AuthorProfileModal (shared across pages)
  const [selectedAuthorProfileForModal, setSelectedAuthorProfileForModal] = useState<UserProfile | null>(null);
  const [isAuthorProfileModalOpen, setIsAuthorProfileModalOpen] = useState(false);
  const [isLoadingAuthorProfile, setIsLoadingAuthorProfile] = useState(false);
  

  // Listener for unread notifications count
  useEffect(() => {
    let unsubscribe: RTDBUnsubscribe | null = null;
    if (currentUser) {
      const unreadCountRef = ref(db_rtdb, `userProfiles/${currentUser.uid}/unreadNotificationsCount`);
      unsubscribe = onValue(unreadCountRef, (snapshot) => {
        setUnreadNotificationsCount(snapshot.val() || 0);
      });
    } else {
      setUnreadNotificationsCount(0);
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [currentUser]);


  useEffect(() => {
    if (currentUser && userProfile) {
      if (userProfile.selectedTheme && userProfile.selectedTheme !== currentGlobalTheme) {
        applyTheme(userProfile.selectedTheme, currentUser.uid);
      } else if (!userProfile.selectedTheme) {
        const localTheme = localStorage.getItem('selectedTheme');
        if (localTheme && localTheme !== currentGlobalTheme) {
          applyTheme(localTheme, currentUser.uid); // Apply and save to DB
        } else if (localTheme) { // Local theme matches global, ensure it's in DB
          const userProfileUpdatesRef = ref(db_rtdb, `userProfiles/${currentUser.uid}`);
          update(userProfileUpdatesRef, { selectedTheme: localTheme }).catch(err => console.error("Error promoting local theme to DB:", err));
        }
      }
    } else if (!currentUser) {
      const localTheme = localStorage.getItem('selectedTheme') || 'lemonade'; 
      if (localTheme !== currentGlobalTheme) applyTheme(localTheme); 
    }
  }, [currentUser, userProfile, currentGlobalTheme, applyTheme]);
  
  useEffect(() => {
    let unsubscribe: RTDBUnsubscribe | null = null;
    if (currentUser) {
      setIsLoadingConfessions(true);
      const confessionsRef = rtdbQuery(ref(db_rtdb, 'confessions'), orderByChild('createdAt'));
      unsubscribe = onValue(confessionsRef, (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        const postsArray: ConfessionPost[] = data ? Object.keys(data).map(key => ({
          id: key, ...data[key], customTitle: data[key].customTitle || undefined,
          reactions: data[key].reactions || {}, reactionSummary: data[key].reactionSummary || {},
          likesCount: data[key].reactionSummary?.like !== undefined ? data[key].reactionSummary.like : (data[key].likesCount || 0),
          commentCount: data[key].commentCount || 0, tags: data[key].tags || [],
          wittyDisplayName: data[key].wittyDisplayName || undefined, comments: data[key].comments || {},
          authorLevelName: data[key].authorLevelName || undefined, authorBadges: data[key].authorBadges || [],
          authorPhotoURL: data[key].authorPhotoURL || undefined,
          imageUrl: data[key].imageUrl || undefined,
          authorSelectedFrameId: data[key].authorSelectedFrameId || null, 
          authorSelectedFlairId: data[key].authorSelectedFlairId || null,
          selectedPostFlairId: data[key].selectedPostFlairId || null, 
          wishesGrantedBy: data[key].wishesGrantedBy || {},
          starPowerBoost: data[key].starPowerBoost || undefined,
          hasBeenInTop5: data[key].hasBeenInTop5 || false,
          hasBeenSupernova: data[key].hasBeenSupernova || false,
          firstReachedSupernovaAt: data[key].firstReachedSupernovaAt || null,
        })).sort((a, b) => b.createdAt - a.createdAt) : [];
        setAllConfessions(postsArray);
        setIsLoadingConfessions(false);
      }, (error) => { console.error("Error fetching confessions:", error); setAllConfessions([]); setIsLoadingConfessions(false); });
    } else {
      setAllConfessions([]); setIsLoadingConfessions(false); 
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [currentUser]); 

  useEffect(() => {
    let unsubscribe: RTDBUnsubscribe | null = null;
    // Fetch all user profiles if a user is logged in, or for specific pages like Leaderboard even if not logged in.
    // For simplicity, let's assume we load them if currentUser exists or if on leaderboard page.
    // A more sophisticated approach might load them on demand.
    // if (currentUser || location.pathname === '/leaderboards') { // Simpler: always load if app is used beyond landing.
      setIsLoadingUserProfiles(true);
      const userProfilesRef = ref(db_rtdb, 'userProfiles');
      unsubscribe = onValue(userProfilesRef, (snapshot: DataSnapshot) => {
          const data = snapshot.val();
          const profilesArray: UserProfile[] = data ? Object.keys(data).map(uid => ({ 
            uid, 
            ...data[uid],
            // Ensure friend related fields are initialized if not present
            friends: data[uid].friends || {},
            friendRequestsSent: data[uid].friendRequestsSent || {},
            friendRequestsReceived: data[uid].friendRequestsReceived || {},
            unreadFriendRequestCount: data[uid].unreadFriendRequestCount || 0,
            isAdmin: data[uid].isAdmin || false,
            isBanned: data[uid].isBanned || false,
            banReason: data[uid].banReason || undefined,
            tempBanUntil: data[uid].tempBanUntil || undefined,
            tempBanReason: data[uid].tempBanReason || undefined,
          })) : [];
          setAllUserProfiles(profilesArray);
          setIsLoadingUserProfiles(false);
      }, (error) => { console.error("Error fetching all user profiles:", error); setAllUserProfiles([]); setIsLoadingUserProfiles(false); });
    // } else {
    //   setAllUserProfiles([]); setIsLoadingUserProfiles(false); 
    //   if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    // }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [currentUser]); // Rerun if currentUser changes, so profiles are loaded after login.

  useEffect(() => {
    setIsLoadingAuth(true);
    let profileListenerUnsubscribe: RTDBUnsubscribe | null = null;
    const authStateUnsubscribe = auth.onAuthStateChanged((user) => { 
      if (profileListenerUnsubscribe) profileListenerUnsubscribe();
      setUserProfile(null); 
      if (user) {
        setCurrentUser(user);
        const userProfileRef = ref(db_rtdb, `userProfiles/${user.uid}`);
        profileListenerUnsubscribe = onValue(userProfileRef, (snapshot) => {
          if (snapshot.exists()) {
            const profileDataFromDB = snapshot.val();
            const todayUTC = getUTCDateString();
            const profileData: UserProfile = { 
                uid: user.uid, username: profileDataFromDB.username, displayName: profileDataFromDB.displayName,
                points: profileDataFromDB.points || 0, createdAt: profileDataFromDB.createdAt || Date.now(),
                lastActivityAt: profileDataFromDB.lastActivityAt || Date.now(), photoURL: profileDataFromDB.photoURL,
                selectedTheme: profileDataFromDB.selectedTheme || undefined, 
                selectedAvatarFrameId: profileDataFromDB.selectedAvatarFrameId === undefined ? 'none' : profileDataFromDB.selectedAvatarFrameId,
                selectedAvatarFlairId: profileDataFromDB.selectedAvatarFlairId === undefined ? 'none' : profileDataFromDB.selectedAvatarFlairId,
                unlockedAvatarFrames: profileDataFromDB.unlockedAvatarFrames || ['none'],
                unlockedAvatarFlairs: profileDataFromDB.unlockedAvatarFlairs || ['none'],
                unlockedPostFlairs: profileDataFromDB.unlockedPostFlairs || [], 
                badges: profileDataFromDB.badges || [],
                postsAuthoredCount: profileDataFromDB.postsAuthoredCount || 0,
                commentsAuthoredCount: profileDataFromDB.commentsAuthoredCount || 0,
                reactionsReceivedCount: profileDataFromDB.reactionsReceivedCount || 0,
                chatStreak: profileDataFromDB.chatStreak || 0,
                longestChatStreak: profileDataFromDB.longestChatStreak || 0,
                lastChatActivityDate: profileDataFromDB.lastChatActivityDate || '',
                dailyMessageCount: profileDataFromDB.lastDailyMessageCountResetDate === todayUTC ? (profileDataFromDB.dailyMessageCount || 0) : 0,
                lastDailyMessageCountResetDate: profileDataFromDB.lastDailyMessageCountResetDate || '',
                awardedDailyMessageMilestones: profileDataFromDB.awardedDailyMessageMilestones || {},
                awardedStreakMilestones: profileDataFromDB.awardedStreakMilestones || { '3day': false, '7day': false, '30day': false },
                unreadNotificationsCount: profileDataFromDB.unreadNotificationsCount || 0,
                // Friend system fields
                friends: profileDataFromDB.friends || {},
                friendRequestsSent: profileDataFromDB.friendRequestsSent || {},
                friendRequestsReceived: profileDataFromDB.friendRequestsReceived || {},
                unreadFriendRequestCount: profileDataFromDB.unreadFriendRequestCount || 0,
                isAdmin: profileDataFromDB.isAdmin || false,
                isBanned: profileDataFromDB.isBanned || false,
                banReason: profileDataFromDB.banReason || undefined,
                tempBanUntil: profileDataFromDB.tempBanUntil || undefined,
                tempBanReason: profileDataFromDB.tempBanReason || undefined,
            };
            if (profileData.username) { if (profileData.displayName !== profileData.username) profileData.displayName = profileData.username; }
            else if (profileData.displayName) profileData.username = profileData.displayName.replace(/\s+/g, '_').toLowerCase();
            else { const p = user.email?.split('@')[0] || 'AnonB'; profileData.username = p.replace(/\s+/g, '_').toLowerCase(); profileData.displayName = p; }
            if (!profileData.photoURL) profileData.photoURL = generateDefaultDicebear7xAvatarUrl(profileData.username || user.uid);
            if (profileData.lastDailyMessageCountResetDate !== todayUTC) profileData.dailyMessageCount = 0;
            if (!profileData.awardedDailyMessageMilestones![todayUTC]) profileData.awardedDailyMessageMilestones![todayUTC] = { '5': false, '15': false, '30': false };
            
            setUserProfile(profileData);

            // Check for expired temporary ban
            if (profileData.tempBanUntil && profileData.tempBanUntil <= Date.now()) {
              clearExpiredTempBan(user.uid)
                .then(() => console.log(`Expired temp ban cleared for ${user.uid} by App.tsx`))
                .catch(err => console.error(`Error clearing expired temp ban in App.tsx for ${user.uid}:`, err));
              // The profile listener will pick up the change from clearExpiredTempBan
            }

          } else {
            const cT = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
            const lST = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0;
            const isNew = (lST - cT) < NEW_USER_PROFILE_GRACE_PERIOD_MS;
            console.warn(`User profile for ${isNew ? 'NEW' : 'EXISTING'} user ${user.uid} not found. RegisterPage or awardPoints should create it.`);
            setUserProfile(null); 
          }
          setIsLoadingAuth(false); 
        }, (error) => { console.error("Firebase onValue error (user profile):", error); setUserProfile(null); setIsLoadingAuth(false); });
      } else { setCurrentUser(null); setUserProfile(null); setIsLoadingAuth(false); }
    });
    return () => { authStateUnsubscribe(); if (profileListenerUnsubscribe) profileListenerUnsubscribe(); };
  }, []); 

  useEffect(() => {
    if (currentUser && userProfile && typeof userProfile.points === 'number') { 
      checkAndUnlockAvatarItemsIfNeeded(currentUser.uid, userProfile.points, userProfile.unlockedAvatarFrames, userProfile.unlockedAvatarFlairs);
      checkAndUnlockPostFlairsIfNeeded(currentUser.uid, userProfile.points, userProfile.unlockedPostFlairs);
    }
  }, [currentUser, userProfile?.points, userProfile?.unlockedAvatarFrames, userProfile?.unlockedAvatarFlairs, userProfile?.unlockedPostFlairs]);

  const openAuthPage = useCallback((type: 'login' | 'register', message?: string, redirectPath: string = '/') => {
    setIsChatModalOpen(false); 
    setIsDmModalOpen(false); 
    const path = type === 'login' ? '/login' : '/register';
    navigateHook(path, { state: { message: message || null, redirectPath } });
  }, [navigateHook]);

  const openChatModal = useCallback(() => {
    if (currentUser && userProfile) setIsChatModalOpen(true);
    else openAuthPage('login', "Please log in to access Global Chat.", location.pathname + location.search);
  }, [currentUser, userProfile, openAuthPage, location.pathname, location.search]);
  const closeChatModal = useCallback(() => setIsChatModalOpen(false), []);

  const openDmModal = useCallback(() => {
    if (currentUser && userProfile) setIsDmModalOpen(true);
    else openAuthPage('login', "Please log in to view Direct Messages.", location.pathname + location.search);
  }, [currentUser, userProfile, openAuthPage, location.pathname, location.search]);
  const closeDmModal = useCallback(() => setIsDmModalOpen(false), []);


  const isLoadingDataForLoggedInUser = !!currentUser && (isLoadingConfessions || isLoadingUserProfiles);

  const [selectedPostForCommentModal, setSelectedPostForCommentModal] = useState<ConfessionPost | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPostForReadMoreModal, setSelectedPostForReadMoreModal] = useState<ConfessionPost | null>(null);
  const [isReadMoreModalOpen, setIsReadMoreModalOpen] = useState(false);

  const handleOpenCommentModalForPage = useCallback((post: ConfessionPost) => { setSelectedPostForReadMoreModal(null); setIsReadMoreModalOpen(false); setSelectedPostForCommentModal(post); setIsCommentModalOpen(true); }, []);
  const handleCloseCommentModalForPage = useCallback(() => { setIsCommentModalOpen(false); setSelectedPostForCommentModal(null); }, []);
  const handleOpenReadMoreModalForPage = useCallback((post: ConfessionPost) => { setSelectedPostForReadMoreModal(post); setIsReadMoreModalOpen(true); }, []);
  
  const handleOpenAuthorProfileModal = useCallback((authorUsername: string, targetProfileData?: UserProfile | null) => {
    if (!currentUser && !targetProfileData) {
      openAuthPage('login', "Log in to view profiles.", window.location.hash.substring(1) || '/');
      return;
    }
    if (targetProfileData) {
      setSelectedAuthorProfileForModal(targetProfileData);
      setIsLoadingAuthorProfile(false);
    } else if (authorUsername) {
      const profileFromList = allUserProfiles.find(p => p.username === authorUsername);
      if (profileFromList) {
        setSelectedAuthorProfileForModal(profileFromList);
        setIsLoadingAuthorProfile(false);
      } else {
        setIsLoadingAuthorProfile(true);
        // Implement fetching profile by username if not in allUserProfiles (e.g., directly from DB)
        // For now, assume it will be in allUserProfiles or handle loading state appropriately.
        // This path might need more robust fetching if allUserProfiles is not guaranteed to be complete.
        console.warn(`Profile for ${authorUsername} not found in preloaded list. Consider fetching.`);
        setSelectedAuthorProfileForModal(null); // Or keep old one while loading
      }
    }
    setIsAuthorProfileModalOpen(true);
  }, [currentUser, openAuthPage, allUserProfiles]);

  const handleCloseAuthorProfileModal = useCallback(() => {
    setIsAuthorProfileModalOpen(false);
    setSelectedAuthorProfileForModal(null);
    setIsLoadingAuthorProfile(false);
  }, []);


  const handleReactToPostForPage = useCallback(async (postId: string, reactionType: ReactionType, postAuthorId: string) => {
    if (!currentUser || !userProfile) { openAuthPage('login', "Log in to react!", window.location.hash.substring(1) || '/'); return; }
    const postRef = ref(db_rtdb, `confessions/${postId}`);
    await runTransaction(postRef, (post: ConfessionPost | null) => { 
        if (post) {
            if (!post.reactions) post.reactions = {};
            if (!post.reactionSummary) post.reactionSummary = {};
            const currentReaction = post.reactions[currentUser.uid];
            if (currentReaction === reactionType) { 
                delete post.reactions[currentUser.uid];
                post.reactionSummary[reactionType] = (post.reactionSummary[reactionType] || 1) - 1;
            } else { 
                if (currentReaction) post.reactionSummary[currentReaction] = (post.reactionSummary[currentReaction] || 1) - 1;
                post.reactions[currentUser.uid] = reactionType;
                post.reactionSummary[reactionType] = (post.reactionSummary[reactionType] || 0) + 1;
            }
            Object.keys(post.reactionSummary).forEach(key => { if (post.reactionSummary![key as ReactionType]! < 0) post.reactionSummary![key as ReactionType] = 0; });
        }
        return post; 
    });
    if (postAuthorId !== currentUser.uid) {
      const postSnapshot = await get(postRef);
      const postData = postSnapshot.val() as ConfessionPost | null;
      if (postData && userProfile) {
        const messageText = postData.customTitle || postData.text;
        const truncatedMessage = messageText.substring(0, 20) + (messageText.length > 20 ? "..." : "");
        createNotification(
          postAuthorId, 'reaction_post', currentUser.uid, userProfile.username,
          postId, `${userProfile.username} reacted to your post: "${truncatedMessage}".`,
          `/?postId=${postId}`, userProfile.photoURL
        ).catch(err => console.error("Error creating reaction notification:", err));
      }
    }
  }, [currentUser, userProfile, openAuthPage]);

  const handlePostCommentForPage = useCallback(async (postId: string, commentText: string, parentId?: string, parentCommentUserId?: string, originalPostTimestamp?: number) => {
     if (!currentUser || !userProfile || !selectedPostForCommentModal) {
       openAuthPage('login', "Log in to comment.", window.location.hash.substring(1) || '/');
       throw new Error("User not logged in or post not selected.");
     }
     const postAuthorId = selectedPostForCommentModal.userId;
     const postTitleSnippet = selectedPostForCommentModal.customTitle || selectedPostForCommentModal.text.substring(0,20) + (selectedPostForCommentModal.text.length > 20 ? "..." : "");

     if (parentId && parentCommentUserId && parentCommentUserId !== currentUser.uid) {
         createNotification(
            parentCommentUserId, 'reply_comment', currentUser.uid, userProfile.username, parentId,
            `${userProfile.username} replied to your comment on "${postTitleSnippet}"`,
            `/?postId=${postId}&commentId=${parentId}`, userProfile.photoURL, postId
        ).catch(err => console.error("Error creating comment reply notification:", err));
     } else if (!parentId && postAuthorId !== currentUser.uid) {
         createNotification(
            postAuthorId, 'reply_post', currentUser.uid, userProfile.username, postId,
            `${userProfile.username} commented on your post: "${postTitleSnippet}"`,
            `/?postId=${postId}&commentId=${selectedPostForCommentModal.comments ? Object.keys(selectedPostForCommentModal.comments).pop() : 'new'}`, userProfile.photoURL
        ).catch(err => console.error("Error creating post comment notification:", err));
     }
     console.log(`Comment by ${userProfile.username} on post ${postId} (via App.tsx handler): "${commentText}" ${parentId ? `(reply to ${parentId})` : ''}`);
  }, [currentUser, userProfile, openAuthPage, selectedPostForCommentModal]);


  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isLandingPage = location.pathname === '/' && !currentUser && !isLoadingAuth;
  
  let mainContainerClass = "flex-grow";
  if (!isAuthPage && !isLandingPage) mainContainerClass += " container mx-auto px-0 sm:px-2 py-0 sm:py-1";

  return (
    <div className={`min-h-screen flex flex-col text-base-content font-sans transition-colors duration-300 ${isLandingPage ? 'bg-transparent' : 'bg-base-200'}`}>
      {!isAuthPage && !isLandingPage && <Navbar user={currentUser} userProfile={userProfile} isLoading={isLoadingAuth} openAuthPage={openAuthPage} allConfessions={allConfessions} isLoadingConfessions={isLoadingDataForLoggedInUser} openChatModal={openChatModal} openDmModal={openDmModal} unreadNotificationsCount={unreadNotificationsCount} />}
      
      <main className={mainContainerClass}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={ currentUser ? <Navigate to="/" replace /> : <LoginPage /> } />
            <Route path="/register" element={ currentUser ? <Navigate to="/" replace /> : <RegisterPage /> } />
            
            <Route path="/" element={
              isLoadingAuth ? <RouteLoadingIndicator type="fullScreen" /> : 
              currentUser ? ( 
                isLoadingDataForLoggedInUser ? <RouteLoadingIndicator type="pageArea"><HomePageSkeleton /></RouteLoadingIndicator> : (
                  <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
                    <HomePage 
                        openAuthPage={openAuthPage} 
                        currentUser={currentUser} 
                        userProfile={userProfile} 
                        allConfessions={allConfessions} 
                        isLoadingConfessions={isLoadingConfessions}
                        allUserProfiles={allUserProfiles}
                        isLoadingUserProfiles={isLoadingUserProfiles}
                    />
                  </motion.div> 
                )
              ) : ( <LandingPage /> ) 
            } />

            <Route path="/user/:username" element={ 
              isLoadingAuth || (currentUser && (isLoadingUserProfiles || isLoadingConfessions)) ? <RouteLoadingIndicator type="pageArea"><UserProfilePageSkeleton /></RouteLoadingIndicator> : (
                <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
                  <UserProfilePage allConfessions={allConfessions} userProfiles={allUserProfiles} isLoadingUserProfiles={isLoadingUserProfiles} openAuthPage={openAuthPage} currentUser={currentUser} userProfile={userProfile} onReact={handleReactToPostForPage} onOpenCommentModal={handleOpenCommentModalForPage} onOpenReadMoreModal={handleOpenReadMoreModalForPage} onTagClick={(tag) => navigateHook(`/?tag=${tag}`)} onOpenAuthorProfileModal={handleOpenAuthorProfileModal} />
                </motion.div> 
              )
            } />
            <Route path="/leaderboards" element={ 
              isLoadingAuth || (currentUser && isLoadingUserProfiles) ? <RouteLoadingIndicator type="pageArea"><LeaderboardPageSkeleton /></RouteLoadingIndicator> : (
                <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
                  <LeaderboardPage currentUser={currentUser} userProfile={userProfile} allUserProfiles={allUserProfiles} isLoadingUserProfiles={isLoadingUserProfiles} />
                </motion.div> 
              )
            } />
            <Route path="/admin" element={
              isLoadingAuth ? <RouteLoadingIndicator type="fullScreen" /> :
              (userProfile?.isAdmin) ? (
                <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
                  <AdminPage 
                    currentUser={currentUser} 
                    loggedInUserProfile={userProfile}
                    allUserProfiles={allUserProfiles}
                    allConfessions={allConfessions}
                    isLoadingUserProfiles={isLoadingUserProfiles}
                    isLoadingConfessions={isLoadingConfessions}
                  />
                </motion.div>
              ) : (
                <Navigate to="/" replace />
              )
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {isChatModalOpen && currentUser && userProfile && <ChatModal isOpen={isChatModalOpen} onClose={closeChatModal} currentUser={currentUser} userProfile={userProfile} openAuthPage={openAuthPage} />}
        {isDmModalOpen && currentUser && userProfile && <DirectMessagesModal isOpen={isDmModalOpen} onClose={closeDmModal} currentUser={currentUser} currentUserProfile={userProfile} allUserProfiles={allUserProfiles} openAuthPage={openAuthPage} />}
        {isCommentModalOpen && selectedPostForCommentModal && currentUser && userProfile && <CommentModal isOpen={isCommentModalOpen} onClose={handleCloseCommentModalForPage} post={selectedPostForCommentModal} currentUser={currentUser} userProfile={userProfile} onSubmitComment={handlePostCommentForPage} openAuthModal={openAuthPage} />}
        {isReadMoreModalOpen && selectedPostForReadMoreModal && <ReadMoreModal isOpen={isReadMoreModalOpen} onClose={() => setIsReadMoreModalOpen(false)} post={selectedPostForReadMoreModal} currentUser={currentUser} userProfile={userProfile} onOpenComments={handleOpenCommentModalForPage} onReact={handleReactToPostForPage} openAuthModal={openAuthPage} onTagClickOnFeed={(tag) => navigateHook(`/?tag=${tag}`)} />}
        {isAuthorProfileModalOpen && (<AuthorProfileModal isOpen={isAuthorProfileModalOpen} onClose={handleCloseAuthorProfileModal} authorProfile={selectedAuthorProfileForModal} allConfessions={allConfessions} isLoading={isLoadingAuthorProfile} />)}
      </AnimatePresence>
      {!isAuthPage && !isLandingPage && (
        <footer className="footer footer-center p-4 bg-base-300 text-base-content border-t border-base-content/10 text-sm">
          <div><p>Copyright © {new Date().getFullYear()} - B4NTER. Keep the Banter Flowing!</p><p>Current Theme: <span className="badge badge-ghost">{currentGlobalTheme}</span></p></div>
        </footer>
      )}
    </div>
  );
};

const App: React.FC = () => ( <ThemeProvider><HashRouter><AppContentInternal /></HashRouter></ThemeProvider> );
export default App;
