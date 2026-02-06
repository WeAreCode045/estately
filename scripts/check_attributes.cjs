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

function request(method, path) {
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
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function run() {
    console.log(`Listing attributes for collection ${config.collectionId}...`);
    try {
        const res = await request('GET', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes`);
        if (res.attributes) {
            const media = res.attributes.find(a => a.key === 'media');
            const cover = res.attributes.find(a => a.key === 'coverImageId');

            console.log('--- MEDIA ATTRIBUTE ---');
            console.log(media || 'NOT FOUND');

            console.log('--- COVER ATTRIBUTE ---');
            console.log(cover || 'NOT FOUND');
        } else {
            console.log('No attributes found or error:', res);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
