import { AlertCircle, CheckCircle2, Download, Loader2, Save, Signature as SignatureIcon, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { projectFormsService } from '../services/appwrite';
import { documentService } from '../services/documentService';
import { formDefinitionsService } from '../services/formDefinitionsService';
import type { FormDefinition, FormSubmission } from '../types';
import { Project, User, UserRole } from '../types';
import { downloadFormPDF } from '../utils/pdfGenerator';
import SignaturePad from './SignaturePad';

interface Props {
  submission: FormSubmission;
  onClose: () => void;
  onUpdate?: (s: FormSubmission) => void;
  readOnly?: boolean;
  user?: User;
  allUsers?: User[];
  project?: Project;
}

const FormRenderer: React.FC<Props> = ({ submission, onClose, onUpdate, readOnly = false, user: propUser, allUsers, project }) => {
  const { profile } = useAuth() || {};
  const user = propUser || profile;

  // Robust meta parsing
  let meta: any = {};
  try {
    if (typeof submission.meta === 'object' && submission.meta !== null) {
      meta = submission.meta;
    } else if (typeof submission.meta === 'string' && submission.meta.trim()) {
      meta = JSON.parse(submission.meta);
    }
  } catch (e) {
    console.error('Error parsing meta', e);
  }

  const [definition, setDefinition] = useState<FormDefinition | null>(null);
  const [localData, setLocalData] = useState<any>(submission.data || {});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signatures, setSignatures] = useState<Record<string, string>>(
    meta?.signatures || {}
  );
  const [showSignModal, setShowSignModal] = useState<'seller' | 'buyer' | null>(null);

  const needsSellerSign = (meta?.needsSignatureFromSeller === true || meta?.needsSignatureFromSeller === 'true' || meta?.needSignatureFromSeller === true || meta?.needSignatureFromSeller === 'true');
  const needsBuyerSign = (meta?.needsSignatureFromBuyer === true || meta?.needsSignatureFromBuyer === 'true' || meta?.needSignatureFromBuyer === true || meta?.needSignatureFromBuyer === 'true');

  const sellerUser = allUsers?.find(u => u.$id === project?.sellerId || (u as any).userId === project?.sellerId);
  const buyerUser = allUsers?.find(u => u.$id === project?.buyerId || (u as any).userId === project?.buyerId);
  const sellerName = sellerUser?.name || 'Verkoper';
  const buyerName = buyerUser?.name || 'Koper';

  useEffect(() => {
    loadDefinition();
  }, [submission.formKey]);

  const loadDefinition = async () => {
    setLoading(true);
    try {
      const def = await formDefinitionsService.getByKey(submission.formKey);
      if (def) setDefinition(def);
    } catch (err) {
      console.error('Failed to load definition', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (role: 'seller' | 'buyer', dataUrl: string) => {
    setSaving(true);
    try {
      const newSignatures = { ...signatures, [role]: dataUrl };

      // Check if all required signatures are now present
      let newStatus = submission.status;
      const hasSeller = !!newSignatures.seller;
      const hasBuyer = !!newSignatures.buyer;

      const sellerReq = needsSellerSign;
      const buyerReq = needsBuyerSign;

      // If all required signatures are now present, mark as completed
      const allRequiredPresent = (!sellerReq || hasSeller) && (!buyerReq || hasBuyer);

      if (allRequiredPresent && submission.status !== 'closed') {
        newStatus = 'completed';
      }

      const updated = await projectFormsService.updateSubmission(submission.id, {
        status: newStatus,
        meta: {
          ...meta,
          signatures: newSignatures
        }
      });
      setSignatures(newSignatures);
      onUpdate?.(updated);
      setShowSignModal(null);
    } catch (err: any) {
      alert('Error signing: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Determine effective read-only state based on settings
  const isSubmitted = submission.status === 'submitted' || submission.status === 'completed' || submission.status === 'closed';
  const hasSignatures = signatures && Object.keys(signatures).length > 0;

  // Match using profile.userId (link to account $id)
  const profileId = profile?.userId || profile?.$id || user?.$id;
  const isAssignee = profileId === submission.assignedToUserId;
  const isAdmin = user?.role === UserRole.ADMIN;

  const allowChanges = definition?.allowChanges || 'always';

  let effectiveReadOnly = readOnly;

  // Forms cannot be edited by non-assignees (Admins can view but not edit unless they are the assignee)
  if (!isAssignee && !isAdmin) effectiveReadOnly = true;

  // Assignee can edit as long as the form is not signed
  // If there are any signatures, the form is locked to protect the integrity of the signed document
  if (isAssignee && hasSignatures) effectiveReadOnly = true;

  // Respect submission status and template settings
  if (allowChanges === 'never') effectiveReadOnly = true;
  if (allowChanges === 'before_submission' && isSubmitted && !isAdmin) effectiveReadOnly = true;

  // Even if submitted, if no one signed yet, allow the assignee to fix errors
  if (isSubmitted && hasSignatures && !isAdmin) effectiveReadOnly = true;

  const handleSave = async (isFinal = false) => {
    setSaving(true);
    try {
      // If final submission, check if it should be 'completed' or 'submitted' (waiting for signatures)
      let newStatus = submission.status;
      if (isFinal) {
        const hasSeller = !!signatures.seller;
        const hasBuyer = !!signatures.buyer;
        const sellerReq = needsSellerSign;
        const buyerReq = needsBuyerSign;
        const allRequiredPresent = (!sellerReq || hasSeller) && (!buyerReq || hasBuyer);

        newStatus = allRequiredPresent ? 'completed' : 'submitted';
      }

      const updated = await projectFormsService.updateSubmission(submission.id, {
        data: localData,
        status: newStatus,
        meta: {
            ...meta,
            signatures
        }
      });
      onUpdate?.(updated);
      if (isFinal) onClose();
    } catch (err: any) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderRadioTable = (fields: any[], options: any[]) => {
    return (
      <div key={fields[0].id || fields[0].name} className="overflow-x-auto -mx-4 sm:mx-0 py-4">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-tl-xl border-b border-slate-100">
                Omschrijving
              </th>
              {options.map((opt, idx) => (
                <th
                  key={opt.value}
                  className={`py-3 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100 ${idx === options.length - 1 ? 'rounded-tr-xl' : ''}`}
                >
                  {opt.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map((f) => {
              const fName = f.name || f.id;
              const val = localData[fName] ?? '';
              return (
                <tr key={fName} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-4 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                    {f.label}
                  </td>
                  {options.map((opt) => (
                    <td key={opt.value} className="py-3 px-4 text-center">
                      <input
                        type="radio"
                        name={fName}
                        disabled={effectiveReadOnly}
                        checked={val === opt.value}
                        onChange={() => {
                          if (effectiveReadOnly) return;
                          setLocalData((prev: any) => ({ ...prev, [fName]: opt.value }));
                        }}
                        className="w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFieldInRow = (field: any) => {
    const fieldName = field.name || field.id;
    const value = localData[fieldName] ?? '';
    const handleChange = (val: any) => {
      if (effectiveReadOnly) return;
      setLocalData((prev: any) => ({ ...prev, [fieldName]: val }));
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            readOnly={effectiveReadOnly}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none"
            value={value}
            onChange={e => handleChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'select':
        return (
          <select
            disabled={effectiveReadOnly}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={value}
            onChange={e => handleChange(e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            disabled={effectiveReadOnly}
            id={fieldName}
            checked={!!value}
            onChange={e => handleChange(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        );
      case 'number':
      case 'date':
      case 'text':
      default:
        return (
          <input
            type={field.type === 'text' || !field.type ? 'text' : field.type}
            readOnly={effectiveReadOnly}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={value}
            onChange={e => handleChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const renderGenericTable = (fields: any[]) => {
    return (
      <div key={fields[0].id || fields[0].name} className="overflow-x-auto -mx-4 sm:mx-0 py-2">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <tbody className="divide-y divide-slate-100">
            {fields.map((f) => {
              const fName = f.name || f.id;
              return (
                <tr key={fName} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="py-4 px-4 w-1/3 text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    {f.label}
                  </td>
                  <td className="py-2 px-4">
                    {renderFieldInRow(f)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderField = (field: any) => {
    const fieldName = field.name || field.id;
    const value = localData[fieldName] ?? '';
    const handleChange = (val: any) => {
      if (effectiveReadOnly) return;
      setLocalData((prev: any) => ({ ...prev, [fieldName]: val }));
    };

    switch (field.type) {
      case 'header':
        return <h3 key={fieldName} className="text-lg font-bold text-slate-900 pt-4 first:pt-0 border-b border-slate-100 pb-2">{field.label}</h3>;
      case 'section':
        const childFields = field.fields || field.children || [];
        const renderedChildren = [];

        for (let i = 0; i < childFields.length; i++) {
          const f = childFields[i];

          if (f.type === 'radio' && f.options && f.options.length > 0) {
            const group = [f];
            const optionsJson = JSON.stringify(f.options.map((o: any) => o.label));

            while (i + 1 < childFields.length) {
              const next = childFields[i + 1];
              if (next.type === 'radio' && next.options && JSON.stringify(next.options.map((o: any) => o.label)) === optionsJson) {
                group.push(next);
                i++;
              } else {
                break;
              }
            }
            renderedChildren.push(renderRadioTable(group, f.options));
          } else if (f.type === 'section') {
            renderedChildren.push(renderField(f));
          } else {
            // Group other standalone fields into generic tables
            const group = [f];
            const standAloneTypes = ['text', 'number', 'date', 'select', 'checkbox', 'textarea'];
            while (i + 1 < childFields.length && standAloneTypes.includes(childFields[i+1].type)) {
                group.push(childFields[++i]);
            }
            renderedChildren.push(renderGenericTable(group));
          }
        }

        return (
          <div key={fieldName} className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-6 mb-2 border-t border-slate-50">
              {field.label}
            </div>
            {renderedChildren.length > 0 && (
              <div className="pl-6 space-y-2 border-l-2 border-slate-50 ml-1">
                {renderedChildren}
              </div>
            )}
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName} className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
            <textarea
              readOnly={effectiveReadOnly}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none"
              value={value}
              onChange={e => handleChange(e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
      case 'select':
        return (
          <div key={fieldName} className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
            <select
              disabled={effectiveReadOnly}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={value}
              onChange={e => handleChange(e.target.value)}
            >
              <option value="">Select...</option>
              {field.options?.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      case 'checkbox':
        return (
          <div key={fieldName} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              disabled={effectiveReadOnly}
              id={fieldName}
              checked={!!value}
              onChange={e => handleChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={fieldName} className="text-sm font-medium text-slate-700">{field.label}</label>
          </div>
        );
      case 'number':
        return (
          <div key={fieldName} className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
            <input
              type="number"
              readOnly={effectiveReadOnly}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={value}
              onChange={e => handleChange(e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
      case 'date':
        return (
          <div key={fieldName} className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
            <input
              type="date"
              readOnly={effectiveReadOnly}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={value}
              onChange={e => handleChange(e.target.value)}
            />
          </div>
        );
      case 'radio':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
            <div className="flex flex-wrap gap-4">
              {field.options?.map((opt: any) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name={fieldName}
                    disabled={effectiveReadOnly}
                    checked={value === opt.value}
                    onChange={() => handleChange(opt.value)}
                    className="w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div key={fieldName} className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
            <input
              type="text"
              readOnly={effectiveReadOnly}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={value}
              onChange={e => handleChange(e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 font-medium">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
               <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">{submission.title || definition?.title || 'Form'}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  submission.status === 'submitted' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {submission.status}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{new Date(submission.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => definition && project && downloadFormPDF(submission, definition as FormDefinition, allUsers || [], project)}
              disabled={!definition || !project}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download as PDF"
            >
              <Download size={20} />
            </button>
            {!readOnly && (
               <button
                 onClick={() => handleSave(false)}
                 disabled={saving}
                 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                 title="Save Draft"
               >
                 <Save size={20} />
               </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"><X /></button>
          </div>
        </div>

        {/* Global Signature Banner for Submitted Forms */}
        {(isSubmitted || hasSignatures) && (
          <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-900 block">Review & Approval</span>
                <span className="text-[10px] text-indigo-600 font-medium">{isSubmitted ? 'Official Submission' : 'Draft with Signatures'}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 border-r border-indigo-100 pr-6">
                {(needsSellerSign || signatures.seller) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Seller:</span>
                    {signatures.seller ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase">Signed</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Pending</span>
                    )}
                  </div>
                )}

                {(needsBuyerSign || signatures.buyer) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Buyer:</span>
                    {signatures.buyer ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase">Signed</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Pending</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons inside Renderer for better UX */}
              {(() => {
                const currentRole = (user?.role || '').toUpperCase();
                const canSignAsSeller = currentRole === UserRole.SELLER && needsSellerSign && !signatures.seller;
                const canSignAsBuyer = currentRole === UserRole.BUYER && needsBuyerSign && !signatures.buyer;
                const canSignAsAdmin = currentRole === UserRole.ADMIN && ((needsSellerSign && !signatures.seller) || (needsBuyerSign && !signatures.buyer));

                if (canSignAsSeller || canSignAsBuyer || canSignAsAdmin) {
                  return (
                    <button
                      onClick={() => setShowSignModal(canSignAsSeller ? 'seller' : (canSignAsBuyer ? 'buyer' : (needsSellerSign && !signatures.seller ? 'seller' : 'buyer')))}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 animate-pulse"
                    >
                      <SignatureIcon size={14} className="LucideSignature" />
                      Sign for Approval
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {showSignModal && (
          <SignaturePad
            onSave={(dataUrl) => handleSign(showSignModal, dataUrl)}
            onCancel={() => setShowSignModal(null)}
          />
        )}

        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
          {definition?.schema?.fields ? (
            <div className="space-y-6">
              {definition.schema.fields.map((field: any) => renderField(field))}

              {/* Visual Signatures Audit Trail */}
              {(signatures.seller || signatures.buyer) && (
                <div className="mt-12 pt-12 border-t border-slate-100 grid grid-cols-2 gap-8">
                  {signatures.seller && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Handtekening Verkoper</p>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center">
                        <img src={signatures.seller} alt="Seller Signature" className="max-h-24 object-contain brightness-90 contrast-125 mix-blend-multiply" />
                        <div className="mt-4 w-full border-t border-slate-200 pt-2 text-center">
                          <p className="text-sm font-bold text-slate-900">{sellerName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Getekend op {new Date(submission.updatedAt || submission.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {signatures.buyer && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Handtekening Koper</p>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center">
                        <img src={signatures.buyer} alt="Buyer Signature" className="max-h-24 object-contain brightness-90 contrast-125 mix-blend-multiply" />
                        <div className="mt-4 w-full border-t border-slate-200 pt-2 text-center">
                          <p className="text-sm font-bold text-slate-900">{buyerName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Getekend op {new Date(submission.updatedAt || submission.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <AlertCircle size={48} className="mb-4 text-slate-300" />
              <p className="font-medium">No valid form schema found for "{submission.formKey}".</p>
              <p className="text-xs text-slate-400 mt-2">Make sure a template with key "{submission.formKey}" exists and has a valid schema defined.</p>

              <div className="mt-8 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left w-full max-w-2xl overflow-auto shadow-2xl">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Debug Information</span>
                  <span className="text-[10px] font-mono text-blue-400">{submission.id}</span>
                </div>
                <div className="space-y-4 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block mb-1">// Definition State</span>
                    <pre className="text-emerald-400">{JSON.stringify({
                      hasDefinition: !!definition,
                      hasSchema: !!definition?.schema,
                      fieldsCount: definition?.schema?.fields?.length || 0,
                      keyMatch: definition?.key === submission.formKey
                    }, null, 2)}</pre>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">// Full Definition Object</span>
                    <pre className="text-blue-300">{JSON.stringify(definition, (key, value) => {
                      if (key === 'schema' && typeof value === 'string') {
                        try { return JSON.parse(value); } catch(e) { return 'INVALID JSON: ' + value; }
                      }
                      return value;
                    }, 2)}</pre>
                  </div>
                </div>
              </div>

              <pre className="mt-8 bg-slate-50 p-4 rounded-xl text-left text-xs max-w-full overflow-auto border border-slate-100">
                {JSON.stringify(submission.data, null, 2)}
              </pre>
            </div>
          )}

          {submission.attachments && submission.attachments.length > 0 && (
            <div className="pt-8 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Attachments</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {submission.attachments.map((fid) => (
                  <a
                    key={fid}
                    href={documentService.getFileDownload(fid)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-200 transition-all group"
                  >
                    <div className="truncate text-xs font-bold text-slate-600">{fid}</div>
                    <Download size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-4">
             <p className="text-xs text-slate-500 italic max-w-xs">
               Your changes are kept as draft until you click "Submit Final Form".
             </p>
             <div className="flex gap-3">
               <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-white rounded-xl transition-all">Cancel</button>
               <button
                 onClick={() => handleSave(true)}
                 disabled={saving}
                 className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
               >
                 {saving ? <Loader2 className="animate-spin" size={18} /> : 'Submit Final Form'}
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormRenderer;
