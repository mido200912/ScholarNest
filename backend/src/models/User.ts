import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional for Google OAuth users
  googleId?: string;
  role: 'user' | 'admin' | 'assistant_admin';
  savedScholarships: mongoose.Types.ObjectId[];
  
  // Smart Profile fields
  major?: string;
  gpa?: string;
  englishLevel?: string; // IELTS/TOEFL score
  targetCountries?: string[];
  telegramChatId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password required only if not using Google OAuth
      },
    },
    googleId: {
      type: String,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'assistant_admin'],
      default: 'user',
    },
    savedScholarships: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Scholarship',
      },
    ],
    major: { type: String, trim: true },
    gpa: { type: String, trim: true },
    englishLevel: { type: String, trim: true },
    targetCountries: [{ type: String, trim: true }],
    telegramChatId: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Exclude password when converting to JSON
userSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    delete ret.password;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);
