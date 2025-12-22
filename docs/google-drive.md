---
files:
  - imports/client/components/AccountFormHelpers.tsx
  - imports/client/components/GoogleLinkBlock.tsx
  - imports/client/components/InsertImage.tsx
  - imports/lib/models/DocumentActivities.ts
  - imports/lib/models/FolderPermissions.ts
  - imports/server/models/HuntFolders.ts
  - imports/methods/configureGoogleOAuthClient.ts
  - imports/methods/linkUserGoogleAccount.ts
  - imports/methods/unlinkUserGoogleAccount.ts
  - imports/server/accounts.ts
  - imports/server/addUserToHunt.ts
  - imports/server/gdrive.ts
  - imports/server/gdriveActivityFetcher.ts
  - imports/server/googleClientRefresher.ts
  - imports/server/googleScriptContent.ts
  - imports/server/methods/configureCollectGoogleAccountIds.ts
  - imports/server/methods/configureEnsureGoogleScript.ts
  - imports/server/methods/configureGoogleOAuthClient.ts
  - imports/server/methods/configureGoogleScriptUrl.ts
  - imports/server/methods/configureGdriveCreds.ts
  - imports/server/methods/configureGdriveTemplates.ts
  - imports/server/methods/configureOrganizeGoogleDrive.ts
  - imports/server/methods/configureS3ImageBucket.ts
  - imports/server/methods/createDocumentImageUpload.ts
  - imports/server/methods/ensurePuzzleDocument.ts
  - imports/server/methods/insertDocumentImage.ts
  - imports/server/methods/linkUserGoogleAccount.ts
  - imports/server/methods/listDocumentSheets.ts
  - imports/server/methods/unlinkUserGoogleAccount.ts
  - imports/server/models/DriveActivityLatests.ts
  - imports/server/setup.ts
  - private/google-script/main.js
updated: 2025-12-22
---

# Google Drive Integration

Google Drive is a core part of the collaboration model for Jolly Roger, and as
such we've built a fairly deep integration with the service over time. This
integration includes:

- Allowing users to link their Google accounts to their Jolly Roger accounts and
  log in using them
- Creating files (documents and spreadsheets) in Google Drive whose lifecycles
  are tied to the lifecycles of their associated puzzles
- Using Google Drive's permissioning model to prevent users from appearing as
  "Anonymous Animals" without letting them take destructive actions
- Polling for recent edit activity on files and storing that data to surface as
  an indicator of how "hot" a given puzzle is
- An out-of-band mechanism for adding images to a Google Spreadsheet, since the
  native UI does not work when Google Sheets is presented in an iframe

While they are all interconnected, we'll attempt to look at each separately.

## Google OAuth

While Jolly Roger does not use Meteor's native OAuth-based login (provided by
the `accounts-google` package), it does leverage Meteor's built-in support for
OAuth, including via Google. Users can link a Google account to their Jolly
Roger account, either by manually linking it on their profile page (the
`GoogleLinkBlock` React component and the `linkUserGoogleAccount` and
`unlinkUserGoogleAccount` Meteor methods) or by creating an account from an
invite link using our Jolly Roger-specific Google-based user authentication flow
(`useGoogleSignInCredentialsField` and the call to
`Accounts.registerLoginHandler` in `imports/server/accounts.ts`). Either way,
once an account is linked, that account can be used for subsequent logins.

Because we use Meteor's built-in OAuth support, OAuth application credentials
are stored in `ServiceConfiguration` (see the `configureGoogleOAuthClient`
Meteor method) instead of the `Settings` model, which we use for all other
configuration related to Google integrations. This is handled by the
`GoogleLinkBlock` React component and the `linkUserGoogleAccount` and
`unlinkUserGoogleAccount` Meteor methods.

