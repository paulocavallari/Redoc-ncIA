'use server';

/**
 * @fileOverview A lesson plan generation AI agent using Google Gemini.
 *
 * - generateLessonPlan - A function that handles the lesson plan generation process.
 * - GenerateLessonPlanInput - The input type for the generateLessonPlan function.
 * - GenerateLessonPlanOutput - The return type for the generateLessonPlan function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Updated Input Schema to include optional file attachment and reflect multiple skills/contents
const GenerateLessonPlanInputSchema = z.object({
  disciplina: z.string().describe('Nome da Disciplina.'),
  anoSerie: z.string().describe('Ano/Série (ex: 8º ano do Ensino Fundamental).'),
  habilidade: z.string().describe('Código(s) e/ou descrição(ões) completa(s) da(s) Habilidade(s) do Currículo Paulista (pode ser uma lista separada por vírgula, ex: EF08MA06, EF08MA07).'),
  conteudo: z.string().describe('Conteúdo(s) específico(s) relacionado(s) à habilidade (pode ser uma lista separada por vírgula, ex: Frações e seus significados, Operações com frações).'),
  aulaDuracao: z.string().describe('Duração estimada da aula (ex: 50 minutos ou 2 aulas de 50 minutos).'),
  orientacoesAdicionais: z
    .string()
    .describe('Orientações adicionais inseridas pelo usuário.')
    .optional(),
  materialDigitalDataUri: z
    .string()
    .describe(
      "Opcional: Material digital em anexo (ex: PDF da aula SEDUC) como um data URI. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    )
    .optional(),
});
export type GenerateLessonPlanInput = z.infer<typeof GenerateLessonPlanInputSchema>;

// Output Schema remains a string containing the detailed lesson plan
const GenerateLessonPlanOutputSchema = z.object({
  lessonPlan: z.string().describe('A detailed lesson plan suggestion following the required structure.'),
});
export type GenerateLessonPlanOutput = z.infer<typeof GenerateLessonPlanOutputSchema>;

export async function generateLessonPlan(input: GenerateLessonPlanInput): Promise<GenerateLessonPlanOutput> {
  return generateLessonPlanFlow(input);
}

// Updated Prompt using the provided structure for Gemini and including the optional file attachment
const prompt = ai.definePrompt({
  name: 'generateLessonPlanPrompt',
  input: {
    schema: GenerateLessonPlanInputSchema,
  },
  output: {
    schema: GenerateLessonPlanOutputSchema,
  },
  prompt: `Instrução para a IA: Aja como um especialista em design instrucional e pedagogia, com foco no Currículo Paulista. Crie um plano de aula detalhado, prático e engajador com base nas informações fornecidas abaixo. A resposta DEVE seguir rigorosamente a estrutura solicitada.

Informações da Aula:

Disciplina: {{{disciplina}}}
Ano/Série: {{{anoSerie}}}
Habilidade (Currículo Paulista): {{{habilidade}}}
Conteúdo: {{{conteudo}}}
Duração Estimada da Aula: {{{aulaDuracao}}}
{{#if orientacoesAdicionais}}
Orientações Adicionais: {{{orientacoesAdicionais}}}
{{/if}}
{{#if materialDigitalDataUri}}
Material Digital de Referência (SEDUC-SP): {{media url=materialDigitalDataUri}}
Instrução Adicional: Utilize o arquivo em anexo para consulta do andamento sugerido pela SEDUC-SP ao elaborar o plano.
{{/if}}

Estrutura Obrigatória da Resposta:

Por favor, organize sua resposta exatamente nas seguintes seções:

Introdução:

Descreva como iniciar a aula para engajar os alunos.
Inclua estratégias para ativar conhecimentos prévios sobre o tema.
Apresente o objetivo da aula de forma clara para os alunos.
(Tempo estimado para esta seção).

Desenvolvimento:

Detalhe o passo a passo das atividades principais da aula.
Descreva a sequência didática de forma lógica.
Explique como o conteúdo será apresentado e como a habilidade será trabalhada.
Sugira momentos de interação, prática e aplicação do conhecimento.
(Tempo estimado para cada etapa principal do desenvolvimento).

Conclusão:

Apresente formas de sistematizar o que foi aprendido.
Sugira uma breve atividade de verificação de compreensão ou fechamento.
Indique como conectar a aula com aprendizados futuros ou o cotidiano dos alunos.
(Tempo estimado para esta seção).

Recursos Utilizados:

Liste todos os materiais necessários (digitais, impressos, manipuláveis, audiovisuais, etc.).
Inclua links para recursos online, se aplicável.

Metodologias Sugeridas:

Indique as principais abordagens pedagógicas a serem empregadas (ex: Aprendizagem Baseada em Problemas, Sala de Aula Invertida, Rotação por Estações, Instrução Direta, Trabalho em Grupo, etc.).
Justifique brevemente por que essas metodologias são adequadas para esta aula.

Sugestões de adaptações para alunos Alvos da Educação Especial:

Forneça estratégias e recursos específicos para garantir a inclusão e acessibilidade de alunos com diferentes necessidades (ex: Deficiência Intelectual, Visual, Auditiva, TEA, Altas Habilidades/Superdotação).
Sugira adaptações nos materiais, nas atividades, no tempo e na avaliação.
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
  // Log input including whether the material URI is present (optional)
  console.log("Generating lesson plan with input:", {
        ...input,
        materialDigitalDataUri: input.materialDigitalDataUri ? `Present (length: ${input.materialDigitalDataUri.length})` : 'Not provided',
   });

  const {output} = await prompt(input);
  // Ensure the output format is strictly adhered to, although the prompt guides it.
  // Basic validation could be added here if needed, but relying on the prompt for structure.
  return output!;
});
