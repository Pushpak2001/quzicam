'use server';
/**
 * @fileOverview Generates a multiple-choice quiz from an image.
 *
 * - generateQuizFromImage - A function that handles the quiz generation process.
 * - GenerateQuizFromImageInput - The input type for the generateQuizFromImage function.
 * - GenerateQuizFromImageOutput - The return type for the generateQuizFromImage function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateQuizFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to generate a quiz from, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  numQuestions: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('The number of questions to generate for the quiz.'),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .default('medium')
    .describe('The difficulty level of the quiz.'),
  language: z.string().default('en').describe('The language to generate the quiz in.'), // Added language field
});
export type GenerateQuizFromImageInput = z.infer<typeof GenerateQuizFromImageInputSchema>;

const GenerateQuizFromImageOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).describe('The possible answers to the question.'),
      correctAnswerIndex: z.number().int().describe('The index of the correct answer in the options array.'),
    })
  ).describe('The generated quiz questions.'),
});
export type GenerateQuizFromImageOutput = z.infer<typeof GenerateQuizFromImageOutputSchema>;

export async function generateQuizFromImage(input: GenerateQuizFromImageInput): Promise<GenerateQuizFromImageOutput> {
  return generateQuizFromImageFlow(input);
}

const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {
    schema: z.object({
      photoDataUri: z
        .string()
        .describe(
          "A photo to generate a quiz from, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
      numQuestions: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .describe('The number of questions to generate for the quiz.'),
      difficulty: z
        .enum(['easy', 'medium', 'hard'])
        .default('medium')
        .describe('The difficulty level of the quiz.'),
      language: z.string().default('en').describe('The language to generate the quiz in.'), // Added language
    }),
  },
  output: {
    schema: z.object({
      questions: z.array(
        z.object({
          question: z.string().describe('The quiz question.'),
          options: z.array(z.string()).describe('The possible answers to the question.'),
          correctAnswerIndex: z.number().int().describe('The index of the correct answer in the options array.'),
        })
      ).describe('The generated quiz questions.'),
    }),
  },
  prompt: `You are an AI quiz generator.  You will generate a multiple-choice quiz based on the content of the image provided. The user will upload an image and you should respond with questions about the image. The number of questions to generate should be taken from the numQuestions field. The difficulty of the questions should be set by the difficulty field. The language of the quiz should be {{{language}}}. Return your response as a json object. Do not include any other text. Here is the photo: {{media url=photoDataUri}}

Difficulty: {{{difficulty}}}
Number of Questions: {{{numQuestions}}}
Language: {{{language}}}

Output format: JSON array of question objects with keys 'question', 'options', and 'correctAnswerIndex'. Each question must have 4 options.
`, 
});

const generateQuizFromImageFlow = ai.defineFlow<
  typeof GenerateQuizFromImageInputSchema,
  typeof GenerateQuizFromImageOutputSchema
>({
  name: 'generateQuizFromImageFlow',
  inputSchema: GenerateQuizFromImageInputSchema,
  outputSchema: GenerateQuizFromImageOutputSchema,
}, async input => {
  const {output} = await generateQuizPrompt(input);
  return output!;
});
