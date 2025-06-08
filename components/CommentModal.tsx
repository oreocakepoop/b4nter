
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; 
import { Link } from 'react-router-dom'; // Updated import
import { ConfessionPost, Comment, UserProfile, ProcessedComment, FirebaseUser, CommentModalProps as CommentModalPropsType } from '../types'; // Added FirebaseUser, CommentModalPropsType
import LoadingSpinner from './LoadingSpinner';
import { formatRelativeTime } from '../utils/dateUtils';
import ProfilePhoto from './ProfilePhoto'; 

// Use CommentModalPropsType from types.ts
const MAX_INDENT_LEVEL = 3; 
const INDENT_STEP_REM = 0.75; 
const LINE_INDICATOR_LEFT_OFFSET_REM = 0.375; 

interface ReplyTarget {
  id: string;
  userDisplayName: string;
  text: string;
  userId: string; 
  isOriginalPost?: boolean; 
  originalPostTimestamp?: number;
}

const CommentLineIndicator: React.FC = () => (
  <div 
    className="absolute top-0 bottom-0 w-[2px] bg-base-300/70 group-hover:bg-primary/40 transition-colors duration-150"
    style={{ left: `-${LINE_INDICATOR_LEFT_OFFSET_REM}rem` }} 
    aria-hidden="true"
  />
);

