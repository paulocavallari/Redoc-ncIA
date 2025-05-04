'use server';

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// WARNING: Hardcoding API keys directly in the source code is a security risk.
// It's recommended to use environment variables instead.
const GOOGLE_GENAI_API_KEY = 'AIzaSyDO94XyB0fV5xmsgLGkVhaPlfn36TnhUYI';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      // Use the provided API key. Consider using process.env.GOOGLE_GENAI_API_KEY
      apiKey: GOOGLE_GENAI_API_KEY,
    }),
  ],
  // Change the default model to gemini-2.0-flash
  model: 'googleai/gemini-2.0-flash',
  logLevel: 'debug', // Optional: Add debug logging
  enableTracing: true, // Optional: Enable tracing
});
