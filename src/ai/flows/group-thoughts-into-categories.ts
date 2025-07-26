'use server';
/**
 * @fileOverview AI flow that groups thoughts into categories.
 *
 * - groupThoughtsIntoCategories - A function that handles the grouping of thoughts into categories.
 * - GroupThoughtsIntoCategoriesInput - The input type for the groupThoughtsIntoCategories function.
 * - GroupThoughtsIntoCategoriesOutput - The return type for the groupThoughtsIntoCategories function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GroupThoughtsIntoCategoriesInputSchema = z.object({
  brainDump: z.string().describe('A brain dump of thoughts.'),
  categories: z.array(z.string()).describe('The AI-generated categories.'),
});
export type GroupThoughtsIntoCategoriesInput = z.infer<
  typeof GroupThoughtsIntoCategoriesInputSchema
>;

const GroupThoughtsIntoCategoriesOutputSchema = z.record(
  z.string(),
  z.array(z.string())
).describe('A record of categories and their associated thoughts.');
export type GroupThoughtsIntoCategoriesOutput = z.infer<
  typeof GroupThoughtsIntoCategoriesOutputSchema
>;

export async function groupThoughtsIntoCategories(
  input: GroupThoughtsIntoCategoriesInput
): Promise<GroupThoughtsIntoCategoriesOutput> {
  return groupThoughtsIntoCategoriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'groupThoughtsIntoCategoriesPrompt',
  input: {
    schema: GroupThoughtsIntoCategoriesInputSchema,
  },
  output: {
    schema: GroupThoughtsIntoCategoriesOutputSchema,
  },
  prompt: `You are an expert at categorizing thoughts.

You will receive a brain dump of thoughts and a list of categories.
Your job is to group the thoughts into the categories.

Brain Dump: {{{brainDump}}}
Categories: {{#each categories}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Return a JSON object where the keys are the categories and the values are arrays of thoughts that belong to that category.
`,
});

const groupThoughtsIntoCategoriesFlow = ai.defineFlow(
  {
    name: 'groupThoughtsIntoCategoriesFlow',
    inputSchema: GroupThoughtsIntoCategoriesInputSchema,
    outputSchema: GroupThoughtsIntoCategoriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
