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

const GroupedThoughtSchema = z.object({
  category: z.string().describe('The category for the group of thoughts. This must be one of the provided categories.'),
  thoughts: z.array(z.string()).describe('An array of thoughts that belong to the specified category. These must be excerpts from the original brain dump.'),
});

const GroupThoughtsIntoCategoriesOutputSchema = z.object({
  groupedThoughts: z
    .array(GroupedThoughtSchema)
    .describe('An array of objects, where each object represents a category and contains the thoughts associated with it.'),
});
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

You will receive a brain dump of thoughts and a list of categories. Your task is to group the thoughts from the brain dump into the provided categories.

Brain Dump:
"""
{{{brainDump}}}
"""

Categories:
{{#each categories}}
- {{{this}}}
{{/each}}

Please group each relevant sentence or thought from the brain dump into one of the categories.
Return a JSON object with a "groupedThoughts" key. The value of "groupedThoughts" should be an array of objects.
Each object in the array must have two keys:
1. "category": A string representing one of the provided categories.
2. "thoughts": An array of strings, where each string is a direct quote or a thought from the brain dump that belongs to that category.
Do not create new categories. Only use the ones provided. Every thought must be assigned to a category.
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
