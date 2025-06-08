
import { ref, get, set } from 'firebase/database';
import { GoogleGenAI } from '@google/genai';
import { db_rtdb } from '../firebase';
import { DailyPrompt } from '../types';

const DAILY_PROMPT_PATH = 'dailyPrompts/current';

/**
 * Gets the current date as a YYYY-MM-DD string.
 */
function getCurrentDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetches the daily prompt from Firebase RTDB.
 * If no prompt exists for the current day, it attempts to generate and store a new one.
 * @returns {Promise<DailyPrompt | null>} The daily prompt object or null if an error occurs.
 */
export async function fetchOrGenerateDailyPrompt(): Promise<DailyPrompt | null> {
  const currentDateStr = getCurrentDateString();
  const promptRef = ref(db_rtdb, DAILY_PROMPT_PATH);

  try {
    const snapshot = await get(promptRef);
    if (snapshot.exists()) {
      const currentPrompt = snapshot.val() as DailyPrompt;
      if (currentPrompt.date === currentDateStr && !currentPrompt.error) {
        return currentPrompt; // Return existing prompt if it's for today and has no error
      }
      if (currentPrompt.date === currentDateStr && currentPrompt.error) {
        console.warn("Previous prompt generation for today resulted in an error:", currentPrompt.error);
        // Optionally, allow re-generation or return the error state
        // For now, we'll attempt to regenerate.
      }
    }

    // No prompt for today or previous attempt had an error, generate a new one.
    if (!process.env.API_KEY) {
      console.error("API_KEY for @google/genai is not set in environment variables.");
      const errorPrompt: DailyPrompt = { date: currentDateStr, text: "Daily prompt generation is currently unavailable (API key missing).", error: "API_KEY_MISSING" };
      await set(promptRef, errorPrompt);
      return errorPrompt;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const geminiPrompt = "Generate a short, fun, and engaging daily discussion prompt for a social media app about general life, humor, and confessions. The prompt should be under 150 characters and suitable for a general audience. Make it intriguing.";
    
    let newPromptText = "Could not generate a prompt today. Try sharing your own spark!";
    let generationError: string | undefined = undefined;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: geminiPrompt,
      });
      newPromptText = response.text.trim();
      if (!newPromptText) { // Handle empty response from API
        newPromptText = "What's a funny thing that happened to you this week?";
        generationError = "EMPTY_API_RESPONSE";
      }
    } catch (apiError: any) {
      console.error("Error generating prompt from Gemini API:", apiError);
      newPromptText = "Banter Bot is napping! What's on your mind today?";
      generationError = apiError.message || "API_GENERATION_FAILED";
    }

    const newDailyPrompt: DailyPrompt = {
      date: currentDateStr,
      text: newPromptText,
      ...(generationError !== undefined && { error: generationError }) // Conditionally add error if it exists
    };
    await set(promptRef, newDailyPrompt);
    return newDailyPrompt;

  } catch (dbError: any) {
    console.error("Error fetching or setting daily prompt in Firebase:", dbError);
    return { date: currentDateStr, text: "Error loading today's prompt. Please try again later.", error: dbError.message || "DB_OPERATION_FAILED" };
  }
}
