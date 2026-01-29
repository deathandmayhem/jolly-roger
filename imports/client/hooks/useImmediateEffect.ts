import type { EffectCallback } from "react";
import { useEffect, useRef } from "react";

function depsDiffer<T>(deps1?: T[], deps2?: T[]) {
  return !(
    Array.isArray(deps1) &&
    Array.isArray(deps2) &&
    deps1.length === deps2.length &&
    deps1.every((dep, idx) => Object.is(dep, deps2[idx]))
  );
}

export default function useImmediateEffect<T>(
  effectBody: EffectCallback,
  deps?: T[],
) {
  const cleanupRef = useRef<ReturnType<EffectCallback>>(undefined);
  const depsRef = useRef<T[] | undefined>(undefined);

  if (!depsRef.current || depsDiffer(depsRef.current, deps)) {
    depsRef.current = deps;
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    cleanupRef.current = effectBody();
  }

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);
}
