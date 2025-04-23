"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { captureImage } from "@/services/camera";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  userAnswer?: number | null;
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<
    {
      quiz: Question[];
      score: number;
      date: Date;
    }[]
  >([]);

  const { toast } = useToast();

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
      }));

      setQuiz(initialQuizState);
      setActiveQuestionIndex(0);
      setQuizStarted(true);
    } catch (error: any) {
      toast({
        title: "Failed to generate quiz. Please try again.",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [imageSrc, numQuestions, difficulty, toast]);

  const handleAnswerSelection = (optionIndex: number) => {
    setQuiz((prevQuiz) => {
      const updatedQuiz = [...prevQuiz];
      updatedQuiz[activeQuestionIndex] = {
        ...prevQuiz[activeQuestionIndex],
        userAnswer: optionIndex,
      };
      return updatedQuiz;
    });
  };

  const handleNextQuestion = () => {
    setActiveQuestionIndex((prevIndex) => prevIndex + 1);
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

  const getCongratulatoryMessage = (score: number) => {
    const percentage = (score / quiz.length) * 100;
    if (percentage > 90) {
      return "Excellent!";
    } else if (percentage > 70) {
      return "Good job!";
    } else if (percentage > 50) {
      return "Not bad, keep practicing!";
    } else {
      return "Better luck next time!";
    }
  };

  const handleFinishQuiz = () => {
    const score = calculateScore();
    const congratulatoryMessage = getCongratulatoryMessage(score);

    toast({
      title: congratulatoryMessage,
      description: `You scored ${score} out of ${quiz.length}.`,
    });

    setQuizHistory((prevHistory) => [
      ...prevHistory,
      { quiz, score, date: new Date() },
    ]);
    setQuizStarted(false);
  };

  const currentQuestion = quiz[activeQuestionIndex];
  const isLastQuestion = activeQuestionIndex === quiz.length - 1;
  const score = calculateScore();
  const isCorrect =
    currentQuestion?.userAnswer === currentQuestion?.correctAnswerIndex;

  const handleCaptureImage = async () => {
    try {
      const imageData = await captureImage();
      setImageSrc(imageData);
      setCameraOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to capture image.",
        description: error.message,
        variant: "destructive",
      });
    }
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">Capture Image</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Capture Image</AlertDialogTitle>
                          <AlertDialogDescription>
                            Do you want to capture image from camera?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCaptureImage}>
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

              <Button onClick={generateQuiz} disabled={!imageSrc}>
                Generate Quiz
              </Button>
            </div>
          ) : (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>
                  Question {activeQuestionIndex + 1} of {quiz.length}
                </CardTitle>
                <CardDescription>{currentQuestion?.question}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {currentQuestion?.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={`w-full justify-start ${
                      currentQuestion.userAnswer === index
                        ? isCorrect
                          ? "bg-green-500 text-green-50"
                          : "bg-red-500 text-red-50"
                        : ""
                    } ${
                      currentQuestion.userAnswer !== null &&
                      index === currentQuestion.correctAnswerIndex
                        ? "bg-green-500 text-green-50"
                        : ""
                    }`}
                    onClick={() => handleAnswerSelection(index)}
                    disabled={currentQuestion.userAnswer !== null}
                  >
                    {option}
                  </Button>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between">
                {activeQuestionIndex > 0 && (
                  <Button onClick={() => setActiveQuestionIndex((i) => i - 1)}>
                    Previous
                  </Button>
                )}
                {isLastQuestion ? (
                  <Button onClick={handleFinishQuiz}>Finish Quiz</Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    disabled={currentQuestion?.userAnswer === null}
                  >
                    Next
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="outline-none">
          {quizHistory.length === 0 ? (
            <p>No quiz history available.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {quizHistory.map((history, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>Quiz {index + 1}</CardTitle>
                    <CardDescription>
                      Date: {history.date.toLocaleDateString()} - Score:{" "}
                      {history.score} / {history.quiz.length}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {history.quiz.map((question, qIndex) => (
                        <div key={qIndex} className="border p-2 rounded-md">
                          <p>
                            <strong>Q{qIndex + 1}:</strong> {question.question}
                          </p>
                          <p>
                            <strong>Your Answer:</strong>{" "}
                            {question.userAnswer !== null
                              ? question.options[question.userAnswer]
                              : "Not Answered"}
                          </p>
                          <p
                            className={
                              question.userAnswer === question.correctAnswerIndex
                                ? "text-green-500"
                                : "text-red-500"
                            }
                          >
                            <strong>Correct Answer:</strong>{" "}
                            {question.options[question.correctAnswerIndex]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default App;
