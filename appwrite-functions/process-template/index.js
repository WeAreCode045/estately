const fetch = require('node-fetch');
const PDFParser = require('pdf-parse');
const sdk = require('node-appwrite');

// Appwrite client configured via function environment variables
const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
  .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

const databases = new sdk.Databases(client);

async function downloadFile(bucketId, fileId) {
  const url = `${process.env.APPWRITE_FUNCTION_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/download`;
  const resp = await fetch(url, {
    headers: {
      'X-Appwrite-Project': process.env.APPWRITE_FUNCTION_PROJECT_ID,
      'X-Appwrite-Key': process.env.APPWRITE_FUNCTION_API_KEY
    }
  });
  if (!resp.ok) throw new Error(`Failed to download file: ${resp.status} ${resp.statusText}`);
  const ab = await resp.arrayBuffer();
  return Buffer.from(ab);
}

async function callLLM(prompt) {
  const provider = process.env.LLM_PROVIDER || 'openai';
  if (provider === 'openai') {
    const endpoint = process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    const body = {
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
      max_tokens: 1500
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LLM_API_KEY}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`LLM responded ${res.status}`);
    const json = await res.json();
    return json.choices?.[0]?.message?.content || json.choices?.[0]?.text;
  }

  // Generic POST to custom LLM endpoint (expects a text response)
  const res = await fetch(process.env.LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLM_API_KEY}`
    },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error(`LLM responded ${res.status}`);
  return res.text();
}

module.exports = async function (req, res) {
  try {
    // Appwrite functions expose payload in `req.payload` (string) when invoked with data
    const payload = req.payload ? JSON.parse(req.payload) : {};
    const templateId = payload.templateId || payload.template_id;
    const fileId = payload.fileId || payload.file_id || payload.storageFileId;

    if (!fileId) return res.json({ error: 'fileId required in payload' }, 400);

    const bucketId = process.env.STORAGE_BUCKET_ID;
    const databaseId = process.env.DATABASE_ID;
    const collectionId = process.env.TEMPLATE_COLLECTION_ID;

    if (!bucketId || !databaseId || !collectionId) {
      return res.json({ error: 'Missing required environment variables: STORAGE_BUCKET_ID, DATABASE_ID, TEMPLATE_COLLECTION_ID' }, 500);
    }

    // Download the PDF from Appwrite storage
    const buffer = await downloadFile(bucketId, fileId);

    // Extract text (fast path for digital PDFs). For scanned PDFs, use Cloud Vision OCR separately.
    const pdfData = await PDFParser(buffer);
    const extractedText = (pdfData && pdfData.text) ? pdfData.text : '';

    // Build the LLM prompt to convert raw text into structured form schema and preview HTML
    const prompt = `You are a document-parsing assistant. Given the extracted text from a PDF, return a single valid JSON object (no surrounding commentary) with keys: \n` +
      `- fields: an array of field objects { name, label, exampleValues, page, type (text|number|date|checkbox|signature), confidence }\n` +
      `- formSchema: a JSON Schema (properties with types and titles) suitable for rendering a form\n` +
      `- htmlPreview: a small HTML string rendering the form (labels + simple inputs).\n\n` +
      `Here is the extracted text:\n\n${extractedText}`;

    const llmOutput = await callLLM(prompt);

    // Try to parse JSON from the LLM output
    let parsed = null;
    try {
      parsed = JSON.parse(llmOutput);
    } catch (err) {
      // Try to extract the first JSON object substring
      const m = llmOutput.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else throw new Error('LLM output is not valid JSON');
    }

    // Prepare update payload
    const updatePayload = {
      extractedSchema: {
        rawText: extractedText,
        llmRaw: llmOutput,
        fields: parsed.fields || []
      },
      formSchema: parsed.formSchema || {},
      htmlPreview: parsed.htmlPreview || '',
      analysisStatus: 'READY',
      updatedAt: new Date().toISOString()
    };

    // If templateId provided, update DB document
    if (templateId) {
      await databases.updateDocument(databaseId, collectionId, templateId, updatePayload);
    }

    return res.json({ success: true, parsed: updatePayload }, 200);
  } catch (err) {
    console.error('process-template error:', err);
    return res.json({ error: String(err) }, 500);
  }
};
