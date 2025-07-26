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
  category: z.string().describe('The category for the thoughts.'),
  thoughts: z.array(z.string()).describe('The thoughts for the category.'),
});

const GroupThoughtsIntoCategoriesOutputSchema = z.object({
  groupedThoughts: z
    .array(GroupedThoughtSchema)
    .describe('An array of categories and their associated thoughts.'),
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

You will receive a brain dump of thoughts and a list of categories.
Your job is to group the thoughts into the categories.

Brain Dump: {{{brainDump}}}
Categories: {{#each categories}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Return a JSON object with a "groupedThoughts" key, which is an array of objects.
Each object in the array should have a "category" key (one of the provided categories) and a "thoughts" key (an array of strings from the brain dump that belong to that category).
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
