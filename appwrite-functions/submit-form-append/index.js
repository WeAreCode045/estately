const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
  .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

const databases = new sdk.Databases(client);

function safeParse(x) {
  try { return typeof x === 'string' ? JSON.parse(x) : x; } catch (e) { return x; }
}

module.exports = async function (req, res) {
  function sendResponse(body, status = 200) {
    if (res && typeof res.json === 'function') {
      try { return res.json(body, status); } catch (e) { /* fallthrough */ }
    }
    const out = { status, body };
    console.log('FUNCTION_RESPONSE', JSON.stringify(out));
    return out;
  }

  try {
    console.log('submit-form-append invoked');

    // Extract event payload (support multiple runtime wrappers)
    let payload = req && req.payload ? req.payload : (req && req.req && req.req.payload ? req.req.payload : null);
    if (!payload && req && req.body) payload = req.body;
    if (!payload && req && req.req && req.req.bodyText) {
      try { payload = JSON.parse(req.req.bodyText); } catch (e) { payload = null; }
    }

    const event = payload || {};
    console.log('event payload keys:', Object.keys(event || {}));

    // Appwrite DB create event payload typically contains $id, formId, profileId, submittedAt
    const doc = event || {};
    const responseId = doc.$id || doc.id || doc.responseId;
    const formId = doc.formId;
    const profileId = doc.profileId;
    const submittedAt = doc.submittedAt || new Date().toISOString();
    const title = (doc && doc.metadata && doc.metadata.title) || (doc && doc.summary) || null;

    if (!responseId || !formId || !profileId) {
      console.warn('Missing responseId/formId/profileId in event, skipping append');
      return sendResponse({ ok: false, reason: 'missing fields' }, 200);
    }

    // Read profile
    let profile;
    try {
      profile = await databases.getDocument(process.env.APPWRITE_FUNCTION_DATABASE_ID || process.env.DATABASE_ID, process.env.VITE_APPWRITE_COLLECTION_PROFILES || process.env.APPWRITE_COLLECTION_PROFILES || 'profiles', profileId);
    } catch (e) {
      console.error('Failed reading profile', profileId, e);
      return sendResponse({ ok: false, reason: 'profile not found' }, 500);
    }

    const existing = safeParse(profile.formResponses) || [];
    const already = (existing || []).some((f) => f.responseId === responseId);
    if (already) {
      console.log('Pointer already exists on profile, skipping append');
      return sendResponse({ ok: true, appended: false }, 200);
    }

    const pointer = {
      formId,
      responseId,
      title,
      submittedAt,
      metadata: (doc && doc.metadata) || {}
    };

    existing.push(pointer);

    try {
      const updated = await databases.updateDocument(process.env.APPWRITE_FUNCTION_DATABASE_ID || process.env.DATABASE_ID, process.env.VITE_APPWRITE_COLLECTION_PROFILES || process.env.APPWRITE_COLLECTION_PROFILES || 'profiles', profileId, {
        formResponses: JSON.stringify(existing)
      });
      console.log('Updated profile with new form pointer', responseId);
      return sendResponse({ ok: true, appended: true }, 200);
    } catch (e) {
      console.error('Failed updating profile with form pointer', e);
      return sendResponse({ ok: false, reason: 'update failed' }, 500);
    }
  } catch (err) {
    console.error('submit-form-append error:', err);
    return sendResponse({ ok: false, error: String(err) }, 500);
  }
};
