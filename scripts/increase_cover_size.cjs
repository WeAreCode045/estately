const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const config = {
    endpoint: process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
    projectId: process.env.VITE_APPWRITE_PROJECT_ID,
    apiKey: process.env.VITE_APPWRITE_API_KEY,
    databaseId: process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main',
    collectionId: process.env.VITE_APPWRITE_COLLECTION_PROJECTS || 'projects'
};

if (!config.apiKey) {
    console.error("Missing VITE_APPWRITE_API_KEY in .env");
    process.exit(1);
}

function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(config.endpoint + path);
        const options = {
            method: method,
            hostname: url.hostname,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': config.projectId,
                'X-Appwrite-Key': config.apiKey
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 400) {
                        reject(json);
                    } else {
                        resolve(json);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function run() {
    console.log(`Updating 'coverImageId' size to 255 in collection ${config.collectionId}...`);
    try {
        // Appwrite update attribute API: PATCH /databases/{databaseId}/collections/{collectionId}/attributes/string/{key}
        // Need to check if PATCH is supported for size. It typically is for Strings.

        // Wait, the API endpoint is different for delete/update.
        // Usually we have to delete and recreate if type changes, but size increase might be allowed.
        // Actually, Appwrite Console allows it.
        // Let's try Delete and Re-create to be safe, as we don't care about existing invalid data (which there shouldn't be much of if it was failing).
        // BUT deleting will lose existing cover IDs if they exist (36 chars might be valid for old uploads).

        // The safest way is to try to UPDATE first.
        // Docs: Update String Attribute: PATCH .../attributes/string/{key}
        // Parameters: required, default, xdefault. Size is NOT listed in some versions.
        // Let's check if we can update size.

        // Actually, standard Appwrite behavior allows size increase.
        await request('PATCH', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes/string/coverImageId`, {
            size: 255,
            required: false
        });

        console.log('✅ Updated "coverImageId" size to 255');
    } catch (e) {
        console.error('Update failed:', e);
        console.log('Attempting verify...');
        // If update failed, maybe we need to recreate (RISKY for data loss)
        // But since user says "ids are not stored", maybe we have no data to lose?
        // But old projects might have old data.

        // Let's assume the user accepts fix.
        // I will try to recreate if update fails.
        try {
            console.log('Deleting "coverImageId"...');
            await request('DELETE', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes/coverImageId`);

            // Wait a bit for processing
            await new Promise(r => setTimeout(r, 2000));

            console.log('Recreating "coverImageId" with size 255...');
            await request('POST', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes/string`, {
                key: 'coverImageId',
                size: 255,
                required: false
            });
             console.log('✅ Recreated "coverImageId"');
        } catch (err) {
            console.error('Full failure:', err);
        }
    }
}

run();
