
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; 
import { ConfessionPost, ReactionType, REACTION_ICONS, REACTION_COLORS, UserProfile, FirebaseUser, ReadMoreModalProps as ReadMoreModalPropsType } from '../types'; // Added FirebaseUser, ReadMoreModalPropsType
import { formatRelativeTime } from '../utils/dateUtils';
import ProfilePhoto from './ProfilePhoto'; 

// Use imported type
const ReactionButtonDisplay: React.FC<{
  reactionType: ReactionType;
  onClick: () => void;
  isSelected: boolean;
  disabled?: boolean; // Added disabled prop
}> = ({ reactionType, onClick, isSelected, disabled = false }) => {
  let iconClassName = `${REACTION_ICONS[reactionType]} text-md sm:text-lg`;

  if (isSelected) {
    iconClassName += ` ${REACTION_COLORS[reactionType]}`; 
  } else { 
    iconClassName += ` text-base-content/70`;
  }
  
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); if(!disabled) onClick(); }}
      className={`btn btn-ghost btn-circle btn-sm ${isSelected ? 'bg-base-300' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      title={disabled ? "Reactions disabled" : reactionType.charAt(0).toUpperCase() + reactionType.slice(1)}
      aria-label={`React with ${reactionType}`}
      aria-pressed={isSelected}
      disabled={disabled}
    >
      <i className={iconClassName}></i>
    </motion.button>
  );
};


const ReadMoreModal: React.FC<ReadMoreModalPropsType> = ({ // Use imported type
  isOpen, onClose, post, currentUser, userProfile, 
  onOpenComments, onReact, openAuthModal, onTagClickOnFeed
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const modalTitleId = "read-more-modal-title";
  const [copyButtonText, setCopyButtonText] = useState("Copy Link");
  const [isReactionPopoverVisible, setIsReactionPopoverVisible] = useState(false);
  const reactionTimeoutRef = useRef<number | null>(null);
  const [imageError, setImageError] = useState(false);

  const isPermanentlyBanned = userProfile?.isBanned === true;
  const isTemporarilyBanned = userProfile?.tempBanUntil && userProfile.tempBanUntil > Date.now();
  const canInteract = currentUser && userProfile && !isPermanentlyBanned && !isTemporarilyBanned;

  useEffect(() => {
    if (isOpen) {
      setCopyButtonText("Copy Link"); 
      setIsReactionPopoverVisible(false); 
      setImageError(false);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleDialogCloseEvent = () => { if (isOpen) onClose(); };
    dialog?.addEventListener('close', handleDialogCloseEvent);
    return () => dialog?.removeEventListener('close', handleDialogCloseEvent);
  }, [onClose, isOpen]);

  const handleCommentNavigation = () => { 
      if (!canInteract && currentUser) {
          // Optionally show a message that commenting is disabled due to ban
          console.log("Commenting disabled due to account restriction.");
          return;
      }
      if(post) onOpenComments(post); 
  };
  const handleTagClick = (tag: string) => { onClose(); onTagClickOnFeed(tag); };

  const handleCopyLink = () => {
    if (!post) return;
    const link = `${window.location.origin}${window.location.pathname}#/?postId=${post.id}`;
    navigator.clipboard.writeText(link)
      .then(() => { setCopyButtonText("Copied!"); setTimeout(() => setCopyButtonText("Copy Link"), 2000); })
      .catch(err => { console.error("Failed to copy link: ", err); setCopyButtonText("Error"); setTimeout(() => setCopyButtonText("Copy Link"), 2000); });
  };
  
  const currentUserReaction = useMemo(() => currentUser && post ? post.reactions?.[currentUser.uid] : null, [post?.reactions, currentUser]);
  const totalReactionsCount = useMemo(() => Object.values(post?.reactionSummary || {}).reduce((sum, count) => sum + (count || 0), 0), [post?.reactionSummary]);
  
  const handleReactionInteraction = (reactionType: ReactionType) => {
    if (!currentUser) { onClose(); openAuthModal('login', "Log in to react!", window.location.hash.substring(1) || '/'); return; }
    if (!canInteract) {
        console.log("Reactions disabled due to account restriction.");
        hideReactionPopover(true);
        return;
    }
    if(post) onReact(post.id, reactionType, post.userId);
    hideReactionPopover(true); 
  };

  const showReactionPopover = () => { if (canInteract && reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current); if(canInteract) setIsReactionPopoverVisible(true); };
  const hideReactionPopover = (immediate = false) => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    if (immediate) setIsReactionPopoverVisible(false);
    else reactionTimeoutRef.current = window.setTimeout(() => setIsReactionPopoverVisible(false), 300);
  };
  
  if (!post) return null;

  const mainReactionIconBase = currentUserReaction ? REACTION_ICONS[currentUserReaction] : REACTION_ICONS.like;
  
  let mainIconClassName = `${mainReactionIconBase} text-lg group-hover:scale-110 transition-transform`;

  if (currentUserReaction) {
    mainIconClassName += ` ${REACTION_COLORS[currentUserReaction]}`;
  } else {
    mainIconClassName += ` text-base-content/70`;
  }
  
  const authorDisplay = post.authorUsername || post.wittyDisplayName || "Anonymous Banter";
  const authorUserForAvatar = { uid: post.userId, photoURL: post.authorPhotoURL, displayName: authorDisplay } as any;
  const authorProfileForAvatar = { 
      photoURL: post.authorPhotoURL, 
      username: post.authorUsername, 
      displayName: authorDisplay,
      selectedAvatarFrameId: post.authorSelectedFrameId,
      selectedAvatarFlairId: post.authorSelectedFlairId,
    } as any;


  const modalBoxStyle: React.CSSProperties = { maxHeight: '85vh' };
  const modalBoxBaseClasses = `modal-box w-11/12 max-w-xl flex flex-col overflow-hidden p-0 font-sans`;
  const modalBoxBgClasses = `bg-base-100`;

  return (
    <dialog id="read_more_modal" className="modal modal-bottom sm:modal-middle" ref={dialogRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`${modalBoxBaseClasses} ${modalBoxBgClasses}`}
            style={modalBoxStyle} 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="p-3 sm:p-4 border-b flex justify-between items-start shrink-0 relative z-10 border-base-300">
              <div className="flex items-center space-x-3">
                 <ProfilePhoto
                    currentUser={authorUserForAvatar}
                    userProfile={authorProfileForAvatar}
                    onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})}
                    size="sm" 
                    editable={false}
                    className="!w-10 !h-10 sm:!w-11 sm:!h-11"
                    selectedFrameId={post.authorSelectedFrameId}
                    selectedFlairId={post.authorSelectedFlairId}
                />
                <div className="flex-1 min-w-0">
                   <h3 id={modalTitleId} className={`font-semibold text-base sm:text-lg text-primary ${post.customTitle ? '' : 'italic'}`} title={post.customTitle || "Untitled Banter"}>
                    {post.customTitle || "Untitled Banter"}
                  </h3>
                  <p className="text-xs text-base-content/70" title={new Date(post.createdAt).toLocaleString()}>
                    By <span className="font-medium text-base-content/90">{authorDisplay}</span> • {formatRelativeTime(post.createdAt)}
                  </p>
                </div>
              </div>
              <form method="dialog">
                <button className="btn btn-xs btn-circle btn-ghost hover:bg-base-content/20 text-base-content/70" aria-label="Close full post modal" onClick={onClose}>✕</button>
              </form>
            </div>

            {currentUser ? (
              <>
                <div className="flex-grow overflow-y-auto p-3 sm:p-4 relative z-10"> 
                  {post.imageUrl && !imageError && (
                    <div className="mb-3 max-h-96 overflow-hidden flex justify-center items-center bg-base-200">
                      <img 
                        src={post.imageUrl} 
                        alt={post.customTitle || "Banter image"} 
                        className="max-h-96 w-auto object-contain"
                        onError={() => setImageError(true)}
                      />
                    </div>
                  )}
                  {imageError && post.imageUrl && (
                    <div className="mb-3 p-2 text-xs text-error-content bg-error/20 text-center">Could not load image.</div>
                  )}
                  <p className={`text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed text-base-content`}>
                    {post.text}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-base-300">
                      <h4 className="text-xs font-semibold mb-1.5 text-base-content/60">TAGS:</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.map(tag => (
                          <button
                            key={tag} onClick={() => handleTagClick(tag)}
                            className={`badge badge-accent badge-outline badge-sm sm:badge-md hover:opacity-80 transition-opacity`}
                            title={`Filter by tag: #${tag}`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t flex flex-wrap gap-2 justify-between items-center shrink-0 backdrop-blur-sm relative z-10 border-base-300 bg-base-100/80" 
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div 
                      className={`relative flex items-center space-x-1 p-1 rounded-md group transition-colors ${canInteract ? 'cursor-pointer hover:bg-base-content/10' : 'opacity-60 cursor-not-allowed'}`}
                      onMouseEnter={showReactionPopover} onMouseLeave={() => hideReactionPopover()}
                      onClick={() => { if (canInteract) handleReactionInteraction(currentUserReaction || 'like'); }}
                      role="button" tabIndex={canInteract ? 0 : -1} aria-haspopup="true" aria-expanded={isReactionPopoverVisible} aria-label={`React. ${totalReactionsCount} reactions.`}
                      onKeyDown={(e) => { if (canInteract && (e.key === 'Enter' || e.key === ' ')) setIsReactionPopoverVisible(!isReactionPopoverVisible); }}
                      title={!canInteract ? "Reactions disabled due to account restriction" : `React. ${totalReactionsCount} reactions.`}
                    >
                      <i className={mainIconClassName}></i>
                      <span className="text-xs sm:text-sm font-medium group-hover:opacity-80 text-base-content/80">{totalReactionsCount}</span>
                      <AnimatePresence>
                      {isReactionPopoverVisible && canInteract && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.1 } }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-1 bg-base-100 border border-base-300 shadow-xl flex space-x-0.5 z-20"
                          onMouseEnter={showReactionPopover} onMouseLeave={() => hideReactionPopover(true)}
                        >
                          {(Object.keys(REACTION_ICONS) as ReactionType[]).map(reaction => (
                            <ReactionButtonDisplay key={reaction} reactionType={reaction} onClick={() => handleReactionInteraction(reaction)} isSelected={currentUserReaction === reaction} />
                          ))}
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </div>

                    <button 
                        onClick={handleCommentNavigation} 
                        className={`btn btn-ghost btn-xs sm:btn-sm hover:text-accent focus:text-accent text-base-content/80 ${!canInteract ? 'opacity-60 cursor-not-allowed' : ''}`} 
                        aria-label={`View comments. ${post.commentCount || 0} comments.`}
                        disabled={!canInteract && !!currentUser} // Disable only if logged in and banned
                        title={!canInteract && !!currentUser ? "Commenting disabled due to account restriction" : `View comments. ${post.commentCount || 0} comments.`}
                    >
                      <i className="far fa-comment-dots text-base sm:text-lg mr-1"></i>
                      <span className="hidden sm:inline">Comment</span> ({post.commentCount || 0})
                    </button>
                  </div>
                  
                  <button onClick={handleCopyLink} className="btn btn-ghost btn-xs sm:btn-sm hover:text-accent focus:text-accent text-base-content/80" disabled={copyButtonText === "Copied!" || copyButtonText === "Error"} aria-live="polite">
                    <i className={`fas ${copyButtonText === "Copied!" ? "fa-check" : "fa-link"} text-sm sm:text-base mr-1`}></i> {copyButtonText}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-6 sm:p-8 text-center relative z-10">
                <div className="alert alert-warning shadow-lg max-w-md">
                    <div className="flex flex-col items-center justify-center space-y-2"> 
                        <i className="fas fa-lock text-3xl"></i> 
                        <h3 className="font-bold text-lg">Unlock the Full Banter!</h3> 
                        <p className="text-sm">You need to be logged in to view the full content of this post.</p> 
                        <div className="flex gap-2 mt-3">
                            <button onClick={() => { onClose(); openAuthModal('login', 'Log in to view the full banter.', window.location.hash.substring(1) || '/'); }} className="btn btn-sm btn-neutral">Login</button>
                            <button onClick={() => { onClose(); openAuthModal('register', 'Register to view the full banter.', window.location.hash.substring(1) || '/'); }} className="btn btn-sm btn-outline">Register</button> 
                        </div>
                    </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
};

export default ReadMoreModal;
