import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = import.meta.env.VITE_AWS_REGION || 'eu-central-1';
const BUCKET = import.meta.env.VITE_AWS_S3_BUCKET || 'estately-storage';
const PRESIGNER = import.meta.env.VITE_PRESIGNER_URL || '';

const hasClientCredentials = Boolean(import.meta.env.VITE_AWS_ACCESS_KEY_ID && import.meta.env.VITE_AWS_SECRET_ACCESS_KEY);

const s3 = hasClientCredentials
  ? new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
      }
    })
  : undefined as unknown as S3Client;

function buildProjectKey(projectId: string, folder: string, filename: string) {
  return `project/${projectId}/${folder}/${filename}`;
}

function buildGeneralKey(path: string) {
  return `general/${path}`;
}

function buildAgencyKey(agencyId: string, path: string) {
  return `agency/${agencyId}/${path}`;
}

async function callPresigner(path: string, body: any) {
  const url = PRESIGNER.replace(/\/$/, '') + path;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Presigner error: ${res.statusText}`);
  return res.json();
}

export const s3Service = {
  async uploadProjectFile(projectId: string, folder: string, file: File) {
    const key = buildProjectKey(projectId, folder, file.name);

    if (PRESIGNER) {
      // get presigned PUT
      const { url } = await callPresigner('/presign', { key, method: 'put', contentType: file.type });
      // upload directly
      const putRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) throw new Error('Upload failed');
      const getRes = await callPresigner('/presign', { key, method: 'get' });
      return { key, url: getRes.url };
    }

    // fallback to client-side upload (requires credentials)
    const parallelUpload = new Upload({
      client: s3,
      params: { Bucket: BUCKET, Key: key, Body: file, ContentType: file.type }
    });
    await parallelUpload.done();
    const url = await this.getPresignedUrl(key);
    return { key, url };
  },

  async uploadGeneral(path: string, file: File) {
    const key = buildGeneralKey(path + '/' + file.name);
    if (PRESIGNER) {
      const { url } = await callPresigner('/presign', { key, method: 'put', contentType: file.type });
      const putRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) throw new Error('Upload failed');
      const getRes = await callPresigner('/presign', { key, method: 'get' });
      return { key, url: getRes.url };
    }
    const upload = new Upload({ client: s3, params: { Bucket: BUCKET, Key: key, Body: file, ContentType: file.type } });
    await upload.done();
    const url = await this.getPresignedUrl(key);
    return { key, url };
  },

  async uploadAgencyFile(agencyId: string, path: string, file: File) {
    const key = buildAgencyKey(agencyId, path + '/' + file.name);
    if (PRESIGNER) {
      const { url } = await callPresigner('/presign', { key, method: 'put', contentType: file.type });
      const putRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) throw new Error('Upload failed');
      const getRes = await callPresigner('/presign', { key, method: 'get' });
      return { key, url: getRes.url };
    }
    const upload = new Upload({ client: s3, params: { Bucket: BUCKET, Key: key, Body: file, ContentType: file.type } });
    await upload.done();
    const url = await this.getPresignedUrl(key);
    return { key, url };
  },

  async getPresignedUrl(key: string, expiresIn = 60 * 60) {
    if (PRESIGNER) {
      const res = await callPresigner('/presign', { key, method: 'get', expiresIn });
      return res.url;
    }
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return await getSignedUrl(s3, cmd, { expiresIn });
  },

  async deleteObject(key: string) {
    if (PRESIGNER) {
      return await callPresigner('/delete', { key });
    }
    const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
    return await s3.send(cmd);
  },

  async headObject(key: string) {
    if (PRESIGNER) {
      return await callPresigner('/head', { key });
    }
    const cmd = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    return await s3.send(cmd);
  }
};

export default s3Service;
