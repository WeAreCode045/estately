import { X } from 'lucide-react';
import React, { useState } from 'react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: { name: string, email: string, role: 'BUYER' | 'SELLER' }) => Promise<void>;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, onInvite }) => {
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await onInvite({ name: inviteName, email: inviteEmail, role: inviteRole });
      setInviteName('');
      setInviteEmail('');
      setInviteRole('BUYER');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Invite to Project</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              placeholder="participant@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'BUYER' | 'SELLER')}
            >
              <option value="BUYER">Buyer</option>
              <option value="SELLER">Seller</option>
            </select>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 font-bold text-slate-500">Cancel</button>
            <button
              type="submit"
              disabled={isSending}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
            >
              {isSending ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;
