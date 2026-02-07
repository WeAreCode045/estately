import { CheckCircle2, Clock, Eye, Home, Signature as SignIcon, Trash2, User as UserIcon } from 'lucide-react';
/* eslint-env browser */
import React, { useState } from 'react';
import { projectFormsService } from '../api/appwrite';
import type { FormSubmission, User } from '../types';
import { UserRole } from '../types';
import SignaturePad from './SignaturePad';

interface Props {
  submission: FormSubmission;
  onView: (s: FormSubmission) => void;
  onDelete?: (s: FormSubmission) => void;
  onUpdate?: (s: FormSubmission) => void;
  projectName?: string;
  assigneeName?: string;
  user?: User;
}

const FormListItem: React.FC<Props> = ({ submission, onView, onDelete, onUpdate, projectName, assigneeName, user }) => {
  const isSubmitted = submission.status === 'submitted' || submission.status === 'completed' || submission.status === 'closed';

  // Robust meta parsing
  let meta: any = {};
  try {
    if (typeof submission.meta === 'object' && submission.meta !== null) {
      meta = submission.meta;
    } else if (typeof submission.meta === 'string' && submission.meta.trim()) {
      meta = JSON.parse(submission.meta);
    }
  } catch (e) {
    globalThis.console?.error('Error parsing meta', e);
  }

  const signatures = meta?.signatures || {};
  const hasSignatures = signatures && Object.keys(signatures).length > 0;

  const [showSignModal, setShowSignModal] = useState<'seller' | 'buyer' | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const needsSellerSign = (
    meta?.needsSignatureFromSeller === true ||
    meta?.needsSignatureFromSeller === 'true' ||
    meta?.needSignatureFromSeller === true ||
    meta?.needSignatureFromSeller === 'true'
  ) && !signatures?.seller;

  const needsBuyerSign = (
    meta?.needsSignatureFromBuyer === true ||
    meta?.needsSignatureFromBuyer === 'true' ||
    meta?.needSignatureFromBuyer === true ||
    meta?.needSignatureFromBuyer === 'true'
  ) && !signatures?.buyer;

  // Determine display status based on user requirements
    let displayStatus: string = submission.status || 'draft';
    let statusColor = "bg-slate-100 text-slate-700";

    if (submission.status === 'assigned') {
      displayStatus = 'assigned';
      statusColor = "bg-amber-100 text-amber-700";
    } else if (submission.status === 'submitted') {
      if (needsSellerSign && needsBuyerSign) {
        displayStatus = 'submitted/waiting for signature';
        statusColor = "bg-indigo-100 text-indigo-700 text-[8px]";
      } else if (needsSellerSign) {
        displayStatus = 'waiting for seller signature';
        statusColor = "bg-indigo-100 text-indigo-700 text-[8px]";
      } else if (needsBuyerSign) {
        displayStatus = 'waiting for buyer signature';
        statusColor = "bg-indigo-100 text-indigo-700 text-[8px]";
      } else {
        displayStatus = 'submitted';
        statusColor = "bg-emerald-100 text-emerald-700";
      }
    } else if (submission.status === 'completed') {
      displayStatus = 'completed';
      statusColor = "bg-emerald-100 text-emerald-700";
    }

  const currentRole = (user?.role || '').toString().toUpperCase();
  const canSignAsSeller = currentRole === UserRole.SELLER.toUpperCase() && needsSellerSign;
  const canSignAsBuyer = currentRole === UserRole.BUYER.toUpperCase() && needsBuyerSign;
  const canSignAsAdmin = currentRole === UserRole.ADMIN.toUpperCase() && (needsSellerSign || needsBuyerSign);

  // Determine if we show the sign button.
  const canShowSignButton = canSignAsSeller || canSignAsBuyer || canSignAsAdmin;

  const handleSign = async (role: 'seller' | 'buyer', dataUrl: string) => {
    setIsSigning(true);
    try {
      const newSignatures = { ...signatures, [role]: dataUrl };

      // Check if all required signatures are now present
      let newStatus = submission.status;
      const hasSeller = !!newSignatures.seller;
      const hasBuyer = !!newSignatures.buyer;

      // Re-evaluate requirements (using the logic from the component)
      const sellerReq = (meta?.needsSignatureFromSeller === true || meta?.needsSignatureFromSeller === 'true' || meta?.needSignatureFromSeller === true || meta?.needSignatureFromSeller === 'true');
      const buyerReq = (meta?.needsSignatureFromBuyer === true || meta?.needsSignatureFromBuyer === 'true' || meta?.needSignatureFromBuyer === true || meta?.needSignatureFromBuyer === 'true');

      const allPresent = (!sellerReq || hasSeller) && (!buyerReq || hasBuyer);
      if (allPresent && submission.status !== 'closed' && submission.status !== 'completed') {
        newStatus = 'completed';
      }

      const updated = await projectFormsService.updateSubmission(submission.id, {
        status: newStatus,
        meta: {
          ...meta,
          signatures: newSignatures
        }
      });
      onUpdate?.(updated);
      setShowSignModal(null);
    } catch (err: any) {
      alert('Error signing: ' + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-start justify-between hover:border-blue-200 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className={`p-2.5 rounded-xl shrink-0 ${(isSubmitted || hasSignatures) ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {(isSubmitted || hasSignatures) ? <CheckCircle2 size={20} /> : <Clock size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{submission.title || submission.formKey}</div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1.5 grayscale opacity-60">
              <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${statusColor}`}>
                {displayStatus}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">{new Date(submission.createdAt).toLocaleDateString()}</span>
            </div>

            {projectName && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 whitespace-nowrap">
                <Home size={10} />
                {projectName}
              </div>
            )}

            {assigneeName && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 whitespace-nowrap">
                <UserIcon size={10} />
                {assigneeName}
              </div>
            )}

            {/* Inline Signing Status Badges for better visibility */}
            {(isSubmitted || hasSignatures ||
              meta?.needsSignatureFromSeller === true || meta?.needsSignatureFromSeller === 'true' ||
              meta?.needSignatureFromSeller === true || meta?.needSignatureFromSeller === 'true' ||
              meta?.needsSignatureFromBuyer === true || meta?.needsSignatureFromBuyer === 'true' ||
              meta?.needSignatureFromBuyer === true || meta?.needSignatureFromBuyer === 'true'
            ) && (
              <div className="flex items-center gap-2">
                {(meta?.needsSignatureFromSeller === true || meta?.needsSignatureFromSeller === 'true' ||
                  meta?.needSignatureFromSeller === true || meta?.needSignatureFromSeller === 'true' ||
                  signatures.seller) && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                    signatures.seller ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    <SignIcon size={10} />
                    Seller {signatures.seller ? 'Signed' : 'Pending'}
                  </div>
                )}
                {(meta?.needsSignatureFromBuyer === true || meta?.needsSignatureFromBuyer === 'true' ||
                  meta?.needSignatureFromBuyer === true || meta?.needSignatureFromBuyer === 'true' ||
                  signatures.buyer) && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                    signatures.buyer ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    <SignIcon size={10} />
                    Buyer {signatures.buyer ? 'Signed' : 'Pending'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canShowSignButton && (canSignAsSeller || canSignAsBuyer || canSignAsAdmin) && (
          <button
            disabled={isSigning}
            onClick={(e) => {
                e.stopPropagation();
                if (canSignAsSeller) setShowSignModal('seller');
                else if (canSignAsBuyer) setShowSignModal('buyer');
                else if (canSignAsAdmin) setShowSignModal(needsSellerSign ? 'seller' : 'buyer');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm shrink-0 whitespace-nowrap disabled:opacity-50"
          >
            <SignIcon size={14} />
            {isSigning ? 'Signing...' : 'Sign for Approval'}
          </button>
        )}

        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); if(confirm('Are you sure you want to delete this form?')) onDelete(submission); }}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onView(submission); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          <Eye size={14} />
          {(isSubmitted || hasSignatures) ? 'View Results' : 'Fill Form'}
        </button>
      </div>

      {showSignModal && (
        <SignaturePad
          onSave={(dataUrl) => handleSign(showSignModal, dataUrl)}
          onCancel={() => setShowSignModal(null)}
        />
      )}
    </div>
  );
}

export default FormListItem;
