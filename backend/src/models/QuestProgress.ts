import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestProgress extends Document {
  user: mongoose.Types.ObjectId;
  weekKey: string;
  claimed: string[];
  allCompletedBonusGiven: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questProgressSchema = new Schema<IQuestProgress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    weekKey: {
      type: String,
      required: true,
    },
    claimed: [{ type: String }],
    allCompletedBonusGiven: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

questProgressSchema.index({ user: 1, weekKey: 1 }, { unique: true });

export const QuestProgress = mongoose.model<IQuestProgress>('QuestProgress', questProgressSchema);
