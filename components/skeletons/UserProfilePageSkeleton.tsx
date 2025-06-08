
import React from 'react';
import PostCardSkeleton from './PostCardSkeleton'; // Assuming PostCardSkeleton exists

const UserProfilePageSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 animate-pulse">
      {/* Profile Header Skeleton */}
      <div className="card bg-base-100 shadow-xl mb-6 border border-primary/20">
        <div className="card-body p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="skeleton-shimmer w-24 h-24 lg:w-32 lg:h-32 rounded-full flex-shrink-0"></div>
            <div className="flex-grow text-center sm:text-left w-full space-y-2 mt-2 sm:mt-0">
              <div className="skeleton-shimmer h-8 w-3/4 sm:w-1/2 rounded mx-auto sm:mx-0"></div> {/* Username */}
              <div className="skeleton-shimmer h-4 w-1/2 sm:w-1/3 rounded mx-auto sm:mx-0"></div> {/* Joined date */}
              <div className="skeleton-shimmer h-6 w-full mt-3 rounded"></div> {/* Level Progress Bar Area */}
              <div className="skeleton-shimmer h-5 w-1/3 sm:w-1/4 rounded mx-auto sm:mx-0"></div> {/* Points */}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
        {/* Recent Banters Skeleton (takes more space) */}
        <div className="card bg-base-200 shadow-lg lg:col-span-2">
          <div className="card-body p-3 sm:p-5">
            <div className="skeleton-shimmer h-7 w-3/5 mb-4 rounded"></div> {/* Section Title */}
            <div className="space-y-4">
              {[...Array(2)].map((_, index) => ( // Two PostCardSkeletons
                <PostCardSkeleton key={`post-skel-${index}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Stats & Accolades Skeleton */}
        <div className="card bg-base-200 shadow-lg row-start-3 md:row-start-auto lg:row-start-auto">
          <div className="card-body p-3 sm:p-5">
            <div className="skeleton-shimmer h-7 w-1/2 mb-4 rounded"></div> {/* Section Title */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[...Array(4)].map((_, i) => (
                <div key={`stat-skel-${i}`} className="p-2 bg-base-300/50 shadow rounded-md space-y-1.5">
                  <div className="skeleton-shimmer h-3 w-3/4 rounded mx-auto"></div> {/* Stat title */}
                  <div className="skeleton-shimmer h-6 w-1/2 rounded mx-auto"></div> {/* Stat value */}
                </div>
              ))}
            </div>
            <div className="skeleton-shimmer h-5 w-1/3 mb-3 rounded"></div> {/* Badges Subtitle */}
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={`badge-skel-${i}`} className="flex items-start p-2.5 bg-base-100 shadow-sm rounded-md">
                  <div className="skeleton-shimmer w-8 h-8 rounded-md mr-3"></div> {/* Badge Icon */}
                  <div className="flex-grow space-y-1">
                    <div className="skeleton-shimmer h-4 w-3/4 rounded"></div> {/* Badge Name */}
                    <div className="skeleton-shimmer h-3 w-full rounded"></div> {/* Badge Desc */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Echoes (Comments) Skeleton */}
        <div className="card bg-base-200 shadow-lg md:col-span-2 lg:col-span-1 row-start-2 md:row-start-auto lg:row-start-auto">
          <div className="card-body p-3 sm:p-5">
            <div className="skeleton-shimmer h-7 w-4/5 mb-4 rounded"></div> {/* Section Title */}
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={`comment-skel-${i}`} className="card card-compact bg-base-100 shadow-sm p-2.5 rounded-md">
                  <div className="skeleton-shimmer h-3 w-full rounded mb-1"></div>
                  <div className="skeleton-shimmer h-3 w-5/6 rounded mb-1.5"></div>
                  <div className="skeleton-shimmer h-2.5 w-1/2 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePageSkeleton;