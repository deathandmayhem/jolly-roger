import TypedPublication from './TypedPublication';

// Note that this could be a default publication, but our client-side
// implementation of `lookupUrl` wants to know when this has loaded, which means
// we need an explicit subscription
export default new TypedPublication<void>(
  'BlobMappings.publications.all'
);
