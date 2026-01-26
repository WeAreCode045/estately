import { Client, Account, Databases, Storage, Teams, ID, Query, ImageGravity, ImageFormat } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export { client, Query };

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

export const COLLECTIONS = {
    PROJECTS: import.meta.env.VITE_APPWRITE_COLLECTION_PROJECTS,
    CONTRACTS: import.meta.env.VITE_APPWRITE_COLLECTION_CONTRACTS,
    TEMPLATES: import.meta.env.VITE_APPWRITE_COLLECTION_TEMPLATES,
    PROFILES: import.meta.env.VITE_APPWRITE_COLLECTION_PROFILES,
    MESSAGES: import.meta.env.VITE_APPWRITE_COLLECTION_MESSAGES,
    INVITES: import.meta.env.VITE_APPWRITE_COLLECTION_INVITES,
    SETTINGS: 'settings',
    REQUIRED_DOCUMENTS: 'required_documents',
    PROJECT_DOCUMENTS: 'project_documents',
    TASKS: 'tasks',
    TASK_TEMPLATES: 'task_templates',
    FILE_TEMPLATES: 'file_templates',
};

export const BUCKETS = {
    PROPERTY_IMAGES: 'property-images',
    DOCUMENTS: 'documents',
};

export const configService = {
    async get(key: string) {
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SETTINGS, [
                Query.equal('key', key)
            ]);
            return response.documents[0] || null;
        } catch (error) {
            console.error('configService.get error:', error);
            return null;
        }
    },
    async set(key: string, value: string) {
        const existing = await this.get(key);
        if (existing) {
            return await databases.updateDocument(DATABASE_ID, COLLECTIONS.SETTINGS, (existing as any).$id, { value });
        } else {
            return await databases.createDocument(DATABASE_ID, COLLECTIONS.SETTINGS, ID.unique(), { key, value });
        }
    }
};

export const inviteService = {
    async create(data: { email: string, role: string, name?: string, projectId?: string, invitedBy: string }) {
        // Create the invitation document.
        // To send an automated email, you should configure an Appwrite Function 
        // triggered by the 'databases.*.collections.invites.documents.*.create' event.
        // The Web SDK does not support sending administrative emails directly for security reasons.
        return await databases.createDocument(
            DATABASE_ID, 
            COLLECTIONS.INVITES, 
            ID.unique(), 
            {
                ...data,
                status: 'PENDING'
            }
        );
    },
    async listPending() {
        return await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVITES, [
            Query.equal('status', 'PENDING')
        ]);
    },
    async updateStatus(id: string, status: 'ACCEPTED' | 'REJECTED') {
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVITES, id, { status });
    },
    async getByEmail(email: string) {
        return await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVITES, [
            Query.equal('email', email),
            Query.equal('status', 'PENDING')
        ]);
    },
    async delete(id: string) {
        return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVITES, id);
    }
};

export const projectService = {
    async list() {
        return await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS);
    },
    async get(id: string) {
        return await databases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, id);
    },
    async create(data: any) {
        return await databases.createDocument(DATABASE_ID, COLLECTIONS.PROJECTS, ID.unique(), data);
    },
    async update(id: string, data: any) {
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, id, data);
    },
    async uploadImage(file: File) {
        return await storage.createFile(BUCKETS.PROPERTY_IMAGES, ID.unique(), file);
    },
    getImagePreview(fileId: string) {
        if (!fileId) return '';
        const url = storage.getFilePreview({
            bucketId: BUCKETS.PROPERTY_IMAGES,
            fileId: fileId,
            quality: 100,
            output: ImageFormat.Jpg
        });
        return url.toString();
    }
};

export const profileService = {
    async getByUserId(userId: string) {
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
                Query.equal('userId', userId)
            ]);
            
            if (response.documents.length > 0) {
                return response.documents[0];
            }
            
            // Fallback: search all (if small collection) or log
            const allProfiles = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES);
            const found = allProfiles.documents.find((doc: any) => doc.userId === userId);
            return found || null;
        } catch (error) {
            console.error('getByUserId error:', error);
            return null;
        }
    },
    async listAll() {
        return await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES);
    },
    async create(data: any) {
        return await databases.createDocument(DATABASE_ID, COLLECTIONS.PROFILES, ID.unique(), data);
    },
    async update(id: string, data: any) {
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, id, data);
    },
    async delete(id: string) {
        return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROFILES, id);
    },
    async assignTask(profileId: string, taskId: string, extra?: { status?: 'PENDING' | 'COMPLETED', completedAt?: string, projectId?: string }) {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
        const tasks = profile.assignedTasks ? (typeof profile.assignedTasks === 'string' ? JSON.parse(profile.assignedTasks) : profile.assignedTasks) : [];
        
        const isAlreadyAssigned = tasks.some((t: any) => t.taskId === taskId && t.projectId === extra?.projectId);
        if (isAlreadyAssigned) return;

        tasks.push({
            taskId,
            assignedAt: new Date().toISOString(),
            status: 'PENDING',
            projectId: extra?.projectId || 'personal',
            ...extra
        });
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId, {
            assignedTasks: JSON.stringify(tasks)
        });
    },
    async updateTaskStatus(profileId: string, taskId: string, status: 'PENDING' | 'COMPLETED') {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
        let tasks = profile.assignedTasks ? (typeof profile.assignedTasks === 'string' ? JSON.parse(profile.assignedTasks) : profile.assignedTasks) : [];
        
        tasks = tasks.map((t: any) => {
            if (t.taskId === taskId) {
                return {
                    ...t,
                    status,
                    completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined
                };
            }
            return t;
        });
        
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId, {
            assignedTasks: JSON.stringify(tasks)
        });
    },
    async addDocument(profileId: string, metadata: { fileId: string, name: string, documentRequirementId: string, documentType: string, projectId: string, url: string }) {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
        const docs = profile.userDocuments ? (typeof profile.userDocuments === 'string' ? JSON.parse(profile.userDocuments) : profile.userDocuments) : [];
        
        docs.push({
            ...metadata,
            uploadedAt: new Date().toISOString(),
        });
        
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId, {
            userDocuments: JSON.stringify(docs)
        });
    },
    async deleteDocumentReference(profileId: string, fileId: string) {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
        let docs = profile.userDocuments ? (typeof profile.userDocuments === 'string' ? JSON.parse(profile.userDocuments) : profile.userDocuments) : [];
        
        docs = docs.filter((d: any) => d.fileId !== fileId);
        
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId, {
            userDocuments: JSON.stringify(docs)
        });
    }
};

export const contractService = {
    async listByProject(projectId: string) {
        return await databases.listDocuments(DATABASE_ID, COLLECTIONS.CONTRACTS, [
            Query.equal('projectId', projectId)
        ]);
    },
    async create(data: any) {
        return await databases.createDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, ID.unique(), data);
    }
};
