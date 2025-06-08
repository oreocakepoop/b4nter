
import React from 'react';
import { motion } from 'framer-motion';

interface ChatUserListItemSkeletonProps {
  count?: number; // Number of skeleton items to render
}

const SingleUserItemSkeleton: React.FC = () => {
  return (
    <motion.div 
      className="p-1.5 flex items-center space-x-2 sm:space-x-2.5"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="skeleton-shimmer w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0"></div>
      <div className="flex-grow space-y-1.5">
        <div className="skeleton-shimmer h-3 rounded w-3/4"></div>
        {/* Optional second line for streak or status */}
        {/* <div className="skeleton-shimmer h-2 rounded w-1/2"></div> */}
      </div>
    </motion.div>
  );
};


const ChatUserListItemSkeleton: React.FC<ChatUserListItemSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="p-1.5 sm:p-2 space-y-1">
      {[...Array(count)].map((_, index) => (
        <SingleUserItemSkeleton key={index} />
      ))}
    </div>
  );
};

export default ChatUserListItemSkeleton;