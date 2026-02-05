import type React from "react";
import { createContext, useContext } from "react";

const BootstrapScopeContext = createContext<
  React.RefObject<HTMLDivElement | null> | undefined
>(undefined);

export const BootstrapScopeProvider = BootstrapScopeContext.Provider;

export function useBootstrapContainer(): HTMLElement {
  const ref = useContext(BootstrapScopeContext);
  return ref?.current ?? document.body;
}
