const https = require('https');

const config = {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6985280e001b83954ee0',
    apiKey: 'standard_3d1904f583579c0e20420f89a2a9786e174d2b713c35fdfbe91739f7564676b284c3b4a05a8012a556df76ad7e7f0513a288a7c3a4e07341d823d2864ee5d4e73ed4a6f238c9673b5f2672326a568d18ffa661ae7371da7a00f044de2ced94b481ab1589982cdafbfefb5d1ca873519a3a51e2b503ed515a1e2ee340ae31315a',
    databaseId: 'estately-main',
    collectionId: 'agency'
};

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
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function run() {
    console.log('Deleting "brochureSettings" attribute...');
    try {
        const response = await request('DELETE', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes/brochureSettings`);
        console.log('Response:', JSON.stringify(response, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
