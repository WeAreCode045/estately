import { CheckCircle2, Signature as SignatureIcon, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Contract, User } from '../../../types';
import SignaturePad from '../../SignaturePad';

interface SigningModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureData: string) => Promise<void>;
  user: User;
  allUsers: User[];
  isProcessing?: boolean;
}

const SigningModal: React.FC<SigningModalProps> = ({ contract, isOpen, onClose, onSign, user, allUsers }) => {
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  useEffect(() => {
    if (isOpen) setShowSignaturePad(false);
  }, [isOpen]);

  if (!isOpen || !contract) return null;

  const isSignedByMe = contract.signedBy?.includes(user.id || user.$id || '');

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{contract.title}</h3>
            <p className="text-xs text-slate-500">Please review the document carefully before signing.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-slate-50/50">
          <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-8 md:p-12 min-h-full">
            <div className="max-w-prose mx-auto">
              <div
                className="prose prose-slate max-w-none font-serif text-slate-800 text-lg leading-relaxed break-words overflow-hidden"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                dangerouslySetInnerHTML={{ __html: contract.content || '' }}
              />

              {contract.signedBy && contract.signedBy.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Signatures</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {contract.signedBy.map((signerId: string) => {
                      const signer = allUsers.find(u => u.id === signerId || u.$id === signerId);
                      const sigData = (contract.signatureData as any)?.[signerId];
                      return (
                        <div key={signerId} className="space-y-2">
                          {sigData ? (
                            <img src={sigData} alt={`Signature of ${signer?.name}`} className="h-16 object-contain" />
                          ) : (
                            <div className="h-16 flex items-center text-slate-400 italic text-sm">Signed (Image missing)</div>
                          )}
                          <p className="text-xs font-medium text-slate-600 border-t border-slate-100 pt-1">
                            {signer?.name || 'Unknown Signer'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex flex-col md:flex-row items-center justify-center gap-8">
          {!isSignedByMe ? (
            <div className="w-full flex flex-col items-center gap-4">
              {!showSignaturePad ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="w-full max-w-md bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <SignatureIcon size={20} />
                    Sign Document
                  </button>
                  <p className="text-xs text-slate-400">By clicking above, you agree to sign this legal document.</p>
                </div>
              ) : (
                <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Draw your signature below</p>
                    <button onClick={() => setShowSignaturePad(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Cancel</button>
                  </div>
                  <SignaturePad
                    onSave={onSign}
                    onCancel={() => setShowSignaturePad(false)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
                <CheckCircle2 size={32} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900">Document Signed</p>
                <p className="text-sm text-slate-500">You have already signed this contract.</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
              >
                Close Viewer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SigningModal;
