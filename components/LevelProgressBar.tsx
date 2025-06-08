
import React from 'react';
import { motion } from 'framer-motion';
import { BanterLevel } from '../types';
import { BANTER_LEVELS, getNextLevel, DEFAULT_LEVEL } from '../utils/banterLevels';

interface LevelProgressBarProps {
  currentPoints: number;
  currentLevel: BanterLevel;
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({ currentPoints, currentLevel }) => {
  let progressPercentage = 0;
  let pointsForNextLevelDisplay = currentLevel.maxPoints;
  let pointsNeededText = '';
  let isMaxLevel = false;

  if (currentLevel.name === BANTER_LEVELS[BANTER_LEVELS.length - 1].name && currentLevel.maxPoints === Infinity) {
    progressPercentage = 100;
    isMaxLevel = true;
    pointsNeededText = "Max Level Achieved!";
  } else {
    const levelMin = currentLevel.name === DEFAULT_LEVEL.name ? 0 : currentLevel.minPoints;
    const levelMax = currentLevel.maxPoints;

    if (levelMax === Infinity || levelMax <= levelMin) {
        progressPercentage = 100;
    } else {
        const pointsInLevel = Math.max(0, currentPoints - levelMin);
        const pointsForLevelSpan = levelMax - levelMin;
        progressPercentage = pointsForLevelSpan > 0 ? Math.min(100, (pointsInLevel / pointsForLevelSpan) * 100) : 0;
    }
    
    pointsForNextLevelDisplay = levelMax;
    const pointsToNext = pointsForNextLevelDisplay - currentPoints;

    if (pointsToNext > 0) {
        pointsNeededText = `${pointsToNext.toLocaleString()} more points to ${getNextLevel(currentPoints)?.name || 'next level'}`;
    } else if (pointsToNext === 0 && !isMaxLevel) {
        pointsNeededText = `Reached ${currentLevel.name}! Aim for ${getNextLevel(currentPoints)?.name || 'the next challenge'}!`;
    } else if (isMaxLevel) {
        pointsNeededText = "Max Level Achieved!";
    } else {
        pointsNeededText = `Onwards to ${getNextLevel(currentPoints)?.name || 'glory'}!`;
    }
  }

  return (
    <div className="w-full my-1">
      <div className="flex justify-between text-xs text-base-content/80 mb-0.5 px-0.5">
        <span>{currentLevel.name}</span>
        {!isMaxLevel && <span>{currentPoints.toLocaleString()} / {pointsForNextLevelDisplay.toLocaleString()} pts</span>}
      </div>
      {/* DaisyUI progress bar. Use motion.progress if direct animation of value is needed, otherwise style width for visual effect. */}
      <div className="w-full bg-base-300 h-2.5 shadow-inner overflow-hidden">
        <motion.div
          className="progress progress-primary h-full" // Using DaisyUI progress and primary color
          style={{width: `${progressPercentage}%`}} // Animate width directly or use value prop if motion.progress
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {pointsNeededText && <p className="text-xs text-base-content/70 mt-0.5 text-center px-1">{pointsNeededText}</p>}
    </div>
  );
};

export default LevelProgressBar;