/* eslint-disable no-console */
import { Random } from 'meteor/random';
import React, {
  useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import useImmediateEffect from './useImmediateEffect';

type Crumb = {
  path: string;
  title: string;
}

type CrumbId = string

type CrumbWithId = Crumb & {
  id: CrumbId;
}

type BreadcrumbSubscribeHandle = {
  unsubscribe: () => void;
}

type BreadcrumbSubscribeCallback = (crumbs: CrumbWithId[]) => void;

type BreadcrumbContextType = {
  addCrumb: (crumb: Crumb) => CrumbId;
  removeCrumb: (crumbId: CrumbId) => void;
  updateCrumb: (crumbId: CrumbId, crumb: Crumb) => void;
  flushUpdates: () => void;
  subscribe: (listener: BreadcrumbSubscribeCallback) => BreadcrumbSubscribeHandle;
}

const defaultCallbacks: BreadcrumbContextType = {
  addCrumb: (_crumb: Crumb) => { return Random.id(); },
  removeCrumb: (_crumbId: CrumbId) => { },
  updateCrumb: (_crumbId: CrumbId, _crumb: Crumb) => { },
  flushUpdates: () => { },
  subscribe: (_listener: BreadcrumbSubscribeCallback) => {
    return {
      unsubscribe() {
      },
    };
  },
};

const BreadcrumbContext = React.createContext<BreadcrumbContextType>(defaultCallbacks);

const BreadcrumbsProvider = ({ children }: { children: React.ReactNode }) => {
  const crumbsRef = useRef<CrumbWithId[]>([]);
  const listenersRef = useRef<((crumbs: CrumbWithId[]) => void)[]>([]);

  const flushUpdates = useCallback(() => {
    listenersRef.current.forEach((listener) => listener(crumbsRef.current));
  }, []);

  const addCrumb = useCallback((crumb: Crumb) => {
    // Generate a new crumb ID, as this is a new crumb
    const crumbId = Random.id();
    const crumbWithId = {
      id: crumbId,
      title: crumb.title,
      path: crumb.path,
    };
    // console.log(`added crumb ${crumbId} title: ${crumb.title} path: ${crumb.path}`);
    crumbsRef.current = [...crumbsRef.current, crumbWithId];

    // We need to defer the breadcrumb update flushes until we're no longer
    // rendering other components, since `addCrumb` gets called on initial
    // render.  `useBreadcrumb` calls `addCrumb` immediately, and triggers a
    // flush to run during effect time.  So we don't dispatch the listeners,
    // and instead rely on the caller to call `flushUpdates()` later, once we're
    // into the effects phase.

    return crumbId;
  }, []);

  const removeCrumb = useCallback((crumbId: CrumbId) => {
    // console.log(`removing crumb ${crumbId}`);
    const crumbIndex = crumbsRef.current.findIndex((c) => c.id === crumbId);
    if (crumbIndex === undefined) {
      console.error(`requested to remove crumb ID ${crumbId} but didn't find it among crumbs?`);
      return;
    }

    const prevCrumbs = crumbsRef.current;
    const beforeRemoved = prevCrumbs.slice(0, crumbIndex);
    const afterRemoved = prevCrumbs.slice(crumbIndex + 1, prevCrumbs.length);
    crumbsRef.current = beforeRemoved.concat(afterRemoved);
    // removeCrumb runs in the useEffect cleanup phase, so it's safe to dispatch listeners
    listenersRef.current.forEach((listener) => listener(crumbsRef.current));
  }, []);

  const updateCrumb = useCallback((crumbId: CrumbId, crumb: Crumb) => {
    // console.log(`updating crumb ${crumbId} to title: ${crumb.title} path: ${crumb.path}`);
    const prevCrumbs = crumbsRef.current;
    const crumbIndex = prevCrumbs.findIndex((c) => c.id === crumbId);
    const newCrumbWithId = {
      id: crumbId,
      title: crumb.title,
      path: crumb.path,
    };

    const beforeUpdated = prevCrumbs.slice(0, crumbIndex);
    const afterUpdated = prevCrumbs.slice(crumbIndex + 1, prevCrumbs.length);
    crumbsRef.current = beforeUpdated.concat([newCrumbWithId]).concat(afterUpdated);

    // updateCrumb is run from an effect phase, so we can immediately dispatch listeners.
    listenersRef.current.forEach((listener) => listener(crumbsRef.current));
  }, []);

  const subscribe = useCallback((listener: BreadcrumbSubscribeCallback) => {
    listenersRef.current.push(listener);
    listener(crumbsRef.current);

    return {
      unsubscribe() {
        const index = listenersRef.current.findIndex((l) => l === listener);
        listenersRef.current.splice(index, 1);
      },
    };
  }, []);

  const providerCallbacks = useMemo(() => ({
    addCrumb,
    removeCrumb,
    updateCrumb,
    flushUpdates,
    subscribe,
  }), [addCrumb, removeCrumb, updateCrumb, flushUpdates, subscribe]);

  return (
    <BreadcrumbContext.Provider value={providerCallbacks}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

function useBreadcrumb(crumb: Crumb): void {
  const ctx = useContext<BreadcrumbContextType>(BreadcrumbContext);
  const crumbId = useRef<string | null>(null);
  const firstRender = useRef<boolean>(true);

  const {
    addCrumb, removeCrumb, updateCrumb, flushUpdates,
  } = ctx;

  useImmediateEffect(() => {
    crumbId.current = addCrumb(crumb);
    // console.log(`mount ${crumbId.current}`);

    return () => {
      if (crumbId.current) {
        // console.log(`unmount ${crumbId.current}`);
        removeCrumb(crumbId.current);
        crumbId.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      // On first render, trigger a flush of the crumbs, since `addCrumb` has
      // to run immediately (to preserve breadcrumb mount order), but the
      // setState it will trigger can't run during the render phase.
      flushUpdates();
    }
  }, [flushUpdates]);

  useEffect(() => {
    if (crumbId.current) {
      // console.log(`update ${crumbId.current}`);
      updateCrumb(crumbId.current, crumb);
    }
  }, [updateCrumb, crumb]);
}

const useBreadcrumbItems = () => {
  const subscriptionRef = useRef<BreadcrumbSubscribeHandle | undefined>(undefined);
  const [crumbs, setCrumbs] = useState<CrumbWithId[]>([]);
  const ctx = useContext(BreadcrumbContext);
  useImmediateEffect(() => {
    subscriptionRef.current = ctx.subscribe(setCrumbs);
  }, []);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return crumbs;
};

export {
  Crumb, BreadcrumbsProvider, useBreadcrumb, useBreadcrumbItems,
};
