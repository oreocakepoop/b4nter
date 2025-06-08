
import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, ConfessionPost, AuthorProfileModalProps as AuthorProfileModalPropsType } from '../types';
import { BADGE_DEFINITIONS } from '../utils/badges';
import { getBanterLevelInfo } from '../utils/banterLevels';
import LevelProgressBar from './LevelProgressBar';
import { formatRelativeTime } from '../utils/dateUtils';
import LoadingSpinner from './LoadingSpinner';
import ProfilePhoto from './ProfilePhoto'; 

const MAX_RECENT_BANTERS = 3;

const AuthorProfileModal: React.FC<AuthorProfileModalPropsType> = ({
  isOpen, onClose, authorProfile, allConfessions, isLoading,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const modalTitleId = "author-profile-modal-title";

  useEffect(() => { if (isOpen) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [isOpen]);
  useEffect(() => { const d = dialogRef.current; const cb = () => { if(isOpen) onClose(); }; d?.addEventListener('close', cb); return () => d?.removeEventListener('close', cb); }, [onClose, isOpen]);

  const authorRecentBanter = useMemo(() => {
    if (!authorProfile || !allConfessions || allConfessions.length === 0) return [];
    return allConfessions.filter(post => post.userId === authorProfile.uid).slice(0, MAX_RECENT_BANTERS);
  }, [allConfessions, authorProfile]);

  if (!isOpen) return null;

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-10 min-h-[300px]">
      <LoadingSpinner size="lg" className="text-primary" />
      <p className="mt-4 text-base-content/70">Fetching B4NTER Legend's Profile...</p>
    </div>
  );

  const renderProfileNotFound = () => (
     <div className="flex flex-col items-center justify-center p-10 min-h-[300px] text-center">
        <i className="fas fa-ghost text-5xl text-base-content/30 mb-4"></i>
        <h3 className="font-bold text-xl text-base-content/80">Profile Not Found</h3>
        <p className="text-base-content/60 mt-2">This B4NTER user seems to be a master of anonymity!</p>
    </div>
  );
  
  const ModalContentWrapper: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
     <motion.div className="modal-box w-11/12 max-w-2xl p-0" initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
        <div className="p-4 sm:p-5 border-b border-base-300 flex justify-between items-start">
            <h3 className="font-bold text-xl sm:text-2xl text-primary">{title}</h3>
            <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button></form>
        </div>
        {children}
        <div className="modal-action p-3 sm:p-4 border-t border-base-300">
            <form method="dialog"><button className="btn btn-primary btn-sm" onClick={onClose}>Close</button></form>
        </div>
    </motion.div>
  );


  if (isLoading) {
    return (
        <dialog id="author_profile_modal_loading" className="modal modal-bottom sm:modal-middle modal-open" ref={dialogRef}>
            <ModalContentWrapper title="Loading Profile...">{renderLoading()}</ModalContentWrapper>
            <form method="dialog" className="modal-backdrop"><button type="button" onClick={onClose}>close</button></form>
        </dialog>
    );
  }

  if (!authorProfile) {
     return (
        <dialog id="author_profile_modal_notfound" className="modal modal-bottom sm:modal-middle modal-open" ref={dialogRef}>
            <ModalContentWrapper title="Profile Unavailable">{renderProfileNotFound()}</ModalContentWrapper>
            <form method="dialog" className="modal-backdrop"><button type="button" onClick={onClose}>close</button></form>
        </dialog>
    );
  }

  const authorLevel = getBanterLevelInfo(authorProfile.points);
  const authorDisplayName = authorProfile.username || authorProfile.displayName || "Anonymous B4NTERer";
  const avgReactionsPerBanter = (authorProfile.postsAuthoredCount ?? 0) > 0 ? ((authorProfile.reactionsReceivedCount ?? 0) / (authorProfile.postsAuthoredCount ?? 1)).toFixed(1) : "0.0";
  
  const authorUserForAvatar = { uid: authorProfile.uid, photoURL: authorProfile.photoURL, displayName: authorDisplayName } as any;


  return (
    <dialog id="author_profile_modal" className="modal modal-bottom sm:modal-middle" ref={dialogRef}>
      <AnimatePresence>
        {isOpen && (
          <ModalContentWrapper title={`${authorDisplayName}'s Profile`}>
            <div className="p-4 sm:p-5 max-h-[60vh] sm:max-h-[65vh] overflow-y-auto space-y-4 sm:space-y-5">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-3">
                <ProfilePhoto
                    currentUser={authorUserForAvatar} 
                    userProfile={authorProfile}       
                    onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})} 
                    size="md" 
                    editable={false}
                    className="shadow-md"
                    selectedFrameId={authorProfile.selectedAvatarFrameId} 
                    selectedFlairId={authorProfile.selectedAvatarFlairId}
                />
                <div>
                  <p id={modalTitleId} className="font-bold text-lg sm:text-xl text-primary leading-tight truncate max-w-[200px] sm:max-w-xs" title={authorDisplayName}>{authorDisplayName}</p>
                  <p className="text-xs sm:text-sm text-base-content/70">Joined: {new Date(authorProfile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <section className="p-3 sm:p-4 bg-base-200 shadow">
                <div className="flex justify-between items-center mb-1.5">
                    <h4 className="text-sm sm:text-base font-semibold text-primary flex items-center"><i className={`${authorLevel.icon} mr-2 text-lg sm:text-xl`}></i>{authorLevel.name}</h4>
                    <p className="text-sm sm:text-base font-semibold text-accent"><i className="fas fa-star mr-1.5 text-yellow-400"></i>{authorProfile.points.toLocaleString()} Banter Points</p>
                </div>
                <LevelProgressBar currentPoints={authorProfile.points} currentLevel={authorLevel} />
              </section>
              
              <section>
                <h4 className="divider divider-start text-md sm:text-lg font-semibold text-primary my-0"><i className="fas fa-chart-pie mr-2 opacity-70"></i>Activity Snapshot</h4>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm pt-2">
                {[ {label: "Banter Posted", value: authorProfile.postsAuthoredCount || 0}, {label: "Comments Made", value: authorProfile.commentsAuthoredCount || 0}, {label: "Reactions Received", value: authorProfile.reactionsReceivedCount || 0}, {label: "Avg. Reactions/Banter", value: avgReactionsPerBanter} ].map(stat => (
                    <div key={stat.label} className="stat p-2 bg-base-200 shadow place-items-center">
                        <div className="stat-value text-lg sm:text-xl text-neutral">{stat.value}</div>
                        <div className="stat-desc text-xs">{stat.label}</div>
                    </div>
                ))}
                </div>
              </section>

              <section>
                <h4 className="divider divider-start text-md sm:text-lg font-semibold text-primary my-0"><i className="fas fa-medal mr-2 opacity-70"></i>Achievements</h4>
                {authorProfile.badges && authorProfile.badges.length > 0 ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {authorProfile.badges.map(badgeId => { const badge = BADGE_DEFINITIONS[badgeId]; return badge ? (<li key={badgeId} className="flex items-start p-2 sm:p-2.5 bg-base-200 shadow hover:bg-base-300/70 transition-colors"><i className={`${badge.icon} text-xl sm:text-2xl w-8 sm:w-9 text-center mr-2.5 sm:mr-3 mt-0.5`}></i><div><h5 className="font-semibold text-sm sm:text-base">{badge.name}</h5><p className="text-xs sm:text-sm text-base-content/70">{badge.description}</p></div></li>) : null; })}
                  </ul>
                ) : (<p className="text-sm text-base-content/60 py-3 text-center"><i className="fas fa-box-open mr-2 opacity-70"></i>This user hasn't unlocked any badges yet.</p>)}
              </section>

              <section>
                <h4 className="divider divider-start text-md sm:text-lg font-semibold text-primary my-0"><i className="fas fa-history mr-2 opacity-70"></i>Recent Banters</h4>
                {authorRecentBanter.length > 0 ? (
                  <ul className="space-y-2 pt-2">
                    {authorRecentBanter.map(post => { const title = post.customTitle || post.authorUsername || post.text.substring(0,40) + (post.text.length > 40 ? '...' : ''); const totalReactions = Object.values(post.reactionSummary || {}).reduce((acc, val) => acc + (val || 0), 0); return (<li key={post.id} className="p-2 bg-base-200 shadow text-sm hover:bg-base-300/70 transition-colors"><p className="font-medium text-base-content truncate" title={title}>{title}</p><div className="text-xs text-base-content/60 flex justify-between items-center mt-0.5"><span>{formatRelativeTime(post.createdAt)}</span><div className="flex items-center gap-2"><span><i className="far fa-comment-dots fa-xs mr-0.5"></i>{post.commentCount || 0}</span><span><i className="far fa-heart fa-xs mr-0.5"></i>{totalReactions}</span></div></div></li>);})}
                  </ul>
                ) : (<p className="text-sm text-base-content/60 py-3 text-center"><i className="fas fa-feather-alt mr-2 opacity-70"></i>This user hasn't posted any banters recently.</p>)}
              </section>
            </div>
          </ModalContentWrapper>
        )}
      </AnimatePresence>
       <form method="dialog" className="modal-backdrop"><button type="button" onClick={onClose}>close</button></form>
    </dialog>
  );
};

export default AuthorProfileModal;