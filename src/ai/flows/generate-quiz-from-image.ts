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
  language: z.string().describe('The language the quiz is in.'),
});
export type GenerateQuizFromImageOutput = z.infer<typeof GenerateQuizFromImageOutputSchema>;

export async function generateQuizFromImage(input: GenerateQuizFromImageInput): Promise<GenerateQuizFromImageOutput> {
  return generateQuizFromImageFlow(input);
}

const detectLanguageTool = ai.defineTool({
    name: 'detectLanguage',
    description: 'Detects the language of the image content.',
    inputSchema: z.object({
        photoDataUri: z
            .string()
            .describe(
              "A photo to detect language from, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
            ),
    }),
    outputSchema: z.string().describe('The language code of the image content (e.g., "en" for English, "es" for Spanish).'),
  },
  async input => {
    // Replace with actual language detection logic (e.g., using a library or API).
    // This is a placeholder that always returns English for demonstration purposes.
    // In a real implementation, you would analyze the image content to determine the language.
    return 'en';
  }
);

const translateTextTool = ai.defineTool({
    name: 'translateText',
    description: 'Translates the given text to the specified language.',
    inputSchema: z.object({
        text: z.string().describe('The text to translate.'),
        targetLanguage: z.string().describe('The language code to translate the text to (e.g., "en" for English, "es" for Spanish, "mr" for Marathi).'),
    }),
    outputSchema: z.string().describe('The translated text.'),
  },
  async input => {
    // Replace with actual translation logic (e.g., using a library or API).
    // This is a placeholder that always returns the same text for demonstration purposes.
    // In a real implementation, you would use a translation API to translate the text.
    return input.text;
  }
);


const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  tools: [detectLanguageTool, translateTextTool],
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
      language: z.string().describe('The language to generate the quiz in.'),
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
  prompt: `You are an AI quiz generator.  You will generate a multiple-choice quiz based on the content of the image provided. 
  
  First, detect the language of the image content using the detectLanguage tool.
  Then, generate questions about the image in the detected language.
  If the detected language is not English or Marathi, translate the question and answer options to the detected language using the translateText tool.
  If the detected language is Marathi, ensure the questions and options are in Marathi script.
  
  The number of questions to generate should be taken from the numQuestions field. 
  The difficulty of the questions should be set by the difficulty field.

  Return your response as a JSON object. Do not include any other text. 
  
  Here is the photo: {{media url=photoDataUri}}

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
  const detectedLanguage = await detectLanguageTool({photoDataUri: input.photoDataUri});
  const {output} = await generateQuizPrompt({...input, language: detectedLanguage});

   // Translate questions and options if the detected language is not English
   if (detectedLanguage !== 'en' && detectedLanguage !== 'mr') {
    output!.questions = await Promise.all(
      output!.questions.map(async question => {
        const translatedQuestion = await translateTextTool({
          text: question.question,
          targetLanguage: detectedLanguage,
        });
        const translatedOptions = await Promise.all(
          question.options.map(async option =>
            translateTextTool({text: option, targetLanguage: detectedLanguage})
          )
        );

        return {
          ...question,
          question: translatedQuestion,
          options: translatedOptions,
        };
      })
    );
  }

  if (detectedLanguage === 'mr') {
    output!.questions = await Promise.all(
      output!.questions.map(async question => {
        const translatedQuestion = await translateTextTool({
          text: question.question,
          targetLanguage: detectedLanguage,
        });
        const translatedOptions = await Promise.all(
          question.options.map(async option =>
            translateTextTool({text: option, targetLanguage: detectedLanguage})
          )
        );

        return {
          ...question,
          question: translatedQuestion,
          options: translatedOptions,
        };
      })
    );
  }

  return {...output!, language: detectedLanguage};
});
