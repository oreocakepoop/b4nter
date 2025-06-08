
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ConfessionPost } from '../types';

interface PopularTagsCloudProps {
  allConfessions: ConfessionPost[];
  onTagClick: (tag: string) => void;
  activeTags: string[];
  onClearAllTagFilters: () => void;
}

const PopularTagsCloud: React.FC<PopularTagsCloudProps> = ({ allConfessions, onTagClick, activeTags, onClearAllTagFilters }) => {
  const popularTags = useMemo(() => {
    const tagCounts: { [key: string]: number } = {};
    allConfessions.forEach(post => {
      post.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));
  }, [allConfessions]);

  const allUniqueTags = useMemo(() => {
    const uniqueTags = new Set<string>();
    allConfessions.forEach(post => post.tags?.forEach(tag => uniqueTags.add(tag)));
    return Array.from(uniqueTags);
  }, [allConfessions]);

  if (popularTags.length === 0 && activeTags.length === 0 && allUniqueTags.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const getTagStyle = (count: number, maxCount: number) => {
    const minFontSize = 0.7; // rem
    const maxFontSize = 1.0; // rem
    if (maxCount === 0 || maxCount === 1 || popularTags.length <= 1) return { fontSize: `${minFontSize}rem` };
    const scale = Math.min(1, Math.log1p(count) / Math.log1p(maxCount)); // Use log scale for better differentiation
    const fontSize = minFontSize + scale * (maxFontSize - minFontSize);
    return { fontSize: `${fontSize}rem`, padding: '0.2rem 0.4rem' }; // Adjust padding
  };

  const maxTagCount = popularTags.length > 0 ? Math.max(...popularTags.map(t => t.count)) : 1;

  const handleRandomTagClick = () => {
    if (allUniqueTags.length > 0) {
        const randomTag = allUniqueTags[Math.floor(Math.random() * allUniqueTags.length)];
        onTagClick(randomTag); // This will add to selection or toggle
    }
  };

  return (
    <motion.div
      className="card bg-base-100 shadow-md border border-base-300/40 mb-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="card-body p-3 flex flex-col sm:flex-row sm:flex-wrap justify-between items-start gap-2">
        <div className="flex-grow min-w-0">
          <h3 className="card-title text-base font-semibold text-primary !pb-0 mb-2 flex items-center">
            <i className="fas fa-tags mr-1.5 text-accent"></i>Popular Banter Tags
            {activeTags.length > 0 && <span className="text-xs font-normal text-base-content/70 ml-1">({activeTags.length}/5 selected)</span>}
          </h3>
          {popularTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map(({ tag, count }) => (
                <motion.button
                  key={tag}
                  onClick={() => onTagClick(tag)}
                  className={`btn btn-xs ${activeTags.includes(tag) ? 'btn-neutral' : 'btn-outline btn-secondary'} transition-all duration-200 ease-in-out transform hover:scale-105 normal-case`}
                  variants={itemVariants}
                  style={getTagStyle(count, maxTagCount)}
                  title={`${count} posts tagged with #${tag}. ${activeTags.includes(tag) ? 'Click to deselect.' : (activeTags.length < 5 ? 'Click to select.' : 'Max 5 tags selected.')}`}
                  disabled={!activeTags.includes(tag) && activeTags.length >= 5}
                >
                  #{tag}
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-base-content/60 italic mt-1">No popular tags to show yet.</p>
          )}
        </div>

        <div className="flex-shrink-0 sm:ml-4 mt-3 sm:mt-0 text-xs text-right sm:text-left self-center sm:self-auto">
          {activeTags.length > 0 ? (
            <motion.div variants={itemVariants} className="flex flex-col items-end sm:items-start">
              <p className="text-base-content/70 mb-0.5">Filtering by:</p>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {activeTags.map(tag => (
                  <span key={tag} className="badge badge-neutral badge-sm truncate" title={tag}>#{tag}</span>
                ))}
              </div>
              <button
                onClick={onClearAllTagFilters} 
                className="btn btn-xs btn-ghost text-error hover:bg-error hover:text-error-content"
                title="Clear all tag filters"
              >
                <i className="fas fa-times mr-1"></i> Clear All Filters
              </button>
            </motion.div>
          ) : allUniqueTags.length > 0 ? (
            <motion.div variants={itemVariants}>
              <button
                onClick={handleRandomTagClick}
                className="btn btn-xs btn-outline btn-accent hover:bg-accent hover:text-accent-content"
                title="Discover a random tag"
              >
                <i className="fas fa-dice mr-1"></i> Random Tag
              </button>
            </motion.div>
          ) : (
            <p className="text-xs text-base-content/50 italic mt-1 sm:mt-0">No tags available.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PopularTagsCloud;
