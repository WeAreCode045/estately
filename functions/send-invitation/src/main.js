import { Client, Databases, Messaging, Teams, Users, Query, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  // Get environment variables
  const {
    APPWRITE_FUNCTION_PROJECT_ID,
    APPWRITE_FUNCTION_API_KEY,
    APPWRITE_FUNCTION_ENDPOINT
  } = process.env;

  const client = new Client()
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_FUNCTION_API_KEY);

  const databases = new Databases(client);
  const messaging = new Messaging(client);
  const users = new Users(client);
  const teams = new Teams(client);

  const DATABASE_ID = 'estately-main';
  const SETTINGS_COLLECTION = 'settings';
  const PROJECTS_COLLECTION = 'projects';
  const INVITES_COLLECTION = 'invites';

  try {
    // The payload is the newly created invite document
    const invite = req.body;
    log(`Full invite payload: ${JSON.stringify(invite)}`);
    log(`Processing invite for: ${invite.email} (Name: ${invite.name})`);

    // 1. Get Settings
    const [providerIdRes, appUrlRes] = await Promise.all([
      databases.listDocuments(DATABASE_ID, SETTINGS_COLLECTION, [Query.equal('key', 'messaging_provider_id')]),
      databases.listDocuments(DATABASE_ID, SETTINGS_COLLECTION, [Query.equal('key', 'app_url')])
    ]);

    const providerId = providerIdRes.documents[0]?.value;
    const appUrl = appUrlRes.documents[0]?.value || 'https://estately.code045.nl';

    if (!providerId) {
      throw new Error('Messaging provider ID not configured in settings.');
    }

    // 2. Ensure "Agency" Team exists (or use a default)
    const teamId = 'agency';
    try {
      await teams.get(teamId);
    } catch (e) {
      log('Creating Agency team...');
      await teams.create(teamId, 'Agency');
    }

    // REVISION: We use a custom Invitation flow.
    // 1. Ensure User exists (shadow account)
    // 2. Add User to Team quietly
    // 3. Generate Auth Token
    // 4. Send custom Email
    let user;
    try {
      const userList = await users.list([Query.equal('email', invite.email)]);
      if (userList.total > 0) {
        user = userList.users[0];
        // Ensure user has the correct name if it was missing
        if (!user.name || user.name === user.email.split('@')[0]) {
          log(`Updating name for existing user ${user.$id}...`);
          await users.updateName(user.$id, invite.name || '');
        }
      } else {
        log(`Creating shadow user for ${invite.email} with name "${invite.name}"...`);
        user = await users.create(ID.unique(), invite.email, undefined, undefined, invite.name || '');
      }
    } catch (err) {
      error(`User error: ${err.message}`);
      throw err;
    }

    // Add to Team quietly (no email sent from Appwrite)
    try {
      log(`Adding user ${user.$id} to team ${teamId}...`);
      await teams.createMembership(
        teamId,                        // 1. teamId
        [invite.role.toLowerCase()],   // 2. roles
        undefined,                     // 3. email (None to avoid auto-email)
        user.$id,                      // 4. userId (Direct link)
        undefined,                     // 5. phone
        undefined,                     // 6. url
        invite.name                    // 7. name
      );
    } catch (teamErr) {
      if (!teamErr.message.includes('already a member')) {
        log(`Team membership warning: ${teamErr.message}`);
      }
    }

    // Generate an Auth Token for login
    const sessionToken = await users.createToken(user.$id);
    const inviteLink = `${appUrl}/#/accept-invite?userId=${user.$id}&secret=${sessionToken.secret}`;
    log(`Generated invite link: ${inviteLink}`);

    // Link User to Project if projectId is present
    if (invite.projectId) {
      log(`Linking user ${user.$id} to project ${invite.projectId} as ${invite.role}...`);
      const projectUpdate = {};
      const role = invite.role.toUpperCase();
      
      if (role === 'SELLER') {
        projectUpdate.sellerId = user.$id;
      } else if (role === 'BUYER') {
        projectUpdate.buyerId = user.$id;
      }

      if (Object.keys(projectUpdate).length > 0) {
        try {
          await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION, invite.projectId, projectUpdate);
          log(`Project ${invite.projectId} updated successfully with role ${role}.`);
        } catch (updateErr) {
          error(`Failed to update project ${invite.projectId}: ${updateErr.message}`);
        }
      }
    }

    // Update Invite with userId for frontend tracking
    try {
      await databases.updateDocument(DATABASE_ID, INVITES_COLLECTION, invite.$id, { userId: user.$id });
      log(`Invite ${invite.$id} updated with userId: ${user.$id}`);
    } catch (inviteErr) {
      log(`Could not update invite with userId (non-critical): ${inviteErr.message}`);
    }

    // LOG: Verify appUrl
    log(`Using App URL: ${appUrl}`);

    // 5. Construct the email
    const subject = `Welcome to Estately!`;
    const content = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background: #ffffff;">
        <h1 style="color: #0f172a; font-size: 24px;">Welcome to Estately</h1>
        <p>Hello ${invite.name || 'there'},</p>
        <p>You have been invited to join the platform as a <strong>${invite.role}</strong>.</p>
        <p>Click the button below to activate your account and set your password:</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${inviteLink}" 
             style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            Accept Invitation
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
          <strong>Next step:</strong> After clicking the link, you will be asked to set a password for your account.
        </p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;"/>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 Estately. All rights reserved.</p>
      </div>
    `;

    // 6. Send the email via Messaging
    log(`Sending custom invitation to ${user.$id}...`);
    const message = await messaging.createEmail(
      ID.unique(),
      subject,
      content,
      [], // topics
      [user.$id], // users
      [], // targets
      [], // cc
      [], // bcc
      [], // attachments
      false, // draft
      true // html
    );

    log(`Invitation sent! Message ID: ${message.$id}`);
    
    return res.json({
      success: true,
      messageId: message.$id
    });

  } catch (err) {
    error('Error processing invitation:', err.message);
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};
