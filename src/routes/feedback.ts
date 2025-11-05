import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { FeedbackModel } from '../models/feedback';
import mongoose from 'mongoose';

export const feedbackRouter = Router();

// GET /api/feedback/config
// Returns the feedback survey configuration
feedbackRouter.get('/config', authenticateJWT({ skipValidation: true }), async (req: AuthenticatedRequest, res) => {
  try {
    const config = {
      title: "User Feedback Survey",
      questions: [
        {
          id: "q1",
          question: "How satisfied are you with the app performance?",
          type: "rating"
        },
        {
          id: "q2",
          question: "Any suggestions to improve your experience?",
          type: "text"
        }
      ]
    };

    return res.json({ success: true, data: config });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to get feedback config' });
  }
});

// POST /api/feedback/submit
// Submits user feedback
// Body: { metadata: {...}, answers: [...] }
feedbackRouter.post('/submit', authenticateJWT({ skipValidation: true }), async (req: AuthenticatedRequest, res) => {
  try {
    const { metadata, answers } = req.body || {};

    // Validate required fields
    if (!metadata || !answers) {
      return res.status(400).json({ 
        success: false, 
        message: 'metadata and answers are required' 
      });
    }

    // Validate metadata fields
    if (!metadata.appVersion || !metadata.deviceModel || !metadata.osVersion || !metadata.timestamp) {
      return res.status(400).json({ 
        success: false, 
        message: 'All metadata fields (appVersion, deviceModel, osVersion, timestamp) are required' 
      });
    }

    // Validate answers
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one answer is required' 
      });
    }

    // Validate each answer
    for (const answer of answers) {
      if (!answer.questionId || answer.answer === undefined || answer.answer === null) {
        return res.status(400).json({ 
          success: false, 
          message: 'Each answer must have a questionId and answer value' 
        });
      }
    }

    // Get userId from authenticated request and convert to ObjectId
    const userIdString = req.user!.userId;
    const userId = new mongoose.Types.ObjectId(userIdString);

    // Create feedback document
    const feedback = new FeedbackModel({
      userId,
      metadata,
      answers,
      submittedAt: new Date()
    });

    // Save to database
    const savedFeedback = await feedback.save();

    return res.status(201).json({ 
      success: true, 
      data: {
        id: savedFeedback._id,
        userId: savedFeedback.userId,
        submittedAt: savedFeedback.submittedAt
      },
      message: 'Feedback submitted successfully' 
    });
  } catch (err: any) {
    console.error('[Feedback] Error submitting feedback:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to submit feedback' });
  }
});

// GET /api/feedback
// Get all feedback submissions (admin) or user's own feedback
// Query params: limit (default: 100), userId (admin only)
feedbackRouter.get('/', authenticateJWT({ skipValidation: true }), async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const filterUserId = req.query.userId as string;
    const userRole = req.user!.role;
    const currentUserId = req.user!.userId;

    // Build query based on role
    let query: any = {};
    
    if (userRole === 'admin' && filterUserId) {
      // Admin can filter by specific userId
      query.userId = filterUserId;
    } else if (userRole !== 'admin') {
      // Regular users can only see their own feedback
      query.userId = currentUserId;
    }
    // If admin and no filterUserId, show all feedback (empty query)

    const feedbacks = await FeedbackModel
      .find(query)
      .sort({ submittedAt: -1 })
      .limit(limit)
      .populate('userId', 'username email')
      .lean();

    return res.json({ 
      success: true, 
      data: feedbacks,
      count: feedbacks.length 
    });
  } catch (err: any) {
    console.error('[Feedback] Error fetching feedback:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch feedback' });
  }
});
