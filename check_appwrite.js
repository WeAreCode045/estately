const https = require('https');

const config = {
    endpoint: 'https://appwrite.code045.nl/v1',
    projectId: '69759f0f0003f89f3998',
    apiKey: 'standard_9abc323d17d70e53684c1775d74ba29c4f2fba31bff4be1223a2d939dc6dcc2492e799c66bc536f984b3776505e588ef2a0975ac2f54b802d7e572e9162d7e5131cd06abbe5145333b15dcd63de08dd59f8b63b5cca50ce388255b3ce56bdd464844fcb07a465bbc3498621ffc179936aecd26642f481999f255d6529ed0be9b',
    databaseId: 'estately-main',
    collectionId: 'contract_templates'
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
    console.log('Fetching attributes...');
    const result = await request('GET', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes`);

    if (result.attributes) {
        const existing = result.attributes.map(a => a.key);
        console.log('Existing attributes:', existing);

        const needed = [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'content', type: 'string', size: 65535, required: true },
            { key: 'description', type: 'string', size: 1000, required: false },
            { key: 'needSignatureFromSeller', type: 'boolean', required: false, default: false },
            { key: 'needSignatureFromBuyer', type: 'boolean', required: false, default: false },
            { key: 'autoCreateTaskForAssignee', type: 'boolean', required: false, default: false },
            { key: 'autoAddToNewProjects', type: 'boolean', required: false, default: false },
            { key: 'autoAssignTo', type: 'string', size: 255, required: false, array: true },
            { key: 'allowChanges', type: 'string', size: 50, required: false, default: 'always' }
        ];

        for (const attr of needed) {
            if (!existing.includes(attr.key)) {
                console.log(`Creating missing attribute: ${attr.key}`);
                const typePath = attr.type === 'string' ? 'string' : 'boolean';
                const payload = { ...attr };
                delete payload.type;
                const createRes = await request('POST', `/databases/${config.databaseId}/collections/${config.collectionId}/attributes/${typePath}`, payload);
                console.log(`Result for ${attr.key}:`, createRes.key ? 'Created' : createRes.message);
            } else {
                console.log(`Attribute ${attr.key} already exists.`);
            }
        }
    } else {
        console.error('Failed to fetch attributes:', result);
    }
}

run();
