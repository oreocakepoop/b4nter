
import React from 'react';

const LeaderboardPageSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto py-4 sm:py-6 px-2 sm:px-4 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="skeleton-shimmer w-16 h-16 rounded-full mx-auto mb-2"></div> {/* Trophy Icon */}
        <div className="skeleton-shimmer h-8 w-3/5 sm:w-1/2 rounded mx-auto mb-2"></div> {/* Title */}
        <div className="skeleton-shimmer h-4 w-4/5 sm:w-2/3 rounded mx-auto"></div> {/* Subtitle */}
      </div>

      {/* My Banter Snapshot Skeleton */}
      <div className="card bg-base-200 shadow-lg mb-8 border border-secondary/30">
        <div className="card-body p-4 sm:p-6">
          <div className="skeleton-shimmer h-7 w-2/5 mb-4 rounded"></div> {/* Snapshot Title */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="skeleton-shimmer w-16 h-16 rounded-full flex-shrink-0"></div> {/* Avatar */}
            <div className="flex-grow w-full space-y-2">
              <div className="skeleton-shimmer h-5 w-1/2 rounded"></div> {/* Username */}
              <div className="skeleton-shimmer h-4 w-3/4 rounded"></div> {/* Level & Points */}
              <div className="skeleton-shimmer h-3 w-full rounded"></div> {/* Progress Bar */}
              <div className="flex justify-between mt-1">
                <div className="skeleton-shimmer h-3 w-1/3 rounded"></div> {/* Badges count */}
                <div className="skeleton-shimmer h-3 w-1/4 rounded"></div> {/* Rank */}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        {/* Top Banterers List Skeleton */}
        <div className="card bg-base-100 shadow-xl border border-primary/20">
          <div className="card-body p-4 sm:p-5">
            <div className="skeleton-shimmer h-6 w-1/2 mb-4 rounded"></div> {/* List Title */}
            <ul className="space-y-2.5 sm:space-y-3">
              {[...Array(5)].map((_, index) => (
                <li key={index} className="flex items-center p-2.5 sm:p-3 bg-base-100 shadow-sm border border-base-300/70 rounded-md">
                  <div className="skeleton-shimmer h-6 w-8 sm:w-10 rounded mr-2 sm:mr-3"></div> {/* Rank */}
                  <div className="skeleton-shimmer w-10 h-10 rounded-full mr-2 sm:mr-3"></div> {/* Avatar */}
                  <div className="flex-grow space-y-1.5">
                    <div className="skeleton-shimmer h-4 w-3/5 rounded"></div> {/* Username */}
                    <div className="skeleton-shimmer h-3 w-2/5 rounded"></div> {/* Level */}
                  </div>
                  <div className="skeleton-shimmer h-5 w-16 sm:w-20 rounded ml-2"></div> {/* Points */}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Placeholder for Other Leaderboards */}
        {[...Array(2)].map((_, index) => (
            <div key={`placeholder-${index}`} className="card bg-base-100 shadow-xl border border-info/20 opacity-60">
                <div className="card-body p-4 sm:p-5 items-center text-center">
                    <div className="skeleton-shimmer w-12 h-12 rounded-full mb-3"></div>
                    <div className="skeleton-shimmer h-5 w-3/4 rounded mb-2"></div>
                    <div className="skeleton-shimmer h-3 w-full rounded"></div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardPageSkeleton;