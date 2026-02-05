import { Account, Client, Databases, ID, ImageFormat, Permission, Query, Role, Storage, Teams } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export { client, ID, Query };

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
    FORM_DEFINITIONS: 'form_definitions',
    PROJECT_FORMS: import.meta.env.VITE_APPWRITE_COLLECTION_PROJECT_FORMS || 'project_forms',
    AGENCY: 'agency',
};

export const BUCKETS = {
    PROPERTY_IMAGES: 'property-images',
    DOCUMENTS: 'documents',
    AGENCY: 'agency',
    PROPERTY_BROCHURES: 'property-brochures',
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
    async uploadPropertyImage(projectId: string, file: File) {
        const ext = file.name.split('.').pop() || 'jpg';
        const mediaId = ID.unique();
        const fileName = `${projectId}_${mediaId}.${ext}`;
        const renamedFile = new File([file], fileName, { type: file.type });

        // Note: For this to work, the 'property-images' bucket must have 'Create' permission enabled for 'Users' or the specific role of the authenticated user.
        // We set file-level permissions to be public read, so they can be viewed in the gallery by anyone.
        return await storage.createFile(
            BUCKETS.PROPERTY_IMAGES,
            ID.unique(),
            renamedFile,
            [
                Permission.read(Role.any()),
                Permission.write(Role.users()) // or Role.user(userId) if we had it available here
            ]
        );
    },
    getImagePreview(fileId: string) {
        if (!fileId) return '';
        const url = storage.getFilePreview(
            BUCKETS.PROPERTY_IMAGES,
            fileId,
            0, // width
            0, // height
            undefined, // gravity
            100, // quality
            undefined, // borderWidth
            undefined, // borderColor
            undefined, // borderRadius
            undefined, // opacity
            undefined, // rotation
            undefined, // background
            ImageFormat.Jpg // output
        );
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
    async assignTask(profileId: string, taskId: string, extra?: { status?: 'PENDING' | 'COMPLETED', completedAt?: string, projectId?: string, title?: string, description?: string, dueDate?: string }) {
        let profile: any;
        let actualProfileId = profileId;

        try {
            profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
        } catch (e) {
            // Fallback: try to find by userId if the ID provided was a userId
            const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
                Query.equal('userId', profileId)
            ]);
            if (res.documents.length > 0) {
                profile = res.documents[0];
                actualProfileId = profile.$id;
            } else {
                throw e;
            }
        }

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
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, actualProfileId, {
            assignedTasks: JSON.stringify(tasks)
        });
    },
    async updateTaskStatus(profileId: string, taskId: string, status: 'PENDING' | 'COMPLETED') {
        let profile: any;
        let actualProfileId = profileId;

        try {
            profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
        } catch (e) {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
                Query.equal('userId', profileId)
            ]);
            if (res.documents.length > 0) {
                profile = res.documents[0];
                actualProfileId = profile.$id;
            } else {
                throw e;
            }
        }

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

        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, actualProfileId, {
            assignedTasks: JSON.stringify(tasks)
        });
    },
    async addDocument(profileId: string, metadata: { fileId: string, name: string, userDocumentDefinitionId: string, documentType: string, projectId: string, url: string }) {
        let profile: any;
        let actualProfileId = profileId;

        try {
            profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
        } catch (e) {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
                Query.equal('userId', profileId)
            ]);
            if (res.documents.length > 0) {
                profile = res.documents[0];
                actualProfileId = profile.$id;
            } else {
                throw e;
            }
        }

        const docs = profile.userDocuments ? (typeof profile.userDocuments === 'string' ? JSON.parse(profile.userDocuments) : profile.userDocuments) : [];

        docs.push({
            ...metadata,
            uploadedAt: new Date().toISOString(),
        });

        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, actualProfileId, {
            userDocuments: JSON.stringify(docs)
        });
    },
    async deleteDocumentReference(profileId: string, fileId: string) {
        let profile: any;
        let actualProfileId = profileId;

        try {
            profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
        } catch (e) {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
                Query.equal('userId', profileId)
            ]);
            if (res.documents.length > 0) {
                profile = res.documents[0];
                actualProfileId = profile.$id;
            } else {
                throw e;
            }
        }

        let docs = profile.userDocuments ? (typeof profile.userDocuments === 'string' ? JSON.parse(profile.userDocuments) : profile.userDocuments) : [];

        docs = docs.filter((d: any) => d.fileId !== fileId);

        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, actualProfileId, {
            userDocuments: JSON.stringify(docs)
        });
    }
};

const parseContractDoc = (doc: any) => {
    let signatureData = {};
    if (typeof doc.signatureData === 'string' && doc.signatureData.trim() !== '') {
        try {
            signatureData = JSON.parse(doc.signatureData);
        } catch (e) {
            signatureData = {};
        }
    } else if (typeof doc.signatureData === 'object' && doc.signatureData !== null) {
        signatureData = doc.signatureData;
    }

    return {
        ...doc,
        id: doc.$id,
        signatureData
    };
};

export const contractService = {
    async listByProject(projectId: string) {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CONTRACTS, [
            Query.equal('projectId', projectId)
        ]);

        response.documents = response.documents.map(parseContractDoc);
        return response;
    },
    async create(data: any) {
        const payload = { ...data };
        if (payload.signatureData && typeof payload.signatureData === 'object') {
            payload.signatureData = JSON.stringify(payload.signatureData);
        }
        return await databases.createDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, ID.unique(), payload);
    },
    async sign(contractId: string, userId: string, signatureData: string) {
        // Fetch current document
        const currentDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, contractId);
        const current = parseContractDoc(currentDoc);

        const signedBy = Array.from(new Set([...(current.signedBy || []), userId]));
        const allSignatureData = { ...(current.signatureData || {}), [userId]: signatureData };

        // Determine if all assignees have signed
        const assignees = current.assignees || [];
        const isAllSigned = assignees.length > 0 && assignees.every((id: string) => signedBy.includes(id));

        const updateData: any = {
            signedBy,
            signatureData: JSON.stringify(allSignatureData),
            status: isAllSigned ? 'SIGNED' : current.status
        };

        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, contractId, updateData);
    }
};

// Re-export project forms service for central imports
import projectFormsService from './projectFormsService';
export { projectFormsService };
