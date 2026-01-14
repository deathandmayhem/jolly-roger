import classnames from "classnames";
import React, {
  type PointerEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styled, { css } from "styled-components";

const SplitPaneMinusDiv = styled.div<{ $split: "horizontal" | "vertical" }>`
  display: flex;
  flex: 1;
  height: 100%;
  position: absolute;
  outline: none;
  overflow: hidden;
  user-select: text;

  ${({ $split }) =>
    $split === "vertical" &&
    css`
      flex-direction: row;
      left: 0;
      right: 0;
    `}

  ${({ $split }) =>
    $split === "horizontal" &&
    css`
      bottom: 0;
      flex-direction: column;
      min-height: 100%;
      top: 0;
      width: 100%;
    `}

  &.dragging {
    &::after {
      /* Throw an overlay over iFrames during drag to capture mouse events.
         Works in Chrome and Safari but not Firefox for some reason */
      content: "";
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2002;
    }

    &::before {
      /* Kludge that makes it work in Firefox.
         Amazingly, the above part actually works for iframes outside of the SplitPane,
         so we're covered everywhere. */
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2003;
    }
  }
`;

const PaneDiv = styled.div`
  flex: 1;
  position: relative;
  outline: none;
  inset: 0;

  & > * {
    position: absolute;
    inset: 0;
  }
`;

const ResizerSpan = styled.span<{
  $split: "horizontal" | "vertical";
  $allowResize: boolean;
}>`
  background: #6c757d; /* was $gray-600 from bootstrap */
  z-index: 1;
  box-sizing: border-box;
  background-clip: padding-box;

  &:hover {
    transition: border 0.8s ease;
  }

  ${({ $split, $allowResize }) =>
    $split === "horizontal" &&
    css`
      height: 11px;
      margin: -5px 0;
      border-top: 5px solid rgb(255 255 255 / 0%);
      border-bottom: 5px solid rgb(255 255 255 / 0%);
      width: 100%;

      ${
        $allowResize &&
        css`
        cursor: row-resize;

        &:hover {
          border-top: 5px solid rgb(0 0 0 / 10%);
          border-bottom: 5px solid rgb(0 0 0 / 10%);
        }
      `
      }
    `}

  ${({ $split, $allowResize }) =>
    $split === "vertical" &&
    css`
      width: 11px;
      margin: 0 -5px;
      border-left: 5px solid rgb(255 255 255 / 0%);
      border-right: 5px solid rgb(255 255 255 / 0%);
      height: 100%;

      ${
        $allowResize &&
        css`
        cursor: col-resize;

        &:hover {
          border-left: 5px solid rgb(0 0 0 / 10%);
          border-right: 5px solid rgb(0 0 0 / 10%);
        }
      `
      }
    `}
`;

const Pane = ({
  children,
  split,
  size,
  eleRef,
  style: styleProps,
}: {
  children: React.ReactNode;
  split: "vertical" | "horizontal";
  size?: number | undefined;
  style?: React.CSSProperties;
  eleRef: React.MutableRefObject<HTMLDivElement | null>;
}) => {
  const style: React.CSSProperties = {};
  if (size !== undefined) {
    if (split === "vertical") {
      style.width = size;
    } else {
      style.height = size;
      style.display = "flex";
    }
    style.flex = "none";
  }

  const finalStyle = { ...style, ...(styleProps ?? {}) };

  return (
    <PaneDiv ref={eleRef} style={finalStyle}>
      {children}
    </PaneDiv>
  );
};

type SplitPaneMinusProps = {
  children: [React.ReactNode, React.ReactNode];
  split: "vertical" | "horizontal"; // what direction does the divider run the full dimension?
  minSize?: number;
  maxSize?: number;
  primary: "first" | "second";
  size: number; // Size, in pixels of the primary pane.
  onChanged?: (newSize: number) => void; // callback called any time the sidebar size changes (including while dragging)
  allowResize?: boolean; // defaults to true
};

type SplitPaneDragState =
  | {
      active: false;
      position?: number | undefined;
      resized: boolean;
    }
  | {
      active: true;
      position: number;
      resized: boolean;
    };

// Remove any selection, to avoid highlighting random stuff on the page as the
// user drags
function unfocus(window: Window) {
  window.getSelection()?.removeAllRanges();
}

const SplitPaneMinus = ({
  children,
  split,
  minSize,
  maxSize,
  primary,
  size,
  onChanged,
  allowResize = true,
}: SplitPaneMinusProps) => {
  const [dragState, setDragState] = useState<SplitPaneDragState>({
    active: false,
    position: undefined,
    resized: false,
  });
  const ref = useRef<HTMLDivElement | null>(null);
  const pane1ref = useRef<HTMLDivElement | null>(null);
  const pane2ref = useRef<HTMLDivElement | null>(null);

  const onPointerDown: PointerEventHandler<HTMLSpanElement> = useCallback(
    (e) => {
      // console.log("onPointerDown", e);
      e.preventDefault();
      // Capture the pointer, so subsequent events continue to be directed to us
      e.currentTarget.setPointerCapture(e.pointerId);
      unfocus(window);
      const position = split === "vertical" ? e.clientX : e.clientY;
      setDragState({
        active: true,
        position,
        resized: false,
      });
    },
    [split],
  );

  const clampSize = useCallback(
    (requestedSize: number): [number, boolean] => {
      // returns list [clapedSize, didClamp]
      let newMaxSize = maxSize;
      if (maxSize !== undefined && maxSize <= 0) {
        const splitPane = ref.current;
        if (splitPane) {
          if (split === "vertical") {
            newMaxSize = splitPane.getBoundingClientRect().width + maxSize;
          } else {
            newMaxSize = splitPane.getBoundingClientRect().height + maxSize;
          }
        }
      }

      if (minSize !== undefined && requestedSize < minSize) {
        // clamp to minimum size
        return [minSize, true];
      } else if (newMaxSize !== undefined && requestedSize > newMaxSize) {
        // clamp to maximum size
        return [newMaxSize, true];
      }

      // grant requested size
      return [requestedSize, false];
    },
    [minSize, maxSize, split],
  );

  const measurePane = useCallback(
    (primaryPaneRef?: any) => {
      if (primaryPaneRef) {
        const node = primaryPaneRef.current;
        if (node?.getBoundingClientRect) {
          const bounds = node.getBoundingClientRect();
          const width = bounds.width;
          const height = bounds.height;
          const eleSize = split === "vertical" ? width : height;
          return eleSize;
        }
      }
      return undefined;
    },
    [split],
  );

  const onPointerMove: PointerEventHandler<HTMLSpanElement> = useCallback(
    (e) => {
      // console.log("onPointerMove", e);
      e.preventDefault();
      if (allowResize && dragState.active) {
        unfocus(window);

        const isPrimaryFirst = primary === "first";
        const primaryPaneRef = isPrimaryFirst ? pane1ref : pane2ref;
        const secondaryPaneRef = isPrimaryFirst ? pane2ref : pane1ref;
        const eleSize = measurePane(primaryPaneRef);
        const node = primaryPaneRef.current;
        const node2 = secondaryPaneRef.current;
        if (eleSize !== undefined && node && node2) {
          const current = split === "vertical" ? e.clientX : e.clientY;
          const positionDelta = dragState.position - current;
          // If you wanted step code, you'd put it here
          let sizeDelta = isPrimaryFirst ? positionDelta : -positionDelta;
          const pane1Order = parseInt(window.getComputedStyle(node).order, 10);
          const pane2Order = parseInt(window.getComputedStyle(node2).order, 10);
          if (pane1Order > pane2Order) {
            sizeDelta = -sizeDelta;
          }
          const requestedSize = eleSize - sizeDelta;

          const [clampedSize, didClamp] = clampSize(requestedSize);
          if (!didClamp) {
            const newPosition = dragState.position - positionDelta;
            setDragState({
              active: dragState.active,
              position: newPosition,
              resized: true,
            });
          }

          if (onChanged) onChanged(clampedSize);
        }
      }
    },
    [
      allowResize,
      split,
      primary,
      measurePane,
      clampSize,
      dragState.active,
      dragState.position,
      onChanged,
    ],
  );

  const onPointerRelease: PointerEventHandler<HTMLSpanElement> = useCallback(
    (e) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (dragState.active) {
        setDragState((prevState) => {
          return {
            ...prevState,
            active: false,
          };
        });
      }
    },
    [dragState.active],
  );

  const onPointerCancel: PointerEventHandler<HTMLSpanElement> = useCallback(
    (e) => {
      // console.log("onpointercancel", e);
      onPointerRelease(e);
    },
    [onPointerRelease],
  );

  const onPointerUp: PointerEventHandler<HTMLSpanElement> = useCallback(
    (e) => {
      // console.log("onpointerup", e);
      onPointerRelease(e);
    },
    [onPointerRelease],
  );

  const onWindowResized = useCallback(
    (_e: WindowEventMap["resize"]) => {
      // console.log("window resized", _e);
      const isPrimaryFirst = primary === "first";
      const primaryPaneRef = isPrimaryFirst ? pane1ref : pane2ref;
      const requestedSize = measurePane(primaryPaneRef);
      if (requestedSize !== undefined) {
        const [clampedSize, _didClamp] = clampSize(requestedSize);
        if (onChanged) onChanged(clampedSize);
      }
    },
    [primary, measurePane, clampSize, onChanged],
  );

  useEffect(() => {
    window.addEventListener("resize", onWindowResized);
    return () => {
      window.removeEventListener("resize", onWindowResized);
    };
  }, [onWindowResized]);

  const className = classnames(
    "SplitPaneMinus",
    dragState.active ? "dragging" : "",
  );
  const pane1Size = primary === "first" ? size : undefined;
  const pane2Size = primary === "second" ? size : undefined;
  return (
    <SplitPaneMinusDiv $split={split} className={className} ref={ref}>
      <Pane split={split} size={pane1Size} eleRef={pane1ref}>
        {children[0]}
      </Pane>
      <ResizerSpan
        key="resizer"
        role="presentation"
        $split={split}
        $allowResize={allowResize}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
      <Pane split={split} size={pane2Size} eleRef={pane2ref}>
        {children[1]}
      </Pane>
    </SplitPaneMinusDiv>
  );
};

export default SplitPaneMinus;
