'use server';

/**
 * @fileOverview Suggests additional content related to a given lesson plan topic.
 *
 * - suggestAdditionalContent - A function that suggests additional content.
 * - SuggestAdditionalContentInput - The input type for the suggestAdditionalContent function.
 * - SuggestAdditionalContentOutput - The return type for the suggestAdditionalContent function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SuggestAdditionalContentInputSchema = z.object({
  topic: z.string().describe('The topic of the lesson plan.'),
  gradeLevel: z.string().describe('The grade level of the lesson plan.'),
  subject: z.string().describe('The subject of the lesson plan.'),
  currentContent: z.string().describe('The existing content of the lesson plan.'),
});
export type SuggestAdditionalContentInput = z.infer<typeof SuggestAdditionalContentInputSchema>;

const SuggestAdditionalContentOutputSchema = z.object({
  additionalContentSuggestions: z
    .array(z.string())
    .describe('A list of suggested additional content related to the topic.'),
});
export type SuggestAdditionalContentOutput = z.infer<typeof SuggestAdditionalContentOutputSchema>;

export async function suggestAdditionalContent(
  input: SuggestAdditionalContentInput
): Promise<SuggestAdditionalContentOutput> {
  return suggestAdditionalContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAdditionalContentPrompt',
  input: {
    schema: z.object({
      topic: z.string().describe('The topic of the lesson plan.'),
      gradeLevel: z.string().describe('The grade level of the lesson plan.'),
      subject: z.string().describe('The subject of the lesson plan.'),
      currentContent: z.string().describe('The existing content of the lesson plan.'),
    }),
  },
  output: {
    schema: z.object({
      additionalContentSuggestions: z
        .array(z.string())
        .describe('A list of suggested additional content related to the topic.'),
    }),
  },
  prompt: `You are an AI assistant helping teachers to expand their lesson plans. Given the topic, grade level, subject and current content of a lesson plan, suggest additional content that could be included to enrich the lesson.

Topic: {{{topic}}}
Grade Level: {{{gradeLevel}}}
Subject: {{{subject}}}
Current Content: {{{currentContent}}}

Suggest additional content related to the topic:`,
});

const suggestAdditionalContentFlow = ai.defineFlow<
  typeof SuggestAdditionalContentInputSchema,
  typeof SuggestAdditionalContentOutputSchema
>({
  name: 'suggestAdditionalContentFlow',
  inputSchema: SuggestAdditionalContentInputSchema,
  outputSchema: SuggestAdditionalContentOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});