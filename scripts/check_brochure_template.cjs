const https = require('https');

const config = {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6985280e001b83954ee0',
    apiKey: 'standard_3d1904f583579c0e20420f89a2a9786e174d2b713c35fdfbe91739f7564676b284c3b4a05a8012a556df76ad7e7f0513a288a7c3a4e07341d823d2864ee5d4e73ed4a6f238c9673b5f2672326a568d18ffa661ae7371da7a00f044de2ced94b481ab1589982cdafbfefb5d1ca873519a3a51e2b503ed515a1e2ee340ae31315a',
    databaseId: 'estately-main',
    collectionId: 'agency'
};

function request(method, path) {
    return new Promise((resolve, reject) => {
        const url = new URL(config.endpoint + path);
        const options = {
            method,
            hostname: url.hostname,
            path: url.pathname + url.search,
            headers: {
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

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('Fetching all attributes...\n');
    try {
        const response = await request('GET', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes`);
        console.log('Total attributes:', response.total);
        console.log('\nLooking for brochure_template...\n');

        const attr = response.attributes?.find(a => a.key === 'brochure_template');
        if (attr) {
            console.log('✅ Found brochure_template:');
            console.log('- Status:', attr.status);
            console.log('- Size:', attr.size);
            console.log('- Type:', attr.type);
            console.log('\n' + (attr.status === 'available' ? '✅ READY TO USE' : '⏳ STILL PROCESSING - Please wait'));
        } else {
            console.log('❌ brochure_template not found');
            console.log('\nExisting attributes:');
            response.attributes?.forEach(a => console.log(`- ${a.key} (${a.type}, ${a.status})`));
        }
    } catch (e) {
        console.error('Error:', e.message || e);
    }
}

run();
