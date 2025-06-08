
import { formatDistanceToNow, isValid, differenceInSeconds } from 'date-fns';
import parseISO from 'date-fns/parseISO'; // Corrected import

/**
 * Formats a given timestamp into a relative time string (e.g., "about 2 hours ago").
 * Provides more granular output for recent times.
 * @param timestamp The timestamp, can be a number (milliseconds since epoch) or a string.
 * @returns A string representing the relative time, or a fallback string if the date is invalid.
 */
export const formatRelativeTime = (timestamp: number | string | undefined): string => {
  if (timestamp === undefined || timestamp === null) {
    return 'Date unavailable';
  }

  let date: Date;
  if (typeof timestamp === 'string') {
    date = parseISO(timestamp); // Attempt to parse if it's an ISO string
    if (!isValid(date)) {
      // If not a valid ISO string, try to parse as number (milliseconds)
      const numTimestamp = Number(timestamp);
      if (!isNaN(numTimestamp)) {
        date = new Date(numTimestamp);
      } else {
        // console.error('[Banter Debug] formatRelativeTime: Invalid date string received:', timestamp); // Kept for important errors if needed
        return 'Invalid date string';
      }
    }
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    // console.error('[Banter Debug] formatRelativeTime: Invalid date format received:', timestamp); // Kept for important errors
    return 'Invalid date format'; // Should not happen if types are correct
  }

  if (!isValid(date)) {
    // console.error('[Banter Debug] formatRelativeTime: Timestamp parsed to invalid date:', timestamp, 'Resulting date:', date); // Kept for important errors
    return 'Invalid date';
  }

  const now = new Date(); // Client's current time
  const diffInSeconds = differenceInSeconds(now, date);

  try {
    // Case 1: "just now" for very recent past (0-4s) or very near future (0-9s, to account for minor clock skew)
    if ( (diffInSeconds >= 0 && diffInSeconds < 5) || (diffInSeconds < 0 && Math.abs(diffInSeconds) < 10) ) {
      return "just now";
    }
    
    // Case 2: "X seconds ago" for 5-59 seconds in the past
    if (diffInSeconds >= 5 && diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }

    // Case 3: Use formatDistanceToNow for anything else (includes "X minutes ago", "Y hours ago", or future dates)
    return formatDistanceToNow(date, { addSuffix: true, includeSeconds: true });

  } catch (error) {
    console.error("Error in formatDistanceToNow:", error, "Input date for formatDistanceToNow:", date); // Kept for important errors
    return 'Error formatting time'; 
  }
};

/**
 * Gets the current date as a YYYY-MM-DD string in UTC.
 * @param date Optional date object, defaults to new Date().
 * @returns A string representing the date in YYYY-MM-DD format (UTC).
 */
export const getUTCDateString = (date: Date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
