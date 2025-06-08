
import React from 'react';
import { motion } from 'framer-motion';

const PostCardSkeleton: React.FC = () => {
  const randomWidth = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

  return (
    <motion.div 
      className="card bg-base-100 shadow-lg border border-base-300/40 overflow-hidden"
      initial={{ opacity: 0.5 }} // Start slightly visible for smoother perceived load
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card-body p-3 sm:p-4">
        {/* Author Info Skeleton */}
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
          <div className="skeleton-shimmer w-10 h-10 sm:w-11 sm:h-11 rounded-full flex-shrink-0"></div>
          <div className="flex-grow space-y-1.5">
            <div className="skeleton-shimmer h-3 sm:h-3.5 rounded w-3/5"></div>
            <div className="skeleton-shimmer h-2.5 sm:h-3 rounded w-2/5"></div>
          </div>
        </div>

        {/* Title Skeleton */}
        <div className="skeleton-shimmer h-5 sm:h-6 rounded w-4/5 mb-2"></div>
        
        {/* Image Placeholder (Optional) - uncomment if posts often have images */}
        {/* <div className="skeleton-shimmer h-40 sm:h-48 rounded-md my-2"></div> */}

        {/* Text Content Skeleton */}
        <div className="space-y-2 mb-3">
          <div className="skeleton-shimmer h-3 sm:h-3.5 rounded w-full"></div>
          <div className="skeleton-shimmer h-3 sm:h-3.5 rounded w-[${randomWidth(70,95)}%]"></div>
          <div className="skeleton-shimmer h-3 sm:h-3.5 rounded w-[${randomWidth(60,85)}%]"></div>
        </div>

        {/* Tags Skeleton */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[...Array(randomWidth(1,3))].map((_, i) => (
            <div key={i} className="skeleton-shimmer h-4 sm:h-5 rounded-full w-[${randomWidth(40,80)}px]"></div>
          ))}
        </div>

        {/* Actions Skeleton */}
        <div className="flex justify-between items-center border-t border-base-300/50 pt-2.5">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="skeleton-shimmer h-6 w-16 sm:h-7 sm:w-20 rounded-md"></div>
            <div className="skeleton-shimmer h-6 w-20 sm:h-7 sm:w-24 rounded-md"></div>
          </div>
          <div className="skeleton-shimmer h-6 w-16 sm:h-7 sm:w-20 rounded-md"></div>
        </div>
      </div>
    </motion.div>
  );
};

export default PostCardSkeleton;