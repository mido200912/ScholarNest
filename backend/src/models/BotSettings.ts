import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBotSettings extends Document {
  hunterChatId: string;
  huntEnabled: boolean;
  huntSchedule: string;
  queriesPerDay: number;
  searchQueries: string[];
  maxResultsPerQuery: number;
  telegramBotToken: string;
  updatedAt: Date;
}

interface IBotSettingsModel extends Model<IBotSettings> {
  getSettings(): Promise<IBotSettings>;
}

const botSettingsSchema = new Schema<IBotSettings, IBotSettingsModel>(
  {
    hunterChatId: {
      type: String,
      default: '',
    },
    huntEnabled: {
      type: Boolean,
      default: true,
    },
    huntSchedule: {
      type: String,
      default: '0 9 * * *',
    },
    queriesPerDay: {
      type: Number,
      default: 3,
      min: 1,
      max: 8,
    },
    searchQueries: {
      type: [String],
      default: [
        'fully funded scholarships 2026 2027 international students',
        'new scholarships for international students deadline 2026',
        'master PhD scholarship 2026 2027 fully funded',
        'scholarships for arab students abroad 2026',
        'latest government scholarships international students',
        'university scholarships 2026 2027 application open',
        'Erasmus Fulbright DAAD new scholarships 2026',
        'scholarship opportunities developing countries 2026',
      ],
    },
    maxResultsPerQuery: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    telegramBotToken: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

botSettingsSchema.static('getSettings', async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
});

export const BotSettings = mongoose.model<IBotSettings, IBotSettingsModel>('BotSettings', botSettingsSchema);
