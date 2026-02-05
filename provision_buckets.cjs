const https = require('https');

const config = {
    endpoint: 'https://appwrite.code045.nl/v1',
    projectId: '69759f0f0003f89f3998',
    apiKey: 'standard_9abc323d17d70e53684c1775d74ba29c4f2fba31bff4be1223a2d939dc6dcc2492e799c66bc536f984b3776505e588ef2a0975ac2f54b802d7e572e9162d7e5131cd06abbe5145333b15dcd63de08dd59f8b63b5cca50ce388255b3ce56bdd464844fcb07a465bbc3498621ffc179936aecd26642f481999f255d6529ed0be9b'
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
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(body ? JSON.parse(body) : {});
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject({ statusCode: res.statusCode, body: body });
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

async function provisionBucket(bucketId, name, publicRead = true) {
    try {
        console.log(`Checking bucket "${name}" (${bucketId})...`);
        try {
            await request('GET', `/storage/buckets/${bucketId}`);
            console.log(`Bucket ${bucketId} exists.`);
        } catch (e) {
            if (e.statusCode === 404) {
                console.log(`Creating bucket ${bucketId}...`);
                await request('POST', '/storage/buckets', {
                    bucketId: bucketId,
                    name: name,
                    fileSecurity: false,
                    enabled: true,
                    permissions: publicRead ? [
                        'read("any")',
                        'write("users")', 
                        'update("users")', 
                        'delete("users")' 
                    ] : []
                });
                console.log(`Bucket ${bucketId} created.`);
            } else {
                throw e;
            }
        }
        
        if (publicRead) {
            console.log(`Ensuring permissions for ${bucketId}...`);
            // Update permissions just in case
            await request('PUT', `/storage/buckets/${bucketId}`, {
                name: name,
                permissions: [
                    'read("any")',
                    'write("users")',
                    'update("users")',
                    'delete("users")'
                ],
                fileSecurity: false
            });
            console.log(`Permissions updated for ${bucketId}.`);
        }

    } catch (error) {
        console.error(`Error provisioning bucket ${bucketId}:`, error);
        console.error(error.body);
    }
}

async function main() {
    await provisionBucket('agency', 'Agency Assets', true);
    await provisionBucket('property-brochures', 'Property Brochures', true); // Maybe restricted read? User implies public access might be needed for download URL sharing, or at least authenticated. Let's start with public read for simplicity unless specified.
    console.log("Storage provisioning complete.");
}

main();
