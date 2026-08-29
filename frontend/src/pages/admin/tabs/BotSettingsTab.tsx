import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, RefreshCw, Sparkles, Bot, Search, Plus, X } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE as API } from '../../../config/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export default function BotSettingsTab() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();

  const [botSettings, setBotSettings] = useState<any>(null);
  const [botSettingsLoading, setBotSettingsLoading] = useState(false);
  const [botSettingsSaving, setBotSettingsSaving] = useState(false);
  const [newQuery, setNewQuery] = useState('');
  const [testHuntLoading, setTestHuntLoading] = useState(false);

  const headers = { Authorization: `Bearer ${user?.token}` };

  const fetchBotSettings = async () => {
    setBotSettingsLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/bot-settings`, { headers });
      setBotSettings(data.data);
    } catch {
      toastError('Failed', 'Could not load bot settings.');
    } finally {
      setBotSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchBotSettings();
  }, []);

  const handleSaveBotSettings = async () => {
    setBotSettingsSaving(true);
    try {
      const { data } = await axios.put(`${API}/admin/bot-settings`, botSettings, { headers });
      setBotSettings(data.data);
      toastSuccess('Saved!', 'Bot settings updated successfully.');
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not save bot settings.');
    } finally {
      setBotSettingsSaving(false);
    }
  };

  const handleTestHunt = async () => {
    setTestHuntLoading(true);
    try {
      await axios.post(`${API}/admin/bot-settings/test-hunt`, {}, { headers });
      toastSuccess('Hunt Triggered!', 'Check Telegram for results.');
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not trigger hunt.');
    } finally {
      setTestHuntLoading(false);
    }
  };

  const handleAddQuery = () => {
    if (!newQuery.trim()) return;
    setBotSettings({
      ...botSettings,
      searchQueries: [...(botSettings.searchQueries || []), newQuery.trim()],
    });
    setNewQuery('');
  };

  const handleRemoveQuery = (index: number) => {
    setBotSettings({
      ...botSettings,
      searchQueries: botSettings.searchQueries.filter((_: string, i: number) => i !== index),
    });
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-light mb-1">Bot Settings</h2>
      <p className="text-muted-foreground text-sm mb-6">Configure the AI Scholarship Hunter and Telegram bot settings.</p>

      {botSettingsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !botSettings ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Failed to load bot settings.</p>
          <Button onClick={fetchBotSettings} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Telegram Bot Section */}
          <Card className="rounded-lg border-border shadow-none bg-card">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4" /> Telegram Bot
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bot Token</Label>
                  <Input
                    type="password"
                    value={botSettings.telegramBotToken || ''}
                    onChange={e => setBotSettings({ ...botSettings, telegramBotToken: e.target.value })}
                    placeholder="Enter bot token from @BotFather"
                    className="rounded-lg shadow-none h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hunter Chat ID <span className="text-muted-foreground">(where notifications are sent)</span></Label>
                  <Input
                    value={botSettings.hunterChatId || ''}
                    onChange={e => setBotSettings({ ...botSettings, hunterChatId: e.target.value })}
                    placeholder="e.g. 8901344688"
                    className="rounded-lg shadow-none h-10"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Send /start to your bot, then forward the message to @userinfobot to get your Chat ID
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scholarship Hunter Section */}
          <Card className="rounded-lg border-border shadow-none bg-card">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Scholarship Hunter
              </h3>
              <div className="space-y-4">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Enable Daily Hunting</Label>
                    <p className="text-[10px] text-muted-foreground">Automatically search for new scholarships daily</p>
                  </div>
                  <button
                    onClick={() => setBotSettings({ ...botSettings, huntEnabled: !botSettings.huntEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      botSettings.huntEnabled ? 'bg-red-600' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      botSettings.huntEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Schedule */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Cron Schedule <span className="text-muted-foreground">(when to run)</span></Label>
                  <Input
                    value={botSettings.huntSchedule || '0 9 * * *'}
                    onChange={e => setBotSettings({ ...botSettings, huntSchedule: e.target.value })}
                    placeholder="0 9 * * * (daily at 9 AM)"
                    className="rounded-lg shadow-none h-10 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Format: minute hour day month weekday. Examples: "0 9 * * *" = daily at 9 AM
                  </p>
                </div>

                {/* Queries Per Day */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Queries Per Day <span className="text-muted-foreground">(1-8)</span></Label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={botSettings.queriesPerDay || 3}
                    onChange={e => setBotSettings({ ...botSettings, queriesPerDay: parseInt(e.target.value) || 3 })}
                    className="rounded-lg shadow-none h-10 w-32"
                  />
                </div>

                {/* Max Results Per Query */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Results Per Query <span className="text-muted-foreground">(1-10)</span></Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={botSettings.maxResultsPerQuery || 5}
                    onChange={e => setBotSettings({ ...botSettings, maxResultsPerQuery: parseInt(e.target.value) || 5 })}
                    className="rounded-lg shadow-none h-10 w-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Queries Section */}
          <Card className="rounded-lg border-border shadow-none bg-card">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Search className="w-4 h-4" /> Search Queries
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                These queries are used to search for new scholarships on the internet. More queries = broader search.
              </p>
              
              {/* Current Queries */}
              <div className="space-y-2 mb-4">
                {(botSettings.searchQueries || []).map((query: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 group">
                    <span className="text-[10px] text-muted-foreground w-5 shrink-0">{index + 1}.</span>
                    <Input
                      value={query}
                      onChange={e => {
                        const newQueries = [...botSettings.searchQueries];
                        newQueries[index] = e.target.value;
                        setBotSettings({ ...botSettings, searchQueries: newQueries });
                      }}
                      className="rounded-lg shadow-none h-9 text-sm flex-1"
                    />
                    <Button
                      onClick={() => handleRemoveQuery(index)}
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add New Query */}
              <div className="flex gap-2">
                <Input
                  value={newQuery}
                  onChange={e => setNewQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddQuery()}
                  placeholder="Add new search query..."
                  className="rounded-lg shadow-none h-10 flex-1"
                />
                <Button onClick={handleAddQuery} variant="outline" className="h-10 rounded-lg text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSaveBotSettings}
              disabled={botSettingsSaving}
              className="h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold"
            >
              {botSettingsSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                'Save Settings'
              )}
            </Button>
            <Button
              onClick={handleTestHunt}
              disabled={testHuntLoading}
              variant="outline"
              className="h-11 rounded-lg"
            >
              {testHuntLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Test Hunt Now</>
              )}
            </Button>
            <Button
              onClick={fetchBotSettings}
              variant="outline"
              className="h-11 rounded-lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
