import React, { createContext, useContext, useEffect, useState } from 'react';
import { Models, ID } from 'appwrite';
import { account, profileService, inviteService, projectService } from '../services/appwrite';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (email: string, pass: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserStatus();
    }, []);

    const checkUserStatus = async () => {
        try {
            const session = await account.get();
            setUser(session);
            await refreshProfile(session.$id);
        } catch (error) {
            setUser(null);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const refreshProfile = async (userId?: string) => {
        const id = userId || user?.$id;
        if (!id) return;
        
        try {
            let userProfile = await profileService.getByUserId(id);
            
            if (!userProfile) {
                // Determine if we should create a profile (only for the logged-in user)
                const currentUser = user || await account.get();
                if (currentUser && currentUser.$id === id) {
                    // Check again with the listAll fallback just to be 100% sure we don't duplicate
                    const all = await profileService.listAll();
                    const exists = all.documents.find((d: any) => d.userId === id || d.email === currentUser.email);
                    
                    if (exists) {
                        setProfile(exists);
                        return;
                    }

                    // Check for pending invitations
                    const invites = await inviteService.getByEmail(currentUser.email);
                    let role = all.total === 0 ? 'ADMIN' : 'BUYER';
                    let projectId = '';

                    if (invites.total > 0) {
                        const invite = invites.documents[0];
                        role = invite.role;
                        projectId = invite.projectId;
                        
                        // Mark invite as accepted
                        await inviteService.updateStatus(invite.$id, 'ACCEPTED');
                        
                        // Link user to project if project exists
                        if (projectId) {
                            const field = role === 'SELLER' ? 'sellerId' : 'buyerId';
                            await projectService.update(projectId, { [field]: id });
                        }
                    }

                    userProfile = await profileService.create({
                        userId: currentUser.$id,
                        name: currentUser.name,
                        email: currentUser.email,
                        role: role,
                        status: 'ACTIVE'
                    });
                }
            }
            
            if (userProfile) {
                setProfile(userProfile);
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    };

    const login = async (email: string, pass: string) => {
        try {
            // Attempt to clear any existing session first to avoid "session already active" errors
            await account.deleteSession('current');
        } catch (e) {
            // Ignore error if no session exists
        }
        await account.createEmailPasswordSession(email, pass);
        const session = await account.get();
        setUser(session);
        await refreshProfile(session.$id);
    };

    const register = async (email: string, pass: string, name: string) => {
        try {
            await account.deleteSession('current');
        } catch (e) {}
        await account.create(ID.unique(), email, pass, name);
        await login(email, pass);
        
        // Final profile check/sync is handled by login -> refreshProfile
    };

    const logout = async () => {
        await account.deleteSession('current');
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
