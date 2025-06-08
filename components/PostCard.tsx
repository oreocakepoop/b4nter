
import React, { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfessionPost, ReactionType, REACTION_ICONS, REACTION_COLORS, PostCardProps, FirebaseUser, PostFlairDefinition, UserProfile } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';
import { BADGE_DEFINITIONS } from '../utils/badges'; 
import ProfilePhoto from './ProfilePhoto'; 
import { Link, useNavigate } from 'react-router-dom';
import { calculatePostStarPower } from '../utils/postUtils';
import { getPostFlairById } from '../utils/postFlairDecorations';
import UserHoverTooltip from './UserHoverTooltip'; // Added import

const MAX_PREVIEW_LINES = 3; 

const ReactionButton: React.FC<{
  reactionType: ReactionType;
  onClick: () => void;
  isSelected: boolean;
  disabled?: boolean; // Added disabled prop
}> = ({ reactionType, onClick, isSelected, disabled = false }) => {
  let iconClassName = `${REACTION_ICONS[reactionType]} text-sm sm:text-md`;
  
  if (isSelected) {
    iconClassName += ` ${REACTION_COLORS[reactionType]}`; 
  } else { 
    iconClassName += ` text-base-content/70`;
  }

  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      className={`btn btn-ghost btn-circle btn-xs sm:btn-sm ${isSelected ? 'bg-base-300' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={disabled ? {} : { scale: 1.15, rotate: isSelected ? [0, 5, -5, 0] : 0 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      transition={{ duration: 0.2 }}
      title={disabled ? "Reactions disabled" : reactionType.charAt(0).toUpperCase() + reactionType.slice(1)}
      aria-label={`React with ${reactionType}`}
      aria-pressed={isSelected}
      disabled={disabled}
    >
      <i className={iconClassName}></i>
    </motion.button>
  );
};


const getAnimationVariants = () => {
  return {
    initial: { opacity: 0, y: 25, scale: 0.98 }, 
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 18, stiffness: 120} }, 
    exit: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.25 } }, 
  };
};

const PostCardComponent: React.FC<PostCardProps> = React.memo(({
    post, currentUser, userProfile, onReact, openAuthModal, onOpenCommentModal, 
    onOpenReadMoreModal, onTagClick, activeTags, onOpenAuthorProfileModal,
    allUserProfiles // Destructure allUserProfiles
}) => {
  
  const [isReactionPopoverVisible, setIsReactionPopoverVisible] = useState(false);
  const reactionTimeoutRef = useRef<number | null>(null);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  const starPower = useMemo(() => calculatePostStarPower(post), [post]);
  const postFlairDef = useMemo(() => getPostFlairById(post.selectedPostFlairId), [post.selectedPostFlairId]);

  const isPotentiallyTruncated = post.text.length > 150 || (post.imageUrl && post.text.length > 80); 

  const isPermanentlyBanned = userProfile?.isBanned === true;
  const isTemporarilyBanned = userProfile?.tempBanUntil && userProfile.tempBanUntil > Date.now();
  const canInteract = currentUser && userProfile && !isPermanentlyBanned && !isTemporarilyBanned;

  const handleMainContentClick = () => onOpenReadMoreModal(post);
  
  const handleCommentStatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal('login', "Log in or register to comment!", window.location.hash.substring(1) || '/');
      return;
    }
     if (!canInteract) {
      // Optionally show a small message or toast here
      console.log("User is banned, cannot comment.");
      return;
    }
    onOpenCommentModal(post);
  };

  const handleReactionInteraction = (reactionType: ReactionType) => {
    if (!currentUser) {
      openAuthModal('login', "Log in or register to react!", window.location.hash.substring(1) || '/');
      return;
    }
    if (!canInteract) {
      // Optionally show a small message or toast here
      console.log("User is banned, cannot react.");
      hideReactionPopover(true);
      return;
    }
    onReact(post.id, reactionType, post.userId);
    hideReactionPopover(true);
  };
  
  const postTitle = useMemo(() => {
    if (post.customTitle && post.customTitle.trim() !== '') return post.customTitle.trim();
    const words = post.text.trim().split(/\s+/);
    let snippet = words.slice(0, 7).join(" "); 
    if (snippet.length > 50) snippet = snippet.substring(0, 50).trimEnd();
    if (words.length > 7 || (words.length <=7 && post.text.trim().length > snippet.length) ) snippet += "...";
    return snippet.trim() || "Untitled Banter"; 
  }, [post.customTitle, post.text]);

  const displayedAuthorName = post.authorUsername || post.wittyDisplayName || "Anonymous";
  
  const authorFullProfile = useMemo(() => {
    if (!post.userId || !allUserProfiles || allUserProfiles.length === 0) return null;
    return allUserProfiles.find(p => p.uid === post.userId) || null;
  }, [post.userId, allUserProfiles]);
  
  const authorForTooltip: UserProfile | null = useMemo(() => {
    if (authorFullProfile) return authorFullProfile;
    // Fallback minimal profile if full profile not found
    if (!post.userId) return null;
    return {
      uid: post.userId,
      username: post.authorUsername || "Anonymous",
      displayName: post.wittyDisplayName || post.authorUsername || "Anonymous",
      photoURL: post.authorPhotoURL,
      points: 0, // Fallback points
      createdAt: 0,
      lastActivityAt: 0,
      selectedAvatarFrameId: post.authorSelectedFrameId,
      selectedAvatarFlairId: post.authorSelectedFlairId,
      friends: {},
      friendRequestsSent: {},
      friendRequestsReceived: {},
    };
  }, [authorFullProfile, post]);


  const currentUserReaction = useMemo(() => currentUser ? post.reactions?.[currentUser.uid] : null, [post?.reactions, currentUser]);
  const totalReactionsCount = useMemo(() => Object.values(post?.reactionSummary || {}).reduce((sum, count) => sum + (count || 0), 0), [post?.reactionSummary]);

  const showReactionPopover = () => { if (canInteract && reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current); if (canInteract) setIsReactionPopoverVisible(true); };
  const hideReactionPopover = (immediate = false) => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    if (immediate) setIsReactionPopoverVisible(false);
    else reactionTimeoutRef.current = window.setTimeout(() => setIsReactionPopoverVisible(false), 350);
  };

  const mainReactionIconBase = currentUserReaction ? REACTION_ICONS[currentUserReaction] : REACTION_ICONS.like;
  let mainIconClassName = `${mainReactionIconBase} text-sm sm:text-base group-hover:scale-110 transition-transform`;
  if (currentUserReaction) { mainIconClassName += ` ${REACTION_COLORS[currentUserReaction]}`; } 
  else { mainIconClassName += ` text-base-content/60`; }

  const authorUserForAvatar = { uid: post.userId, photoURL: post.authorPhotoURL, displayName: displayedAuthorName } as any;
  const authorProfileForAvatar = { 
      photoURL: post.authorPhotoURL, 
      username: post.authorUsername, 
      displayName: displayedAuthorName,
      selectedAvatarFrameId: post.authorSelectedFrameId,
      selectedAvatarFlairId: post.authorSelectedFlairId,
  } as any;
  
  const canViewAuthorProfile = post.authorUsername && post.authorUsername !== "Anonymous";
  const cardClasses = `card bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out border border-base-300/40 ${postFlairDef?.backgroundColorClass || ''} ${postFlairDef?.borderColorClass || ''}`;

  return (
    <motion.div 
      layout 
      variants={getAnimationVariants()} 
      initial="initial" 
      animate="animate" 
      exit="exit" 
      className={cardClasses}
    >
      <div className="card-body p-3 sm:p-4">
        <div className="flex items-start space-x-2 sm:space-x-3 mb-2">
          <ProfilePhoto 
            currentUser={authorUserForAvatar}
            userProfile={authorProfileForAvatar}
            onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})}
            size="sm"
            editable={false}
            className="!w-10 !h-10 sm:!w-11 !h-11 flex-shrink-0"
            selectedFrameId={post.authorSelectedFrameId}
            selectedFlairId={post.authorSelectedFlairId}
          />
          <div className="flex-grow min-w-0">
            <div className="flex items-baseline space-x-1.5">
             {authorForTooltip ? (
                <UserHoverTooltip 
                    targetUser={authorForTooltip} 
                    currentUser={currentUser} 
                    currentUserProfile={userProfile} // Pass logged-in user's profile
                    onSendMessage={(targetUid) => { 
                        if (userProfile?.friends?.[targetUid]) { 
                            navigate(`/?roomId=${post.userId < targetUid ? `${post.userId}_${targetUid}` : `${targetUid}_${post.userId}` }`);
                        }
                    }}
                >
                    <span 
                        className="text-sm sm:text-base font-semibold text-primary-focus hover:text-primary hover:underline cursor-pointer truncate" 
                        title={`View ${displayedAuthorName}'s profile`}
                        onClick={(e) => {
                             e.stopPropagation(); 
                             if (canViewAuthorProfile) onOpenAuthorProfileModal(post.authorUsername!, authorForTooltip);
                        }}
                    >
                        {displayedAuthorName}
                    </span>
                </UserHoverTooltip>
             ) : (
                <p className="text-sm sm:text-base font-semibold text-primary-focus cursor-default truncate" title={displayedAuthorName}>
                    {displayedAuthorName}
                </p>
             )}
              {post.authorLevelName && <span className="badge badge-ghost badge-xs flex-shrink-0">{post.authorLevelName}</span>}
              {post.authorBadges && post.authorBadges.length > 0 && (
                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                  {post.authorBadges.slice(0, 3).map(badgeId => {
                    const badge = BADGE_DEFINITIONS[badgeId];
                    return badge ? (
                      <i key={badgeId} className={`${badge.icon} text-xs`} title={badge.name}></i>
                    ) : null;
                  })}
                  {post.authorBadges.length > 3 && (
                    <span className="text-xs text-base-content/70" title={`+${post.authorBadges.length - 3} more badges`}>...</span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-base-content/70" title={new Date(post.createdAt).toLocaleString()}>{formatRelativeTime(post.createdAt)}</p>
          </div>
          <div className="flex items-center space-x-1">
            {postFlairDef && (
              <div className="tooltip tooltip-left" data-tip={postFlairDef.name}>
                <i className={`${postFlairDef.icon} ${postFlairDef.iconColorClass} text-lg opacity-80`}></i>
              </div>
            )}
            {starPower > 0 && (
              <div className="tooltip tooltip-left" data-tip={`Star Power: ${starPower.toFixed(1)}`}>
                <div className="flex items-center text-sm text-accent font-semibold">
                  <i className="fas fa-meteor mr-1.5"></i>
                  <span>{starPower.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-2 cursor-pointer" onClick={handleMainContentClick}>
          <h2 className={`card-title text-base sm:text-lg font-semibold text-primary hover:text-primary-focus transition-colors ${post.customTitle ? '' : 'italic'}`} title={postTitle}>
            {postTitle}
          </h2>
          {post.imageUrl && !imageError && (
            <div className="mt-2 mb-1 max-h-72 overflow-hidden flex justify-center items-center bg-base-200">
                <img src={post.imageUrl} alt={post.customTitle || "Banter image"} className="max-h-72 w-auto object-contain" onError={() => setImageError(true)} />
            </div>
          )}
          {imageError && post.imageUrl && (
            <div className="mt-2 mb-1 p-1.5 text-xs text-error-content bg-error/10 text-center rounded">Could not load image.</div>
          )}
          <p className="text-sm text-base-content whitespace-pre-wrap break-words leading-relaxed line-clamp-3">
            {post.text}
          </p>
          {isPotentiallyTruncated && (
            <span className="text-xs text-secondary hover:underline mt-1 inline-block">
              Read More...
            </span>
          )}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {post.tags.map(tag => (
              <motion.button 
                key={tag} 
                onClick={(e) => { e.stopPropagation(); onTagClick(tag); }} 
                className={`badge ${activeTags?.includes(tag) ? 'badge-neutral' : 'badge-accent badge-outline'} badge-xs sm:badge-sm hover:opacity-80 transition-opacity`} 
                whileTap={{ scale: 0.9 }}
              >
                #{tag}
              </motion.button>
            ))}
          </div>
        )}

        <div className="card-actions justify-between items-center border-t border-base-300/50 pt-2">
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            <div 
              className={`relative flex items-center space-x-0.5 sm:space-x-1 p-1 rounded-md group transition-colors ${canInteract ? 'cursor-pointer hover:bg-base-content/10' : 'opacity-60 cursor-not-allowed'}`}
              onMouseEnter={showReactionPopover} onMouseLeave={() => hideReactionPopover()}
              onClick={(e) => { e.stopPropagation(); if (canInteract) handleReactionInteraction(currentUserReaction || 'like'); }} 
              role="button" tabIndex={canInteract ? 0 : -1} aria-haspopup="true" aria-expanded={isReactionPopoverVisible} aria-label={`React. ${totalReactionsCount} reactions.`}
              onKeyDown={(e) => { if (canInteract && (e.key === 'Enter' || e.key === ' ')) setIsReactionPopoverVisible(!isReactionPopoverVisible); }}
              title={!canInteract ? "Reactions disabled due to account restriction" : `React. ${totalReactionsCount} reactions.`}
            >
              <i className={mainIconClassName}></i>
              <span className="text-xs sm:text-sm font-medium group-hover:opacity-80 text-base-content/80">{totalReactionsCount}</span>
              <AnimatePresence>
              {isReactionPopoverVisible && canInteract && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 p-1 bg-base-100 border border-base-300 shadow-xl flex space-x-0.5 z-20 rounded-lg"
                  onMouseEnter={showReactionPopover} onMouseLeave={() => hideReactionPopover(true)}
                >
                  {(Object.keys(REACTION_ICONS) as ReactionType[]).map(reaction => (
                    <ReactionButton key={reaction} reactionType={reaction} onClick={() => handleReactionInteraction(reaction)} isSelected={currentUserReaction === reaction} />
                  ))}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
            <motion.button 
                onClick={handleCommentStatClick} 
                className={`btn btn-ghost btn-xs sm:btn-sm hover:text-info focus:text-info text-base-content/80 ${!canInteract ? 'opacity-60 cursor-not-allowed' : ''}`} 
                aria-label={`View comments. ${post.commentCount || 0} comments.`} 
                whileTap={canInteract ? { scale: 0.95 } : {}}
                disabled={!canInteract}
                title={!canInteract ? "Commenting disabled due to account restriction" : `View comments. ${post.commentCount || 0} comments.`}
            >
              <i className="far fa-comment-dots text-sm sm:text-base mr-1"></i>
              <span className="hidden sm:inline">Comment</span> ({post.commentCount || 0})
            </motion.button>
          </div>
          <motion.button 
            onClick={(e) => { e.stopPropagation(); onOpenReadMoreModal(post); }} 
            className="btn btn-ghost btn-xs sm:btn-sm hover:text-accent focus:text-accent text-base-content/80" 
            aria-label="Share or view more options"
            whileTap={{ scale: 0.95 }}
          >
            <i className="fas fa-share-alt text-sm sm:text-base mr-1"></i>
            <span className="hidden sm:inline">Share</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
});
PostCardComponent.displayName = 'PostCard';
export default PostCardComponent;
