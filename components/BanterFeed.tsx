
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfessionPost, BanterFeedProps as BanterFeedPropsType, FirebaseUser, UserProfile } from '../types'; // Use aliased type
import LoadingSpinner from './LoadingSpinner';
import PostCard from './PostCard'; 

// Use the aliased type for the component props
const BanterFeedComponent: React.FC<BanterFeedPropsType> = ({ 
  isLoading, allConfessions, currentUser, userProfile, openAuthModal,
  onReact, onOpenCommentModal, onOpenReadMoreModal, onOpenAuthorProfileModal,
  onTagClick, activeTagFilter, onShareFirstBanter, onClearAllTagFilters,
  allUserProfiles // Destructure allUserProfiles
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-52 py-10" role="status" aria-live="polite">
        <LoadingSpinner size="lg" className="text-primary" /> 
        <span className="sr-only">Loading confessions...</span>
      </div>
    );
  }

  const noBanterTitle = activeTagFilter && activeTagFilter.length > 0 
    ? `No Banter for: ${activeTagFilter.map(t => `#${t}`).join(', ')}` 
    : "The Airwaves are Quiet...";
  const noBanterDescription = activeTagFilter && activeTagFilter.length > 0
    ? "Looks like this combo is waiting for its star. Or try adjusting your tags!"
    : "Crickets chirping... Be the trendsetter and share the first piece of banter!";

  if (allConfessions.length === 0) {
    return (
      <motion.div 
        className="card bg-base-100 shadow-xl border border-primary/20 mt-6 text-center" 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="card-body items-center p-6 sm:p-8">
            <motion.div
              animate={{ scale: [1, 1.15, 1, 1.1, 1], rotate: [0, 3, -3, 2, -2, 0] }}
              transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.5 }}
            >
              <i className="fas fa-microphone-slash text-6xl mb-4 text-accent opacity-70"></i>
            </motion.div>
            <h2 className="card-title text-xl sm:text-2xl text-primary justify-center"> 
              {noBanterTitle}
            </h2>
            <p className="text-base-content/80 mb-5 text-sm sm:text-base">
              {noBanterDescription}
            </p>
            <div className="card-actions justify-center space-x-3">
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={onShareFirstBanter} 
                  className="btn btn-primary btn-sm sm:btn-md" 
                >
                  <i className="fas fa-plus-circle mr-2"></i> {activeTagFilter && activeTagFilter.length > 0 ? "Post About This Combo" : "Share First Banter"}
                </motion.button>
                {activeTagFilter && activeTagFilter.length > 0 && (
                <button onClick={onClearAllTagFilters} className="btn btn-ghost btn-sm sm:btn-md"> 
                    <i className="fas fa-times mr-1.5"></i>Clear All Filters
                </button>
                )}
            </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-5 mt-4">
      <AnimatePresence>
        {allConfessions.map(post => ( 
          <PostCard 
            key={post.id} 
            post={post} 
            currentUser={currentUser}
            userProfile={userProfile} 
            onReact={onReact}
            openAuthModal={openAuthModal}
            onOpenCommentModal={onOpenCommentModal}
            onOpenReadMoreModal={onOpenReadMoreModal}
            onOpenAuthorProfileModal={onOpenAuthorProfileModal}
            onTagClick={onTagClick}
            activeTags={activeTagFilter}
            allUserProfiles={allUserProfiles} // Pass allUserProfiles here
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BanterFeedComponent;
