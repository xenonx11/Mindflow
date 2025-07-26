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
  category: z.string().describe('The category for the group of thoughts. This must be one of the provided categories, or a new category if similar ones are merged.'),
  thoughts: z
    .array(z.string())
    .describe(
      'An array of thoughts that belong to the specified category. These must be excerpts from the original brain dump.'
    ),
});

const GroupThoughtsIntoCategoriesOutputSchema = z.object({
  groupedThoughts: z
    .array(GroupedThoughtSchema)
    .describe(
      'An array of objects, where each object represents a category and contains the thoughts associated with it.'
    ),
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
  prompt: `You are an expert at categorizing thoughts. Your goal is to organize the user's brain dump into a clear and concise set of categories.

You will receive a brain dump of thoughts and a list of suggested categories.

**THE MOST IMPORTANT RULES:**
1.  **MERGE SIMILAR CATEGORIES:** Before you begin, review the list of categories. If any categories are synonyms or extremely similar, you MUST merge them into a single category. Choose the most descriptive and accurate name for the new, merged category. For example, if you see "work tasks" and "office to-dos", merge them into a single category like "Work Tasks".
2.  **ABSOLUTELY NO DUPLICATES:** Each unique thought or sentence from the brain dump MUST be placed in ONLY ONE category. DO NOT REPEAT any thought across multiple categories. If a thought seems to fit in more than one category, pick the BEST one and move on.

**Other Rules:**
3.  **BE COMPREHENSIVE:** Every thought from the brain dump must be assigned to one of your final categories. Do not leave any thoughts out.
4.  **FOLLOW USER INSTRUCTIONS:** The brain dump may contain specific instructions on how to categorize certain thoughts. You MUST follow these instructions precisely.

Brain Dump:
"""
{{{brainDump}}}
"""

Suggested Categories:
{{#each categories}}
- {{{this}}}
{{/each}}

Please group each relevant sentence or thought from the brain dump into the final, consolidated categories, strictly following all the rules above.
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
