import React from 'react';
import { motion } from 'framer-motion';
import { DailyPrompt } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface DailyPromptDisplayProps {
  dailyPrompt: DailyPrompt | null;
  isLoading: boolean;
  onUsePrompt: (promptText: string) => void;
  currentTheme?: string; // Optional theme to adjust styling if needed
}

const DailyPromptDisplay: React.FC<DailyPromptDisplayProps> = ({
  dailyPrompt,
  isLoading,
  onUsePrompt,
  currentTheme
}) => {
  const handleUsePromptClick = () => {
    if (dailyPrompt && dailyPrompt.text && !dailyPrompt.error) {
      onUsePrompt(dailyPrompt.text);
    }
  };

  let cardBgClass = 'bg-info';
  let textColorClass = 'text-info-content';
  let buttonClass = 'btn-secondary';
  
  // Example of theme-specific adjustments if needed, can be expanded
  if (currentTheme === 'synthwave' || currentTheme === 'dracula' || currentTheme === 'dark') {
    cardBgClass = 'bg-neutral'; // Use neutral for better contrast on dark themes
    textColorClass = 'text-neutral-content';
    buttonClass = 'btn-primary';
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`card card-bordered shadow-lg mb-4 ${cardBgClass} ${textColorClass}`}
      role="region"
      aria-labelledby="daily-prompt-title"
    >
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-center mb-2">
          <i className="fas fa-bolt text-xl sm:text-2xl mr-3 opacity-80"></i>
          <h2 id="daily-prompt-title" className="card-title text-lg sm:text-xl font-bold">
            Today's Banter Spark ✨
          </h2>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-5">
            <LoadingSpinner size="sm" className={textColorClass} />
            <p className="ml-2 text-sm">Fueling up the spark...</p>
          </div>
        )}

        {!isLoading && dailyPrompt && (
          <>
            {dailyPrompt.error ? (
              <p className="text-sm italic py-3 text-center opacity-80">
                Oops! {dailyPrompt.text} (Error: {dailyPrompt.error})
              </p>
            ) : (
              <p className="text-base sm:text-lg leading-relaxed py-2">
                {dailyPrompt.text}
              </p>
            )}
            
            {!dailyPrompt.error && dailyPrompt.text && (
              <div className="card-actions justify-end mt-3">
                <button
                  onClick={handleUsePromptClick}
                  className={`btn btn-sm sm:btn-md ${buttonClass} shadow hover:opacity-90`}
                  aria-label="Use this prompt to create a new banter post"
                >
                  <i className="fas fa-feather-alt mr-2"></i>Banter This!
                </button>
              </div>
            )}
          </>
        )}

        {!isLoading && !dailyPrompt && (
          <p className="text-sm italic py-3 text-center opacity-80">
            The Banter Spark is still brewing... Check back in a moment!
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default DailyPromptDisplay;
