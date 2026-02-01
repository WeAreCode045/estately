import {
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  File,
  FileText,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import React, { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import AddressAutocomplete from '../components/AddressAutocomplete';
import DocumentViewer from '../components/DocumentViewer';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/appwrite';
import { documentService } from '../services/documentService';
import type { Project, User } from '../types';
import { UserRole } from '../types';
import { useSettings } from '../utils/useSettings';

interface ProfileProps {
  user: User;
  projects: Project[];
  allUsers: User[];
  taskTemplates: any[];
  docDefinitions: any[];
}

const Profile: React.FC<ProfileProps> = ({ user, projects, allUsers, taskTemplates, docDefinitions }) => {
  const { refreshProfile } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const isOwnProfile = !userId || userId === user.id;
  const isAdminOrAgent = user.role === UserRole.ADMIN;

  // Access control: only self or admin
  if (!isOwnProfile && !isAdminOrAgent) {
    return <Navigate to="/profile" replace />;
  }

  // Determine which user data to display
  const displayUser = !isOwnProfile ? (allUsers.find(u => u.id === userId) || user) : user;

  const { googleApiKey } = useSettings();
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'tasks' | 'documents' | 'security'>('details');
  const [loading, setLoading] = useState(false);
  const [requiredDocs, setRequiredDocs] = React.useState<any[]>([]);
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = React.useState<string | null>(null);
  const [viewerError, setViewerError] = React.useState<string | null>(null);
  const [viewerDownloadUrl, setViewerDownloadUrl] = React.useState<string | null>(null);
  const handleOpenViewer = async (provided: any, title?: string) => {
    try {
      let url = provided?.url;
      if (!url && provided?.fileId) {
        url = await documentService.getFileUrl(provided.fileId);
      }
      if (!url) throw new Error('No URL available');

      // Ensure mode=admin is present
      if (!url.includes('mode=admin')) {
        url = url.includes('?') ? `${url}&mode=admin` : `${url}?mode=admin`;
      }

      setViewerError(null);
      setViewerUrl(url);
      setViewerTitle(title || provided?.name || 'Document');
      setViewerDownloadUrl(provided?.fileId ? documentService.getFileDownload(provided.fileId) : null);
    } catch (e) {
      console.error('Error opening viewer:', e);
      alert('Could not load document for viewing.');
    }
  };

  const handleCloseViewer = () => {
    setViewerUrl(null);
    setViewerTitle(null);
    setViewerError(null);
    setViewerDownloadUrl(null);
  };

  const [formData, setFormData] = useState({
    name: displayUser.name || '',
    firstName: displayUser.firstName || '',
    lastName: displayUser.lastName || '',
    phone: displayUser.phone || '',
    address: displayUser.address || '',
    city: displayUser.city || '',
    postalCode: displayUser.postalCode || '',
    country: displayUser.country || '',
    notificationPreference: displayUser.notificationPreference || 'BOTH',
    birthday: displayUser.birthday ? displayUser.birthday.split('T')[0] : '',
    birthPlace: displayUser.birthPlace || '',
    idNumber: displayUser.idNumber || '',
    vatNumber: displayUser.vatNumber || '',
    bankAccount: (displayUser as any).bankAccount || '',
  });

  // Track the ID to avoid resetting when profile finishes loading (Account -> Profile)
  const lastUserId = React.useRef(displayUser.id);

  // Sync form data when displayUser changes
  React.useEffect(() => {
    if (displayUser.id !== lastUserId.current) {
      setFormData({
        name: displayUser.name || '',
        firstName: displayUser.firstName || '',
        lastName: displayUser.lastName || '',
        phone: displayUser.phone || '',
        address: displayUser.address || '',
        city: displayUser.city || '',
        postalCode: displayUser.postalCode || '',
        country: displayUser.country || '',
        notificationPreference: displayUser.notificationPreference || 'BOTH',
        birthday: displayUser.birthday ? displayUser.birthday.split('T')[0] : '',
        birthPlace: displayUser.birthPlace || '',
        idNumber: displayUser.idNumber || '',
        vatNumber: displayUser.vatNumber || '',
        bankAccount: (displayUser as any).bankAccount || '',
      });
      lastUserId.current = displayUser.id;
    }
  }, [displayUser]);

  React.useEffect(() => {
    // load required document definitions for view detection
    let mounted = true;
    (async () => {
      try {
        const res = await documentService.listDefinitions();
        if (!mounted) return;
        const mapped = (res.documents || []).map((d: any) => ({ id: d.$id, title: d.title }));
        setRequiredDocs(mapped);
      } catch (e) {
        console.error('Failed to load required docs:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    let docId = (displayUser as any).$id;

    // Fallback: If profile doc ID missing, try direct fetch
    if (!docId) {
        setLoading(true);
        try {
            const profileData = await profileService.getByUserId(displayUser.id);
            if (profileData) {
                docId = profileData.$id;
            }
        } catch (e) {
            console.error("Profile fetch failed", e);
        }
    }

    if (!docId) {
      alert('Profile document ID is missing. Cannot save changes.');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      alert('Full Name is required.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim(),
        notificationPreference: formData.notificationPreference,
        birthday: formData.birthday || null,
        birthPlace: formData.birthPlace,
        idNumber: formData.idNumber,
        vatNumber: formData.vatNumber,
        bankAccount: formData.bankAccount,
      };

      await profileService.update(docId, updateData);
      if (isOwnProfile) {
        await refreshProfile();
      }
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Error updating profile: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {isOwnProfile ? 'My Profile' : `${displayUser.name}'s Profile`}
        </h1>
        {(isOwnProfile || isAdminOrAgent) && (
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="h-32 bg-slate-900 relative">
          <div className="absolute -bottom-12 left-8 group cursor-pointer">
            <div className="relative">
              <img src={displayUser.avatar} className="w-24 h-24 rounded-3xl border-4 border-white object-cover shadow-lg" alt="" />
              {isOwnProfile && (
                <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Camera size={24} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 px-8 pb-4">
          <h2 className="text-2xl font-bold text-slate-900">{displayUser.name}</h2>
          <p className="text-slate-500 font-medium capitalize">{displayUser.role.toLowerCase()}</p>
        </div>

        <div className="flex border-b border-slate-100 px-8 mt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('details')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeSubTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Personal Info
          </button>
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeSubTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Assigned Tasks
          </button>
          <button
            onClick={() => setActiveSubTab('documents')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeSubTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Document Vault
          </button>
          <button
            onClick={() => setActiveSubTab('security')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeSubTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Security
          </button>
        </div>

        <div className="p-8">
          {activeSubTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ProfileField
                icon={<UserIcon size={18}/>}
                label="First Name"
                value={formData.firstName}
                onChange={(v) => setFormData({...formData, firstName: v})}
                editable
              />
              <ProfileField
                icon={<UserIcon size={18}/>}
                label="Last Name"
                value={formData.lastName}
                onChange={(v) => setFormData({...formData, lastName: v})}
                editable
              />
              <ProfileField icon={<Mail size={18}/>} label="Email Address" value={displayUser.email} />
              <ProfileField
                icon={<Phone size={18}/>}
                label="Phone Number"
                value={formData.phone}
                onChange={(v) => setFormData({...formData, phone: v})}
                editable
              />
              <ProfileField
                icon={<MapPin size={18}/>}
                label="Current Address"
                value={formData.address}
                onChange={(v) => setFormData({...formData, address: v})}
                editable
                isAddress
                googleApiKey={googleApiKey}
              />
              <ProfileField
                icon={<MapPin size={18}/>}
                label="City"
                value={formData.city}
                onChange={(v) => setFormData({...formData, city: v})}
                editable
              />
              <ProfileField
                icon={<MapPin size={18}/>}
                label="Postal Code"
                value={formData.postalCode}
                onChange={(v) => setFormData({...formData, postalCode: v})}
                editable
              />
              <ProfileField
                icon={<Clock size={18}/>}
                label="Date of Birth"
                value={formData.birthday}
                onChange={(v) => setFormData({...formData, birthday: v})}
                editable
                type="date"
              />
              <ProfileField
                icon={<MapPin size={18}/>}
                label="Place of Birth"
                value={formData.birthPlace}
                onChange={(v) => setFormData({...formData, birthPlace: v})}
                editable
              />
              <ProfileField
                icon={<Hash size={18}/>}
                label="Personal ID Number"
                value={formData.idNumber}
                onChange={(v) => setFormData({...formData, idNumber: v})}
                editable
              />
              <ProfileField
                icon={<ShieldCheck size={18}/>}
                label="VAT/Tax Number"
                value={formData.vatNumber}
                onChange={(v) => setFormData({...formData, vatNumber: v})}
                editable
              />
              <ProfileField
                icon={<CreditCard size={18}/>}
                label="Bank Account (IBAN)"
                value={formData.bankAccount}
                onChange={(v) => setFormData({...formData, bankAccount: v})}
                editable
              />
              <ProfileField
                icon={<MapPin size={18}/>}
                label="Country"
                value={formData.country}
                onChange={(v) => setFormData({...formData, country: v})}
                editable
              />

              <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notification Preferences</label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: 'EMAIL', label: 'Email Only', icon: <Mail size={16}/> },
                    { id: 'APP', label: 'App Only', icon: <ShieldCheck size={16}/> },
                    { id: 'BOTH', label: 'Email & App', icon: <Bell size={16}/> }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFormData({...formData, notificationPreference: opt.id as any})}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                        formData.notificationPreference === opt.id
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Task History</h3>
                  <p className="text-xs text-slate-500">View your assigned tasks and completion status.</p>
                </div>
              </div>

              <div className="space-y-4">
                {displayUser.assignedTasks && displayUser.assignedTasks.length > 0 ? (
                  displayUser.assignedTasks.map((task, idx) => {
                    const template = taskTemplates.find(t => t.id === task.taskId);
                    const project = projects.find(p => p.id === task.projectId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {task.status === 'COMPLETED' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{template?.title || 'Unknown Task'}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Project: {project?.title || 'Personal/General'} • Assigned on {new Date(task.assignedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {task.status}
                          </span>
                          {task.completedAt && (
                            <p className="text-[10px] text-slate-500 mt-1">Completed {new Date(task.completedAt).toLocaleDateString()}</p>
                          )}

                          {/* View Document button when a document exists for this task */}
                          {(() => {
                            const userDocs = displayUser.userDocuments ? (typeof displayUser.userDocuments === 'string' ? JSON.parse(displayUser.userDocuments) : displayUser.userDocuments) : [];
                            const matchTitlePrefix = "Upload Document: ";
                            const isDocTask = task.title?.startsWith(matchTitlePrefix);
                            const docTitle = isDocTask ? task.title.replace(matchTitlePrefix, "") : "";
                            const req = docTitle ? requiredDocs.find(d => d.title === docTitle) : null;
                            const userDoc = req ? userDocs.find((ud: any) => ud.userDocumentDefinitionId === req.id && ud.projectId === task.projectId) : null;
                            if (userDoc) {
                              return (
                                <button onClick={() => handleOpenViewer(userDoc, template?.title || 'Document')} className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:underline">
                                  <FileText size={14} /> View Document
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No tasks assigned yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Document Vault</h3>
                  <p className="text-xs text-slate-500">Secure record of all documents you have provided.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayUser.userDocuments && displayUser.userDocuments.length > 0 ? (
                  displayUser.userDocuments.map((doc, idx) => {
                    const definition = docDefinitions.find(d => d.id === doc.userDocumentDefinitionId);
                    return (
                      <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm group hover:border-blue-200 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                            <File size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{definition?.title || doc.documentType || 'Document'}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Provided {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenViewer(doc, definition?.title || doc.documentType || 'Document')}
                          className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No documents provided yet.
                  </div>
                )}
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
    {(viewerUrl || viewerError) && (
      <DocumentViewer
        url={viewerUrl}
        downloadUrl={viewerDownloadUrl}
        error={viewerError || undefined}
        title={viewerTitle || undefined}
        onClose={handleCloseViewer}
      />
    )}
    </>
  );
};

const ProfileField: React.FC<{
  icon: React.ReactNode,
  label: string,
  value: string,
  editable?: boolean,
  onChange?: (value: string) => void,
  isAddress?: boolean,
  googleApiKey?: string | null,
  type?: string
}> = ({ icon, label, value, editable, onChange, isAddress, googleApiKey, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 group">
      <div className="text-slate-400 group-hover:text-blue-600 transition-colors">{icon}</div>
      {isAddress && googleApiKey && editable && onChange ? (
        <AddressAutocomplete
          apiKey={googleApiKey}
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-900"
        />
      ) : (
        <input
          type={type}
          value={value}
          readOnly={!editable}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-900"
        />
      )}
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
