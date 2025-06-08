import { ref, runTransaction, serverTimestamp as rtdbServerTimestamp, update, get } from 'firebase/database';
import { db_rtdb } from '../firebase';
import { UserProfile, BadgeId } from '../types';
import { getUTCDateString } from './dateUtils';
import { awardPoints, ensureBadgeAwarded } from './firebaseUtils'; // Assuming these exist and work as expected

// Streak Point Milestones
const STREAK_POINTS: Record<number, number> = {
  3: 10,  // 3-day streak
  7: 25,  // 7-day streak
  30: 100, // 30-day streak
};

// Daily Message Count Point Milestones & Badges
const DAILY_MESSAGE_MILESTONES = [
  { count: 5, points: 5, badge: 'daily_chatter_bronze' as BadgeId },
  { count: 15, points: 10, badge: 'daily_chatter_silver' as BadgeId }, // Additional points
  { count: 30, points: 15, badge: 'daily_chatter_gold' as BadgeId },  // Additional points
];

const POINTS_FIRST_MESSAGE_OF_DAY = 10;

/**
 * Checks and updates the user's chat streak.
 * Awards points and badges for streak milestones.
 * @param userId The ID of the user.
 */
export async function checkAndUpdateChatStreak(userId: string): Promise<void> {
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  const todayUTCString = getUTCDateString();

  try {
    await runTransaction(userProfileRef, (profile: UserProfile | null) => {
      if (profile) {
        const lastActivity = profile.lastChatActivityDate || '';
        let currentStreak = profile.chatStreak || 0;
        let longestStreak = profile.longestChatStreak || 0;
        
        // Initialize if first time or missing
        if (!profile.awardedStreakMilestones) {
            profile.awardedStreakMilestones = { '3day': false, '7day': false, '30day': false };
        }

        if (lastActivity === todayUTCString) {
          // Already active today, no change to streak
        } else {
          const yesterdayUTCString = getUTCDateString(new Date(Date.now() - 86400000)); 
          if (lastActivity === yesterdayUTCString) {
            currentStreak++;
          } else {
            currentStreak = 1; // Reset streak
            // If streak is reset, also reset the awarded milestones for points
            // Badges are one-time, so they are not reset here.
             profile.awardedStreakMilestones = { '3day': false, '7day': false, '30day': false };
          }
          profile.lastChatActivityDate = todayUTCString;
        }

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
          profile.longestChatStreak = longestStreak;
        }
        profile.chatStreak = currentStreak;

        // Award streak badges and points if not already awarded for this streak instance
        if (currentStreak >= 3 && !profile.awardedStreakMilestones['3day']) {
          ensureBadgeAwarded(userId, 'streak_starter'); // Badge is one-time per profile effectively
          awardPoints(userId, STREAK_POINTS[3]);
          profile.awardedStreakMilestones['3day'] = true;
        }
        if (currentStreak >= 7 && !profile.awardedStreakMilestones['7day']) {
          // No new badge, just points
          awardPoints(userId, STREAK_POINTS[7]);
          profile.awardedStreakMilestones['7day'] = true;
        }
        if (currentStreak >= 30 && !profile.awardedStreakMilestones['30day']) {
          ensureBadgeAwarded(userId, 'streak_master'); // Badge is one-time per profile
          awardPoints(userId, STREAK_POINTS[30]);
          profile.awardedStreakMilestones['30day'] = true;
        }
        
        profile.lastActivityAt = rtdbServerTimestamp() as any;
      }
      return profile;
    });
  } catch (error) {
    console.error(`Error updating chat streak for user ${userId}:`, error);
  }
}

/**
 * Checks and updates the user's daily message count.
 * Awards points and badges for daily message milestones.
 * @param userId The ID of the user.
 */
export async function checkAndUpdateDailyMessageCount(userId: string): Promise<void> {
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  const todayUTCString = getUTCDateString();

  try {
    await runTransaction(userProfileRef, (profile: UserProfile | null) => {
      if (profile) {
        if (!profile.awardedDailyMessageMilestones) profile.awardedDailyMessageMilestones = {};
        
        if (profile.lastDailyMessageCountResetDate !== todayUTCString) {
          profile.dailyMessageCount = 0;
          profile.lastDailyMessageCountResetDate = todayUTCString;
          profile.awardedDailyMessageMilestones[todayUTCString] = { '5': false, '15': false, '30': false };
        }
        
        // Ensure today's milestones object exists if it was somehow missed
        if (!profile.awardedDailyMessageMilestones[todayUTCString]) {
             profile.awardedDailyMessageMilestones[todayUTCString] = { '5': false, '15': false, '30': false };
        }

        profile.dailyMessageCount = (profile.dailyMessageCount || 0) + 1;
        
        const todaysMilestones = profile.awardedDailyMessageMilestones[todayUTCString];

        for (const milestone of DAILY_MESSAGE_MILESTONES) {
          const milestoneKey = milestone.count.toString() as keyof typeof todaysMilestones;
          if (profile.dailyMessageCount >= milestone.count && !todaysMilestones[milestoneKey]) {
            ensureBadgeAwarded(userId, milestone.badge);
            awardPoints(userId, milestone.points);
            todaysMilestones[milestoneKey] = true;
          }
        }
        profile.lastActivityAt = rtdbServerTimestamp() as any;
      }
      return profile;
    });
  } catch (error) {
    console.error(`Error updating daily message count for user ${userId}:`, error);
  }
}


/**
 * Checks if the user is the first to send a message today and awards points.
 * @param userId The ID of the user.
 * @param username The username of the user (for logging/display).
 * @returns Promise<{ wasFirst: boolean; pointsAwarded: number }>
 */
export async function checkAndAwardFirstMessageOfTheDay(
  userId: string,
  username: string
): Promise<{ wasFirst: boolean; pointsAwarded: number }> {
  const todayUTCString = getUTCDateString();
  const awardPath = `globalChat/dailyAwards/${todayUTCString}/firstMessageUserId`;
  const awardRef = ref(db_rtdb, awardPath);

  try {
    const transactionResult = await runTransaction(awardRef, (currentData: string | null) => {
      if (currentData === null) { // No one has claimed it yet for today
        return userId; // Attempt to claim it
      }
      return undefined; // Abort transaction if someone else already claimed it or it's already set
    });

    if (transactionResult.committed && transactionResult.snapshot.val() === userId) {
      // This user successfully claimed the first message award
      await awardPoints(userId, POINTS_FIRST_MESSAGE_OF_DAY);
      console.log(`User ${username} (${userId}) got the "First Message of the Day" award and ${POINTS_FIRST_MESSAGE_OF_DAY} points!`);
      // Optionally, you could award a specific badge here too if desired
      // await ensureBadgeAwarded(userId, 'early_bird_chatter'); // Example badge
      return { wasFirst: true, pointsAwarded: POINTS_FIRST_MESSAGE_OF_DAY };
    }
  } catch (error) {
    console.error(`Error in first message transaction for user ${userId} (${username}):`, error);
  }
  return { wasFirst: false, pointsAwarded: 0 };
}