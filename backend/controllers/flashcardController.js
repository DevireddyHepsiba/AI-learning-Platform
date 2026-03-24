import Flashcard from "../models/Flashcard.js";

/* ================================
   GET ALL FLASHCARD SETS
================================ */
export const getAllFlashcardSets = async (req, res, next) => {
  try {
    const sets = await Flashcard.find({ userId: req.user._id })
      .populate("documentId", "title")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: sets.length,
      data: sets,
    });
  } catch (error) {
    next(error);
  }
};

/* ================================
   GET FLASHCARDS BY DOCUMENT
================================ */
export const getFlashcards = async (req, res, next) => {
  try {
    const sets = await Flashcard.find({
      userId: req.user._id,
      documentId: req.params.documentId, // ✅ FIXED
    }).populate("documentId", "title");

    res.status(200).json({
      success: true,
      count: sets.length,
      data: sets,
    });
  } catch (error) {
    next(error);
  }
};

/* ================================
   REVIEW FLASHCARD
================================ */
export const reviewFlashcard = async (req, res, next) => {
  try {
    const set = await Flashcard.findOne({
      userId: req.user._id,
      "cards._id": req.params.cardId,
    });

    if (!set) {
      return res.status(404).json({
        success: false,
        error: "Flashcard not found",
      });
    }

    const card = set.cards.id(req.params.cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: "Flashcard not found",
      });
    }

    card.reviewCount += 1;
    card.lastReviewed = new Date();

    await set.save();

    res.status(200).json({
      success: true,
      data: card,
      message: "Flashcard reviewed",
    });
  } catch (error) {
    next(error);
  }
};

/* ================================
   TOGGLE STAR
================================ */
export const toggleStarFlashcard = async (req, res, next) => {
  try {
    const set = await Flashcard.findOne({
      userId: req.user._id,
      "cards._id": req.params.cardId,
    });

    if (!set) {
      return res.status(404).json({
        success: false,
        error: "Flashcard not found",
      });
    }

    const card = set.cards.id(req.params.cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: "Flashcard not found",
      });
    }

    card.isStarred = !card.isStarred;

    await set.save();

    res.status(200).json({
      success: true,
      data: card,
      message: card.isStarred
        ? "Flashcard starred"
        : "Flashcard unstarred",
    });
  } catch (error) {
    next(error);
  }
};

/* ================================
   DELETE FLASHCARD SET
================================ */
export const deleteFlashcardSet = async (req, res, next) => {
  try {
    const set = await Flashcard.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!set) {
      return res.status(404).json({
        success: false,
        error: "Flashcard set not found",
      });
    }

    await set.deleteOne();

    res.status(200).json({
      success: true,
      message: "Flashcard set deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
