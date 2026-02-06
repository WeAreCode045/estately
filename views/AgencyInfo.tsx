/* eslint-env browser */
import {
    Building2,
    CreditCard,
    Hash,
    Image as ImageIcon,
    Loader2,
    MapPin,
    Save,
    Users
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import BrochureBuilder from '../components/brochure-builder/BrochureBuilder';
import { exportBlocksToHtml } from '../components/brochure-builder/services/htmlExportService';
import { PageBlock } from '../components/brochure-builder/types';
import { defaultTheme } from '../components/pdf/themes';
import type { BrochureSettings, PageConfig } from '../components/pdf/types';
import { COLLECTIONS, DATABASE_ID, ID, databases } from '../services/appwrite';
import { s3Service } from '../services/s3Service';
import type { Agency, Project, User } from '../types';
import { UserRole } from '../types';

interface AgencyInfoProps {
  user: User;
  allUsers: User[];
}

const AgencyInfo: React.FC<AgencyInfoProps> = ({ allUsers }) => {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'brochure'>('general');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string>('');
  const [imgError, setImgError] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
      async function loadPreviewData() {
        if (!selectedProjectId) {
            setPreviewData(null);
            return;
        }
        const proj = projects.find(p => p.id === selectedProjectId);
        if (!proj) return;

        let coverUrl = '';
        if (proj.coverImageId) {
            try { coverUrl = await s3Service.getPresignedUrl(proj.coverImageId); } catch (e) { console.error(e); }
        }

        let mediaUrls: string[] = [];
        if (proj.media) {
            try {
                mediaUrls = await Promise.all(proj.media.map(m => s3Service.getPresignedUrl(m)));
            } catch (e) {
                console.error(e);
            }
        }

        // Construct flattened data object for liquid/handlebars style interpolation
        setPreviewData({
            project: {
                name: proj.title,
                description: proj.property?.description || 'Professional property description would go here...',
                address: proj.property?.address,
                price: proj.property?.price,
                livingArea: proj.property?.livingArea ? `${proj.property.livingArea} m²` : '',
                bedrooms: proj.property?.bedrooms,
                coverImage: coverUrl,
                images: mediaUrls
            },
            agency: {
                name: agency?.name,
                logo: agencyLogoUrl,
                address: agency?.address
            },
            agent: {
                name: 'John Doe', // Placeholder as project might not link to full agent object structure here
                email: 'john@estately.com',
                phone: '+31 6 1234 5678'
            }
        });
      }
      loadPreviewData();
  }, [selectedProjectId, projects, agency, agencyLogoUrl]);

  // Still needed for fallback or default brochure settings structure if needed by other components
  const defaultBrochureSettings: BrochureSettings = {
    theme: defaultTheme,
    pages: [
      { type: 'cover', enabled: true },
      { type: 'description', enabled: true },
      { type: 'gallery', enabled: true, columns: 2 },
      { type: 'features', enabled: true },
      { type: 'map', enabled: true },
      { type: 'contact', enabled: true }
    ]
  };

  useEffect(() => {
    const fetchAgency = async () => {
      try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.AGENCY);
        if (response.documents.length > 0) {
          const doc: any = response.documents[0];
          setAgency({
            id: doc.$id,
            name: doc.name,
            logo: doc.logo,
            address: doc.address,
            bankAccount: doc.bankAccount,
            vatCode: doc.vatCode,
            agentIds: doc.agentIds || [],
            brochureSettings: doc.brochureSettings
          });
          setIsNew(false);
        } else {
          setAgency({
            id: '',
            name: '',
            logo: '',
            address: '',
            bankAccount: '',
            vatCode: '',
            agentIds: [],
            brochureSettings: JSON.stringify(defaultBrochureSettings)
          });
          setIsNew(true);
        }
      } catch (error) {
        console.error('Error fetching agency info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgency();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS);
            const loaded = response.documents.map(d => ({ ...d, id: d.$id } as unknown as Project));
            setProjects(loaded);
        } catch (e) {
            console.error('Error loading projects for preview:', e);
        }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const resolveLogo = async () => {
      setImgError(false);
      if (!agency?.logo) return setAgencyLogoUrl('');
      if (agency.logo.startsWith('http')) return setAgencyLogoUrl(agency.logo);
      try {
        const url = await s3Service.getPresignedUrl(agency.logo);
        setAgencyLogoUrl(url);
      } catch {
        setAgencyLogoUrl('');
      }
    };
    resolveLogo();
  }, [agency?.logo]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;

    setSaving(true);
    try {
      const data = {
        name: agency.name,
        logo: agency.logo,
        address: agency.address,
        bankAccount: agency.bankAccount,
        vatCode: agency.vatCode,
        agentIds: agency.agentIds,
        brochureSettings: agency.brochureSettings
      };

      if (isNew) {
        const res = await databases.createDocument(DATABASE_ID, COLLECTIONS.AGENCY, ID.unique(), data);
        setAgency({ ...agency, id: res.$id });
        setIsNew(false);
      } else {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.AGENCY, agency.id, data);
      }
      alert('Agency information saved successfully!');
    } catch (error: any) {
      console.error('Error saving agency info:', error);
      alert('Failed to save agency information.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !agency) return;

    try {
      setUploadingLogo(true);
      const uploaded = await s3Service.uploadAgencyFile(agency.id || 'agency', 'logo', file);
      setAgency({ ...agency, logo: uploaded.key });

    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleAgent = (userId: string) => {
    if (!agency) return;
    const current = agency.agentIds || [];
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    setAgency({ ...agency, agentIds: updated });
  };

  const getInitialBlocks = (): PageBlock[] | undefined => {
    if (!agency?.brochureSettings) return undefined;
    try {
        const parsed = JSON.parse(agency.brochureSettings);
        if (Array.isArray(parsed)) return parsed;
        if (parsed.builderBlocks) return parsed.builderBlocks;
        return undefined;
    } catch {
        return undefined;
    }
  };

  const handleBuilderSave = (blocks: PageBlock[]) => {
      if (!agency) return;
      let settings: BrochureSettings;
      try {
          const parsed = JSON.parse(agency.brochureSettings || '{}');
          // If legacy array, upgrade to object
          if (Array.isArray(parsed)) {
              settings = { ...defaultBrochureSettings, builderBlocks: blocks };
          } else {
              settings = { ...defaultBrochureSettings, ...parsed, builderBlocks: blocks };
          }
      } catch {
          settings = { ...defaultBrochureSettings, builderBlocks: blocks };
      }
      setAgency({ ...agency, brochureSettings: JSON.stringify(settings) });
      alert('Brochure template saved to local state. Click "Save Changes" to persist.');
  };

  const handleSavePage = (blocks: PageBlock[]) => {
      if (!agency) return;
      const name = prompt("Enter a name for this page (e.g. 'Intro Page')");
      if (!name) return;

      const html = exportBlocksToHtml(blocks);

      let settings: BrochureSettings;
      try {
          const parsed = JSON.parse(agency.brochureSettings || '{}');
          if (Array.isArray(parsed)) {
              settings = { ...defaultBrochureSettings, builderBlocks: parsed };
          } else {
              settings = { ...defaultBrochureSettings, ...parsed };
          }
      } catch (e) {
          console.error("Failed to parse brochure settings", e);
          settings = { ...defaultBrochureSettings };
      }

      // Add custom page
      const newPage: PageConfig = {
          type: 'custom',
          enabled: true,
          title: name,
          htmlContent: html,
          blocks: blocks,
          options: {}
      };

      // Ensure we have a fresh array to avoid reference mutation of defaults
      const currentPages = settings.pages ? [...settings.pages] : [];
      currentPages.push(newPage);
      settings.pages = currentPages;

      setAgency({ ...agency, brochureSettings: JSON.stringify(settings) });
      alert(`Page "${name}" added to brochure settings.`);
  };

  const getSavedPages = (): PageConfig[] => {
    if (!agency?.brochureSettings) return [];
    try {
        const parsed = JSON.parse(agency.brochureSettings);
        return parsed.pages || [];
    } catch {
        return [];
    }
  };

  const handleDeletePage = (index: number) => {
      if (!agency) return;
      if (!confirm('Are you sure you want to delete this page?')) return;

      let settings: BrochureSettings;
      try {
          const parsed = JSON.parse(agency.brochureSettings || '{}');
          settings = { ...defaultBrochureSettings, ...parsed };
      } catch {
          return;
      }

      if (settings.pages) {
          settings.pages.splice(index, 1);
          setAgency({ ...agency, brochureSettings: JSON.stringify(settings) });
      }
  };

  const handleLoadPage = (index: number): PageBlock[] | undefined => {
      const pages = getSavedPages();
      if (pages[index] && pages[index].blocks) {
          return pages[index].blocks;
      }
      return undefined;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }




  const agents = allUsers.filter(u => u.role === UserRole.AGENT || u.role === UserRole.ADMIN);

  return (
    <div className={activeTab === 'brochure' ? "w-full min-h-screen bg-slate-50 flex flex-col pt-8 animate-in fade-in" : "max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500"}>
      <div className={activeTab === 'brochure' ? "max-w-5xl mx-auto w-full px-4 lg:px-6 mb-4" : ""}>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Agency Information</h1>
                <p className="text-slate-500 mt-1">Manage your real estate agency profile and linked agents.</p>
            </div>
            <div className="flex items-center gap-4">
                {activeTab === 'brochure' && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Preview Data:</span>
                        <select
                            className="bg-white border border-slate-300 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                        >
                            <option value="">-- No Project (Generic) --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>
                )}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
                    Save Changes
                </button>
            </div>
        </div>
      </div>

      <div className={activeTab === 'brochure' ? "max-w-5xl mx-auto w-full px-4 lg:px-6 border-b border-slate-200" : "flex border-b border-slate-200"}>
        <div className="flex">
            <button
                onClick={() => setActiveTab('general')}
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
                    activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
                General Details
            </button>
            <button
                onClick={() => setActiveTab('brochure')}
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
                    activeTab === 'brochure' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
                Brochure Builder
            </button>
        </div>
      </div>

      {activeTab === 'general' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              <h2 className="font-bold text-slate-900">General Information</h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="agency-name" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Agency Name</label>
                  <input
                    id="agency-name"
                    type="text"
                    value={agency?.name}
                    onChange={e => setAgency({ ...agency!, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="e.g. Estately Premium Realty"
                  />
                </div>
                <div>
                  <label htmlFor="agency-vat" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">VAT / Tax Code</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      id="agency-vat"
                      type="text"
                      value={agency?.vatCode}
                      onChange={e => setAgency({ ...agency!, vatCode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      placeholder="e.g. NL123456789B01"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="agency-address" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Physical Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="agency-address"
                    type="text"
                    value={agency?.address}
                    onChange={e => setAgency({ ...agency!, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="Main St 123, 1011AB Amsterdam"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="agency-bank" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bank Account (IBAN)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="agency-bank"
                    type="text"
                    value={agency?.bankAccount}
                    onChange={e => setAgency({ ...agency!, bankAccount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="NL00 BANK 0123 4567 89"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                <h2 className="font-bold text-slate-900">Linked Agents</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                {agency?.agentIds?.length || 0} Linked
              </span>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map(agent => (
                <div
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAgent(agent.id); } }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      agency?.agentIds?.includes(agent.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                  <img src={agent.avatar || `https://ui-avatars.com/api/?name=${agent.name}`} className="w-10 h-10 rounded-xl object-cover" alt={agent.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{agent.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{agent.role}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    agency?.agentIds?.includes(agent.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-slate-200'
                  }`}>
                    {agency?.agentIds?.includes(agent.id) && <Save size={10} className="text-white" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
            <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-widest text-slate-400">Agency Logo</h3>
            <input
              id="agency-logo-input"
              type="file"
              aria-label="Upload agency logo"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleLogoUpload}
            />
            <div className="relative group mx-auto w-32 h-32 mb-6">
              <div className="w-32 h-32 rounded-[2rem] bg-slate-100 border-4 border-slate-50 overflow-hidden shadow-inner flex items-center justify-center relative">
                {agency?.logo && !imgError ? (
                  <img
                    src={agencyLogoUrl}
                    className="w-full h-full object-contain"
                    alt="Logo"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Building2 size={40} className="text-slate-300" />
                )}
                {uploadingLogo && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                    </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="absolute -bottom-2 -right-2 bg-white p-2.5 rounded-2xl shadow-xl border border-slate-100 text-slate-600 hover:text-blue-600 disabled:opacity-50 transition-all"
              >
                <ImageIcon size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed italic">
              "This logo will appear on all automated contracts and client communications."
            </p>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'brochure' && (
        <div className="flex-1 overflow-hidden border-t border-slate-200 bg-slate-100 flex flex-col h-[calc(100vh-140px)]">
             <BrochureBuilder
                initialBlocks={getInitialBlocks()}
                onSave={handleBuilderSave}
                onSavePage={handleSavePage}
                savedPages={getSavedPages()}
                onDeletePage={handleDeletePage}
                onLoadPage={handleLoadPage}
                previewData={previewData}
             />
        </div>
      )}
    </div>
  );
};

export default AgencyInfo;
