'use server';
/**
 * @fileOverview Transforms brain dump content into a concise prompt for ChatGPT.
 *
 * - transformToChatGPTprompt - A function that transforms the content into a ChatGPT prompt.
 * - TransformToChatGPTpromptInput - The input type for the transformToChatGPTprompt function.
 * - TransformToChatGPTpromptOutput - The return type for the transformToChatGPTprompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const TransformToChatGPTpromptInputSchema = z.object({
  brainDump: z.string().describe('The brain dump content to transform into a ChatGPT prompt.'),
});
export type TransformToChatGPTpromptInput = z.infer<typeof TransformToChatGPTpromptInputSchema>;

const TransformToChatGPTpromptOutputSchema = z.object({
  chatGPTprompt: z.string().describe('The concise ChatGPT prompt generated from the brain dump.'),
});
export type TransformToChatGPTpromptOutput = z.infer<typeof TransformToChatGPTpromptOutputSchema>;

export async function transformToChatGPTprompt(input: TransformToChatGPTpromptInput): Promise<TransformToChatGPTpromptOutput> {
  return transformToChatGPTpromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'transformToChatGPTpromptPrompt',
  input: {schema: TransformToChatGPTpromptInputSchema},
  output: {schema: TransformToChatGPTpromptOutputSchema},
  prompt: `You are an AI prompt generator. Your task is to transform the given brain dump content into a concise and effective prompt for ChatGPT.

Brain Dump Content: {{{brainDump}}}

Concise ChatGPT Prompt:`,
  model: googleAI.model('gemini-2.0-flash'),
});

const transformToChatGPTpromptFlow = ai.defineFlow(
  {
    name: 'transformToChatGPTpromptFlow',
    inputSchema: TransformToChatGPTpromptInputSchema,
    outputSchema: TransformToChatGPTpromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
