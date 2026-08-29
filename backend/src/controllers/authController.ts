import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { registerSchema, loginSchema } from '../validators/authValidator';
import { Application } from '../models/Application';
import { Comment } from '../models/Comment';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password } = validatedData;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        major: user.major,
        gpa: user.gpa,
        englishLevel: user.englishLevel,
        targetCountries: user.targetCountries,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await User.findOne({ email });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        major: user.major,
        gpa: user.gpa,
        englishLevel: user.englishLevel,
        targetCountries: user.targetCountries,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

export const createAssistantAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, telegramChatId } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const assistant = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'assistant_admin',
      telegramChatId: telegramChatId || '',
    });

    res.status(201).json({ success: true, data: assistant });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.major = req.body.major || user.major;
      user.gpa = req.body.gpa || user.gpa;
      user.englishLevel = req.body.englishLevel || user.englishLevel;
      user.telegramChatId = req.body.telegramChatId !== undefined ? req.body.telegramChatId : user.telegramChatId;
      
      if (req.body.targetCountries && Array.isArray(req.body.targetCountries)) {
        user.targetCountries = req.body.targetCountries;
      }

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          major: updatedUser.major,
          gpa: updatedUser.gpa,
          englishLevel: updatedUser.englishLevel,
          targetCountries: updatedUser.targetCountries,
          token: generateToken(updatedUser._id.toString()),
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all users (admin)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role, limit = 20, page = 1 } = req.query;

    let query: any = {};

    if (role && ['user', 'admin', 'assistant_admin'].includes(role as string)) {
      query.role = role;
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get staff accounts (assistant admins)
// @route   GET /api/auth/staff
// @access  Private/Admin
export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await User.find({ role: 'assistant_admin' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: staff });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Don't allow deleting the main admin
    if (user.role === 'admin') {
      res.status(400).json({ success: false, message: 'Cannot delete admin account' });
      return;
    }

    const userId = user._id;

    // Cascade delete related data
    await Promise.all([
      Application.deleteMany({ user: userId }),
      Comment.deleteMany({ user: userId }),
    ]);

    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
