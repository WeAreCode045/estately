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
                        // If conflict (409), it's not a failure for us
                        if (res.statusCode === 409) {
                            resolve({ status: 409, message: 'Already exists' });
                        } else {
                            reject(json);
                        }
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
    console.log(`Checking attributes for collection ${config.collectionId}...`);

    try {
        console.log('Creating "coverImageId" (string)...');
        const res1 = await request('POST', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes/string`, {
            key: 'coverImageId',
            size: 255,
            required: false
        });
        console.log('Result:', res1.message || 'Created');

        console.log('Creating "media" (string array)...');
        const res2 = await request('POST', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes/string`, {
            key: 'media',
            size: 255,
            required: false,
            array: true
        });
        console.log('Result:', res2.message || 'Created');

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
