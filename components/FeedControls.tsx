
import React, { useState } from 'react';
import { motion } from 'framer-motion';
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; 
import { FeedControlsProps, FirebaseUser, ImagePresenceFilter } from '../types'; // Updated to import full props type, Added FirebaseUser, ImagePresenceFilter
import PopularTagsCloud from './PopularTagsCloud';

const sortOptions: { label: string; value: FeedControlsProps['sortBy']; icon?: string }[] = [
  { label: 'Latest', value: 'latest', icon: 'fa-solid fa-clock-rotate-left' },
  { label: 'Hot', value: 'hot', icon: 'fa-solid fa-fire text-error' }, // Added text-error for Hot icon
  { label: 'Top Liked', value: 'mostLiked', icon: 'fa-solid fa-heart text-secondary' }, // Added text-secondary
  { label: 'Most Discussed', value: 'mostCommented', icon: 'fa-solid fa-comments text-info' }, // Added text-info
];

const FeedControlsComponent: React.FC<FeedControlsProps> = ({ 
  currentUser, userProfile, pointsTooltipText, sortBy, setSortBy, allPosts, onTagClick, activeTagFilter, onClearAllTagFilters,
  searchKeyword, setSearchKeyword, onApplyKeywordSearch,
  filterUsername, setFilterUsername,
  filterImagePresence, setFilterImagePresence,
  onClearAdvancedFilters
}) => {
  const [internalSearchKeyword, setInternalSearchKeyword] = useState(searchKeyword);

  const handleKeywordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalSearchKeyword(e.target.value);
  };

  const handleKeywordSearchSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    setSearchKeyword(internalSearchKeyword); // Update parent state for actual filtering
    onApplyKeywordSearch();
  };
  
  const handleClearKeywordSearch = () => {
    setInternalSearchKeyword("");
    setSearchKeyword("");
    onApplyKeywordSearch(); // Trigger re-filter with empty keyword
  };

  return (
    <div className="mb-3 sticky top-[var(--navbar-height)] bg-base-200 z-40 py-2 shadow-md px-1 sm:px-0">
      {/* Row 1: Title, Points, Sort (Desktop) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <motion.h1 
            className="text-2xl sm:text-3xl font-extrabold text-primary"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          >
            The Banter Feed
          </motion.h1>
          {currentUser && userProfile && userProfile.points !== undefined && (
            <div className="tooltip tooltip-bottom sm:tooltip-right" data-tip={pointsTooltipText}>
              <motion.div 
                className="badge badge-lg badge-accent shadow-md gap-1 sm:gap-1.5"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.2, type: "spring", stiffness: 150 }}
              >
                <i className="fas fa-star text-xs"></i>
                <span className="font-bold text-xs">{userProfile.points} Banter Points</span>
              </motion.div>
            </div>
          )}
        </div>
        
        <div className="dropdown dropdown-end sm:hidden self-end mb-2 sm:mb-0">
          <button tabIndex={0} className="btn btn-sm btn-outline btn-neutral">
            <i className="fas fa-sort mr-1"></i> Sort <i className="fas fa-chevron-down fa-xs ml-1"></i>
          </button>
          <ul tabIndex={0} className="dropdown-content menu p-1.5 shadow bg-base-200 rounded-box w-48 z-[50]"> {/* Increased z-index for dropdown */}
            {sortOptions.map(opt => (
              <li key={opt.value}>
                <button 
                  onClick={() => setSortBy(opt.value)}
                  className={`w-full text-left text-xs py-1.5 px-2 rounded-md ${sortBy === opt.value ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`}
                >
                  {opt.icon && <i className={`${opt.icon} mr-1.5 ${sortBy === opt.value ? '' : 'opacity-70'}`}></i>}
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden sm:flex space-x-1.5">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`btn btn-sm ${sortBy === opt.value ? 'btn-primary shadow-md' : 'btn-ghost'}`}
              title={`Sort by ${opt.label}`}
            >
              {opt.icon && <i className={`${opt.icon} mr-1 ${sortBy === opt.value ? '' : 'opacity-70'}`}></i>}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Search and Advanced Filters */}
      <form onSubmit={handleKeywordSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
        <div className="relative flex-grow">
          <input 
            type="search" 
            placeholder="Search banter by keyword..." 
            className="input input-bordered input-sm w-full pr-10" 
            value={internalSearchKeyword}
            onChange={handleKeywordInputChange}
            aria-label="Search banter by keyword"
          />
          {internalSearchKeyword && (
             <button type="button" onClick={handleClearKeywordSearch} className="btn btn-xs btn-ghost btn-circle absolute top-1/2 right-10 transform -translate-y-1/2" aria-label="Clear keyword search">
                <i className="fas fa-times opacity-50"></i>
             </button>
          )}
        </div>
        <button type="submit" className="btn btn-sm btn-primary sm:w-auto">
          <i className="fas fa-search mr-1.5"></i>Search
        </button>
        <div className="dropdown dropdown-end">
          <button type="button" tabIndex={0} className="btn btn-sm btn-outline btn-neutral w-full sm:w-auto">
            <i className="fas fa-filter mr-1.5"></i>Advanced Filters
          </button>
          <div tabIndex={0} className="dropdown-content menu p-3 shadow bg-base-300 rounded-box w-64 sm:w-72 mt-1 z-[50]"> {/* Increased z-index */}
            <div className="form-control mb-3">
              <label className="label pb-1 pt-0"><span className="label-text text-xs">Filter by Username:</span></label>
              <input 
                type="text" 
                placeholder="Enter username..." 
                className="input input-xs" 
                value={filterUsername}
                onChange={(e) => setFilterUsername(e.target.value)}
              />
            </div>
            <div className="form-control mb-3">
              <label className="label pb-1 pt-0"><span className="label-text text-xs">Image Content:</span></label>
              <div className="flex flex-col gap-1">
                {(['all', 'with', 'without'] as ImagePresenceFilter[]).map(option => (
                  <label key={option} className="label cursor-pointer p-0 justify-start text-xs">
                    <input 
                      type="radio" 
                      name="image-filter" 
                      className="radio radio-xs radio-primary mr-2" 
                      value={option}
                      checked={filterImagePresence === option}
                      onChange={() => setFilterImagePresence(option)}
                    />
                    <span className="label-text text-xs capitalize">{option === 'with' ? 'With Image' : option === 'without' ? 'Without Image' : 'All Posts'}</span>
                  </label>
                ))}
              </div>
            </div>
            <button 
                onClick={onClearAdvancedFilters} 
                className="btn btn-xs btn-ghost text-error hover:bg-error hover:text-error-content w-full mt-2"
                type="button"
            >
              Clear Advanced Filters
            </button>
          </div>
        </div>
      </form>
      
      {/* Row 3: Popular Tags */}
      <div className="mt-1">
        <PopularTagsCloud 
          allConfessions={allPosts} 
          onTagClick={onTagClick}
          activeTags={activeTagFilter}
          onClearAllTagFilters={onClearAllTagFilters}
        />
      </div>
    </div>
  );
};

export default FeedControlsComponent;