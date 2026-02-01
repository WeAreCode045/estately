import {
    Building2,
    CreditCard,
    Hash,
    Image as ImageIcon,
    MapPin,
    Save,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { COLLECTIONS, DATABASE_ID, databases, ID } from '../services/appwrite';
import { Agency, User, UserRole } from '../types';

interface AgencyInfoProps {
  user: User;
  allUsers: User[];
}

const AgencyInfo: React.FC<AgencyInfoProps> = ({ user, allUsers }) => {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

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
            agentIds: doc.agentIds || []
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
            agentIds: []
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
        agentIds: agency.agentIds
      };

      if (isNew) {
        const res = await databases.createDocument(DATABASE_ID, COLLECTIONS.AGENCY, ID.unique(), data);
        setAgency({ ...agency, id: res.$id });
        setIsNew(false);
      } else {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.AGENCY, agency.id, data);
      }
      alert('Agency information saved successfully!');
    } catch (error) {
      console.error('Error saving agency info:', error);
      alert('Failed to save agency information.');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const agents = allUsers.filter(u => u.role === UserRole.AGENT || u.role === UserRole.ADMIN);

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
            <div className="relative group mx-auto w-32 h-32 mb-6">
              <div className="w-32 h-32 rounded-[2rem] bg-slate-100 border-4 border-slate-50 overflow-hidden shadow-inner flex items-center justify-center">
                {agency?.logo ? (
                  <img src={agency.logo} className="w-full h-full object-contain" alt="Logo" />
                ) : (
                  <Building2 size={40} className="text-slate-300" />
                )}
              </div>
              <button className="absolute -bottom-2 -right-2 bg-white p-2.5 rounded-2xl shadow-xl border border-slate-100 text-slate-600 hover:text-blue-600 transition-all">
                <ImageIcon size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed italic">
              "This logo will appear on all automated contracts and client communications."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyInfo;
