const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const REGION = process.env.AWS_REGION || process.env.VITE_AWS_REGION || 'eu-central-1';
const BUCKET = process.env.S3_BUCKET || process.env.VITE_AWS_S3_BUCKET || 'estately-storage';

const s3 = new S3Client({ region: REGION });

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/presign', async (req, res) => {
  try {
    const { key, method = 'get', expiresIn = 3600, contentType } = req.body;
    if (!key) return res.status(400).json({ error: 'Missing key' });

    if (method === 'get') {
      const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      return res.json({ url });
    }

    if (method === 'put') {
      const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      return res.json({ url });
    }

    return res.status(400).json({ error: 'Unsupported method' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/delete', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Missing key' });
    const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
    await s3.send(cmd);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/head', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Missing key' });
    const cmd = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    const out = await s3.send(cmd);
    // convert Headers to plain object
    const obj = {
      contentLength: out.ContentLength,
      contentType: out.ContentType,
      lastModified: out.LastModified,
      metadata: out.Metadata || {}
    };
    return res.json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4001;
app.listen(port, () => console.log(`Presigner running on port ${port}`));