const CommentModal: React.FC<CommentModalPropsType> = ({ // Use imported type
  isOpen, onClose, post, currentUser, userProfile, onSubmitComment, openAuthModal, 
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);
  const [collapsedComments, setCollapsedComments] = useState(new Set<string>());
  const commentInputRef = React.useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const modalTitleId = "comment-modal-title";
  const originalPostDescId = "comment-modal-original-post-desc";

  const isPermanentlyBanned = userProfile?.isBanned === true;
  const isTemporarilyBanned = userProfile?.tempBanUntil && userProfile.tempBanUntil > Date.now();
  let banMessage: string | null = null;

  if (isPermanentlyBanned) {
    banMessage = `Your account is permanently banned. Reason: ${userProfile?.banReason || 'Not specified.'} You cannot comment.`;
  } else if (isTemporarilyBanned && userProfile?.tempBanUntil) {
    const expiryDate = new Date(userProfile.tempBanUntil).toLocaleString();
    banMessage = `Your account is temporarily restricted from commenting until ${expiryDate}. Reason: ${userProfile?.tempBanReason || 'Not specified.'}`;
  }
  const canComment = currentUser && userProfile && !isPermanentlyBanned && !isTemporarilyBanned;


  useEffect(() => {
    if (isOpen) {
      setNewCommentText('');
      setError(null);
      setIsSubmitting(false);
      setReplyingTo(null);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      setCollapsedComments(new Set<string>()); 
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleDialogCloseEvent = () => { if (isOpen) onClose(); };
    dialog?.addEventListener('close', handleDialogCloseEvent);
    return () => dialog?.removeEventListener('close', handleDialogCloseEvent);
  }, [onClose, isOpen]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewCommentText(e.target.value);
    if (error) setError(null);
  };

  const handleSubmitComment = async () => {
    if (!canComment) {
        setError(banMessage || "You are currently restricted from commenting.");
        return;
    }
    if (!newCommentText.trim()) { setError("Comment can't be empty."); return; }
    if (!post || !currentUser || !userProfile) { setError("Cannot submit comment."); return; }
    if (newCommentText.length > 500) { setError("Comment too long (max 500 chars)."); return; }

    setError(null);
    setIsSubmitting(true);
    try {
      const parentCommentUserId = replyingTo && !replyingTo.isOriginalPost ? replyingTo.userId : undefined;
      const opTimestampForComebackKid = replyingTo ? (replyingTo.isOriginalPost ? replyingTo.originalPostTimestamp : undefined) : post.createdAt;
      
      await onSubmitComment(post.id, newCommentText, replyingTo && !replyingTo.isOriginalPost ? replyingTo.id : undefined, parentCommentUserId, opTimestampForComebackKid);
      
      setNewCommentText('');
      setReplyingTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReply = useCallback((target: ProcessedComment | ConfessionPost, isOriginalPostTarget: boolean = false) => {
    if (!canComment) return;
    if (isOriginalPostTarget && target && 'text' in target && 'userId' in target) { 
      const op = target as ConfessionPost;
      const opAuthorDisplay = op.authorUsername || op.wittyDisplayName || "Original Poster";
      setReplyingTo({ id: op.id, userDisplayName: opAuthorDisplay, text: op.text.substring(0, 50) + (op.text.length > 50 ? "..." : ""), userId: op.userId, isOriginalPost: true, originalPostTimestamp: op.createdAt });
    } else if (!isOriginalPostTarget && target && 'userDisplayName' in target && 'userId' in target) { 
      const comment = target as ProcessedComment;
      setReplyingTo({ id: comment.id, userDisplayName: comment.userDisplayName, text: comment.text.substring(0, 50) + (comment.text.length > 50 ? "..." : ""), userId: comment.userId, isOriginalPost: false });
    }
    commentInputRef.current?.focus();
  }, [canComment]);

  const cancelReply = () => setReplyingTo(null);

  const toggleReplies = (commentId: string) => {
    setCollapsedComments(prev => {
      const newSet = new Set(prev);
      newSet.has(commentId) ? newSet.delete(commentId) : newSet.add(commentId);
      return newSet;
    });
  };

  const { topLevelComments, repliesByParentId, totalCommentCountFromProcessing } = useMemo(() => {
    if (!post?.comments) return { topLevelComments: [], repliesByParentId: {}, totalCommentCountFromProcessing: 0 };
    const allCommentsList = Object.values(post.comments);
    const commentsMap = new Map<string, Comment>(allCommentsList.map(c => [c.id, c]));
    const tempRepliesByParentId: Record<string, Comment[]> = {};
    allCommentsList.forEach(comment => {
      if (comment.parentId) {
        if (!tempRepliesByParentId[comment.parentId]) tempRepliesByParentId[comment.parentId] = [];
        tempRepliesByParentId[comment.parentId].push(comment);
      }
    });
    for (const parentId in tempRepliesByParentId) tempRepliesByParentId[parentId].sort((a, b) => a.createdAt - b.createdAt);
    
    const allProcessedComments = allCommentsList.map(c => {
        const level = (() => { let current = c, l = 0; while(current.parentId && commentsMap.has(current.parentId)) { current = commentsMap.get(current.parentId)!; l++; } return l; })();
        const directReplies = tempRepliesByParentId[c.id] || [];
        const getAllDescendantsCount = (commentId: string): number => (tempRepliesByParentId[commentId] || []).reduce((sum, child) => sum + 1 + getAllDescendantsCount(child.id), 0);
        return { ...c, level, directReplyCount: directReplies.length, totalReplyCount: getAllDescendantsCount(c.id) } as ProcessedComment;
    });
    
    const finalTopLevelComments = allProcessedComments.filter(comment => !comment.parentId).sort((a, b) => b.createdAt - a.createdAt); 
    const finalRepliesByParentId: Record<string, ProcessedComment[]> = {};
    allProcessedComments.forEach(comment => {
        if (comment.parentId) {
            if (!finalRepliesByParentId[comment.parentId]) finalRepliesByParentId[comment.parentId] = [];
            finalRepliesByParentId[comment.parentId].push(comment);
        }
    });
    for (const parentId in finalRepliesByParentId) finalRepliesByParentId[parentId].sort((a, b) => a.createdAt - b.createdAt);
    return { topLevelComments: finalTopLevelComments, repliesByParentId: finalRepliesByParentId, totalCommentCountFromProcessing: allCommentsList.length };
  }, [post?.comments]);

  useEffect(() => {
    const defaultCollapsed = new Set<string>();
    function findCommentsWithReplies(commentsToSearch: ProcessedComment[]) {
      commentsToSearch.forEach(comment => { if (comment.totalReplyCount > 0) defaultCollapsed.add(comment.id); const children = repliesByParentId[comment.id]; if (children?.length > 0) findCommentsWithReplies(children); });
    }
    if (isOpen && post) { findCommentsWithReplies(topLevelComments); setCollapsedComments(defaultCollapsed); }
  }, [isOpen, post, topLevelComments, repliesByParentId]);

  const renderCommentListRecursive = (comments: ProcessedComment[]) => comments.map(comment => (
    <React.Fragment key={comment.id}>
      {renderComment(comment)}
      {!collapsedComments.has(comment.id) && repliesByParentId[comment.id]?.length > 0 && (
        <div className="replies-container mt-1">{renderCommentListRecursive(repliesByParentId[comment.id])}</div>
      )}
    </React.Fragment>
  ));

  const renderComment = (comment: ProcessedComment) => {
    const currentLevel = comment.level || 0;
    const isCollapsed = collapsedComments.has(comment.id);
    const indentStyle: React.CSSProperties = currentLevel > 0 
      ? { marginLeft: `${Math.min(currentLevel, MAX_INDENT_LEVEL + 1) * INDENT_STEP_REM}rem` } 
      : {};
    
    let commentBoxClasses = `flex items-start space-x-2 p-2 bg-base-100 hover:bg-base-200/40 transition-colors duration-150`;

    const commenterUserForAvatar = { uid: comment.userId, photoURL: comment.commenterPhotoURL, displayName: comment.userDisplayName } as any;
    const commenterProfileForAvatar = { 
        photoURL: comment.commenterPhotoURL, 
        username: comment.userDisplayName, 
        displayName: comment.userDisplayName,
        selectedAvatarFrameId: comment.commenterSelectedFrameId,
        selectedAvatarFlairId: comment.commenterSelectedFlairId,
     } as any;
    
    const commenterDisplayName = comment.userDisplayName || 'Banterer';
    const commenterProfileLink = currentUser && commenterDisplayName !== 'Anon' && commenterDisplayName !== 'Banterer' ? `/user/${commenterDisplayName}` : null;


    return (
      <motion.div 
        layout="position" 
        initial={{ opacity: 0, y: -5 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: 5, transition: { duration: 0.1 } }} 
        className="group relative" 
        style={indentStyle}
      >
        {currentLevel > 0 && currentLevel <= MAX_INDENT_LEVEL && <CommentLineIndicator />}
        
        <div className={commentBoxClasses}>
          <div className="flex-shrink-0">
              <ProfilePhoto
                  currentUser={commenterUserForAvatar}
                  userProfile={commenterProfileForAvatar}
                  onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})}
                  size="sm"
                  editable={false}
                  className="!w-6 !h-6" 
                  selectedFrameId={comment.commenterSelectedFrameId}
                  selectedFlairId={comment.commenterSelectedFlairId}
              />
          </div>
          <div className="flex-grow min-w-0">
              <div className="flex items-baseline space-x-1.5 mb-0.5">
                {commenterProfileLink ? (
                  <Link to={commenterProfileLink} onClick={(e) => e.stopPropagation()} className="text-xs font-medium text-base-content hover:text-primary hover:underline cursor-pointer truncate max-w-[120px] sm:max-w-[200px]" title={commenterDisplayName}> {/* Updated usage */}
                    {commenterDisplayName}
                  </Link>
                ) : (
                  <p className="text-xs font-medium text-base-content cursor-default truncate max-w-[120px] sm:max-w-[200px]" title={commenterDisplayName}>
                    {commenterDisplayName}
                  </p>
                )}
                  <span className="text-[0.65rem] text-base-content/60">{formatRelativeTime(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-base-content whitespace-pre-wrap break-words">{comment.text}</p>
              <div className="flex items-center space-x-3 text-xs mt-1">
                  {canComment && currentLevel < MAX_INDENT_LEVEL && ( 
                      <button onClick={() => handleStartReply(comment, false)} className="btn btn-xs btn-ghost normal-case font-medium text-base-content/70 hover:bg-base-content/10 p-1" aria-label={`Reply to ${commenterDisplayName}`} title="Reply to this comment">
                          Reply
                      </button>
                  )}
                  {comment.totalReplyCount > 0 && (
                  <button onClick={() => toggleReplies(comment.id)} className="btn btn-xs btn-ghost normal-case font-medium text-accent hover:bg-accent/10 p-1 flex items-center" aria-expanded={!isCollapsed} aria-controls={`replies-${comment.id}`} title={isCollapsed ? "Show replies" : "Hide replies"}>
                      <i className={`fas ${isCollapsed ? 'fa-caret-down' : 'fa-caret-up'} fa-sm mr-1 opacity-90`}></i>
                      {comment.totalReplyCount} {comment.totalReplyCount === 1 ? 'reply' : 'replies'}
                  </button>
                  )}
              </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const placeholderUsername = userProfile?.username || userProfile?.displayName || currentUser?.email?.split('@')[0] || 'Banterer';
  const originalPostAuthorDisplay = post?.authorUsername || post?.wittyDisplayName || "Original Poster";
  
  const opUserForAvatar = post ? { uid: post.userId, photoURL: post.authorPhotoURL, displayName: originalPostAuthorDisplay } as any : null;
  const opProfileForAvatar = post ? { 
      photoURL: post.authorPhotoURL, 
      username: post.authorUsername, 
      displayName: originalPostAuthorDisplay,
      selectedAvatarFrameId: post.authorSelectedFrameId,
      selectedAvatarFlairId: post.authorSelectedFlairId,
    } as any : null;
  const originalPostAuthorLink = currentUser && post?.authorUsername ? `/user/${post.authorUsername}` : null;


  return (
    <dialog id="comment_modal" className="modal modal-bottom sm:modal-middle" ref={dialogRef}>
      <AnimatePresence>
        {isOpen && post && (
          <motion.div className="modal-box w-11/12 max-w-3xl flex flex-col overflow-hidden p-0" style={{ maxHeight: '90vh' }} initial={{ scale: 0.95, opacity: 0, y: 25 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 25 }} transition={{ type: 'spring', stiffness: 280, damping: 30 }}>
            <div className="p-4 sm:p-5 border-b border-base-300 flex justify-between items-center shrink-0">
              <h3 id={modalTitleId} className="font-bold text-xl sm:text-2xl text-primary truncate">Echo Chamber</h3>
              <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost" aria-label="Close comments modal" disabled={isSubmitting} onClick={onClose}>✕</button></form>
            </div>
            
            {!currentUser ? (
                <div className="flex-grow flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                    <div className="alert alert-warning shadow-lg max-w-md">
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <i className="fas fa-comments-dollar text-3xl"></i>
                            <h3 className="font-bold text-lg">Join the Conversation!</h3>
                            <p className="text-sm">Log in or register to view comments and add your voice to the banter.</p>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => { onClose(); openAuthModal('login', 'Log in to view comments.', window.location.hash.substring(1) || '/'); }} className="btn btn-sm btn-neutral">Login</button>
                                <button onClick={() => { onClose(); openAuthModal('register', 'Register to view comments.', window.location.hash.substring(1) || '/'); }} className="btn btn-sm btn-outline">Register</button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
              <>
                <div className="flex-grow overflow-y-auto p-3 sm:p-4 space-y-3"> 
                  <div className="bg-base-200 p-3 mb-3">
                    <div className="flex items-start mb-2 space-x-3">
                        {opUserForAvatar && opProfileForAvatar && (
                        <ProfilePhoto
                            currentUser={opUserForAvatar}
                            userProfile={opProfileForAvatar}
                            onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})}
                            size="sm"
                            editable={false}
                            className="!w-8 !h-8" 
                            selectedFrameId={post.authorSelectedFrameId}
                            selectedFlairId={post.authorSelectedFlairId}
                        />
                        )}
                        <div>
                            <p className="card-title text-md text-primary !pb-0">{post.customTitle || "The Banter That Started It All..."}</p>
                            <p className="text-xs text-base-content/70 mt-0.5">
                                Posted {formatRelativeTime(post.createdAt)} by {originalPostAuthorLink ? (<Link to={originalPostAuthorLink} onClick={e => e.stopPropagation()} className="font-medium text-primary/90 hover:underline">{originalPostAuthorDisplay}</Link>) : (<span className="font-medium text-primary/90">{originalPostAuthorDisplay}</span>)} {/* Updated usage */}
                            </p>
                        </div>
                    </div>
                    <p id={originalPostDescId} className="text-sm text-base-content whitespace-pre-wrap break-words leading-relaxed line-clamp-6">{post.text}</p>
                    {post.imageUrl && <img src={post.imageUrl} alt="Original post image" className="mt-2 max-h-60 object-contain"/>}
                    {canComment && (<button onClick={() => handleStartReply(post, true)} className="btn btn-xs btn-ghost normal-case font-medium text-accent hover:bg-accent/10 p-1 mt-1.5"><i className="fas fa-reply fa-sm mr-1"></i> Reply to Original Post</button>)}
                  </div>

                  <div className="comments-section space-y-3">
                    <h4 className="text-md font-semibold text-primary mb-2">Replies & Ripples ({post.commentCount || totalCommentCountFromProcessing})</h4>
                    {topLevelComments.length === 0 && !isSubmitting && ( 
                      <div className="text-center py-6 text-base-content/60">
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.2}}>
                            <i className="fas fa-seedling text-4xl mb-3 text-success opacity-60"></i>
                            <p className="font-medium text-md text-success/80">Be the first ripple...</p>
                            <p className="text-sm">This discussion is waiting for your voice.</p>
                        </motion.div>
                      </div>
                    )}
                    <AnimatePresence>{isSubmitting && topLevelComments.length === 0 && (<motion.div key="submitting-empty-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center py-6"><LoadingSpinner className="text-primary" size="sm" /> <span className="ml-2 text-sm text-base-content/70">Posting your ripple...</span></motion.div>)}</AnimatePresence>
                    <div className="comments-list-container space-y-3">{renderCommentListRecursive(topLevelComments)}</div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 border-t border-base-300 shrink-0 bg-base-100/80 backdrop-blur-sm">
                    {banMessage && (
                        <div role="alert" className={`alert ${isPermanentlyBanned ? 'alert-error' : 'alert-warning'} text-xs p-1.5 mb-1.5`}>
                        <i className={`fas ${isPermanentlyBanned ? 'fa-ban' : 'fa-clock'} mr-1.5`}></i>
                        {banMessage}
                        </div>
                    )}
                    {replyingTo && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="alert alert-info text-xs p-1.5 mb-1.5">
                        <div className="flex-1"><i className="fas fa-reply fa-sm mr-1.5"></i>Replying to <strong className="text-info-content/90">{replyingTo.userDisplayName}</strong>: <em className="line-clamp-1 ml-1 opacity-80">"{replyingTo.text}"</em></div>
                        <button onClick={cancelReply} className="btn btn-xs btn-ghost text-error p-1">(Cancel)</button>
                      </motion.div>
                    )}
                    <textarea ref={commentInputRef} className={`textarea textarea-bordered w-full text-sm leading-relaxed p-2 ${error ? 'textarea-error' : ''}`} placeholder={replyingTo ? `Your reply to ${replyingTo.userDisplayName}...` :`Join the discussion as ${placeholderUsername}... (max 500 chars)`} value={newCommentText} onChange={handleTextChange} rows={2} maxLength={500} disabled={isSubmitting || !canComment} aria-label="Your comment or reply"></textarea>
                    <div className="flex justify-between items-center mt-1">
                        {error && !banMessage && <p className="text-error text-xs font-medium" role="alert"><i className="fas fa-exclamation-circle fa-xs mr-1"></i>{error}</p>}
                        <span className="text-xs text-base-content/60 ml-auto">{newCommentText.length}/500</span>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button onClick={handleSubmitComment} className="btn btn-primary btn-sm" disabled={isSubmitting || !canComment || !newCommentText.trim() || newCommentText.length > 500}>
                        {isSubmitting ? <LoadingSpinner size="xs" /> : <><i className="fas fa-paper-plane fa-sm mr-1.5"></i>Post {replyingTo ? 'Reply' : 'Comment'}</>}
                      </button>
                    </div>
                  </div>
                </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <form method="dialog" className="modal-backdrop"><button type="button" onClick={onClose}>close</button></form>
    </dialog>
  );
};

export default CommentModal;
