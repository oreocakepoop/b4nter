import { ConfessionPost } from '../types';

/**
 * Calculates the "Star Power" or "Hotness" score for a confession post.
 * This score is used for determining trending posts and can be displayed on post cards.
 *
 * The formula considers:
 * - Positive reactions (like, funny, relatable, wow, hmm)
 * - Negative reactions (dislike)
 * - Number of comments
 * - Age of the post (older posts decay in score)
 * - Any active Star Power Boost
 *
 * @param post The confession post object.
 * @returns A numerical score representing the post's star power.
 */
export const calculatePostStarPower = (post: ConfessionPost): number => {
  const now = Date.now();
  // Ensure createdAt is a number. If it's a server timestamp placeholder, it might not be resolved yet.
  // For newly created posts that haven't been written to DB and re-read, createdAt might be an object.
  // However, by the time it's displayed or used for sorting, it should be a number.
  // Fallback to 'now' if createdAt is not a number, effectively giving it zero age for calculation.
  const postCreatedAt = typeof post.createdAt === 'number' ? post.createdAt : now;
  const ageInHours = Math.max(0.1, (now - postCreatedAt) / (1000 * 60 * 60)); // Prevent division by zero or log(0)

  const reactionSummary = post.reactionSummary || {};
  const totalPositiveReactions =
    (reactionSummary.like || 0) +
    (reactionSummary.funny || 0) +
    (reactionSummary.relatable || 0) +
    (reactionSummary.wow || 0) +
    (reactionSummary.hmm || 0);
  const totalNegativeReactions = reactionSummary.dislike || 0;

  // Define weights for different factors
  const positiveReactionWeight = 1.0;
  const negativeReactionWeight = -0.5; // Dislikes reduce score (weight is negative)
  const commentWeight = 1.5;
  const ageDecayFactor = 0.75;

  let score =
    totalPositiveReactions * positiveReactionWeight +
    totalNegativeReactions * negativeReactionWeight + // Effectively subtracts due to negative weight
    (post.commentCount || 0) * commentWeight -
    Math.log1p(ageInHours) * ageDecayFactor; // log1p for smoother decay, handles ageInHours = 0 slightly better

  if (post.starPowerBoost && post.starPowerBoost.expiresAt > now) {
    score += post.starPowerBoost.amount;
  }

  return score;
};
