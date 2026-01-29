import React, { useEffect, useState, useRef } from 'react';
import { User } from '../types';
import { docTemplateService } from '../services/docTemplateService';
import TemplateList from '../components/TemplateList';
import TemplateEditor from '../components/TemplateEditor';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Loader2 } from 'lucide-react';

const DocTemplates: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res: any = await docTemplateService.list();
      setTemplates(res.documents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleUploadClick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!profile) return alert('Only admins can upload');
    if (f.type !== 'application/pdf') return alert('Please upload a PDF file');
    const maxMb = 10;
    if (f.size > maxMb * 1024 * 1024) return alert(`File too large — max ${maxMb}MB`);
    try {
      setLoading(true);
      const created = await docTemplateService.create(profile.userId || profile.userId || profile.$id, f, { title: f.name });
      await fetchList();
      alert('Template uploaded — analysis will run in background');
      console.info('Template created:', created);
    } catch (err) {
      console.error('Upload error:', err);
      const msg = (err as any)?.message || JSON.stringify(err);
      alert('Upload failed: ' + msg);
    } finally { setLoading(false); }
  };

  if (!isAdmin) return <div className="p-6">Access denied.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Doc Templates</h1>
          <p className="text-sm text-slate-500">Upload and manage editable document templates.</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileRef} className="hidden" accept="application/pdf" onChange={onFile} />
          <button onClick={handleUploadClick} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl">
            <Plus size={16} /> Upload PDF
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="text-center py-12"><Loader2 className="animate-spin" /></div>
        ) : (
          <TemplateList templates={templates} onEdit={(t: any) => setEditing(t)} onRefresh={fetchList} />
        )}
      </div>

      {editing && (
        <TemplateEditor template={editing} onClose={() => { setEditing(null); fetchList(); }} />
      )}
    </div>
  );
};

export default DocTemplates;
