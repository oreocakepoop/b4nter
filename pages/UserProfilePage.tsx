import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ref, get } from 'firebase/database';
import { db_rtdb } from '../firebase';
import { UserProfile, ConfessionPost, Comment, UserProfilePageProps as UserProfilePagePropsType, BadgeId } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfilePhoto from '../components/ProfilePhoto';
import { getBanterLevelInfo } from '../utils/banterLevels';
import LevelProgressBar from '../components/LevelProgressBar';
import { BADGE_DEFINITIONS } from '../utils/badges';
import PostCard from '../components/PostCard';
import { formatRelativeTime } from '../utils/dateUtils';
import UserHoverTooltip from '../components/UserHoverTooltip'; // Added for potential future use here

const ITEMS_PER_PAGE = 5;

const UserProfilePage: React.FC<UserProfilePagePropsType> = ({
  allConfessions,
  userProfiles, // Prop containing all profiles, used if available
  isLoadingUserProfiles: isLoadingAllProfiles, // Loading state for all profiles
  openAuthPage,
  currentUser,
  userProfile: loggedInUserProfile,
  onReact,
  onOpenCommentModal,
  onOpenReadMoreModal,
  onTagClick,
  onOpenAuthorProfileModal, // Expects (username: string, targetUserProfile?: UserProfile | null)
}) => {
  const { username } = useParams<{ username: string }>(); 
  const navigateHook = useNavigate(); 
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPageBanter, setCurrentPageBanter] = useState(1);
  const [currentPageComments, setCurrentPageComments] = useState(1);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setError("Username not provided in URL.");
        setIsLoadingProfile(false);
        return;
      }
      setIsLoadingProfile(true);
      setError(null);
      setProfileData(null);
      setCurrentPageBanter(1);
      setCurrentPageComments(1);

      // Try to find profile from already loaded allUserProfiles first
      if (userProfiles && !isLoadingAllProfiles) {
        const foundProfile = userProfiles.find(p => p.username.toLowerCase() === username.toLowerCase());
        if (foundProfile) {
          setProfileData(foundProfile);
          setIsLoadingProfile(false);
          return;
        }
      }
      
      // If not found or allUserProfiles not available/loading, fetch from DB
      try {
        const usernameLower = username.toLowerCase();
        const usernameToUidRef = ref(db_rtdb, `usernameToUid/${usernameLower}`);
        const uidSnapshot = await get(usernameToUidRef);

        if (!uidSnapshot.exists()) {
          setError(`Banterer "${username}" not found.`);
          setProfileData(null);
          setIsLoadingProfile(false);
          return;
        }
        const uid = uidSnapshot.val();
        if (!uid) {
            setError(`Invalid UID mapping for "${username}".`);
            setProfileData(null);
            setIsLoadingProfile(false);
            return;
        }

        const profileRef = ref(db_rtdb, `userProfiles/${uid}`);
        const profileSnapshot = await get(profileRef);

        if (profileSnapshot.exists()) {
          const fetchedProfile = { uid, ...profileSnapshot.val() } as UserProfile;
          // Ensure friend fields are initialized
           setProfileData({
            ...fetchedProfile,
            friends: fetchedProfile.friends || {},
            friendRequestsSent: fetchedProfile.friendRequestsSent || {},
            friendRequestsReceived: fetchedProfile.friendRequestsReceived || {},
            unreadFriendRequestCount: fetchedProfile.unreadFriendRequestCount || 0,
          });
        } else {
          setError(`Profile data for "${username}" (UID: ${uid}) is missing.`);
          setProfileData(null);
        }
      } catch (err) {
        console.error("Error fetching profile by username:", err);
        setError("Failed to load profile. The digital winds are howling!");
        setProfileData(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [username, userProfiles, isLoadingAllProfiles]);

  const userBanterPosts = useMemo(() => {
    if (!profileData || !allConfessions) return [];
    return allConfessions.filter(post => post.userId === profileData.uid)
                         .sort((a,b) => b.createdAt - a.createdAt);
  }, [profileData, allConfessions]);

  const userComments = useMemo(() => {
    if (!profileData || !allConfessions) return [];
    const comments: (Comment & { originalPostTitle?: string, originalPostId?: string })[] = [];
    allConfessions.forEach(post => {
      if (post.comments) {
        Object.values(post.comments).forEach(comment => {
          if (comment.userId === profileData.uid) {
            comments.push({
              ...comment,
              originalPostTitle: post.customTitle || post.text.substring(0,50) + (post.text.length > 50 ? "..." : ""),
              originalPostId: post.id,
            });
          }
        });
      }
    });
    return comments.sort((a,b) => b.createdAt - a.createdAt);
  }, [profileData, allConfessions]);

  const paginatedBanterPosts = useMemo(() => {
    const startIndex = (currentPageBanter - 1) * ITEMS_PER_PAGE;
    return userBanterPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [userBanterPosts, currentPageBanter]);

  const paginatedComments = useMemo(() => {
    const startIndex = (currentPageComments - 1) * ITEMS_PER_PAGE;
    return userComments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [userComments, currentPageComments]);

  const avgReactionsPerBanter = useMemo(() => {
    if (!profileData || !profileData.postsAuthoredCount || profileData.postsAuthoredCount === 0) return "0.0";
    return ((profileData.reactionsReceivedCount || 0) / profileData.postsAuthoredCount).toFixed(1);
  }, [profileData]);


  if (isLoadingProfile || (!profileData && !error)) { // Show loading if profile is loading OR if no profileData and no error yet
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><LoadingSpinner size="lg" /> <p className="ml-3">Summoning Banterer's Profile...</p></div>;
  }

  if (error) {
    return <div className="text-center py-10"><p className="text-error text-lg">{error}</p><button onClick={() => navigateHook('/')} className="btn btn-primary mt-4">Go Home</button></div>;
  }

  if (!profileData) { // Should be covered by error state, but as a fallback
    return <div className="text-center py-10"><p className="text-xl">Banterer not found. Maybe they're off on a secret mission?</p><button onClick={() => navigateHook('/')} className="btn btn-primary mt-4">Go Home</button></div>;
  }

  const profileLevel = getBanterLevelInfo(profileData.points);
  const profileDisplayName = profileData.username || profileData.displayName || "Anonymous Banterer";
  
  const PaginationControls: React.FC<{currentPage: number, totalItems: number, onPageChange: (page:number) => void, itemName?: string}> = ({currentPage, totalItems, onPageChange, itemName="items"}) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    return (
      <div className="join mt-4 flex justify-center" aria-label={`Pagination for ${itemName}`}>
        <button onClick={() => onPageChange(currentPage - 1)} className="join-item btn btn-sm btn-outline" disabled={currentPage === 1} aria-label="Previous page">«</button>
        <button className="join-item btn btn-sm btn-disabled">Page {currentPage} of {totalPages}</button>
        <button onClick={() => onPageChange(currentPage + 1)} className="join-item btn btn-sm btn-outline" disabled={currentPage === totalPages} aria-label="Next page">»</button>
      </div>
    );
  };
  
  const isOwnProfile = currentUser?.uid === profileData.uid;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto py-4 px-2 sm:px-4">
      <div className="card bg-base-100 shadow-xl mb-6 border border-primary/20">
        <div className="card-body p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <ProfilePhoto
              currentUser={null} 
              userProfile={profileData}
              onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})}
              size="lg"
              editable={false}
              className="flex-shrink-0"
              selectedFrameId={profileData.selectedAvatarFrameId}
              selectedFlairId={profileData.selectedAvatarFlairId}
            />
            <div className="flex-grow text-center sm:text-left w-full">
              <h1 className="text-3xl lg:text-4xl font-bold text-primary break-words">{profileDisplayName}</h1>
              <p className="text-base-content/80 text-sm">Joined: {new Date(profileData.createdAt).toLocaleDateString()}</p>
              <div className="mt-3">
                <LevelProgressBar currentPoints={profileData.points} currentLevel={profileLevel} />
              </div>
              <p className="text-base font-medium text-accent mt-1.5"><i className="fas fa-star mr-1.5"></i>{profileData.points.toLocaleString()} Banter Points</p>
              {(profileData.chatStreak && profileData.chatStreak > 0) && (
                  <div className="mt-2 text-xs text-orange-500 font-medium">
                    <i className="fas fa-fire-alt mr-1"></i> Current Chat Streak: {profileData.chatStreak} days
                    {profileData.longestChatStreak && profileData.longestChatStreak > 0 && ` (Longest: ${profileData.longestChatStreak} days)`}
                  </div>
              )}
              {/* Placeholder for Friend Action Button - UI for this will be more complex */}
              {!isOwnProfile && loggedInUserProfile && (
                <div className="mt-3">
                  {/* This is where a friend request button or status would go.
                      For now, the UserHoverTooltip handles this for interactions elsewhere.
                      A button here would need similar logic to UserHoverTooltip's friend button.
                  */}
                   <UserHoverTooltip targetUser={profileData} currentUser={currentUser} currentUserProfile={loggedInUserProfile}>
                     <button className="btn btn-sm btn-outline btn-secondary">Interact</button>
                   </UserHoverTooltip>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
        <div className="card bg-base-200 shadow-lg lg:col-span-2">
          <div className="card-body p-3 sm:p-5">
            <h2 className="card-title text-xl text-primary mb-3">
              <i className="fas fa-comments mr-2 opacity-80"></i>Recent Banters by {profileDisplayName}
            </h2>
            {userBanterPosts.length > 0 ? (
              <div className="space-y-4">
                {paginatedBanterPosts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser} 
                    userProfile={loggedInUserProfile} 
                    onReact={onReact}
                    openAuthModal={openAuthPage}
                    onOpenCommentModal={onOpenCommentModal}
                    onOpenReadMoreModal={onOpenReadMoreModal}
                    onTagClick={onTagClick}
                    onOpenAuthorProfileModal={onOpenAuthorProfileModal}
                  />
                ))}
                <PaginationControls currentPage={currentPageBanter} totalItems={userBanterPosts.length} onPageChange={setCurrentPageBanter} itemName="banters" />
              </div>
            ) : <p className="text-center py-8 text-base-content/70">This banterer hasn't shared any wisdom... yet!</p>}
          </div>
        </div>

        <div className="card bg-base-200 shadow-lg row-start-3 md:row-start-auto lg:row-start-auto">
          <div className="card-body p-3 sm:p-5">
            <h2 className="card-title text-xl text-primary mb-4">
              <i className="fas fa-chart-line mr-2 opacity-80"></i>Stats & Accolades
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="stat p-2 bg-base-300/50 shadow place-items-center">
                <div className="stat-title text-xs">Posts Authored</div>
                <div className="stat-value text-xl text-secondary">{profileData.postsAuthoredCount || 0}</div>
              </div>
              <div className="stat p-2 bg-base-300/50 shadow place-items-center">
                <div className="stat-title text-xs">Comments Made</div>
                <div className="stat-value text-xl text-secondary">{profileData.commentsAuthoredCount || 0}</div>
              </div>
              <div className="stat p-2 bg-base-300/50 shadow place-items-center">
                <div className="stat-title text-xs">Reactions Received</div>
                <div className="stat-value text-xl text-accent">{profileData.reactionsReceivedCount || 0}</div>
              </div>
              <div className="stat p-2 bg-base-300/50 shadow place-items-center">
                <div className="stat-title text-xs">Avg Reactions/Post</div>
                <div className="stat-value text-xl text-accent">{avgReactionsPerBanter}</div>
              </div>
            </div>
            
            <h3 className="text-md font-semibold text-primary mt-3 mb-2 divider divider-neutral">Badges</h3>
            {profileData.badges && profileData.badges.length > 0 ? (
              <ul className="space-y-2">
                {profileData.badges.map(badgeId => {
                  const badge = BADGE_DEFINITIONS[badgeId as BadgeId];
                  return badge ? (
                    <li key={badgeId} className="flex items-start p-2.5 bg-base-100 shadow-sm hover:bg-base-300/30 transition-colors">
                      <i className={`${badge.icon} text-2xl w-8 text-center mr-3 mt-1`}></i>
                      <div>
                        <h5 className="font-semibold text-base text-secondary-focus">{badge.name}</h5>
                        <p className="text-xs text-base-content/80">{badge.description}</p>
                      </div>
                    </li>
                  ) : null;
                })}
              </ul>
            ) : <p className="text-center py-4 text-base-content/70">No shiny badges collected... for now!</p>}
          </div>
        </div>
        
        <div className="card bg-base-200 shadow-lg md:col-span-2 lg:col-span-1 row-start-2 md:row-start-auto lg:row-start-auto">
          <div className="card-body p-3 sm:p-5">
            <h2 className="card-title text-xl text-primary mb-3">
              <i className="fas fa-bullhorn mr-2 opacity-80"></i>Echoes from {profileDisplayName}
            </h2>
            {userComments.length > 0 ? (
              <div className="space-y-3">
                {paginatedComments.map(comment => (
                  <div key={comment.id} className="card card-compact bg-base-100 shadow-sm">
                    <div className="card-body p-2.5">
                      <p className="text-sm whitespace-pre-wrap break-words line-clamp-3">"{comment.text}"</p>
                      <p className="text-xs text-base-content/60 mt-1.5">
                        On <Link to={`/?postId=${comment.originalPostId}`} className="link link-hover text-accent truncate" style={{maxWidth: '150px', display: 'inline-block'}} onClick={(e) => { 
                          e.preventDefault(); 
                          const originalPost = allConfessions.find(p => p.id === comment.originalPostId);
                          if (originalPost) { onOpenReadMoreModal(originalPost); } 
                          else { navigateHook(`/?postId=${comment.originalPostId}`); }
                        }}>
                          "{comment.originalPostTitle}"
                        </Link> • {formatRelativeTime(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <PaginationControls currentPage={currentPageComments} totalItems={userComments.length} onPageChange={setCurrentPageComments} itemName="comments" />
              </div>
            ) : <p className="text-center py-8 text-base-content/70">This banterer is a silent observer in the comments.</p>}
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default UserProfilePage;
