
import React from 'react';
import { motion } from 'framer-motion';

interface ChatMessageSkeletonProps {
  isAlternate?: boolean; // To alternate bubble alignment
  count?: number; // Number of skeleton messages to render
}

const SingleMessageSkeleton: React.FC<{isAlternate?: boolean}> = ({ isAlternate }) => {
  const randomWidthPercent = Math.floor(Math.random() * (70 - 30 + 1) + 30); // % width for bubble

  return (
    <motion.div 
      className={`flex items-end w-full my-2 ${isAlternate ? 'justify-start' : 'justify-end'}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`flex items-start max-w-[70%] sm:max-w-[60%] ${isAlternate ? 'flex-row space-x-2' : 'flex-row-reverse space-x-reverse space-x-2'}`}>
        <div className="skeleton-shimmer w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 mt-1"></div>
        <div className="flex flex-col w-full">
          {!isAlternate && ( /* Simulate name only for received messages for variety */
            <div className={`skeleton-shimmer h-2.5 rounded mb-1 ${isAlternate ? 'self-start' : 'self-end'}`} style={{width: '40%'}}></div>
          )}
          <div className={`skeleton-shimmer p-3 rounded-xl h-10 sm:h-12`} style={{ width: `${randomWidthPercent}%` }}>
            {/* Inner lines for more realism (optional) */}
            {/* <div className="skeleton-shimmer h-2 rounded w-5/6 mb-1 bg-opacity-50"></div>
            <div className="skeleton-shimmer h-2 rounded w-3/4 bg-opacity-50"></div> */}
          </div>
          <div className={`skeleton-shimmer h-2 rounded mt-1 ${isAlternate ? 'self-start' : 'self-end'}`} style={{width: '25%'}}></div>
        </div>
      </div>
    </motion.div>
  );
}


const ChatMessageSkeleton: React.FC<ChatMessageSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="p-2 sm:p-3 space-y-1">
      {[...Array(count)].map((_, index) => (
        <SingleMessageSkeleton key={index} isAlternate={index % 2 === 0} />
      ))}
    </div>
  );
};

export default ChatMessageSkeleton;