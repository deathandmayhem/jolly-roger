import TypedPublication from './TypedPublication';

// Publish pending guesses enriched with puzzle and hunt. This is a dedicated
// publish because every operator needs this information for the notification
// center, and without assistance they need an overly broad subscription to the
// related collections
//
// Note that there's no restriction on this sub, beyond being logged in. This is
// safe because we won't publish guesses for hunts for which you're not an
// operator. However, most clients aren't expected to subscribe to it, because
// we check on the client if they're an operator for any hunt before making the
// subscription. Doing this on the client means we can make it a reactive
// computation, whereas if we used a permissions check on the server to
// short-circuit the sub, we could not.
export default new TypedPublication<void>(
  'Guesses.publications.pendingForSelf'
);
