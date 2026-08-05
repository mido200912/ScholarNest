import { Request, Response } from 'express';
import { Comment } from '../models/Comment';
import { Scholarship } from '../models/Scholarship';
import { AuthRequest } from '../middleware/auth';

// @desc    Add a comment to a scholarship
// @route   POST /api/comments/:scholarshipId
// @access  Private
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { scholarshipId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const scholarship = await Scholarship.findById(scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }

    const comment = await Comment.create({
      user: req.user?._id,
      scholarship: scholarshipId,
      text: text.trim(),
    });

    const populatedComment = await comment.populate('user', 'name role');

    res.status(201).json({ success: true, data: populatedComment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get comments for a specific scholarship
// @route   GET /api/comments/:scholarshipId
// @access  Public
export const getCommentsByScholarship = async (req: Request, res: Response) => {
  try {
    const { scholarshipId } = req.params;
    const comments = await Comment.find({ scholarship: scholarshipId })
      .populate('user', 'name role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: comments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
