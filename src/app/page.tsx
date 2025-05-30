"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateQuizFromImage } from "@/ai/flows/generate-quiz-from-image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  userAnswer?: number | null;
  isCorrect?: boolean | null;
}

const difficultyLevels = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
];

const App = () => {
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [quizLanguage, setQuizLanguage] = useState<string>("");
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = useCallback(
    async (file: File | null) => {
      if (!file) {
        setImageSrc(null);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        setImageSrc(base64Image);
      };
      reader.readAsDataURL(file);
    },
    [setImageSrc]
  );

  const generateQuiz = useCallback(async () => {
    if (!imageSrc) {
      toast({
        title: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const generatedQuiz = await generateQuizFromImage({
        photoDataUri: imageSrc,
        numQuestions: numQuestions,
        difficulty: difficulty,
      });

      // Initialize user answers to null for each question
      const initialQuizState = generatedQuiz.questions.map((question) => ({
        ...question,
        userAnswer: null,
        isCorrect: null,
      }));

      setQuiz(initialQuizState);
      setActiveQuestionIndex(0);
      setQuizLanguage(generatedQuiz.language); // Set the detected language
      setQuizStarted(true);

    } catch (error: any) {
      toast({
        title: "Failed to generate quiz. Please try again.",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [imageSrc, numQuestions, difficulty, toast]);

  const handleAnswerSelection = (optionIndex: number) => {
    if (isSubmitting) {
      return; // Prevent multiple submissions
    }

    setIsSubmitting(true); // Disable further clicks

    setQuiz((prevQuiz) => {
      const updatedQuiz = [...prevQuiz];
      const isCorrect = optionIndex === prevQuiz[activeQuestionIndex].correctAnswerIndex;
      updatedQuiz[activeQuestionIndex] = {
        ...prevQuiz[activeQuestionIndex],
        userAnswer: optionIndex,
        isCorrect: isCorrect,
      };
      return updatedQuiz;
    });

    // Automatically move to the next question after a delay
    setTimeout(() => {
      setIsSubmitting(false); // Re-enable submission after delay
      moveToNextQuestion();
    }, 1000);
  };

  const moveToNextQuestion = () => {
      if (activeQuestionIndex < quiz.length - 1) {
        setActiveQuestionIndex((prevIndex) => prevIndex + 1);
      } else {
         handleFinishQuiz();
      }
  }

  const handleFinishQuiz = () => {
    // Calculate the score
    const score = calculateScore();

    const url = new URL('/quiz-results', window.location.origin);
    url.searchParams.append('quiz', JSON.stringify(quiz));
    url.searchParams.append('score', score.toString());
    url.searchParams.append('language', quizLanguage);

    router.push(url.toString());
    setQuizStarted(false);
  };

  const calculateScore = () => {
    let score = 0;
    quiz.forEach((question) => {
      if (question.userAnswer === question.correctAnswerIndex) {
        score++;
      }
    });
    return score;
  };

  const currentQuestion = quiz[activeQuestionIndex];
  const isCorrect =
    currentQuestion?.userAnswer === currentQuestion?.correctAnswerIndex;


    const getLanguageSpecificClassName = (baseClassName: string = "") => {
        let languageClassName = "";

        switch (quizLanguage) {
            case 'mr':
                languageClassName = 'marathi-font';
                break;
            default:
                languageClassName = '';
                break;
        }

        return cn(baseClassName, languageClassName);
    };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">QuizCam AI</h1>

      <Tabs defaultValue="quiz" className="w-full max-w-2xl">
        <TabsList>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="quiz" className="outline-none">
          {!quizStarted ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Configuration</CardTitle>
                  <CardDescription>
                    Configure the quiz settings before starting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="numQuestions">Number of Questions</Label>
                    <Input
                      type="number"
                      id="numQuestions"
                      defaultValue={numQuestions}
                      onChange={(e) =>
                        setNumQuestions(Number(e.target.value))
                      }
                      min="1"
                      max="10"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Difficulty Level</Label>
                    <RadioGroup
                      defaultValue={difficulty}
                      onValueChange={setDifficulty}
                      className="flex flex-col gap-2"
                    >
                      {difficultyLevels.map((level) => (
                        <div key={level.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={level.value} id={level.value} />
                          <Label htmlFor={level.value}>{level.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Image</CardTitle>
                  <CardDescription>
                    Upload an image to generate a quiz from.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageUpload(
                        e.target.files && e.target.files.length > 0
                          ? e.target.files[0]
                          : null
                      )
                    }
                    className="hidden"
                    id="imageUpload"
                  />
                  <div className="flex items-center space-x-4">
                    <Label
                      htmlFor="imageUpload"
                      className="cursor-pointer bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80"
                    >
                      Upload from Device
                    </Label>
                  </div>

                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt="Uploaded"
                      className="max-h-64 rounded-md object-contain"
                    />
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={generateQuiz}
                disabled={!imageSrc || isGenerating}
                className={cn(
                  "relative",
                  isGenerating && "animate-pulse cursor-not-allowed"
                )}
              >
                Generate Quiz
              </Button>
            </div>
          ) : (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>
                  Question {activeQuestionIndex + 1} of {quiz.length}
                </CardTitle>
                <CardDescription className={getLanguageSpecificClassName()}>
                  <strong className="font-bold">{currentQuestion?.question}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {currentQuestion?.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={cn(
                      "w-full justify-start relative",
                      currentQuestion.userAnswer === index
                        ? currentQuestion.isCorrect
                          ? "text-green-50"
                          : "text-red-50"
                        : "",
                      currentQuestion.userAnswer !== null &&
                        index === currentQuestion.correctAnswerIndex
                        ? "text-green-50"
                        : "",
                      currentQuestion.userAnswer === index && currentQuestion.isCorrect === true
                      ? 'bg-green-500'
                      : currentQuestion.userAnswer === index && currentQuestion.isCorrect === false
                        ? 'bg-red-500'
                        : '',
                      (currentQuestion.userAnswer !== null && !currentQuestion.isCorrect && index === currentQuestion.correctAnswerIndex)
                        ? 'before:absolute before:inset-0 before:bg-green-500 before:animate-pulse before:opacity-50'
                        : '',
                       getLanguageSpecificClassName()
                    )}
                    onClick={() => {
                        handleAnswerSelection(index);
                    }}
                    disabled={currentQuestion.userAnswer !== null}
                  >
                    {option}
                  </Button>
                ))}
              </CardContent>
                <Button onClick={handleFinishQuiz}>
                    Finish Quiz
                </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="outline-none">
          {/* History Tab Content - unchanged */}
        </TabsContent>
      </Tabs>
      <style jsx>{`
        .marathi-font {
          font-family: 'Arial Unicode MS', sans-serif; /* Use a font that supports Marathi script */
        }
      `}</style>
    </div>
  );
};

export default App;

