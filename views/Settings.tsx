import { Bell, Database, Globe, Key, Loader2, Save, Shield, User as UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { configService, profileService } from '../api/appwrite';
import type { User } from '../types';
import { UserRole } from '../types';
import { migrateAllProjects, migrateProjectProperty } from '../utils/migratePropertyData';

interface SettingsProps {
  user: User;
}

const Settings: React.FC<SettingsProps> = ({ user: _user }) => {
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [messagingProviderId, setMessagingProviderId] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [defaultAgentId, setDefaultAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [googleConfig, messagingConfig, appUrlConfig, defaultAgentConfig, profiles] = await Promise.all([
        configService.get('google_maps_api_key'),
        configService.get('messaging_provider_id'),
        configService.get('app_url'),
        configService.get('default_agent_id'),
        profileService.listAll()
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
      if (defaultAgentConfig) {
        setDefaultAgentId((defaultAgentConfig as any).value || '');
      }

      setAgents(profiles.documents.filter((p: any) => p.role === UserRole.ADMIN));

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
        configService.set('app_url', appUrl),
        configService.set('default_agent_id', defaultAgentId)
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

  const handleMigrateFirstProject = async () => {
    setMigrating(true);
    setMigrationResult(null);
    try {
      const result = await migrateProjectProperty();
      if (result?.alreadyMigrated) {
        setMigrationResult('✓ Project already has property data migrated.');
      } else if (result?.needsAttributeCreation) {
        setMigrationResult('⚠️ Property created but needs attribute setup. Check console for instructions.');
      } else {
        setMigrationResult(`✓ Migration successful! Property ID: ${result?.property.$id}`);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      if (errorMsg.includes('Unknown attribute') || errorMsg.includes('property_id')) {
        setMigrationResult('❌ property_id attribute missing. Check console for setup instructions.');
      } else {
        setMigrationResult(`✗ Migration failed: ${errorMsg}`);
      }
    } finally {
      setMigrating(false);
    }
  };

  const handleMigrateAllProjects = async () => {
    if (!confirm('Are you sure you want to migrate all projects? This will create property records for all projects without a property_id.')) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);
    try {
      const results = await migrateAllProjects();
      const successful = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success).length;
      setMigrationResult(`✓ Migration completed! Successful: ${successful}, Failed: ${failed}`);
    } catch (err: any) {
      setMigrationResult(`✗ Migration failed: ${err.message}`);
    } finally {
      setMigrating(false);
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
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-xl transition-colors">
            <Database size={20} /> Data Migration
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

                <div className="space-y-3 mt-6 pt-6 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <UserIcon size={14} /> Default Agent
                  </label>
                  <p className="text-sm text-slate-500 mb-2">Select the agent that will be automatically assigned to new projects if no manager is specified.</p>

                  <div className="space-y-2">
                    {agents.length === 0 ? (
                       <p className="text-sm text-slate-400 italic bg-slate-50 p-2 rounded-lg">No admin profiles found.</p>
                    ) : (
                      agents.map(agent => (
                        <label key={agent.$id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${defaultAgentId === agent.userId ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                          <input
                            type="radio"
                            name="defaultAgent"
                            value={agent.userId}
                            checked={defaultAgentId === agent.userId}
                            onChange={() => setDefaultAgentId(agent.userId)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <img src={agent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}`} className="w-8 h-8 rounded-full border border-slate-100" />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{agent.name}</p>
                            <p className="text-xs text-slate-500">{agent.email}</p>
                          </div>
                          {defaultAgentId === agent.userId && <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">DEFAULT</span>}
                        </label>
                      ))
                    )}
                  </div>
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

          {/* Data Migration Section */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Database size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Data Migration Utilities</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-medium mb-1">⚠️ Admin Only</p>
                <p className="text-sm text-amber-700">
                  These utilities help migrate property data from legacy project records to the new property collection structure.
                  Use with caution and check the browser console for detailed logs.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">Migrate First Project</h4>
                    <p className="text-sm text-slate-500">Test migration with the first project in the database</p>
                  </div>
                  <button
                    onClick={handleMigrateFirstProject}
                    disabled={migrating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {migrating ? <Loader2 className="animate-spin" size={16} /> : null}
                    {migrating ? 'Migrating...' : 'Migrate'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900">Migrate All Projects</h4>
                    <p className="text-sm text-slate-500">Migrate all projects without property_id (bulk operation)</p>
                  </div>
                  <button
                    onClick={handleMigrateAllProjects}
                    disabled={migrating}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {migrating ? <Loader2 className="animate-spin" size={16} /> : null}
                    {migrating ? 'Migrating...' : 'Migrate All'}
                  </button>
                </div>
              </div>

              {migrationResult && (
                <div className={`p-4 rounded-xl text-sm font-medium ${
                  migrationResult.startsWith('✓')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {migrationResult}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  💡 Check the browser console (F12) for detailed migration logs and progress information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
