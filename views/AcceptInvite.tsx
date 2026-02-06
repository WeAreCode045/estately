import { AlertCircle, CheckCircle2, Home, Loader2, Lock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { account } from '../services/appwrite';

const AcceptInvite: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Magic URL parameters from the invitation link
    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');
    const email = searchParams.get('email');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!userId || !secret) {
            setStatus('ERROR');
            setErrorMessage('Invalid invitation link. Please request a new one from your administrator.');
        }
    }, [userId, secret]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            // 1. Create a session using the invited user's token
            await account.createSession(userId!, secret!);

            // 2. Set the permanent password
            await account.updatePassword(password);

            setStatus('SUCCESS');

            // Redirect to dashboard
            globalThis.setTimeout(() => {
                navigate('/', { replace: true });
            }, 2000);

        } catch (err: any) {
            globalThis.console?.error('Accept invite error:', err);
            setStatus('ERROR');
            setErrorMessage(err.message || 'Failed to initialize your account. The link might be expired.');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'SUCCESS') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 text-center">
                <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
                    <div className="bg-emerald-100 text-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Activated!</h2>
                    <p className="text-slate-500 mb-6">Your password has been set. You are being redirected to your dashboard...</p>
                    <div className="flex justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg">
                        <Home size={32} />
                    </div>
                    <span className="font-bold text-slate-900 text-3xl tracking-tight">Estately</span>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Finalize Your Account</h2>
                    <p className="text-slate-500 mb-8">Set a secure password to complete your invitation and join the platform.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {status === 'ERROR' && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="invite-email" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                            <input
                                id="invite-email"
                                type="text"
                                disabled
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 font-medium cursor-not-allowed"
                                value={email || 'invitation-user@estately.pro'}
                            />
                        </div>

                        <div>
                            <label htmlFor="invite-password" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Set Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    id="invite-password"
                                    type="password"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-mono"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="invite-confirm-password" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    id="invite-confirm-password"
                                    type="password"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-mono"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || status === 'ERROR'}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Complete Setup'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AcceptInvite;
