import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  user: mongoose.Types.ObjectId;
  scholarship: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scholarship: {
      type: Schema.Types.ObjectId,
      ref: 'Scholarship',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast retrieval of comments for a specific scholarship
commentSchema.index({ scholarship: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