In addition to the OAuth application (used for user authentication), Jolly Roger
requires a regular Google account, linked via the `configureGdriveCreds` Meteor
method. (We describe this as a "service user", but we do not utilize Google
Cloud's support for service accounts). Although the credentials are referred to
as being for "Drive", in practice they are used to authenticate all actions
taken directly by Jolly Roger (including interfacing with the Drive, Drive
Activity and Script APIs).

On the server side, `imports/server/googleClientRefresher.ts` is responsible for
monitoring changes to various Google-related settings and ensuring that we
always have a Google API client initiated with valid credentials for the service
account (assuming such credentials are available). It exports that client for
consumption by other code.

## File lifecycle

Jolly Roger interacts with the Google Drive API via `imports/server/gdrive.ts`,
which exports a number of wrapper functions providing higher level abstractions
for the rest of the app.

The `ensureHuntFolder` function in `imports/server/gdrive.ts` creates a
dedicated folder for each hunt, primarily to support our permission model (see
below), but also to keep the service user's Google Drive slightly organized. The
resulting folder IDs are tracked in the `HuntFolders` model, making
`ensureHuntFolder` idempotent without spamming the Google APIs and caching the
ID for subsequent use. The function is called before any operation that requires
the folder to be present, but the expectation is that it will only actually do
anything when it's called as part of hunt creation.

Similarly, the `ensureDocument` function creates either a spreadsheet or
document to go with a puzzle, tracked in the `Documents` collection (which,
unlike `HuntFolders`, is published to clients). If Jolly Roger is configured
with a template document or spreadsheet (`configureGdriveTemplates`), new
documents are created as copies of those templates rather than from whole cloth.
As with `ensureHuntFolder`, this is called before operations that requires the
doc but is primarily expected to take action when a new puzzle is created.

Since the document is a core part of the Jolly Roger experience, clients can
also call `ensureDocument` via the `ensurePuzzleDocument` Meteor method, which
they call on loading a puzzle page. In order to prevent thundering herds of
creation attempts, when creating a new puzzle, the document is created *before*
saving the puzzle to MongoDB, so that once clients discover the new puzzle, the
document should already be present.

Both folders and documents are renamed when the hunt or puzzle (respectively) is
renamed.

## File permissions

There are a few design goals that influenced how we manage permissions on Google
Drive resources:

- Allow users to edit files for hunts they are a part of, even if they have not
  linked a Google account.
- If possible, avoid users showing up as ["Anonymous
  Animals"][anonymous animals] and attribute their write activity to them.
- Prevent users from being able to delete or move files (accidentally or
  otherwise).
- Avoid various quotas and rate limits imposed by Google. This includes an
  overall rate limit on API calls (of around 3 per second) and an apparent
  "flood limit" on creating a high number of shares in a short time frame.

Our current system seems to largely accomplish these goals. We still
occasionally trigger rate limits when onboarding a large group of people
simultaneously, but we can generally still recover from this because of our
just-in-time verification and initialization logic.

To satisfy the first requirement, we grant the writer permission to "anyone" on
each file. (This is the equivalent of the "Anyone on the internet with the link
can edit" setting). This is the only permission we set on individual files and
the only place we grant any full writer permissions. When a puzzle is deleted,
we remove this permission to make the corresponding file read-only.

Since all files for a hunt live in a shared folder, we grant permissions on that
folder to any Google accounts linked to hunt members. Doing this once per folder
instead of once per puzzle avoids needing to call the create permissions API
once per puzzle per user, which would reliably result in rate limiting. Granting
_any_ permission on a folder is sufficient to prevent Anonymous Animals on files
in that folder. The "commenter" permission also results in edits being
attributed to that user in the Drive Activity API (instead of the file's owner),
while also preventing the user from being able to move or delete the files
themselves.

These permissions are granted by the `ensureHuntFolderPermission` function in
`imports/server/gdrive.ts`, which in turn is called when a user is added to a
new hunt (`addUserToHunt`), when they link a new Google account
(`linkUserGoogleAccount`), or when they open a puzzle page (`ensureDocument`).

Any time we successfully grant a user access to a hunt folder, we keep a flag
record in the `FolderPermissions` model. This allows us to make permissions
grants idempotent without needing additional API requests. This allows us to be
resilient both to transient issues and rate limiting from Google's APIs and
changes in state of the various circuit breaker feature flags covering the
Google Drive integration, while also being proactive about ensuring the correct
permissions are in place.

## Activity tracking

Edits on Google Drive files are a key indicator of solving activity on a puzzle,
so we collect activity data using the [Drive Activity API][]. The server runs a
loop in the background to periodically fetch activity data
(`imports/server/gdriveActivityFetcher.ts`).

The Drive Activity API lacks any way to request "records we haven't already
seen", so instead we filter based on timestamp. We store the most recent
timestamp we've observed in the `DriveActivityLatests` model (which only
contains a single record). Activity is tracked in the `DocumentActivities`
model, with a separate record per user so that we can deduplicate a single user
acting across Google Drive, voice calls, and Jolly Roger chat in the same time
bucket.

As a note, we experimented with using Google Drive watches (both
[drive][changes.watch] and [individual file][files.watch]), but found them to be
significantly lacking in functionality by comparison. Google Drive only sends
watch push notifications every 3 minutes and on a delay, giving us significantly
less granularity than we'd like. They also don't include any information about
who edited a file. Additionally, accepting incoming webhook requests from Google
Drive made development significantly more challenging, as it required some sort
of internet-accessible proxy.

## Image uploads

Inserting an image into a Google Sheet doesn't work when the sheet is loaded via
an iframe (due to Google's security policies). Since uploading images is a very
common part of the solving workflow, Jolly Roger includes its own out-of-band
flow for uploading images into a spreadsheet.

Inserting images into a document is not exposed via any of Google's standard
REST APIs, but it is supported via the Google Apps Script Spreadsheet service,
specifically via the [insertImage method][]. Google Apps Script projects can be
granted access to all of a user's (in our case, the service user's) spreadsheets
and can service anonymous HTTP requests. This gives us enough rope to create our
own HTTP API which can insert images into a Google Sheet.

The code for that API is kept in `private/google-script/main.js` (Google Apps
Script projects run on a [sandboxed Javascript runtime][V8]), and is published
as a [web app][Apps Script web app], meaning that the `doPost` global function
is the entrypoint for incoming requests. We use a JSON-RPC-style API, where all
requests are sent as a JSON-encoded `POST` request with top-level keys `secret`,
`method`, and `parameters`. The `secret` key is generated by the Jolly Roger
server and embedded into the Apps Script source code when the project is
created, and is used to authenticate Jolly Roger (since the Apps Script project
runs privileged and is otherwise internet-accessible). The code is written
extremely defensively, because uncaught exceptions in Apps Script result in very
unhelpful 500 errors.

Jolly Roger attempts to mostly manage the deployment of the Apps Script project,
both for simplicity for the user and because its usage of the API is pretty
tightly coupled to the current revision of the code. The
`configureEnsureGoogleScript` Meteor method creates the project if it doesn't
exist and updates it if it's out of date, storing the current status in
`Settings`. This method knows if the code is up to date based on a SHA256 of the
source code, calculated in `imports/server/googleScriptContent.ts`. However,
because the project needs to run authenticated as the Jolly Roger service user,
Jolly Roger itself can't fully deploy it as a web app. The setup page walks the
admin through doing this and getting the resulting endpoint URL, which is stored
using `configureGoogleScriptUrl`.

Because client code should only show the image upload flow if all of this
configuration is in place, the `googleScriptInfo` publication in
`imports/server/setup.ts` announces whether or not the script is fully
configured. (For admins, it also includes info about whether or not the script
is currently up to date, driving a reminder to update). Assuming it is
configured, the `InsertImage` React component drives inserting images on the
client side using the `listDocumentSheets` and `insertDocumentImage` Meteor
methods to front the API methods of our Google Apps Script project.

Finally, even though the [insertImage method][] supports uploading image data
directly, it has extremely stringent size limits (2 MB and one million pixels)
which proved prohibitive. So we ultimately introduced the option of hosting
uploaded image files in S3. AWS credentials must be provided via the environment
(or some other ambient configuration, such as the EC2 instance metadata
service), and the bucket to use is configured by `configureS3ImageBucket`.
Assuming that's configured, the `createDocumentImageUpload` Meteor method
generates a pre-signed AWS URL that can be used to upload images, which are then
inserted by URL. The `InsertImage` client-side flow still has fallback logic to
upload directly in the event that S3 is not configured.

## Utility Meteor methods

Finally, there are two utility Meteor methods introduced to aid in various
migrations from older versions of our Google integration.

First, `configureOrganizeGoogleDrive` ensures that the `HuntFolders` and
`Documents` match the directory structure in Google Drive that we expect. This
was originally intended to help migrate from older versions of Jolly Roger,
which put all documents in the root of the service user's Drive, but can also
perform general cleanup (or migration, if the configured root folder changes).

And second, `configureCollectGoogleAccountIds` attempts to backfill the
`googleAccountId` property on `Users`. Originally, Jolly Roger only captured the
email address of the Google account. However, the "other contacts" returned by
the Google People API also often (though not quite always) includes users that
have used Jolly Roger (either because of the OAuth link or because they've been
granted access on docs and folders owned by the Jolly Roger service user). This
method takes advantage of this fact to try and fully populate the property.

[anonymous animals]: https://support.google.com/docs/answer/2494888?visit_id=1-636184745566842981-35709989&hl=en&rd=1
[Drive Activity API]: https://developers.google.com/drive/activity/v2
[changes.watch]: https://developers.google.com/drive/api/v2/reference/changes/watch
[files.watch]: https://developers.google.com/drive/api/reference/rest/v2/files/watch
[insertImage method]: https://developers.google.com/apps-script/reference/spreadsheet/sheet#insertimageblobsource,-column,-row
[V8]: https://developers.google.com/apps-script/guides/v8-runtime
[Apps script web app]: https://developers.google.com/apps-script/guides/web
