
import { BanterLevel } from '../types';

export const BANTER_LEVELS: BanterLevel[] = [
  { name: "Rookie Roaster", minPoints: 1, maxPoints: 100, icon: "fas fa-feather-alt" }, // Max points of this level is the entry for next level's progress
  { name: "Comeback Apprentice", minPoints: 101, maxPoints: 1000, icon: "fas fa-user-graduate" },
  { name: "Punchline Pro", minPoints: 1001, maxPoints: 4500, icon: "fas fa-microphone-alt" },
  { name: "Clapback King/Queen", minPoints: 4501, maxPoints: 10000, icon: "fas fa-crown" },
  { name: "Roast Royalty", minPoints: 10001, maxPoints: 50000, icon: "fas fa-chess-king" },
  { name: "Supreme Banter Deity", minPoints: 50001, maxPoints: Infinity, icon: "fas fa-meteor" },
];

// DEFAULT_LEVEL is for users with 0 points. 
// maxPoints is set to BANTER_LEVELS[0].minPoints (or 1 if first level starts at 1)
// to show progress towards the first actual level.
export const DEFAULT_LEVEL: BanterLevel = { 
  name: "Banter Enthusiast", 
  minPoints: 0, 
  maxPoints: BANTER_LEVELS[0]?.minPoints > 0 ? BANTER_LEVELS[0].minPoints : 1, // Progress towards the first level's minPoints
  icon: "fas fa-comments" 
};

export const getBanterLevelInfo = (points: number): BanterLevel => {
  if (points <= 0) { // Catches 0 points and any unexpected negative points
    // For a user with 0 points, their "current level" is the default,
    // and they are progressing towards the minPoints of the first actual level.
    // So, DEFAULT_LEVEL.maxPoints should reflect the target for this initial state.
    return { 
        ...DEFAULT_LEVEL, 
        maxPoints: BANTER_LEVELS[0]?.minPoints > 0 ? BANTER_LEVELS[0].minPoints : 1
    };
  }
  for (const level of BANTER_LEVELS) {
    if (points >= level.minPoints && points <= level.maxPoints) {
      return level;
    }
  }
  // Should be caught by Supreme Banter Deity with maxPoints: Infinity
  // If somehow not, return the highest level.
  return BANTER_LEVELS[BANTER_LEVELS.length - 1] || DEFAULT_LEVEL;
};

export const getNextLevel = (currentPoints: number): BanterLevel | null => {
    const currentLevel = getBanterLevelInfo(currentPoints);
    if (currentLevel.maxPoints === Infinity) return null; // Highest level

    const currentLevelIndex = BANTER_LEVELS.findIndex(l => l.name === currentLevel.name);
    
    if (currentLevel.name === DEFAULT_LEVEL.name) { // If user is at default (0 points)
        return BANTER_LEVELS[0] || null; // Next level is the first actual level
    }

    if (currentLevelIndex !== -1 && currentLevelIndex < BANTER_LEVELS.length - 1) {
        return BANTER_LEVELS[currentLevelIndex + 1];
    }
    return null; // Should not happen if current level is not the highest
};