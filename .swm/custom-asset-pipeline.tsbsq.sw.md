---
id: tsbsq
title: Custom Asset Pipeline
file_version: 1.1.2
app_version: 1.3.7
---

Jolly Roger includes around a dozen versions of its logo, used as a mixture of in-app branding and iconography for various platforms (favicons, etc.). Administrators are able to override each of these images individually.

In designing the asset system, there were two primary goals:

*   Make assets extremely cacheable, without needing to worry about cache invalidation.
    
*   Ensure that customized content displays correctly on initial load, even before initial Meteor subscriptions load.

<br/>

For cacheability, assets are served in a content-addressed manner, under the `/asset/:asset`; the `:asset` parameter is the SHA256 of the image content:
<!-- NOTE-swimm-snippet: the lines below link your snippet to Swimm -->
### 📄 imports/server/assets.ts
```typescript
104      const blob = dbAssets.get(req.params.asset) ?? defaultAssets.get(req.params.asset);
105      if (blob) {
106        const buff = Buffer.from(blob.value);
107        res.statusCode = 200;
108        res.setHeader('ETag', blob.md5);
109        res.setHeader('Content-Type', blob.mimeType);
110        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
111        res.send(buff);
112        res.end();
113        return;
114      }
```

<br/>

This endpoint serves both the default assets included in Jolly Roger's source code (using Meteor's [Assets library](https://docs.meteor.com/api/assets.html)) and uploaded custom assets (which are stored content-addressed in the `Blobs`<swm-token data-swm-token=":imports/server/models/Blobs.ts:19:2:2:`const Blobs = new Model(&#39;jr_blobs&#39;, Blob, z.string().regex(/^[a-fA-F0-9]{64}$/));`"/> modal). Either way, assets are served with Cache-Control headers that make it clear that they can be cached forever (or as close to forever as Cache-Control headers allow). In our standard production configuration, these headers should be respected by nginx, allowing most asset requests to be serviced without involving Meteor or a database lookup.

Customizations to a given named asset are tracked in the `BlobMappings`<swm-token data-swm-token=":imports/lib/models/BlobMappings.ts:12:2:2:`const BlobMappings = new Model(&#39;jr_blob_mappings&#39;, BlobMapping, nonEmptyString);`"/> collection, using the name of the asset as the `_id`. Absence of a record indicates that the default asset should be used.

<br/>

Ensuring that customized content appears correctly for server-side rendered content (such as `site.webmanifest` for Android icons) is relatively straightforward, as those renders do not need to be reactive. These use the server implementation of `lookupUrl`<swm-token data-swm-token=":imports/server/lookupUrl.ts:3:6:6:`export default function lookupUrl(image: string) {`"/> .
<!-- NOTE-swimm-snippet: the lines below link your snippet to Swimm -->
### 📄 imports/server/lookupUrl.ts
```typescript
3      export default function lookupUrl(image: string) {
4        const mapping = cachedDBMappings.get(image) ?? defaultMappings.get(image);
5        return `/asset/${mapping}`;
6      }
```

<br/>

On the client, we need to ensure that the data is available both at initial load time and subsequently via a reactive subscription, in order to reflect updates.

<br/>

To ensure that client-side contexts have access to blob mappings immediately at load time, any records in `BlobMappings`<swm-token data-swm-token=":imports/lib/models/BlobMappings.ts:12:2:2:`const BlobMappings = new Model(&#39;jr_blob_mappings&#39;, BlobMapping, nonEmptyString);`"/> are included in the initial page rendering using Meteor's [runtime configuration hook](https://docs.meteor.com/packages/webapp.html#WebApp-addRuntimeConfigHook). Once the application JavaScript loads, the client subscribes to the `BlobMappings`<swm-token data-swm-token=":imports/lib/models/BlobMappings.ts:12:2:2:`const BlobMappings = new Model(&#39;jr_blob_mappings&#39;, BlobMapping, nonEmptyString);`"/> collection and uses the ready state of that subscription to transition away from the load-time configuration. This handoff is mediated in the client implementation of `lookupUrl`<swm-token data-swm-token=":imports/client/lookupUrl.ts:13:6:6:`export default function lookupUrl(image: string) {`"/>:
<!-- NOTE-swimm-snippet: the lines below link your snippet to Swimm -->
### 📄 imports/client/lookupUrl.ts
```typescript
5      const blobMappingsSub = typedSubscribe(blobMappingsAll);
6      
7      // A convenience function for the most common usage pattern of looking up the
8      // url for a particular image asset. This always checks the Mongo record first
9      // (to create a reactive dependency), but if we haven't fully loaded the
10     // subscription yet, we'll fall back to checking the runtime config embedded in
11     // the page load. Finally, if neither has a custom image mapping, fall back to
12     // the static default images.
13     export default function lookupUrl(image: string) {
14       let mapping = BlobMappings.findOne(image)?.blob;
15       if (!blobMappingsSub.ready()) {
16         mapping ||= __meteor_runtime_config__.blobMappings?.[image];
17       }
18       mapping ||= __meteor_runtime_config__.defaultBlobMappings[image];
19       return `/asset/${mapping}`;
20     }
```

<br/>

This file was generated by Swimm. [Click here to view it in the app](https://app.swimm.io/repos/Z2l0aHViJTNBJTNBam9sbHktcm9nZXIlM0ElM0FkZWF0aGFuZG1heWhlbQ==/docs/tsbsq).
