import {
    ArrowDown,
    ArrowUp,
    Building2,
    CreditCard,
    FileText,
    GripVertical,
    Hash,
    Image as ImageIcon,
    Loader2,
    MapPin,
    Palette,
    Save,
    Sparkles,
    Upload,
    Users
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { BUCKETS, COLLECTIONS, DATABASE_ID, ID, databases, storage } from '../services/appwrite';
import { Agency, User, UserRole } from '../types';
import { BrochureSettings, PageConfig, PageType } from '../components/pdf/types';
import { defaultTheme } from '../components/pdf/themes';
import { GeminiService } from '../services/geminiService';

interface AgencyInfoProps {
  user: User;
  allUsers: User[];
}

const AgencyInfo: React.FC<AgencyInfoProps> = ({ user, allUsers }) => {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'brochure'>('general');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
      const fileId = ID.unique();
      
      // Upload file to bucket
      await storage.createFile(
        BUCKETS.AGENCY,
        fileId,
        file
      );

      // Update agency state
      setAgency({ ...agency, logo: fileId });
      
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

  const handlePdfAnalysis = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert("Please upload a PDF or Image file (JPG, PNG, WebP).");
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please upload a file smaller than 10MB.");
        return;
    }

    try {
      setAnalyzing(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
          try {
             // Extract base64 part properly
             const resultString = reader.result as string;
             // Handle both regular base64 and data URI formats if needed, but split(',') usually works for FileReader
             const base64 = resultString.includes(',') ? resultString.split(',')[1] : resultString;
             
             const gemini = new GeminiService();
             const result = await gemini.generateBrochureTemplateFromPDF(base64, file.type);
             
             if (result) {
                 if (confirm("AI Analysis Complete! We found a matching color scheme and page structure. Do you want to apply these settings? This will overwrite your current configuration.")) {
                     updateBrochureSettings(prev => ({
                         ...prev,
                         theme: {
                             colors: { ...prev.theme.colors, ...(result.theme?.colors || {}) },
                             fonts: { ...prev.theme.fonts, ...(result.theme?.fonts || {}) },
                             shapes: { ...(prev.theme.shapes || defaultTheme.shapes), ...(result.theme?.shapes || {}) },
                             background: { ...(prev.theme.background || defaultTheme.background), ...(result.theme?.background || {}) }
                         },
                         pages: result.pages || prev.pages
                     }));
                 }
             }
          } catch (e: any) {
              console.error("AI Analysis Error", e);
              alert(`Failed to analyze file. Error: ${e.message || "Unknown error"}. Please try a simpler file.`);
          } finally {
              setAnalyzing(false);
          }
      };

    } catch (error) {
      console.error('Error starting analysis:', error);
      setAnalyzing(false);
    } finally {
      // Reset input
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
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

  const getBrochureSettings = (): BrochureSettings => {
    if (!agency?.brochureSettings) return defaultBrochureSettings;
    try {
        const parsed = JSON.parse(agency.brochureSettings);
        
        // Auto-migration for legacy blue theme -> luxury black theme
        const isLegacyBlue = parsed.theme?.colors?.primary === '#1f3c88';
        const baseTheme = isLegacyBlue ? defaultTheme : { ...defaultTheme, ...parsed.theme };
        
        // Clean merge with default structure to avoid missing properties on legacy data
        return {
            ...defaultBrochureSettings,
            ...parsed,
            theme: { 
                colors: { ...defaultTheme.colors, ...(isLegacyBlue ? {} : (parsed.theme?.colors || {})) },
                fonts: { ...defaultTheme.fonts, ...(isLegacyBlue ? {} : (parsed.theme?.fonts || {})) },
                shapes: { ...(defaultTheme.shapes || {}), ...(isLegacyBlue ? {} : (parsed.theme?.shapes || {})) },
                background: { ...(defaultTheme.background || {}), ...(isLegacyBlue ? {} : (parsed.theme?.background || {})) }
            },
            pages: parsed.pages || defaultBrochureSettings.pages
        };
    } catch {
        return defaultBrochureSettings;
    }
  };

  const updateBrochureSettings = (updater: (prev: BrochureSettings) => BrochureSettings) => {
    if (!agency) return;
    const current = getBrochureSettings();
    const updated = updater(current);
    setAgency({ ...agency, brochureSettings: JSON.stringify(updated) });
  };

  // Helper for direct object updates (legacy compatibility if needed, but updater pattern preferred)
  const updateBrochureObject = (updates: Partial<BrochureSettings>) => {
      updateBrochureSettings(prev => ({ ...prev, ...updates }));
  };

  const movePage = (index: number, direction: 'up' | 'down') => {
      updateBrochureSettings(prev => {
          const newPages = [...prev.pages];
          if (direction === 'up' && index > 0) {
              [newPages[index], newPages[index - 1]] = [newPages[index - 1], newPages[index]];
          } else if (direction === 'down' && index < newPages.length - 1) {
              [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
          }
          return { ...prev, pages: newPages };
      });
  };

  const togglePage = (index: number) => {
      updateBrochureSettings(prev => {
          const newPages = [...prev.pages];
          newPages[index] = { ...newPages[index], enabled: !newPages[index].enabled };
          return { ...prev, pages: newPages };
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const agents = allUsers.filter(u => u.role === UserRole.AGENT || u.role === UserRole.ADMIN);
  const brochureSettings = getBrochureSettings();

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agency Information</h1>
          <p className="text-slate-500 mt-1">Manage your real estate agency profile and linked agents.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      <div className="flex border-b border-slate-200">
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
            Brochure Settings
        </button>
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
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Agency Name</label>
                  <input
                    type="text"
                    value={agency?.name}
                    onChange={e => setAgency({ ...agency!, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="e.g. Estately Premium Realty"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">VAT / Tax Code</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
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
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Physical Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={agency?.address}
                    onChange={e => setAgency({ ...agency!, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="Main St 123, 1011AB Amsterdam"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bank Account (IBAN)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
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
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
            />
            <div className="relative group mx-auto w-32 h-32 mb-6">
              <div className="w-32 h-32 rounded-[2rem] bg-slate-100 border-4 border-slate-50 overflow-hidden shadow-inner flex items-center justify-center relative">
                {agency?.logo ? (
                  <img 
                    src={agency.logo.startsWith('http') ? agency.logo : storage.getFilePreview({ bucketId: BUCKETS.AGENCY, fileId: agency.logo }).toString()} 
                    className="w-full h-full object-contain" 
                    alt="Logo" 
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Page Order */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* AI Import Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 shadow-sm overflow-hidden relative">
                <div className="p-6 flex items-center justify-between">
                    <div className="flex gap-4 items-start">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 text-lg">AI Template Generator</h2>
                            <p className="text-sm text-slate-600 mt-1 max-w-sm">
                                Upload an existing brochure (PDF or Image) and our AI will automatically extract the color palette, fonts, and page structure for you.
                            </p>
                        </div>
                    </div>
                    <div>
                        <input
                            type="file"
                            ref={pdfInputRef}
                            className="hidden"
                            accept=".pdf, .jpg, .jpeg, .png, .webp"
                            onChange={handlePdfAnalysis}
                        />
                        <button 
                            onClick={() => pdfInputRef.current?.click()}
                            disabled={analyzing}
                            className="bg-white text-indigo-600 px-5 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 hover:shadow-md transition-all border border-indigo-100 flex items-center gap-2 disabled:opacity-50"
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Analyzing File...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Upload PDF to Analyze
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {analyzing && (
                    <div className="absolute bottom-0 left-0 h-1 bg-indigo-200 w-full overflow-hidden">
                        <div className="h-full bg-indigo-600 animate-pulse w-full"></div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    <h2 className="font-bold text-slate-900">Page Structure</h2>
                </div>
                <div className="p-8">
                    <p className="text-sm text-slate-500 mb-6">Use arrows to reorder the PDF pages.</p>
                    <div className="space-y-3">
                        {brochureSettings.pages.map((page, index) => (
                            <div key={page.type + index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-slate-300">
                                    <GripVertical size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 capitalize">{page.type} Page</h4>
                                    <p className="text-xs text-slate-500">
                                        {page.enabled ? 'Included in brochure' : 'Skipped'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => movePage(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 hover:bg-white hover:shadow-sm rounded transition disabled:opacity-30 disabled:cursor-not-allowed text-slate-500"
                                     >
                                         <ArrowUp size={16} />
                                     </button>
                                     <button 
                                        onClick={() => movePage(index, 'down')}
                                        disabled={index === brochureSettings.pages.length - 1}
                                        className="p-1 hover:bg-white hover:shadow-sm rounded transition disabled:opacity-30 disabled:cursor-not-allowed text-slate-500"
                                     >
                                         <ArrowDown size={16} />
                                     </button>
                                </div>
                                <div className="h-6 w-px bg-slate-200"></div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={page.enabled}
                                        onChange={() => togglePage(index)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                    <Palette size={20} className="text-blue-600" />
                    <h2 className="font-bold text-slate-900">Theme & Colors</h2>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Colors</label>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={brochureSettings.theme.colors.primary}
                                    onChange={e => updateBrochureSettings(prev => ({
                                        ...prev,
                                        theme: { ...prev.theme, colors: { ...prev.theme.colors, primary: e.target.value } }
                                    }))}
                                    className="h-10 w-10 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <div>
                                    <div className="text-sm font-bold text-slate-700">Primary Color</div>
                                    <div className="text-xs text-slate-400">Headings, accents, branding</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={brochureSettings.theme.colors.secondary}
                                    onChange={e => updateBrochureSettings(prev => ({
                                        ...prev,
                                        theme: { ...prev.theme, colors: { ...prev.theme.colors, secondary: e.target.value } }
                                    }))}
                                    className="h-10 w-10 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <div>
                                    <div className="text-sm font-bold text-slate-700">Secondary Color</div>
                                    <div className="text-xs text-slate-400">Backgrounds, secondary elements</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={brochureSettings.theme.colors.accent}
                                    onChange={e => updateBrochureSettings(prev => ({
                                        ...prev,
                                        theme: { ...prev.theme, colors: { ...prev.theme.colors, accent: e.target.value } }
                                    }))}
                                    className="h-10 w-10 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <div>
                                    <div className="text-sm font-bold text-slate-700">Accent Color</div>
                                    <div className="text-xs text-slate-400">Highlights, calls to action</div>
                                </div>
                            </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Fonts</label>
                         <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Heading Font</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                    value={brochureSettings.theme.fonts.heading}
                                    onChange={e => updateBrochureSettings(prev => ({
                                        ...prev,
                                        theme: { ...prev.theme, fonts: { ...prev.theme.fonts, heading: e.target.value } }
                                    }))}
                                >
                                    <option value="Helvetica">Helvetica (Clean)</option>
                                    <option value="Times-Roman">Times New Roman (Serif)</option>
                                    <option value="Courier">Courier (Monospace)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Body Font</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                    value={brochureSettings.theme.fonts.body}
                                    onChange={e => updateBrochureSettings(prev => ({
                                        ...prev,
                                        theme: { ...prev.theme, fonts: { ...prev.theme.fonts, body: e.target.value } }
                                    }))}
                                >
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Times-Roman">Times New Roman</option>
                                </select>
                            </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>

        {/* Right Col: Preview */}
        <div className="space-y-6">
             <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sticky top-8">
                <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-widest text-slate-400">Live Preview</h3>
                <div className="aspect-[1/1.4] bg-white border border-slate-200 shadow-xl mx-auto w-full max-w-[240px] relative flex flex-col pointer-events-none transform transition-all hover:scale-105">
                    {/* Tiny representation of the brochure based on settings */}
                    <div style={{ backgroundColor: brochureSettings.theme.colors.primary }} className="h-24 w-full flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/10"></div>
                        <h1 style={{ fontFamily: brochureSettings.theme.fonts.heading }} className="text-white text-lg font-bold z-10">ESTATELY</h1>
                    </div>
                    
                    <div className="flex-1 p-4 space-y-3 bg-white">
                        <div style={{ fontFamily: brochureSettings.theme.fonts.heading, color: brochureSettings.theme.colors.primary }} className="text-xs font-bold uppercase tracking-wider">
                            Property Brochure
                        </div>
                        <div style={{ fontFamily: brochureSettings.theme.fonts.body }} className="text-[10px] text-slate-600 leading-relaxed">
                            This is a preview of your brochure style. The actual content will be populated from your real estate projects.
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="aspect-square bg-slate-100 rounded-lg"></div>
                            <div className="aspect-square bg-slate-100 rounded-lg"></div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100">
                             <div style={{ backgroundColor: brochureSettings.theme.colors.secondary }} className="h-1.5 w-1/3 rounded-full"></div>
                        </div>
                    </div>
                    
                    <div style={{ backgroundColor: brochureSettings.theme.colors.primary }} className="h-2 w-full"></div>
                </div>
                <p className="text-center mt-6 text-xs text-slate-500 font-medium">
                    This preview shows the style only. <br/>
                    Content order matches your settings.
                </p>
             </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default AgencyInfo;
