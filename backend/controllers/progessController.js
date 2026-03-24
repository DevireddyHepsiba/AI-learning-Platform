import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";

// @desc  Get user learning statistics
// @route GET /api/progress/dashboard
// @access Private
export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Use MongoDB aggregation for faster calculation instead of fetching all data
    const [flashcardStats, quizStats, recentData] = await Promise.all([
      // Flashcard stats using aggregation
      Flashcard.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalSets: { $sum: 1 },
            totalCards: { $sum: { $size: "$cards" } },
            reviewedCards: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$cards",
                    as: "card",
                    cond: { $gt: ["$$card.reviewCount", 0] },
                  },
                },
              },
            },
            starredCards: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$cards",
                    as: "card",
                    cond: { $eq: ["$$card.isStarred", true] },
                  },
                },
              },
            },
          },
        },
      ]),

      // Quiz stats using aggregation ⚡ Much faster!
      Quiz.aggregate([
        { $match: { userId, completedAt: { $ne: null } } },
        {
          $group: {
            _id: null,
            totalCompleted: { $sum: 1 },
            averageScore: { $avg: "$score" },
          },
        },
      ]),

      // Recent activity in parallel
      Promise.all([
        Document.find({ userId })
          .sort({ lastAccessed: -1 })
          .limit(5)
          .select("title fileName lastAccessed status")
          .lean(),

        Quiz.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("documentId", "title")
          .select("title score totalQuestions completedAt")
          .lean(),
      ]),
    ]);

    // Extract aggregation results
    const flashcardData = flashcardStats[0] || {
      totalSets: 0,
      totalCards: 0,
      reviewedCards: 0,
      starredCards: 0,
    };

    const quizData = quizStats[0] || {
      totalCompleted: 0,
      averageScore: 0,
    };

    const [recentDocuments, recentQuizzes] = recentData;

    // Get counts (these are fast)
    const [totalDocuments, totalFlashcardSets, totalQuizzes, completedQuizzes] =
      await Promise.all([
        Document.countDocuments({ userId }),
        Flashcard.countDocuments({ userId }),
        Quiz.countDocuments({ userId }),
        Quiz.countDocuments({ userId, completedAt: { $ne: null } }),
      ]);

    // Study streak (mock data)
    const studyStreak = Math.floor(Math.random() * 7) + 1;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalDocuments,
          totalFlashcardSets,
          totalFlashcards: flashcardData.totalCards,
          reviewedFlashcards: flashcardData.reviewedCards,
          starredFlashcards: flashcardData.starredCards,
          totalQuizzes,
          completedQuizzes,
          averageScore: Math.round(quizData.averageScore || 0),
          studyStreak,
        },
        recentActivity: {
          documents: recentDocuments,
          quizzes: recentQuizzes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
