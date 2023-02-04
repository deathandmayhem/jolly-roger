export const hooks = new Set<() => Promise<void>>();

// runIfLatestBuild registers a hook which runs on server startup, but only if
// this is the most recent build timestamp that we've observed (otherwise the
// hook is skipped)
export default function runIfLatestBuild(fn: () => Promise<void>) {
  hooks.add(fn);
}
