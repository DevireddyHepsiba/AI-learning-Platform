import Quiz from "../../models/Quiz.js";

const normalizeAnswer = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/^\s*[A-D]\s*[).:-]\s*/i, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();

const getOptionLetter = (value) => {
  const match = String(value ?? "").trim().match(/^([A-D])(?:\s*[).:-]\s*|$)/i);
  return match?.[1]?.toUpperCase() || null;
};

const resolveCorrectOption = (question) => {
  const matchingOption = question.options?.find(
    (option) => normalizeAnswer(option) === normalizeAnswer(question.correctAnswer)
  );
  if (matchingOption) return matchingOption;

  const letter = getOptionLetter(question.correctAnswer);
  if (!letter) return question.correctAnswer;
  return question.options?.[letter.charCodeAt(0) - 65] ?? question.correctAnswer;
};

const resolveSubmittedOption = (question, submittedAnswer) => {
  const matchingOption = question.options?.find(
    (option) => normalizeAnswer(option) === normalizeAnswer(submittedAnswer)
  );
  if (matchingOption) return matchingOption;

  const letter = getOptionLetter(submittedAnswer);
  if (!letter) return submittedAnswer;
  return question.options?.[letter.charCodeAt(0) - 65] ?? submittedAnswer;
};

const isAnswerCorrect = (question, submittedAnswer) => {
  const submitted = normalizeAnswer(submittedAnswer);
  const expected = normalizeAnswer(question.correctAnswer);
  if (!submitted || !expected) return false;
  if (submitted === expected) return true;

  const correctLetter = getOptionLetter(question.correctAnswer);
  const correctOption = resolveCorrectOption(question);
  const submittedOption = resolveSubmittedOption(question, submittedAnswer);
  if (normalizeAnswer(submittedOption) === normalizeAnswer(correctOption)) return true;

  return Boolean(correctLetter && submitted === correctLetter.toLocaleLowerCase());
};

// @desc Get all quizzes for a document
// @route GET /api/quizzes/:documentId
// @access Private
export const getQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({
      userId: req.user._id,
      documentId: req.params.documentId,
    })
      .populate("documentId", "title fileName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get a single quiz by ID
// @route GET /api/quizzes/quiz/:id
// @access Private
export const getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
        statusCode: 404,
      });
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Submit quiz
// @route POST /api/quizzes/:id/submit
// @access Private
export const submitQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
        statusCode: 404,
      });
    }

    if (quiz.completedAt) {
      return res.status(400).json({
        success: false,
        error: "Quiz already completed",
        statusCode: 400,
      });
    }

    const submittedAnswers = Array.isArray(req.body?.userAnswers) ? req.body.userAnswers : [];

    let correctCount = 0;
    const userAnswers = [];
    const answeredQuestions = new Set();

    submittedAnswers.forEach((answer) => {
      if (!answer || typeof answer !== "object") return;
      const { questionIndex, selectedAnswer } = answer;

      if (
        Number.isInteger(questionIndex) &&
        questionIndex >= 0 &&
        questionIndex < quiz.questions.length &&
        !answeredQuestions.has(questionIndex) &&
        typeof selectedAnswer === "string"
      ) {
        answeredQuestions.add(questionIndex);
        const question = quiz.questions[questionIndex];
        const isCorrect = isAnswerCorrect(question, selectedAnswer);

        if (isCorrect) correctCount++;

        userAnswers.push({
          questionIndex,
          selectedAnswer,
          isCorrect,
          answeredAt: new Date(),
        });
      }
    });

    const score = quiz.questions.length
      ? Math.round((correctCount / quiz.questions.length) * 100)
      : 0;

    quiz.userAnswers = userAnswers;
    quiz.score = score;
    quiz.completedAt = new Date();

    await quiz.save();

    res.status(200).json({
      success: true,
      data: {
        quizId: quiz._id,
        score,
        correctCount,
        totalQuestions: quiz.questions.length,
        percentage: score,
        userAnswers,
      },
      message: "Quiz submitted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get quiz results
// @route GET /api/quizzes/:id/results
// @access Private
export const getQuizResults = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("documentId", "title");

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
        statusCode: 404,
      });
    }

    if (!quiz.completedAt) {
      return res.status(400).json({
        success: false,
        error: "Quiz not completed yet",
        statusCode: 400,
      });
    }

    const detailedResults = quiz.questions.map(
      (question, index) => {
        const userAnswer = quiz.userAnswers.find(
          (a) => a.questionIndex === index
        );

        const selectedAnswer = userAnswer?.selectedAnswer
          ? resolveSubmittedOption(question, userAnswer.selectedAnswer)
          : null;

        return {
          questionIndex: index,
          question: question.question,
          options: question.options,
          correctAnswer: resolveCorrectOption(question),
          selectedAnswer,
          // Recalculate to repair results saved before the option-label fix.
          isCorrect: isAnswerCorrect(question, selectedAnswer),
          explanation: question.explanation,
        };
      }
    );
    const correctCount = detailedResults.filter((result) => result.isCorrect).length;
    const score = quiz.questions.length
      ? Math.round((correctCount / quiz.questions.length) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          document: quiz.documentId,
          score,
          totalQuestions: quiz.questions.length,
          completedAt: quiz.completedAt,
        },
        results: detailedResults,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete quiz
// @route DELETE /api/quizzes/:id
// @access Private
export const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
        statusCode: 404,
      });
    }

    await quiz.deleteOne();

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
