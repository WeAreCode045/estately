const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const config = {
    endpoint: process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
    projectId: process.env.VITE_APPWRITE_PROJECT_ID || '6985280e001b83954ee0',
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

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function createAttribute() {
    console.log('Adding "media" attribute to projects collection...');

    try {
        await request(
            'POST',
            `/databases/${config.databaseId}/collections/${config.collectionId}/attributes/string`,
            {
                key: 'media',
                size: 255,
                required: false,
                array: true, // This is an array of strings (Permission IDs / File IDs)
                xdefault: null
            }
        );
        console.log('✅ Created "media" attribute (Array<String>)');
    } catch (error) {
        if (error.code === 409) {
            console.log('⚠️ Attribute "media" already exists.');
        } else {
            console.error('❌ Failed to create "media" attribute:', error);
        }
    }
}

createAttribute().then(() => {
    console.log('Done.');
}).catch(err => {
    console.error('Script failed:', err);
});
