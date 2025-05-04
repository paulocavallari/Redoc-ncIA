'use server';

/**
 * @fileOverview A lesson plan generation AI agent.
 *
 * - generateLessonPlan - A function that handles the lesson plan generation process.
 * - GenerateLessonPlanInput - The input type for the generateLessonPlan function.
 * - GenerateLessonPlanOutput - The return type for the generateLessonPlan function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateLessonPlanInputSchema = z.object({
  educationLevel: z.string().describe('The education level (e.g., Ensino Fundamental: Anos Finais).'),
  year: z.string().describe('The year or series (e.g., 6º ano).'),
  subject: z.string().describe('The subject (e.g., Matemática).'),
  content: z.string().describe('The content to be taught (e.g., Números decimais).'),
  skills: z.array(z.string()).describe('A list of skills associated with the content (e.g., [EF06MA07]).'),
  additionalInstructions: z
    .string()
    .describe('Additional instructions or context for the AI (e.g., turma com dificuldades de leitura).')
    .optional(),
  classDurationMinutes: z.number().describe('The duration of the class in minutes.'),
});
export type GenerateLessonPlanInput = z.infer<typeof GenerateLessonPlanInputSchema>;

const GenerateLessonPlanOutputSchema = z.object({
  lessonPlan: z.string().describe('A detailed lesson plan suggestion.'),
});
export type GenerateLessonPlanOutput = z.infer<typeof GenerateLessonPlanOutputSchema>;

export async function generateLessonPlan(input: GenerateLessonPlanInput): Promise<GenerateLessonPlanOutput> {
  return generateLessonPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLessonPlanPrompt',
  input: {
    schema: z.object({
      educationLevel: z.string().describe('The education level (e.g., Ensino Fundamental: Anos Finais).'),
      year: z.string().describe('The year or series (e.g., 6º ano).'),
      subject: z.string().describe('The subject (e.g., Matemática).'),
      content: z.string().describe('The content to be taught (e.g., Números decimais).'),
      skills: z.array(z.string()).describe('A list of skills associated with the content (e.g., [EF06MA07]).'),
      additionalInstructions: z
        .string()
        .describe('Additional instructions or context for the AI (e.g., turma com dificuldades de leitura).')
        .optional(),
      classDurationMinutes: z.number().describe('The duration of the class in minutes.'),
    }),
  },
  output: {
    schema: z.object({
      lessonPlan: z.string().describe('A detailed lesson plan suggestion.'),
    }),
  },
  prompt: `You are an AI assistant designed to help teachers generate lesson plans.

  Based on the following information, please generate a detailed lesson plan suggestion, including a step-by-step teaching sequence, teaching methodologies, and digital or physical resources.

  Education Level: {{{educationLevel}}}
  Year/Series: {{{year}}}
  Subject: {{{subject}}}
  Content: {{{content}}}
  Skills: {{#each skills}}{{{this}}} {{/each}}
  Class Duration: {{{classDurationMinutes}}} minutes

  {{#if additionalInstructions}}
  Additional Instructions: {{{additionalInstructions}}}
  {{/if}}
  `,
});

const generateLessonPlanFlow = ai.defineFlow<
  typeof GenerateLessonPlanInputSchema,
  typeof GenerateLessonPlanOutputSchema
>({
  name: 'generateLessonPlanFlow',
  inputSchema: GenerateLessonPlanInputSchema,
  outputSchema: GenerateLessonPlanOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
