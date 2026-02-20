import type { Meteor } from "meteor/meteor";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faFileAlt } from "@fortawesome/free-solid-svg-icons/faFileAlt";
import { faTable } from "@fortawesome/free-solid-svg-icons/faTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { DocumentType } from "../../lib/models/Documents";

// Google Sheets steals focus during initialization. The number of times
// depends on the browser engine: Chromium does it twice, Firefox once, and
// Safari not at all (it blocks cross-origin iframe focus stealing).
const EXPECTED_FOCUS_STEALS = (() => {
  const ua = navigator.userAgent;
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 0;
  if ("userAgentData" in navigator) return 2; // Chromium-based
  return 1; // Firefox and others
})();

interface DocumentDisplayProps {
  document: DocumentType;
  displayMode: "link" | "embed";
  user: Meteor.User;
}

const StyledDeepLink = styled.a`
  display: inline-block;
  font-weight: bold;
  white-space: nowrap;
`;

const StyledIframe = styled.iframe`
  /* Workaround for unusual sizing behavior of iframes in iOS Safari:
   * Width and height need to be specified in absolute values then adjusted by min and max */
  width: 0;
  height: 0;
  min-width: 100%;
  max-width: 100%;
  min-height: 100%;
  max-height: 100%;
  position: absolute;
  inset: 0;
  border: 0;
  padding-bottom: env(safe-area-inset-bottom, 0);
  background-color: #f1f3f4;
`;

const FocusGuard = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 15%);
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 500;
  user-select: none;
`;

const FocusGuardLabel = styled.span`
  background: rgb(255 255 255 / 85%);
  padding: 0.4em 0.8em;
  border-radius: 0.3em;
  color: #333;
`;

export const DocumentMessage = styled.span`
  display: block;
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => theme.colors.documentMessageBackground};
`;

const GoogleDocumentDisplay = ({
  document,
  displayMode,
  user,
}: DocumentDisplayProps) => {
  const isSpreadsheet = document.value.type === "spreadsheet";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastFocusedRef = useRef<Element | null>(null);
  const [focusGuarded, setFocusGuarded] = useState(
    isSpreadsheet && EXPECTED_FOCUS_STEALS > 0,
  );
  const lastStolenAtRef = useRef<number | undefined>(undefined);

  // While the focus guard overlay is up, poll activeElement and restore focus
  // when Sheets steals it. The overlay prevents user clicks from reaching the
  // iframe, so any focus steal we detect is programmatic. We auto-dismiss
  // after countering EXPECTED_FOCUS_STEALS, or after a quiet period following
  // an iframe load (as a fallback). The user can also click the overlay to
  // dismiss early.
  useEffect(() => {
    if (!focusGuarded) return undefined;

    const QUIET_PERIOD_MS = 3_000;

    let rafId: number;
    let stealCount = 0;

    const poll = () => {
      if (
        stealCount >= EXPECTED_FOCUS_STEALS ||
        (lastStolenAtRef.current !== undefined &&
          Date.now() - lastStolenAtRef.current > QUIET_PERIOD_MS)
      ) {
        setFocusGuarded(false);
        return;
      }

      const active = window.document.activeElement;
      if (active === iframeRef.current) {
        stealCount += 1;
        lastStolenAtRef.current = Date.now();
        if (lastFocusedRef.current instanceof HTMLElement) {
          lastFocusedRef.current.focus();
        } else {
          iframeRef.current?.blur();
        }
      } else if (active && active !== window.document.body) {
        lastFocusedRef.current = active;
      }

      rafId = requestAnimationFrame(poll);
    };

    // If a steal happened while the tab was hidden, RAF wasn't running to
    // detect it. When the tab becomes visible again, check if the iframe has
    // focus and dismiss the guard if so.
    const onVisibilityChange = () => {
      if (
        window.document.visibilityState === "visible" &&
        window.document.activeElement === iframeRef.current
      ) {
        setFocusGuarded(false);
      }
    };

    window.document.addEventListener("visibilitychange", onVisibilityChange);
    rafId = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(rafId);
      window.document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
    };
  }, [focusGuarded]);

  const dismissFocusGuard = useCallback(() => {
    setFocusGuarded(false);
  }, []);

  const onFocusGuardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFocusGuarded(false);
    }
  }, []);

  const onIframeLoad = useCallback(() => {
    lastStolenAtRef.current ??= Date.now();
  }, []);

  let url: string;
  let title: string;
  let icon: IconDefinition;
  // If the user has linked their Google account, try to force usage of that specific account.
  // Otherwise, they may open the document anonymously. If the user isn't signed in, they will be
  // redirected to the default account in their browser session anyway.
  const authUserParam = user.googleAccount
    ? `authuser=${user.googleAccount}&`
    : "";
  switch (document.value.type) {
    case "spreadsheet":
      url = `https://docs.google.com/spreadsheets/d/${document.value.id}/edit?${authUserParam}ui=2&rm=embedded&gid=0#gid=0`;
      title = "Sheet";
      icon = faTable;
      break;
    case "document":
      url = `https://docs.google.com/document/d/${document.value.id}/edit?${authUserParam}ui=2&rm=embedded#gid=0`;
      title = "Doc";
      icon = faFileAlt;
      break;
    default:
      return (
        <DocumentMessage>
          Don&apos;t know how to link to a document of type{" "}
          {document.value.type}
        </DocumentMessage>
      );
  }

  switch (displayMode) {
    case "link":
      return (
        <StyledDeepLink href={url} target="_blank" rel="noreferrer noopener">
          <FontAwesomeIcon icon={icon} /> <span>{title}</span>
        </StyledDeepLink>
      );
    case "embed":
      /* To workaround iOS Safari iframe behavior, scrolling should be "no" */
      return (
        <>
          <StyledIframe
            ref={iframeRef}
            title="document"
            src={url}
            onLoad={onIframeLoad}
          />
          {focusGuarded && (
            <FocusGuard
              role="button"
              tabIndex={0}
              onClick={dismissFocusGuard}
              onKeyDown={onFocusGuardKeyDown}
            >
              <FocusGuardLabel>
                Click to interact with spreadsheet
              </FocusGuardLabel>
            </FocusGuard>
          )}
        </>
      );
    default:
      return (
        <DocumentMessage>Unknown displayMode {displayMode}</DocumentMessage>
      );
  }
};

const DocumentDisplay = ({
  document,
  displayMode,
  user,
}: DocumentDisplayProps) => {
  switch (document.provider) {
    case "google":
      return (
        <GoogleDocumentDisplay
          document={document}
          displayMode={displayMode}
          user={user}
        />
      );
    default:
      return (
        <DocumentMessage>
          Unable to display document from provider {document.provider}
        </DocumentMessage>
      );
  }
};

export default DocumentDisplay;
