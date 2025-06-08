
import React, { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfessionPost } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';
import { formatDistanceToNowStrict } from 'date-fns/formatDistanceToNowStrict'; 
import LoadingSpinner from './LoadingSpinner';
import ProfilePhoto from './ProfilePhoto';
import { awardTrendingMilestone } from '../utils/firebaseUtils';
import { calculatePostStarPower } from '../utils/postUtils'; // Added import

interface TrendingBanterSidebarProps {
  allConfessions: ConfessionPost[];
  isLoadingConfessions: boolean;
  onOpenReadMoreModal: (post: ConfessionPost) => void;
}

const TRENDING_COUNT = 5;

// Removed local calculateStarPower as it's now imported from postUtils

const TrendingBanterSidebar: React.FC<TrendingBanterSidebarProps> = ({ allConfessions, isLoadingConfessions, onOpenReadMoreModal }) => {
  const trendingPosts = useMemo(() => {
    if (isLoadingConfessions || !allConfessions.length) return [];
    return [...allConfessions]
      .map(post => ({ ...post, starPower: calculatePostStarPower(post) })) // Use imported utility
      .sort((a, b) => b.starPower - a.starPower)
      .slice(0, TRENDING_COUNT);
  }, [allConfessions, isLoadingConfessions]);

  useEffect(() => {
    if (!isLoadingConfessions && trendingPosts.length > 0) {
      trendingPosts.forEach((post, index) => {
        if (post.userId) {
          if (index < TRENDING_COUNT && !post.hasBeenInTop5) {
            awardTrendingMilestone(post.id, post.userId, 'top5', 'Banter System', undefined) // Added actor info
              .catch(err => console.error(`Error awarding 'top5' milestone for post ${post.id}:`, err));
          }
          if (index === 0 && !post.hasBeenSupernova) {
            awardTrendingMilestone(post.id, post.userId, 'supernova', 'Banter System', undefined) // Added actor info
              .catch(err => console.error(`Error awarding 'supernova' milestone for post ${post.id}:`, err));
          }
        }
      });
    }
  }, [trendingPosts, isLoadingConfessions]);

  const sidebarVariants = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "circOut" } } };
  const cardContentVariants = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } };

  const renderEmptyState = () => (
    <motion.div variants={itemVariants} className="text-center py-8 px-3 text-base-content/60">
      <i className="fas fa-moon-stars text-4xl mb-3 text-info opacity-70"></i>
      <p className="font-semibold text-info text-sm mb-1">Galaxy is Quiet</p>
      <p className="text-xs">No stars shining brightly right now. Be the first!</p>
    </motion.div>
  );
  
  const SupernovaPost: React.FC<{ post: ConfessionPost & { starPower: number } }> = ({ post }) => {
    const timeInOrbit = post.firstReachedSupernovaAt
      ? `Shining for ${formatDistanceToNowStrict(new Date(post.firstReachedSupernovaAt), { addSuffix: false })}`
      : `First Seen: ${formatRelativeTime(post.createdAt)}`;
    const authorDisplayName = post.authorUsername || post.wittyDisplayName || "Anonymous";
    const authorUserForAvatar = { uid: post.userId, photoURL: post.authorPhotoURL, displayName: authorDisplayName } as any; 
    const authorProfileForAvatar = { photoURL: post.authorPhotoURL, username: post.authorUsername, displayName: authorDisplayName, selectedAvatarFrameId: post.authorSelectedFrameId, selectedFlairId: post.authorSelectedFlairId } as any;

    return (
        <motion.button 
            variants={itemVariants} 
            className="card card-compact w-full text-left bg-gradient-to-br from-primary via-primary/80 to-secondary/70 text-primary-content shadow-xl border-2 border-yellow-400 p-0.5 hover:brightness-110 transition-all duration-200 ease-in-out"
            onClick={() => onOpenReadMoreModal(post)}
            aria-label={`View trending post: ${post.customTitle || post.text.substring(0,30)}`}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="bg-base-100 text-base-content p-2 sm:p-3"> {/* Inner card for content styling */}
                <div className="flex items-center mb-1.5">
                    <motion.i 
                        className="fas fa-sun text-3xl text-orange-400 mr-2 drop-shadow-[0_0_5px_rgba(251,146,60,0.7)]"
                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                        transition={{ duration: 5, ease: "linear", repeat: Infinity }}
                    ></motion.i>
                    <div className="min-w-0 flex-1"> {/* Ensure inner div can shrink */}
                        <h3 className="font-bold text-sm text-primary truncate" title={post.customTitle || post.text}>{post.customTitle || post.text.substring(0,30) + "..."}</h3>
                        <div className="text-xs text-base-content/70 flex items-center">
                        <ProfilePhoto 
                            currentUser={authorUserForAvatar} 
                            userProfile={authorProfileForAvatar} 
                            size="sm" 
                            editable={false} 
                            className="!w-4 !h-4 mr-1" 
                            selectedFrameId={post.authorSelectedFrameId as string} 
                            selectedFlairId={post.authorSelectedFlairId as string}
                            onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})}
                        />
                        <span className="truncate max-w-[100px]" title={authorDisplayName}>{authorDisplayName}</span>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-base-content/80 line-clamp-2 mb-1 break-words">{post.text}</p>
                <div className="flex justify-between items-center text-[0.65rem] text-base-content/60 mt-1 pt-1 border-t border-base-300/50">
                    <span className="font-semibold"><i className="fas fa-star-shooting mr-1 text-accent"></i>Star Power: {post.starPower.toFixed(1)}</span>
                    <div className="flex gap-2">
                        <span><i className="fas fa-heart text-error/80"></i> {Object.values(post.reactionSummary || {}).reduce((s,c)=>s+c,0)}</span>
                        <span><i className="fas fa-comments text-info/80"></i> {post.commentCount || 0}</span>
                    </div>
                </div>
                <p className="text-[0.6rem] text-center text-yellow-500/90 font-medium mt-1">{timeInOrbit}</p>
            </div>
        </motion.button>
    );
  };

  const StarPostItem: React.FC<{post: ConfessionPost & { starPower: number }, type: 'bright' | 'twinkle'}> = ({ post, type }) => {
    const icon = type === 'bright' ? "fas fa-star text-yellow-400" : "far fa-star text-slate-400";
    const authorDisplayName = post.authorUsername || post.wittyDisplayName || "Anonymous";
    const authorUserForAvatar = { uid: post.userId, photoURL: post.authorPhotoURL, displayName: authorDisplayName } as any;
    const authorProfileForAvatar = { photoURL: post.authorPhotoURL, username: post.authorUsername, displayName: authorDisplayName, selectedAvatarFrameId: post.authorSelectedFrameId, selectedFlairId: post.authorSelectedFlairId } as any;

    return (
      <motion.li 
        variants={itemVariants} 
        className="list-none" // Remove default list styling if parent is ul
      >
        <motion.button 
            className="w-full text-left bg-base-100 hover:bg-base-200/70 transition-colors duration-150 ease-in-out border border-base-300/50 shadow-sm hover:shadow-md"
            onClick={() => onOpenReadMoreModal(post)}
            aria-label={`View trending post: ${post.customTitle || post.text.substring(0,25)}`}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
        >
            <div className="p-1.5 sm:p-2">
            <div className="flex items-start space-x-1.5">
                <span className={`text-xs pt-0.5 ${icon.split(' ')[1]}`}><i className={icon.split(' ')[0]}></i></span>
                <div className="flex-grow overflow-hidden">
                    <p className="text-xs font-semibold text-primary hover:text-primary-focus truncate transition-colors" title={post.customTitle || post.text}>
                        {post.customTitle || post.text.substring(0,25) + "..."}
                    </p>
                    {type === 'bright' && (
                        <div className="text-[0.65rem] text-base-content/70 flex items-center">
                            <ProfilePhoto 
                                currentUser={authorUserForAvatar} 
                                userProfile={authorProfileForAvatar} 
                                size="sm" 
                                editable={false} 
                                className="!w-3 !h-3 mr-1" 
                                selectedFrameId={post.authorSelectedFrameId as string} 
                                selectedFlairId={post.authorSelectedFlairId as string}
                                onUpdateAvatarCustomization={async () => ({ success: false, error: "Not editable here"})}
                            />
                            <span className="truncate max-w-[80px]" title={authorDisplayName}>{authorDisplayName}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center text-[0.6rem] text-base-content/60 mt-0.5 pt-0.5 border-t border-base-300/30">
                <span className="font-medium"><i className="fas fa-star-shooting mr-0.5 text-accent/80"></i>{post.starPower.toFixed(1)}</span>
                {type === 'bright' && (
                    <div className="flex gap-1.5">
                        <span><i className="fas fa-heart text-error/70"></i> {Object.values(post.reactionSummary || {}).reduce((s,c)=>s+c,0)}</span>
                        <span><i className="fas fa-comments text-info/70"></i> {post.commentCount || 0}</span>
                    </div>
                )}
            </div>
            </div>
        </motion.button>
      </motion.li>
    );
  };


  return (
    <motion.aside 
        className="hidden md:block md:w-64 lg:w-72 xl:w-80 sticky top-[calc(var(--navbar-height,4rem)+1rem)] self-start shrink-0 print:hidden" 
        variants={sidebarVariants} 
        initial="hidden" 
        animate="visible" 
        exit="hidden" 
        aria-labelledby="trending-banter-header"
    >
      <div className="card card-compact bg-base-100 shadow-lg border border-base-300/60">
        <div className="card-body p-3">
          <div className="flex items-center mb-2 pb-1.5 border-b border-primary/30 min-w-0"> {/* Added min-w-0 here */}
            <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.5 }}>
              <i className="fas fa-meteor text-primary text-lg mr-2"></i>
            </motion.div>
            <h2 id="trending-banter-header" className="text-base font-semibold text-primary !pb-0 truncate flex-1 min-w-0" title="Galaxy of Banter ✨">Galaxy of Banter ✨</h2> {/* Added truncate and min-w-0 */}
          </div>
          <div className="min-h-[200px] max-h-[calc(100vh-15rem)] overflow-y-auto pr-0.5 custom-scrollbar" role="region" aria-label="Top 5 Trending Banter">
            <AnimatePresence mode="wait">
              <motion.div key="trending-list-content" variants={cardContentVariants} initial="initial" animate="animate" exit="initial">
                {isLoadingConfessions ? (
                  <div className="flex justify-center items-center h-32" role="status" aria-live="polite">
                    <LoadingSpinner className="text-primary" size="md" />
                    <span className="sr-only">Loading trending banter...</span>
                  </div>
                ) : trendingPosts.length === 0 ? renderEmptyState() : (
                  <ul className="space-y-2">
                    {trendingPosts.map((post, index) => {
                      if (index === 0) return <SupernovaPost key={post.id} post={post as ConfessionPost & { starPower: number }} />;
                      if (index === 1 || index === 2) return <StarPostItem key={post.id} post={post as ConfessionPost & { starPower: number }} type="bright" />;
                      return <StarPostItem key={post.id} post={post as ConfessionPost & { starPower: number }} type="twinkle" />;
                    })}
                  </ul>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default TrendingBanterSidebar;
