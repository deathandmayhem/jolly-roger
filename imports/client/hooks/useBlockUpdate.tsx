import { Reload } from "meteor/reload";

import React, { useContext, useEffect, useRef, useState } from "react";

// BlockHandle is basically used as a sentinel object, generated for each
// invocation of useBlockUpdate to ensure that we track it consistently as the
// invoker re-renders
type BlockHandle = Record<string, never>;

type BlockStatus = [blocked: boolean, reasons: string[]];
type BlockSubscriber = (status: BlockStatus) => void;

class BlockManager {
  private blockers: Map<BlockHandle, string | undefined> = new Map();

  private subscribers: Set<BlockSubscriber> = new Set();

  private unblock?: () => void;

  isBlocked() {
    return [...this.blockers.values()].some(Boolean);
  }

  checkUnblocked() {
    if (!this.isBlocked()) {
      this.unblock?.();
      this.unblock = undefined;
    }
  }

  onMigrate(retry: () => void) {
    if (this.isBlocked()) {
      this.unblock = retry;
      this.updateSubscribers();
      return [false] as const;
    }
    return [true] as const;
  }

  updateBlocker(blocker: BlockHandle, reason: string | undefined) {
    this.blockers.set(blocker, reason);
    this.checkUnblocked();
    this.updateSubscribers();
  }

  clearBlocker(blocker: BlockHandle) {
    this.blockers.delete(blocker);
    this.checkUnblocked();
    this.updateSubscribers();
  }

  updateSubscribers() {
    const pendingUpdate = !!this.unblock;
    const reasons = [...this.blockers.values()].filter<string>(
      (b): b is string => !!b,
    );
    this.subscribers.forEach((s) => s([pendingUpdate, reasons]));
  }

  subscribe(subscriber: BlockSubscriber) {
    this.subscribers.add(subscriber);
  }

  unsubscribe(subscriber: BlockSubscriber) {
    this.subscribers.delete(subscriber);
  }
}

const blockManager = new BlockManager();
Reload._onMigrate((retry, { immediateMigration }) => {
  if (immediateMigration) {
    // no point in stalling
    return [true];
  }

  return blockManager.onMigrate(retry);
});

const BlockUpdateContext = React.createContext(blockManager);

const useBlockUpdate = (reason: string | undefined) => {
  const ctx = useContext(BlockUpdateContext);
  const blocker = useRef<BlockHandle>({});

  useEffect(() => {
    ctx.updateBlocker(blocker.current, reason);
  }, [reason, ctx]);

  // Only remove blocker when unmounted
  useEffect(() => {
    const { current } = blocker;
    return () => {
      ctx.clearBlocker(current);
    };
  }, [ctx]);
};

export default useBlockUpdate;

const useBlockReasons = (): BlockStatus => {
  const ctx = useContext(BlockUpdateContext);
  const [status, setStatus] = useState<BlockStatus>([false, []]);
  useEffect(() => {
    ctx.subscribe(setStatus);
    return () => {
      ctx.unsubscribe(setStatus);
    };
  }, [ctx]);

  return status;
};

export { useBlockReasons };
