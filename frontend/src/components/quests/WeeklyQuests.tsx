import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/button';
import { API_BASE as API } from '../../config/api';
import { Loader2, Gift, CheckCircle2, CircleDashed, Sparkles, Flame } from 'lucide-react';

interface Quest {
  id: string;
  target: number;
  points: number;
  icon: string;
  title: { en: string; ar: string };
  desc: { en: string; ar: string };
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface QuestsData {
  weekKey: string;
  quests: Quest[];
  allCompleted: boolean;
  allClaimed: boolean;
  bonusPoints: number;
  allCompletedBonusGiven: boolean;
}

export default function WeeklyQuests({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const { user } = useAuthStore();
  const token = user?.token;
  const { success: toastSuccess, error: toastError } = useToast();
  const [data, setData] = useState<QuestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/quests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setData(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const claimQuest = async (questId: string) => {
    if (!token || !data) return;
    setClaiming(questId);
    try {
      const { data: res } = await axios.post(
        `${API}/quests/${questId}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.success) {
        toastSuccess(
          isAr ? 'تم استلام المكافأة!' : 'Reward claimed!',
          isAr ? `+${res.points} نقطة أضيفت لحسابك` : `+${res.points} points added to your account`
        );
        fetchQuests();
      }
    } catch {
      toastError(isAr ? 'فشل الاستلام' : 'Claim failed', isAr ? 'حاول مرة أخرى' : 'Please try again');
    } finally {
      setClaiming(null);
    }
  };

  const claimBonus = async () => {
    if (!token || !data) return;
    setClaiming('bonus');
    try {
      const { data: res } = await axios.post(
        `${API}/quests/bonus/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.success) {
        toastSuccess(
          isAr ? 'مكافأة الأسبوع الذهبي!' : 'Golden Week Bonus!',
          isAr ? `+${res.points} نقطة إضافية` : `+${res.points} bonus points`
        );
        fetchQuests();
      }
    } catch {
      toastError(isAr ? 'فشل الاستلام' : 'Claim failed', isAr ? 'أكمل كل المهام أولاً' : 'Complete all quests first');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!data) return null;

  const completedCount = data.quests.filter(q => q.completed).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Flame className="w-6 h-6 text-red-500" />
        <h2 className="text-2xl font-light">{isAr ? 'مهام الأسبوع' : 'Weekly Quests'}</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        {isAr
          ? 'أكمل المهام واكسب نقاطا ترفع مستواك. المهام تتجدد كل أسبوع.'
          : 'Complete quests to earn points and level up. Quests refresh every week.'}
      </p>

      <div className="mb-6 p-4 bg-card border border-border rounded-xl">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>
            {isAr ? `${completedCount} من ${data.quests.length} مهام مكتملة` : `${completedCount} of ${data.quests.length} quests completed`}
          </span>
          <span className="text-red-500 font-semibold">{Math.round((completedCount / data.quests.length) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / data.quests.length) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full"
          />
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {data.quests.map((quest, i) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`p-5 border rounded-xl transition-colors ${
                quest.claimed
                  ? 'bg-muted/30 border-border/50'
                  : quest.completed
                    ? 'bg-card border-emerald-500/30'
                    : 'bg-card border-border hover:border-red-500/25'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`text-3xl w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                  quest.claimed ? 'bg-muted/50 grayscale opacity-60' : 'bg-red-500/[0.06] border border-red-500/10'
                }`}>
                  {quest.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`font-bold ${quest.claimed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {isAr ? quest.title.ar : quest.title.en}
                    </h3>
                    <span className="text-[11px] font-bold text-red-500 bg-red-500/[0.06] border border-red-500/15 px-2 py-0.5 rounded-full shrink-0">
                      +{quest.points}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {isAr ? quest.desc.ar : quest.desc.en}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(quest.progress / quest.target) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.07 }}
                        className={`h-full rounded-full ${quest.completed ? 'bg-emerald-500' : 'bg-red-500'}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold shrink-0">
                      {quest.progress}/{quest.target}
                    </span>
                    {quest.completed && !quest.claimed && (
                      <Button
                        size="sm"
                        onClick={() => claimQuest(quest.id)}
                        disabled={claiming === quest.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg h-8 px-4 text-xs font-bold shrink-0"
                      >
                        {claiming === quest.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <>{isAr ? 'استلم' : 'Claim'} <Gift className="w-3.5 h-3.5 ml-1" /></>}
                      </Button>
                    )}
                    {quest.claimed && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> {isAr ? 'تم الاستلام' : 'Claimed'}
                      </span>
                    )}
                    {!quest.completed && (
                      <span className="text-muted-foreground/50 shrink-0">
                        <CircleDashed className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {data.allCompleted && !data.allCompletedBonusGiven && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-6 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-black text-lg">{isAr ? 'أسبوع ذهبي!' : 'Golden Week!'}</h3>
            </div>
            <p className="text-white/85 text-sm mb-4">
              {isAr
                ? `أكملت كل مهمات الأسبوع. استلم مكافأتك: +${data.bonusPoints} نقطة`
                : `You completed every quest this week. Claim your bonus: +${data.bonusPoints} points`}
            </p>
            <Button
              onClick={claimBonus}
              disabled={claiming === 'bonus'}
              className="bg-white text-red-700 hover:bg-white/90 font-black rounded-lg"
            >
              {claiming === 'bonus'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>{isAr ? `استلم +${data.bonusPoints}` : `Claim +${data.bonusPoints}`} <Gift className="w-4 h-4 ml-1.5" /></>}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
