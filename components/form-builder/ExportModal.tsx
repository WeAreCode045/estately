import React, { useState } from 'react';
import { X, Copy, Check, Code, FileJson, Download } from 'lucide-react';
import { FormSchema, FieldType, FormField } from './types';

interface ExportModalProps {
  schema: FormSchema;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ schema, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'json' | 'code'>('json');

  const jsonContent = JSON.stringify(schema, null, 2);
  
  const reactCode = `
import React, { useState } from 'react';

const GeneratedForm = () => {
  const [formData, setFormData] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const schema = ${JSON.stringify(schema, null, 2)};

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Submitted Data:', formData);
    alert('Thank you! Your form has been submitted successfully.');
  };

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const toggleSection = (id) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderField = (field) => {
    if (field.type === 'section') {
      const isCollapsed = collapsedSections[field.id];
      return (
        <div key={field.id} className="mb-10 p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div 
            className="flex items-center gap-4 mb-6 cursor-pointer select-none group"
            onClick={() => toggleSection(field.id)}
          >
            <div className={\`w-10 h-10 flex items-center justify-center rounded-xl transition-all \${isCollapsed ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'}\`}>
              <span className="transition-transform duration-300" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}>
                ▼
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{field.label}</h3>
          </div>
          
          <div className={\`space-y-8 pl-6 border-l-2 border-indigo-50 transition-all duration-500 \${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[5000px] opacity-100'}\`}>
            {field.children?.map(child => renderField(child))}
          </div>
        </div>
      );
    }

    const inputClasses = "w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all text-slate-700 font-medium placeholder-slate-300";

    return (
      <div key={field.id} className="space-y-3 mb-8">
        <label className="block text-sm font-extrabold text-slate-700 uppercase tracking-widest px-1">
          {field.label} {field.required && <span className="text-red-500 font-black ml-1">*</span>}
        </label>
        
        {field.type === 'textarea' ? (
          <textarea 
            required={field.required}
            placeholder={field.placeholder}
            onChange={e => handleChange(field.id, e.target.value)}
            className={\`\${inputClasses} min-h-[150px] resize-none\`}
          />
        ) : field.type === 'select' ? (
          <div className="relative">
            <select 
              required={field.required}
              onChange={e => handleChange(field.id, e.target.value)}
              className={\`\${inputClasses} appearance-none\`}
            >
              <option value="">Please choose an option...</option>
              {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
          </div>
        ) : field.type === 'checkbox' || field.type === 'radio' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {field.options?.map(opt => (
              <label key={opt.value} className="flex items-center gap-4 p-4 bg-slate-50/50 border-2 border-transparent hover:border-indigo-100 rounded-2xl cursor-pointer transition-all group">
                <input 
                  type={field.type} 
                  name={field.id}
                  className="w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                  onChange={() => handleChange(field.id, opt.value)}
                />
                <span className="text-slate-700 font-bold group-hover:text-indigo-600 transition-colors">{opt.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <input 
            type={field.type}
            required={field.required}
            placeholder={field.placeholder}
            onChange={e => handleChange(field.id, e.target.value)}
            className={inputClasses}
          />
        )}
        {field.helpText && <p className="text-xs text-slate-400 font-bold italic px-2">{field.helpText}</p>}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-8 md:p-16 bg-white shadow-3xl rounded-[3rem] border border-slate-50 my-20 font-sans antialiased">
      <header className="mb-16">
        <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter">{schema.title}</h2>
        <div className="h-1 w-24 bg-indigo-600 rounded-full mb-8" />
        <p className="text-2xl text-slate-400 font-medium leading-relaxed">{schema.description}</p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        {schema.fields.map(field => renderField(field))}
        
        <div className="pt-12">
          <button type="submit" className="w-full py-8 px-12 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl hover:bg-indigo-700 transform active:scale-[0.98] transition-all shadow-[0_20px_50px_-15px_rgba(79,70,229,0.3)] uppercase tracking-widest">
            {schema.submitButtonText}
          </button>
        </div>
      </form>

      <footer className="mt-20 pt-10 border-t border-slate-50 text-center">
        <p className="text-slate-300 font-bold text-sm tracking-widest uppercase italic">Secure Form • Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default GeneratedForm;
  `;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tab === 'json' ? jsonContent : reactCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[2.5rem] shadow-3xl w-full max-w-6xl h-[92vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">Export Form</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ready for integration</p>
              </div>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setTab('json')}
                className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-xl transition-all ${tab === 'json' ? 'bg-white shadow-xl text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FileJson className="w-4 h-4" /> JSON Schema
              </button>
              <button 
                onClick={() => setTab('code')}
                className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-xl transition-all ${tab === 'code' ? 'bg-white shadow-xl text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Code className="w-4 h-4" /> React Source
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 hover:rotate-90">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-50/50">
          <div className="flex-1 bg-slate-950 rounded-[2rem] p-10 overflow-auto custom-scrollbar font-mono text-sm relative group border border-slate-800 shadow-2xl">
            <button
              onClick={copyToClipboard}
              className="absolute top-6 right-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center gap-3 opacity-0 group-hover:opacity-100 shadow-xl"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span className="font-bold">{copied ? 'Copied to Clipboard' : 'Copy All Code'}</span>
            </button>
            <pre className="text-indigo-100/90 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
              {tab === 'json' ? jsonContent : reactCode}
            </pre>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-white shrink-0">
          <button onClick={onClose} className="py-4 px-8 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">Dismiss</button>
          <button onClick={copyToClipboard} className="py-4 px-10 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 flex items-center gap-3 active:scale-95">
            {copied ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
            {copied ? 'Successfully Copied' : 'Download Snippet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
