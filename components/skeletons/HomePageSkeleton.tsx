
import React from 'react';
import PostCardSkeleton from './PostCardSkeleton';

const HomePageSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto py-2 sm:py-3 px-0 sm:px-2 animate-pulse">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Trending Sidebar Skeleton */}
        <aside className="hidden md:block md:w-64 lg:w-72 xl:w-80 sticky top-[calc(var(--navbar-height,4rem)+1rem)] self-start shrink-0">
          <div className="card card-compact bg-base-100 shadow-lg border border-base-300/60">
            <div className="card-body p-3">
              <div className="skeleton-shimmer h-6 w-3/4 mb-3 rounded"></div> {/* Header */}
              <div className="space-y-2.5">
                {[...Array(1)].map((_, i) => ( // Supernova post
                  <div key={`trending-main-${i}`} className="p-2 border border-base-300/50 rounded-md">
                    <div className="flex items-center mb-1.5">
                      <div className="skeleton-shimmer w-8 h-8 rounded-full mr-2"></div>
                      <div className="flex-grow space-y-1">
                        <div className="skeleton-shimmer h-3 w-4/5 rounded"></div>
                        <div className="skeleton-shimmer h-2 w-3/5 rounded"></div>
                      </div>
                    </div>
                    <div className="skeleton-shimmer h-2.5 w-full rounded mb-1"></div>
                    <div className="skeleton-shimmer h-2.5 w-5/6 rounded mb-2"></div>
                    <div className="flex justify-between">
                      <div className="skeleton-shimmer h-3 w-1/3 rounded"></div>
                      <div className="skeleton-shimmer h-3 w-1/4 rounded"></div>
                    </div>
                  </div>
                ))}
                {[...Array(3)].map((_, i) => ( // Other trending posts
                  <div key={`trending-sub-${i}`} className="p-1.5 border border-base-300/30 rounded">
                     <div className="flex items-start space-x-1.5">
                        <div className="skeleton-shimmer w-3 h-3 rounded-full mt-0.5"></div>
                        <div className="flex-grow space-y-1">
                            <div className="skeleton-shimmer h-2.5 w-full rounded"></div>
                             <div className="skeleton-shimmer h-2 w-1/2 rounded"></div>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area Skeleton */}
        <main className="flex-grow min-w-0">
          {/* Feed Controls Skeleton */}
          <div className="mb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div className="skeleton-shimmer h-8 w-48 rounded"></div> {/* Title */}
              <div className="hidden sm:flex space-x-1.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton-shimmer h-8 w-24 rounded-md"></div> /* Sort buttons */
                ))}
              </div>
            </div>
            {/* Popular Tags Skeleton */}
            <div className="card bg-base-100 shadow-md border border-base-300/40 mb-4">
              <div className="card-body p-3">
                <div className="skeleton-shimmer h-5 w-40 mb-2 rounded"></div> {/* Tags Header */}
                <div className="flex flex-wrap gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton-shimmer h-5 w-16 rounded-full"></div> /* Tag items */
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Daily Prompt Skeleton */}
          <div className="card card-bordered shadow-lg mb-4 bg-info/20">
            <div className="card-body p-4 sm:p-5">
                <div className="flex items-center mb-2">
                    <div className="skeleton-shimmer w-8 h-8 rounded-full mr-3"></div>
                    <div className="skeleton-shimmer h-6 w-1/2 rounded"></div>
                </div>
                <div className="skeleton-shimmer h-4 w-full rounded my-1"></div>
                <div className="skeleton-shimmer h-4 w-4/5 rounded my-1"></div>
                <div className="flex justify-end mt-3">
                    <div className="skeleton-shimmer h-8 w-28 rounded-md"></div>
                </div>
            </div>
          </div>


          {/* Post Feed Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:gap-5 mt-4">
            {[...Array(3)].map((_, index) => ( // Render 3 PostCardSkeletons
              <PostCardSkeleton key={index} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePageSkeleton;