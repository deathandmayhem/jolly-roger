---
files:
  - imports/client/lookupUrl.ts
  - imports/lib/models/BlobMappings.ts
  - imports/lib/publications/blobMappingsAll.ts
  - imports/server/assets.ts
  - imports/server/lookupUrl.ts
  - imports/server/models/Blobs.ts
  - imports/server/publications/blobMappingsAll.ts
updated: 2025-12-22
---

# Custom Asset Pipeline

Jolly Roger includes around a dozen versions of its logo, used as a mixture of
in-app branding and iconography for various platforms (favicons, etc.).
Administrators are able to override each of these images individually.

In designing the asset system, there were two primary goals:

- Make assets extremely cacheable, without needing to worry about cache
  invalidation.
- Ensure that customized content displays correctly on initial load, even before
  initial Meteor subscriptions load.

For cacheability, assets are served in a content-addressed manner, under the
`/asset/:asset` endpoint in `imports/server/assets.ts`; the `:asset` parameter
is the SHA256 of the image content. This endpoint serves both the default assets
included in Jolly Roger's source code (using Meteor's [Assets library][Meteor Assets]) and uploaded custom assets (which are stored content-addressed in the
`Blobs` modal). Either way, assets are served with Cache-Control headers that
make it clear that they can be cached forever (or as close to forever as
Cache-Control headers allow). In our standard production configuration, these
headers should be respected by nginx, allowing most asset requests to be
serviced without involving Meteor or a database lookup.

Customizations to a given named asset are tracked in the `BlobMappings`
collection, using the name of the asset as the `_id`. Absence of a record
indicates that the default asset should be used.

Ensuring that customized content appears correctly for server-side rendered
content (such as `site.webmanifest` for Android icons) is relatively
straightforward, as those renders do not need to be reactive. On the client, we
need to ensure that the data is available both at initial load time and
subsequently via a reactive subscription, in order to reflect updates.

To ensure that client-side contexts have access to blob mappings immediately at
load time, any records in `BlobMappings` are included in the initial page
rendering using Meteor's [runtime configuration hook][addRuntimeConfigHook].
Once the application JavaScript loads, the client subscribes to the
`BlobMappings` collection and uses the ready state of that subscription to
transition away from the load-time configuration. (This handoff is mediated in
the client implementation of `lookupUrl` (`imports/client/lookupUrl.ts`)

[Meteor Assets]: https://docs.meteor.com/api/assets.html
[addRuntimeConfigHook]: https://docs.meteor.com/packages/webapp.html#WebApp-addRuntimeConfigHook
