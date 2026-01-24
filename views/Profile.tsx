
import React, { useState } from 'react';
import { User, Document } from '../types';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Upload, 
  File, 
  MoreVertical,
  Camera,
  Download,
  Trash2,
  Lock
} from 'lucide-react';

interface ProfileProps {
  user: User;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'documents' | 'security'>('details');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md">
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="h-32 bg-slate-900 relative">
          <div className="absolute -bottom-12 left-8 group cursor-pointer">
            <div className="relative">
              <img src={user.avatar} className="w-24 h-24 rounded-3xl border-4 border-white object-cover shadow-lg" alt="" />
              <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 px-8 pb-4">
          <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
          <p className="text-slate-500 font-medium capitalize">{user.role.toLowerCase()}</p>
        </div>

        <div className="flex border-b border-slate-100 px-8 mt-4">
          <button 
            onClick={() => setActiveSubTab('details')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeSubTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Personal Info
          </button>
          <button 
            onClick={() => setActiveSubTab('documents')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeSubTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Document Vault
          </button>
          <button 
            onClick={() => setActiveSubTab('security')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeSubTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Security
          </button>
        </div>

        <div className="p-8">
          {activeSubTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ProfileField icon={<UserIcon size={18}/>} label="Full Name" value={user.name} editable />
              <ProfileField icon={<Mail size={18}/>} label="Email Address" value={user.email} />
              <ProfileField icon={<Phone size={18}/>} label="Phone Number" value={user.phone || '+1 (555) 000-0000'} editable />
              <ProfileField icon={<MapPin size={18}/>} label="Current Address" value={user.address || 'Not set'} editable />
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bio / Professional Summary</label>
                <textarea 
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Tell us a bit about yourself..."
                ></textarea>
              </div>
            </div>
          )}

          {activeSubTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Personal Documents</h3>
                  <p className="text-xs text-slate-500">Securely store IDs, passports, and proof of funds.</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                  <Upload size={18} /> Upload New
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DocumentCard name="Passport_Copy.pdf" date="Oct 12, 2023" size="2.4 MB" />
                <DocumentCard name="Utility_Bill_May.pdf" date="May 02, 2024" size="1.1 MB" />
                <div className="border-2 border-dashed border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer">
                  <Upload size={24} className="mb-2" />
                  <p className="text-sm font-bold">Drop files here</p>
                  <p className="text-[10px] mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'security' && (
            <div className="space-y-8 max-w-md">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="text-blue-600" size={20}/> Privacy Settings</h3>
                <div className="space-y-3">
                  <SecurityOption label="Two-Factor Authentication" description="Add an extra layer of security to your account." enabled />
                  <SecurityOption label="Sign-In Alerts" description="Get notified whenever someone logs into your account." enabled={false} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Lock className="text-blue-600" size={20}/> Change Password</h3>
                <div className="space-y-3">
                  <input type="password" placeholder="Current Password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                  <input type="password" placeholder="New Password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                  <button className="text-sm font-bold text-blue-600 hover:underline">Update Password</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfileField: React.FC<{ icon: React.ReactNode, label: string, value: string, editable?: boolean }> = ({ icon, label, value, editable }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 group">
      <div className="text-slate-400 group-hover:text-blue-600 transition-colors">{icon}</div>
      <input 
        type="text" 
        defaultValue={value} 
        readOnly={!editable}
        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-900" 
      />
    </div>
  </div>
);

const DocumentCard: React.FC<{ name: string, date: string, size: string }> = ({ name, date, size }) => (
  <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 hover:shadow-md transition-shadow group">
    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
      <File size={24} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{date} • {size}</p>
    </div>
    <div className="flex items-center gap-1">
      <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"><Download size={18}/></button>
      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
    </div>
  </div>
);

const SecurityOption: React.FC<{ label: string, description: string, enabled: boolean }> = ({ label, description, enabled }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
    <div className="pr-4">
      <p className="text-sm font-bold text-slate-900">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <button className={`w-12 h-6 rounded-full relative transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'right-1' : 'left-1'}`}></div>
    </button>
  </div>
);

export default Profile;
