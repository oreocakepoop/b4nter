
import { BadgeDefinition, BadgeId } from '../types';

export const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
  wordsmith: {
    id: 'wordsmith',
    name: 'Wordsmith',
    description: 'Authored 50+ banters.',
    icon: 'fas fa-pen-nib text-info', // Was text-indigo-400
  },
  comeback_kid: {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Replied to a banter within 60 seconds.',
    icon: 'fas fa-bolt text-warning', // Was text-yellow-400
  },
  trending_now: {
    id: 'trending_now',
    name: 'Trending Now',
    description: 'Authored a post that hit the Top 3 trending.',
    icon: 'fas fa-chart-line text-success', // Was text-green-400
  },
  banter_og: {
    id: 'banter_og',
    name: 'Banter OG',
    description: 'Joined B4NTER in its early days.',
    icon: 'fas fa-gem text-accent', // Was text-teal-400
  },
  mvp: {
    id: 'mvp',
    name: 'Voted MVP',
    description: 'Voted most entertaining user of the month (Admin Awarded).',
    icon: 'fas fa-trophy text-secondary', // Was text-amber-400, changed to secondary for more distinction
  },
  star_scorer: {
    id: 'star_scorer',
    name: 'Star Scorer',
    description: "Cosmic Contender! Your banter made it to the Top 5 'Rising Stars'.",
    icon: 'fas fa-meteor text-purple-400',
  },
  supernova_author: {
    id: 'supernova_author',
    name: 'Supernova Author',
    description: "Stellar Achievement! Your banter reached #1 'Supernova' status.",
    icon: 'fas fa-sun text-orange-400',
  },
  // New Chat Gamification Badges
  daily_chatter_bronze: {
    id: 'daily_chatter_bronze',
    name: 'Bronze Chatter',
    description: 'Sent 5 messages in Global Chat today.',
    icon: 'fas fa-comment-dots opacity-70 text-[#cd7f32]', // Bronze color
  },
  daily_chatter_silver: {
    id: 'daily_chatter_silver',
    name: 'Silver Chatter',
    description: 'Sent 15 messages in Global Chat today.',
    icon: 'fas fa-comments opacity-80 text-slate-400', // Silver color
  },
  daily_chatter_gold: {
    id: 'daily_chatter_gold',
    name: 'Gold Chatter',
    description: 'Sent 30 messages in Global Chat today.',
    icon: 'fas fa-comment-medical opacity-90 text-yellow-500', // Gold color
  },
  streak_starter: {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Maintained a 3-day chat streak.',
    icon: 'fas fa-fire-alt text-orange-500',
  },
  streak_master: {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintained a 30-day chat streak!',
    icon: 'fas fa-meteor text-red-600',
  },
};

// Cutoff date for "Banter OG" badge (Year, Month (0-indexed), Day)
// Example: All users registered before July 15th, 2024 are OGs
export const EARLY_ADOPTER_CUTOFF_TIMESTAMP = new Date(2024, 6, 15).getTime();
