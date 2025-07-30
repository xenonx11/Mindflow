'use server';

/**
 * @fileOverview This file contains a Genkit flow that analyzes an audio note,
 * transcribes it, and categorizes the transcription.
 *
 * - categorizeAudioNote - A function that handles the audio categorization process.
 * - CategorizeAudioNoteInput - The input type for the categorizeAudioNote function.
 * - CategorizeAudioNoteOutput - The return type for the categorizeAudioNote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const CategorizeAudioNoteInputSchema = z.object({
  audio: z
    .string()
    .describe(
      "The audio note to be categorized, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  existingCategories: z.array(z.string()).describe('An array of existing categories to help with classification.')
});
export type CategorizeAudioNoteInput = z.infer<typeof CategorizeAudioNoteInputSchema>;

const CategorizeAudioNoteOutputSchema = z.object({
  category: z.string().describe('The category identified for the audio note.'),
  title: z.string().describe('A short, concise title for the audio note.'),
  transcription: z.string().describe('The full transcription of the audio note.'),
});
export type CategorizeAudioNoteOutput = z.infer<typeof CategorizeAudioNoteOutputSchema>;

export async function categorizeAudioNote(
  input: CategorizeAudioNoteInput
): Promise<CategorizeAudioNoteOutput> {
  return categorizeAudioNoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeAudioNotePrompt',
  input: {schema: CategorizeAudioNoteInputSchema},
  output: {schema: CategorizeAudioNoteOutputSchema},
  model: googleAI.model('gemini-2.0-flash'),
  prompt: `You are an expert at categorizing audio notes. Your task is to transcribe the given audio note, create a short title for it, and classify it into one of the provided categories.

If the content of the audio note doesn't fit well into any of the existing categories, you should create a new, relevant category for it.

**Instructions:**
1.  Transcribe the audio note accurately.
2.  Based on the transcription, create a short, concise title (4-5 words max).
3.  Analyze the transcription to choose the most appropriate category from the list provided.
4.  If no existing category is a good fit, create a new one.
5.  Return the chosen or new category, the generated title, and the full transcription.

**Audio Note:**
{{media url=audio}}

**Existing Categories:**
{{#each existingCategories}}
- {{{this}}}
{{/each}}
`,
});

const categorizeAudioNoteFlow = ai.defineFlow(
  {
    name: 'categorizeAudioNoteFlow',
    inputSchema: CategorizeAudioNoteInputSchema,
    outputSchema: CategorizeAudioNoteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
