import {
  Download,
  Eye,
  FileText,
  Filter,
  Inbox,
  Loader2,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react';
/* eslint-env browser */
import React, { useRef, useState } from 'react';
import { taskService } from '../api/appwrite';
import { documentService } from '../api/documentService';
import DocumentViewer from '../components/DocumentViewer';
import type { Project, UploadedDocument, User } from '../types';

interface DocumentsViewProps {
  user: User;
  projects: Project[];
  onRefresh: () => void;
}

const Documents: React.FC<DocumentsViewProps> = ({ user, projects, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>('global');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<string | null>(null);

  const handleOpenViewer = async (provided: any, title?: string) => {
    try {
      const fileId = provided?.fileId;
      let documentType = provided?.documentType;
      let url = null;

      if (fileId) {
        url = await documentService.getFileUrl(fileId);
        if (!documentType) {
          try {
            const fileInfo = await documentService.getFile(fileId);
            documentType = fileInfo.mimeType;
          } catch (me) {
            console.warn('Could not fetch file metadata:', me);
          }
        }
      } else {
        url = provided?.url;
      }

      if (!url) throw new Error('No URL available');

      // Generate normalized download URL if we have a fileId
      if (fileId) {
        const dl = await documentService.getFileDownload(fileId);
        setViewerDownloadUrl(dl);
      } else {
        setViewerDownloadUrl(null);
      }

      setViewerError(null);
      setViewerUrl(url);
      setViewerType(documentType);
      setViewerTitle(title || provided?.name || 'Document');
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
    setViewerType(null);
  };

  const documents = user.userDocuments || [];

  const filteredDocs = documents.filter(doc =>
    (doc.documentType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
    const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
    return timeB - timeA;
  });

  const handleGeneralUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setLoading(true);
      // When uploading from vault, use 'general' requirement id
      // Use targetProjectId (global or a specific project)
      await documentService.uploadDocument(user.id, 'general', targetProjectId, selectedFile);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setTargetProjectId('global');
      onRefresh();
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc: UploadedDocument) => {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) return;

    try {
      setLoading(true);
      await documentService.deleteDocument(doc.fileId);

      // Rollback task status if linked to a definition - RELATIONAL MODEL
      if (doc.userDocumentDefinitionId && doc.userDocumentDefinitionId !== 'general' && doc.projectId) {
        // Find completed document_upload task for this project
        const tasks = await taskService.listByProject(doc.projectId, {
          taskType: 'document_upload',
          status: 'completed'
        });

        const matchTitle = `Upload Document: ${doc.documentType || ''}`;
        const taskToReset = tasks.find((t: any) =>
          t.title === matchTitle ||
          t.required_doc_type === doc.userDocumentDefinitionId
        );

        if (taskToReset) {
          await taskService.updateStatus(taskToReset.$id, 'todo');
        }
      }

      onRefresh();
      alert("Document deleted and task status updated if linked.");
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Vault</h1>
          <p className="text-slate-500 mt-1">Access and manage all your uploaded documents in one place.</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
        >
          <Upload size={18} /> Upload General File
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
          />
        </div>
        <button className="bg-white border border-slate-200 p-3 rounded-2xl text-slate-500 hover:text-blue-600 transition-all shadow-sm">
           <Filter size={20} />
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Stored Documents</h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">{filteredDocs.length} Total</span>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredDocs.map(doc => {
            return (
              <div key={doc.fileId} className="p-6 hover:bg-slate-50/50 transition-colors group flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText size={22} />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-900">{doc.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.projectId === 'global' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {doc.projectId === 'global' ? 'Global Vault' : (projects.find(p => p.id === doc.projectId)?.title || 'Specific Project')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0">{doc.documentType}</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button
                     onClick={() => handleOpenViewer({ fileId: doc.fileId, url: doc.url }, doc.name)}
                     className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                     title="View Online"
                   >
                      <Eye size={18} />
                   </button>
                   <button
                     onClick={async () => {
                       try {
                         const dl = await documentService.getFileDownload(doc.fileId);
                         window.open(dl, '_blank');
                       } catch (e) {
                         console.error('Download failed', e);
                         globalThis.alert?.('Download failed.');
                       }
                     }}
                     className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                     title="Download"
                   >
                      <Download size={18} />
                   </button>
                   <button
                     onClick={() => handleDelete(doc)}
                     className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                     title="Delete"
                   >
                      <Trash2 size={18} />
                   </button>
                </div>
              </div>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="py-24 text-center">
              <Inbox size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">{searchTerm ? 'No documents match your search.' : 'Your vault is empty.'}</p>
            </div>
          )}
        </div>
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Upload to Vault</h2>
              <button onClick={() => setIsUploadModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleGeneralUpload} className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all ${selectedFile ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-slate-50'}`}
              >
                 <Upload className={`mx-auto mb-3 ${selectedFile ? 'text-blue-500' : 'text-slate-300'}`} size={32} />
                 <p className="font-bold text-slate-700">{selectedFile ? selectedFile.name : 'Select or drop file'}</p>
                 <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG or DOCX (Max 10MB)</p>
                 <input
                   type="file"
                   hidden
                   ref={fileInputRef}
                   onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                 />
              </div>

              {projects.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 block">Where does this document belong?</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetProjectId('global')}
                      className={`p-4 rounded-2xl border text-left transition-all ${targetProjectId === 'global' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <p className="font-bold text-sm text-slate-900">Global / Personal</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Passport, ID, Tax documents</p>
                    </button>
                    {projects.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTargetProjectId(p.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${targetProjectId === p.id ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                      >
                        <p className="font-bold text-sm text-slate-900">{p.title}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Property specific (Energy label, etc)</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex-1 bg-slate-100 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" disabled={loading || !selectedFile} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Start Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {(viewerUrl || viewerError) && (
        <DocumentViewer
          url={viewerUrl}
          downloadUrl={viewerDownloadUrl}
          documentType={viewerType}
          error={viewerError || undefined}
          title={viewerTitle || undefined}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
};

export default Documents;
