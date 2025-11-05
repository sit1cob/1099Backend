import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { FeedbackModel } from '../models/feedback';
import { FeedbackConfigModel } from '../models/feedbackConfig';
import mongoose from 'mongoose';

export const feedbackRouter = Router();

// GET /api/feedback/config
// Returns the active feedback survey configuration
feedbackRouter.get('/config', authenticateJWT({ skipValidation: true }), async (req: AuthenticatedRequest, res) => {
  try {
    // Find active config or return default
    let config = await FeedbackConfigModel.findOne({ isActive: true }).lean();
    
    if (!config) {
      // Return default config if none exists
      config = {
        title: "User Feedback Survey",
        questions: [
          {
            id: "q1",
            question: "How satisfied are you with the app performance?",
            type: "rating",
            required: true,
            order: 1
          },
          {
            id: "q2",
            question: "Any suggestions to improve your experience?",
            type: "text",
            required: true,
            order: 2
          }
        ]
      } as any;
    }

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
    console.log('[Feedback SUBMIT] User ID from token:', userIdString, 'Type:', typeof userIdString);
    
    if (!userIdString) {
      console.error('[Feedback SUBMIT] No userId in token!');
      return res.status(400).json({ success: false, message: 'No userId found in token' });
    }
    
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(userIdString);
      console.log('[Feedback SUBMIT] Converted to ObjectId:', userId.toString());
    } catch (error) {
      console.error('[Feedback SUBMIT] Failed to convert userId to ObjectId:', error);
      return res.status(400).json({ success: false, message: 'Invalid userId format in token' });
    }

    // Create feedback document
    const feedback = new FeedbackModel({
      userId,
      metadata,
      answers,
      submittedAt: new Date()
    });

    // Save to database
    const savedFeedback = await feedback.save();
    console.log('[Feedback SUBMIT] Saved with userId:', savedFeedback.userId.toString());

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
// Get all feedback submissions
// Query params: limit (default: 100)
feedbackRouter.get('/', authenticateJWT({ skipValidation: true }), async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    console.log('[Feedback GET] Fetching all feedback, limit:', limit);

    // Return all feedback - no userId filtering
    // Don't populate userId since users may not exist in MongoDB
    const feedbacks = await FeedbackModel
      .find({})
      .sort({ submittedAt: -1 })
      .limit(limit)
      .lean();

    console.log('[Feedback GET] Found feedbacks:', feedbacks.length);

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

// POST /api/feedback/config/question
// Add a new question to the feedback config
feedbackRouter.post('/config/question', authenticateJWT({ skipValidation: true }), async (req: AuthenticatedRequest, res) => {
  try {
    const { id, question, type, options, required, order } = req.body;

    // Validate required fields
    if (!id || !question || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'id, question, and type are required' 
      });
    }

    // Validate type
    const validTypes = ['rating', 'text', 'boolean', 'multiple_choice'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: `type must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Find or create active config
    let config = await FeedbackConfigModel.findOne({ isActive: true });
    
    if (!config) {
      // Create new config with default questions
      config = new FeedbackConfigModel({
        title: "User Feedback Survey",
        questions: [
          {
            id: "q1",
            question: "How satisfied are you with the app performance?",
            type: "rating",
            required: true,
            order: 1
          },
          {
            id: "q2",
            question: "Any suggestions to improve your experience?",
            type: "text",
            required: true,
            order: 2
          }
        ],
        isActive: true
      });
    }

    // Check if question with same id already exists
    const existingQuestion = config.questions.find((q: any) => q.id === id);
    if (existingQuestion) {
      return res.status(400).json({ 
        success: false, 
        message: `Question with id '${id}' already exists` 
      });
    }

    // Add new question
    const newQuestion = {
      id,
      question,
      type,
      options: options || [],
      required: required !== undefined ? required : true,
      order: order !== undefined ? order : config.questions.length + 1
    };

    config.questions.push(newQuestion);
    await config.save();

    console.log('[Feedback Config] Added new question:', id);

    return res.status(201).json({ 
      success: true, 
      data: newQuestion,
      message: 'Question added successfully' 
    });
  } catch (err: any) {
    console.error('[Feedback Config] Error adding question:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to add question' });
  }
});

// PUT /api/feedback/config/question/:questionId
// Update an existing question
feedbackRouter.put('/config/question/:questionId', authenticateJWT({ skipValidation: true }), async (req: AuthenticatedRequest, res) => {
  try {
    const { questionId } = req.params;
    const { question, type, options, required, order } = req.body;

    const config = await FeedbackConfigModel.findOne({ isActive: true });
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active feedback config found' 
      });
    }

    const questionIndex = config.questions.findIndex((q: any) => q.id === questionId);
    if (questionIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: `Question with id '${questionId}' not found` 
      });
    }

    // Update question fields
    if (question) config.questions[questionIndex].question = question;
    if (type) config.questions[questionIndex].type = type;
    if (options !== undefined) config.questions[questionIndex].options = options;
    if (required !== undefined) config.questions[questionIndex].required = required;
    if (order !== undefined) config.questions[questionIndex].order = order;

    await config.save();

    console.log('[Feedback Config] Updated question:', questionId);

    return res.json({ 
      success: true, 
      data: config.questions[questionIndex],
      message: 'Question updated successfully' 
    });
  } catch (err: any) {
    console.error('[Feedback Config] Error updating question:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update question' });
  }
});

// DELETE /api/feedback/config/question/:questionId
// Delete a question from the config
feedbackRouter.delete('/config/question/:questionId', authenticateJWT({ skipValidation: true }), async (req: AuthenticatedRequest, res) => {
  try {
    const { questionId } = req.params;

    const config = await FeedbackConfigModel.findOne({ isActive: true });
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active feedback config found' 
      });
    }

    const questionIndex = config.questions.findIndex((q: any) => q.id === questionId);
    if (questionIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: `Question with id '${questionId}' not found` 
      });
    }

    config.questions.splice(questionIndex, 1);
    await config.save();

    console.log('[Feedback Config] Deleted question:', questionId);

    return res.json({ 
      success: true, 
      message: 'Question deleted successfully' 
    });
  } catch (err: any) {
    console.error('[Feedback Config] Error deleting question:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to delete question' });
  }
});
