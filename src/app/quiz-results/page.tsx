'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; // Import the Button component

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  userAnswer?: number | null;
  isCorrect?: boolean | null;
}

const QuizResultsPage = () => {
  const searchParams = useSearchParams();
  const quiz = searchParams.get('quiz');
  const score = searchParams.get('score');
  const language = searchParams.get('language');

  const router = useRouter();

  // Function to safely parse the quiz data
  const parseQuiz = (quizData: string | null): Question[] => {
    try {
      return quizData ? JSON.parse(quizData) : [];
    } catch (error) {
      console.error('Failed to parse quiz data:', error);
      return [];
    }
  };

  const parsedQuiz = parseQuiz(quiz);
  const quizScore = score ? parseInt(score) : 0;


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">Quiz Results</h1>
      <p className="text-lg mb-4">
        Your Score: {quizScore} / {parsedQuiz.length}
      </p>

      <div className="flex flex-col gap-4 w-full max-w-2xl">
        {parsedQuiz.map((question, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>Question {index + 1}</CardTitle>
              <CardDescription>
                <strong className="font-bold">{question.question}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p>
                <strong>Your Answer:</strong>
                <span className={cn(
                  question.isCorrect === true
                    ? "text-green-500"
                    : "text-red-500"
                )}>
                  {question.userAnswer !== null && question.userAnswer !== undefined
                    ? question.options[question.userAnswer]
                    : (question.userAnswer === 0 || question.userAnswer === null) ? "Not Answered" : "Not Answered"}
                </span>
              </p>
              <p className="text-green-500">
                <strong>Correct Answer:</strong> <span className="font-semibold">{question.options[question.correctAnswerIndex]}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
            <Button onClick={() => router.push('/')}>Back to Quiz</Button>
    </div>
  );
};

export default QuizResultsPage;
