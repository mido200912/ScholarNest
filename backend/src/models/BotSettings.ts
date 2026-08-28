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
        'site:scholarships.com fully funded 2026',
        'site:opportunitiescorners.com scholarship 2026',
        'site:scholarshipalert.org new scholarship',
        'site:mastersportal.com scholarship master 2026',
        'site:phdportal.com PhD scholarship 2026',
        'site:erasmusmundus.eu Erasmus+ scholarship 2026',
        'site:daad.de scholarship 2026 international',
        'site:chevening.org scholarship 2026 2027',
        'site:fulbright.org Fulbright scholarship 2026',
        'site:scholarshiproar.com fully funded scholarship',
        'site:geteducationscholarships.com 2026',
        'site:scholarships360.info new scholarship 2026',
        '"fully funded" scholarship 2026 2027 application open deadline',
        '"scholarship" "2026" "apply now" "international students"',
        '"fully funded" "master" OR "PhD" scholarship 2026 deadline',
        'new scholarship announcement 2026 2027 apply now',
        'government scholarship 2026 international students deadline',
        'university scholarship 2026 2027 fully funded application',
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
