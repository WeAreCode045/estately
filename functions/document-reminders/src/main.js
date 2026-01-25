const { Client, Databases, Messaging, Query } = require('node-appwrite');

module.exports = async function (context) {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const messaging = new Messaging(client);

    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    const PROJECTS_COLLECTION = 'projects';
    const PROFILES_COLLECTION = 'profiles';
    const PROJECT_DOCS_COLLECTION = 'project_documents';
    const REQUIRED_DOCS_COLLECTION = 'required_documents';

    try {
        // 1. Get all pending project documents
        const pendingDocs = await databases.listDocuments(
            DATABASE_ID,
            PROJECT_DOCS_COLLECTION,
            [Query.equal('status', 'PENDING')]
        );

        context.log(`Found ${pendingDocs.total} pending documents to check.`);

        for (const doc of pendingDocs.documents) {
            // 2. Get the requirement definition to check reminder settings
            if (!doc.requiredDocumentId) continue;
            
            const requirement = await databases.getDocument(
                DATABASE_ID,
                REQUIRED_DOCS_COLLECTION,
                doc.requiredDocumentId
            );

            if (!requirement.sendReminders) continue;

            // 3. Check if a reminder is due
            // Simplified logic: Send if last update was more than X days ago and it's still pending
            const lastUpdate = new Date(doc.$updatedAt);
            const now = new Date();
            const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

            if (daysSinceUpdate >= requirement.reminderIntervalDays) {
                // 4. Find the target user (Seller or Buyer)
                const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION, doc.projectId);
                const targetUserId = doc.providedBy === 'SELLER' ? project.sellerId : project.buyerId;

                if (targetUserId) {
                    const profileRes = await databases.listDocuments(
                        DATABASE_ID,
                        PROFILES_COLLECTION,
                        [Query.equal('userId', targetUserId)]
                    );

                    const profile = profileRes.documents[0];
                    if (profile && profile.email) {
                        // 5. Send reminder via Messaging (Email)
                        context.log(`Sending reminder to ${profile.email} for ${doc.name}`);
                        
                        await messaging.createEmail(
                            'unique()',
                            'Reminder: Missing Document for ' + project.title,
                            `Hi ${profile.name || 'there'},\n\nThis is a friendly reminder that we are still waiting for your "${doc.name}" for the project "${project.title}".\n\nPlease log in to your portal to upload it.\n\nThank you!`,
                            [], // Topics
                            [profile.email]
                        );

                        // Update doc to reset the $updatedAt timer
                        await databases.updateDocument(
                            DATABASE_ID,
                            PROJECT_DOCS_COLLECTION,
                            doc.$id,
                            { remindersSent: (doc.remindersSent || 0) + 1 }
                        );
                    }
                }
            }
        }

        return context.res.json({ success: true });
    } catch (err) {
        context.error(err.message);
        return context.res.json({ success: false, error: err.message }, 500);
    }
};
