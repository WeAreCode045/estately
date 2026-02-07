const https = require('https');

const config = {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6985280e001b83954ee0',
    apiKey: 'standard_9abc323d17d70e53684c1775d74ba29c4f2fba31bff4be1223a2d939dc6dcc2492e799c66bc536f984b3776505e588ef2a0975ac2f54b802d7e572e9162d7e5131cd06abbe5145333b15dcd63de08dd59f8b63b5cca50ce388255b3ce56bdd464844fcb07a465bbc3498621ffc179936aecd26642f481999f255d6529ed0be9b',
    bucketId: 'property-images'
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

async function updateBucketPermissions() {
    console.log(`Updating permissions for bucket "${config.bucketId}"...`);

    try {
        // First get the bucket to see existing config (name, etc)
        const bucket = await request('GET', `/storage/buckets/${config.bucketId}`);

        // Define desired permissions:
        // - read("any"): Publicly viewable
        // - create("users"): Logged in users can upload
        // - update("users"), delete("users"): Logged in users can update/delete (Modify as needed)
        // ideally update/delete should maybe be narrower, but for now matching the requirement

        const newPermissions = [
            'read("any")',
            'create("users")',
            'update("users")',
            'delete("users")'
        ];

        await request('PUT', `/storage/buckets/${config.bucketId}`, {
            name: bucket.name,
            permissions: newPermissions,
            fileSecurity: true, // "File Security" enabled means file-level perms logic is used
            enabled: true,
            maximumFileSize: bucket.maximumFileSize,
            allowedFileExtensions: bucket.allowedFileExtensions,
            compression: bucket.compression,
            encryption: bucket.encryption,
            antivirus: bucket.antivirus
        });

        console.log('✅ Bucket permissions updated successfully.');
        console.log('   - Read: Any (Public)');
        console.log('   - Create/Update/Delete: Authenticated Users');

    } catch (error) {
        console.error('❌ Failed to update bucket permissions:', error);
    }
}

updateBucketPermissions().then(() => {
    console.log('Done.');
}).catch(err => {
    console.error('Script failed:', err);
});
