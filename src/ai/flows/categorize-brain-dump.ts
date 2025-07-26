'use server';

/**
 * @fileOverview This file contains a Genkit flow that analyzes a brain dump
 * input and generates relevant categories using AI.
 *
 * - categorizeBrainDump - A function that categorizes the brain dump.
 * - CategorizeBrainDumpInput - The input type for the categorizeBrainDump function.
 * - CategorizeBrainDumpOutput - The return type for the categorizeBrainDump function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeBrainDumpInputSchema = z.object({
  brainDump: z
    .string()
    .describe('The brain dump text to be categorized.'),
});
export type CategorizeBrainDumpInput = z.infer<typeof CategorizeBrainDumpInputSchema>;

const CategorizeBrainDumpOutputSchema = z.object({
  categories: z
    .array(z.string())
    .describe('An array of categories generated from the brain dump.'),
});
export type CategorizeBrainDumpOutput = z.infer<typeof CategorizeBrainDumpOutputSchema>;

export async function categorizeBrainDump(input: CategorizeBrainDumpInput): Promise<CategorizeBrainDumpOutput> {
  return categorizeBrainDumpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeBrainDumpPrompt',
  input: {schema: CategorizeBrainDumpInputSchema},
  output: {schema: CategorizeBrainDumpOutputSchema},
  prompt: `Analyze the following brain dump and generate a list of categories that best represent the topics discussed.  Return only a JSON array of strings. No additional text or explanation is needed.

Brain Dump:
{{brainDump}}`,
});

const categorizeBrainDumpFlow = ai.defineFlow(
  {
    name: 'categorizeBrainDumpFlow',
    inputSchema: CategorizeBrainDumpInputSchema,
    outputSchema: CategorizeBrainDumpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
