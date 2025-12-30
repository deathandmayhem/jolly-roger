import { Random } from "meteor/random";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Logger from "../../Logger";

type Crumb = {
  path: string;
  title: string;
};

type CrumbId = string;

type CrumbWithId = Crumb & {
  id: CrumbId;
};

type BreadcrumbSubscribeHandle = {
  unsubscribe: () => void;
};

type BreadcrumbSubscribeCallback = (crumbs: CrumbWithId[]) => void;

type BreadcrumbContextType = {
  addCrumb: (path: string, title: string) => CrumbId;
  removeCrumb: (crumbId: CrumbId) => void;
  updateCrumb: (crumbId: CrumbId, path: string, title: string) => void;
  subscribe: (
    listener: BreadcrumbSubscribeCallback,
  ) => BreadcrumbSubscribeHandle;
};

const defaultCallbacks: BreadcrumbContextType = {
  addCrumb: (_path: string, _title: string) => {
    return Random.id();
  },
  removeCrumb: (_crumbId: CrumbId) => {
    /* noop */
  },
  updateCrumb: (_crumbId: CrumbId, _path: string, _title: string) => {
    /* noop */
  },
  subscribe: (_listener: BreadcrumbSubscribeCallback) => {
    return {
      unsubscribe() {
        // noop
      },
    };
  },
};

const BreadcrumbContext =
  React.createContext<BreadcrumbContextType>(defaultCallbacks);

const byPathLength = (c1: CrumbWithId, c2: CrumbWithId) => {
  return c1.path.length - c2.path.length;
};

const BreadcrumbsProvider = ({ children }: { children: React.ReactNode }) => {
  const crumbsRef = useRef<CrumbWithId[]>([]);
  const listenersRef = useRef<((crumbs: CrumbWithId[]) => void)[]>([]);

  const addCrumb = useCallback((path: string, title: string) => {
    // Generate a new crumb ID, as this is a new crumb
    const crumbId = Random.id();
    const crumbWithId = {
      id: crumbId,
      path,
      title,
    };
    Logger.debug("Added crumb", { crumbId, title, path });
    crumbsRef.current = [...crumbsRef.current, crumbWithId];
    crumbsRef.current.sort(byPathLength);
    listenersRef.current.forEach((listener) => listener(crumbsRef.current));
    return crumbId;
  }, []);

  const removeCrumb = useCallback((crumbId: CrumbId) => {
    Logger.debug("Removing crumb", { crumbId });
    const crumbIndex = crumbsRef.current.findIndex((c) => c.id === crumbId);
    if (crumbIndex === undefined) {
      Logger.error("Attempted to remove breadcrumb but was not among crumbs", {
        error: new Error("Unable to find breadcrumb"),
        crumbId,
        crumbs: crumbsRef.current,
      });
      return;
    }

    const prevCrumbs = crumbsRef.current;
    const beforeRemoved = prevCrumbs.slice(0, crumbIndex);
    const afterRemoved = prevCrumbs.slice(crumbIndex + 1, prevCrumbs.length);
    crumbsRef.current = beforeRemoved.concat(afterRemoved);
    crumbsRef.current.sort(byPathLength);
    listenersRef.current.forEach((listener) => listener(crumbsRef.current));
  }, []);

  const updateCrumb = useCallback(
    (crumbId: CrumbId, path: string, title: string) => {
      Logger.debug("Updating crumb", { crumbId, title, path });
      const prevCrumbs = crumbsRef.current;
      const crumbIndex = prevCrumbs.findIndex((c) => c.id === crumbId);
      const newCrumbWithId = {
        id: crumbId,
        path,
        title,
      };

      const beforeUpdated = prevCrumbs.slice(0, crumbIndex);
      const afterUpdated = prevCrumbs.slice(crumbIndex + 1, prevCrumbs.length);
      crumbsRef.current = beforeUpdated
        .concat([newCrumbWithId])
        .concat(afterUpdated);
      crumbsRef.current.sort(byPathLength);

      Logger.debug("Updating subscribers", {
        count: listenersRef.current.length,
      });
      listenersRef.current.forEach((listener) => listener(crumbsRef.current));
    },
    [],
  );

  const subscribe = useCallback((listener: BreadcrumbSubscribeCallback) => {
    listenersRef.current.push(listener);
    listener(crumbsRef.current);

    return {
      unsubscribe() {
        const index = listenersRef.current.indexOf(listener);
        listenersRef.current.splice(index, 1);
      },
    };
  }, []);

  const providerCallbacks = useMemo(
    () => ({
      addCrumb,
      removeCrumb,
      updateCrumb,
      subscribe,
    }),
    [addCrumb, removeCrumb, updateCrumb, subscribe],
  );

  return (
    <BreadcrumbContext.Provider value={providerCallbacks}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

function useBreadcrumb(crumb: Crumb): void {
  Logger.debug("useBreadcrumb", crumb);
  const ctx = useContext<BreadcrumbContextType>(BreadcrumbContext);
  const crumbId = useRef<string | null>(null);

  const { addCrumb, removeCrumb, updateCrumb } = ctx;

  useEffect(() => {
    if (crumbId.current === null) {
      crumbId.current = addCrumb(crumb.path, crumb.title);
    } else {
      updateCrumb(crumbId.current, crumb.path, crumb.title);
    }
  }, [addCrumb, updateCrumb, crumb.path, crumb.title]);

  useEffect(() => {
    return () => {
      if (crumbId.current) {
        removeCrumb(crumbId.current);
        crumbId.current = null;
      }
    };
  }, [removeCrumb]);
}

const useBreadcrumbItems = () => {
  const subscriptionRef = useRef<BreadcrumbSubscribeHandle | undefined>(
    undefined,
  );
  const [crumbs, setCrumbs] = useState<CrumbWithId[]>([]);
  const ctx = useContext(BreadcrumbContext);
  const { subscribe } = ctx;

  useEffect(() => {
    subscriptionRef.current = subscribe(setCrumbs);
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [subscribe]);

  return crumbs;
};

export { type Crumb, BreadcrumbsProvider, useBreadcrumb, useBreadcrumbItems };
