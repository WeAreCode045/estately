import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Settings as SettingsIcon, Shield, Bell, Globe, Key, Save, Loader2 } from 'lucide-react';
import { configService } from '../services/appwrite';

interface SettingsProps {
  user: User;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [messagingProviderId, setMessagingProviderId] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [googleConfig, messagingConfig, appUrlConfig] = await Promise.all([
        configService.get('google_maps_api_key'),
        configService.get('messaging_provider_id'),
        configService.get('app_url')
      ]);

      if (googleConfig) {
        setGoogleApiKey((googleConfig as any).value || '');
      }
      if (messagingConfig) {
        setMessagingProviderId((messagingConfig as any).value || '');
      }
      if (appUrlConfig) {
        setAppUrl((appUrlConfig as any).value || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await Promise.all([
        configService.set('google_maps_api_key', googleApiKey),
        configService.set('messaging_provider_id', messagingProviderId),
        configService.set('app_url', appUrl)
      ]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Loading agency settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agency Settings</h1>
        <p className="text-slate-500 mt-1">Configure global platform integrations and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-blue-600 font-bold shadow-sm">
            <Globe size={20} /> Integrations
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-xl transition-colors">
            <Shield size={20} /> Security
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-xl transition-colors">
            <Bell size={20} /> Notifications
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Globe size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Google Maps Integration</h3>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                To enable address autocomplete for property listings and user profiles, please provide a Google Maps Platform API key with the "Places API" enabled.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Key size={14} /> Google Maps API Key
                </label>
                <div className="relative">
                  <input 
                    type="password"
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  />
                  {googleApiKey && (
                    <button 
                      type="button" 
                      onClick={() => setGoogleApiKey('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 mb-2">Platform Messaging</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Provide the Messaging Provider ID from your Appwrite console (under Messaging &rarr; Providers) to enable transactional emails for invitations and alerts.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Bell size={14} /> Messaging Provider ID
                  </label>
                  <input 
                    type="text"
                    value={messagingProviderId}
                    onChange={(e) => setMessagingProviderId(e.target.value)}
                    placeholder="e.g. 65b... (SMTP or Mailgun provider)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5 mt-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe size={14} /> Application Base URL
                  </label>
                  <input 
                    type="url"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://yourapp.domian.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 italic">This URL will be used in invitation emails to direct users to the registration page.</p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2 animate-in slide-in-from-top duration-300">
                  <Save size={16} /> settings saved successfully!
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
