// Servers disappearing should be a fairly rare occurrence, so it's
// OK for the timeouts here to be generous. Servers get 120 seconds
// to update before their records are GC'd. Should be long enough to
// account for transients
export const gracePeriod = 120 * 1000;

// Servers will attempt to refresh their liveness once every 15-30 seconds.
export const refreshIntervalBase = 15000;
