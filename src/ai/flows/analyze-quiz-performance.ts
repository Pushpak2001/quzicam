'use server';
/**
 * @fileOverview Analyzes the quiz performance and provides personalized feedback.
 *
 * - analyzeQuizPerformance - A function that handles the quiz performance analysis.
 * - AnalyzeQuizPerformanceInput - The input type for the analyzeQuizPerformance function.
 * - AnalyzeQuizPerformanceOutput - The return type for the analyzeQuizPerformance function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeQuizPerformanceInputSchema = z.object({
  quizHistory: z
    .array(
      z.object({
        question: z.string().describe('The quiz question.'),
        userAnswer: z.string().describe('The user selected answer.'),
        correctAnswer: z.string().describe('The correct answer to the question.'),
        isCorrect: z.boolean().describe('Whether the user answered correctly.'),
      })
    )
    .describe('The history of the quiz, including questions, answers, and correctness.'),
  difficultyLevel: z
    .enum(['easy', 'medium', 'hard'])
    .describe('The difficulty level of the quiz: easy, medium, or hard.'),
  numberOfQuestions: z.number().describe('The total number of questions in the quiz.'),
});
export type AnalyzeQuizPerformanceInput = z.infer<typeof AnalyzeQuizPerformanceInputSchema>;

const AnalyzeQuizPerformanceOutputSchema = z.object({
  overallFeedback: z.string().describe('Overall feedback on the quiz performance.'),
  areasForImprovement: z
    .array(z.string())
    .describe('Specific areas where the user can improve.'),
  encouragingMessage: z.string().describe('An encouraging message for the user.'),
  score: z.number().describe('The user score, represented as a percentage.'),
});
export type AnalyzeQuizPerformanceOutput = z.infer<typeof AnalyzeQuizPerformanceOutputSchema>;

export async function analyzeQuizPerformance(
  input: AnalyzeQuizPerformanceInput
): Promise<AnalyzeQuizPerformanceOutput> {
  return analyzeQuizPerformanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeQuizPerformancePrompt',
  input: {
    schema: z.object({
      quizHistory: z
        .array(
          z.object({
            question: z.string().describe('The quiz question.'),
            userAnswer: z.string().describe('The user selected answer.'),
            correctAnswer: z.string().describe('The correct answer to the question.'),
            isCorrect: z.boolean().describe('Whether the user answered correctly.'),
          })
        )
        .describe('The history of the quiz, including questions, answers, and correctness.'),
      difficultyLevel: z
        .enum(['easy', 'medium', 'hard'])
        .describe('The difficulty level of the quiz: easy, medium, or hard.'),
      numberOfQuestions: z.number().describe('The total number of questions in the quiz.'),
    }),
  },
  output: {
    schema: z.object({
      overallFeedback: z.string().describe('Overall feedback on the quiz performance.'),
      areasForImprovement: z
        .array(z.string())
        .describe('Specific areas where the user can improve.'),
      encouragingMessage: z.string().describe('An encouraging message for the user.'),
      score: z.number().describe('The user score, represented as a percentage.'),
    }),
  },
  prompt: `You are an AI quiz performance analyzer. Analyze the user's quiz history and provide personalized feedback.

Quiz History:
{{#each quizHistory}}
  Question: {{this.question}}
  User Answer: {{this.userAnswer}}
  Correct Answer: {{this.correctAnswer}}
  Is Correct: {{this.isCorrect}}
{{/each}}

Difficulty Level: {{difficultyLevel}}
Number of Questions: {{numberOfQuestions}}

Based on this information, generate:
1.  overallFeedback: Overall feedback on the quiz performance.
2.  areasForImprovement: Specific areas where the user can improve.
3.  encouragingMessage: An encouraging message for the user.
4. score: The user score, represented as a percentage.

Ensure the feedback is tailored to the user's performance and the difficulty level of the quiz.
`,
});

const analyzeQuizPerformanceFlow = ai.defineFlow<
  typeof AnalyzeQuizPerformanceInputSchema,
  typeof AnalyzeQuizPerformanceOutputSchema
>(
  {
    name: 'analyzeQuizPerformanceFlow',
    inputSchema: AnalyzeQuizPerformanceInputSchema,
    outputSchema: AnalyzeQuizPerformanceOutputSchema,
  },
  async input => {
    const {quizHistory, numberOfQuestions} = input;
    const correctAnswers = quizHistory.filter(q => q.isCorrect).length;
    const score = (correctAnswers / numberOfQuestions) * 100;

    const {output} = await prompt({...input, score});
    return {...output!, score};
  }
);
