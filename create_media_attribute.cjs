const https = require('https');

const config = {
    endpoint: 'https://appwrite.code045.nl/v1',
    projectId: '69759f0f0003f89f3998',
    apiKey: 'standard_9abc323d17d70e53684c1775d74ba29c4f2fba31bff4be1223a2d939dc6dcc2492e799c66bc536f984b3776505e588ef2a0975ac2f54b802d7e572e9162d7e5131cd06abbe5145333b15dcd63de08dd59f8b63b5cca50ce388255b3ce56bdd464844fcb07a465bbc3498621ffc179936aecd26642f481999f255d6529ed0be9b',
    databaseId: 'estately-main',
    collectionId: 'projects' // VITE_APPWRITE_COLLECTION_PROJECTS
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
