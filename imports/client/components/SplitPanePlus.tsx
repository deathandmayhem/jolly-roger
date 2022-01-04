import { _ } from 'meteor/underscore';
import classnames from 'classnames';
import elementResizeDetectorMaker from 'element-resize-detector';
import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import SplitPane, { SplitPaneProps } from 'react-split-pane';

/*
  Provides two panes with a user draggable divider featuring snap-to-collapse. Fully controlled.

  Notable features:
    Automatic collapse on drag or resize:
      Collapse is requested via the on PaneChanged callback.  Collapse does not occur if
      a size which would cause collapse during drag is passed directly as a prop.
    Min and max size respected during resize:
      While resizing in absolute or relative mode, minSize and maxSize still have effect.
    Relative scaling option:
      Preserves relative sizes of the two panes during resize instead of absolute size of the
      primary.
    Applies useful classes:
      .dragging          - Applied to the SplitPane during dragging
      .collapsing        - Applied to a pane during drag while it is within its autoCollapse range
      .collapsed         - Applied to a pane when it is collapsed
      .collapsedAdjacent - Applied to a resizer when either pane is collapsed
      .collapsedPrevious - Applied to a resizer when the pane before it is collapsed
      .collapsedNext     - Applied to a resizer when the pane after it is collapsed

  Props:
    size: number
      Size in pixels of the primary pane. Size has no effect during drag or if collapsed is other
      than 0. If size is set to a value normally prohibited by minSize or maxSize or within any
      autoCollapse range, the primary pane will still render at the requested size. If size is
      larger than the container, the primary pane will fill the container. In no event does size
      alone trigger collapse.
    collapsed?: 0 | 1 | 2 = 0
      Which pane is currently collapsed (reduced to size 0 with appropriate classes applied).
      If 0, neither pane is collapsed and normal dragging behavior is present.
    primary?: 'first' | 'second' = 'first'
      Which pane the size property is applied to
    split?: 'vertical' | 'horizontal' = 'vertical'
      Orientation of the dividing line. 'vertical' is side-by-side and 'horizontal' is stacked.
    allowResize?: boolean = true
      True to enable user drag.
    minSize?: number = 0
      Minimum size of the primary pane. Respected by drag and resize.
    maxSize?: number = 0
      Maximum size of the primary pane. Respected by drag and resize. If zero or negative,
      interpreted as minimum size of secondary pane.
    autoCollapse1?, autoCollapse2?: number = 50
      Size in pixels below which a pane is automatically collapsed. Respected by drag and resize.
      Set negative to disable.
    scaling?: 'absolute' | 'relative' = 'absolute'
      If 'relative', primary and secondary panes will retain their proportions during resize.
    step?: number
      Step size when dragging
    onChanged?: (size: number, collapsed: 0 | 1 | 2) => void
      Callback triggered per-frame to indicate a change in pane size during a drag.
    onPaneChanged?: (size: number, collapsed: 0 | 1 | 2, cause: 'drag' | 'resize') => void
      Callback triggered to request a change to size or collapsed state. Drag events will call
      this once, at the end of the event. Resize events will call this whenever the currently
      implied condition does not match the existing props.
    className?: string
      Class names applied to the parent div, in addition to 'SplitPane' and 'Vertical' or
      'Horizontal' (depending on split)
    style?: React.CSSProperties
      Styles applied to the parent div
    paneClassName?, pane1ClassName?, pane2ClassName?: string
      Class names applied to both, the first, and the second pane respectively, in addition to
      'Pane', 'Pane1', and 'Pane2' as well as 'Vertical' or 'Horizontal' (depending on split)
    paneStyle?, pane1Style?, pane2Style?: React.CSSProperties
      Styles applied to both, the first, and the second pane respectively
    resizerClassName?: string
      Class names applied to the resizer, in addition to 'Resizer' as well as 'Vertical' or
      'Horizontal' (depending on split)
    resizerStyle?: React.CSSProperties
      Styles applied to the resizer
*/

// Why is this necessary? These should already be in SplitPaneProps, but
// hilariously SplitPane provides broken TS declarations that don't actually
// declare types for all the props it accepts.  So we use this so we can
// accurately type the full set of props we pass to SplitPane.
interface FullSplitPaneProps extends SplitPaneProps {
  children: React.ReactNode[],
  paneClassName?: string,
  pane1ClassName?: string,
  pane2ClassName?: string,
}

interface SplitPanePlusProps {
  children: React.ReactNode[],
  size: number,
  collapsed?: 0 | 1 | 2,
  primary: 'first' | 'second',
  split: 'vertical' | 'horizontal',
  allowResize?: boolean,
  minSize: number,
  maxSize: number,
  autoCollapse1: number,
  autoCollapse2: number,
  scaling?: 'absolute' | 'relative',
  onChanged?: (size: number, collapsed: 0 | 1 | 2) => void,
  onPaneChanged?: (size: number, collapsed: 0 | 1 | 2, cause: 'drag' | 'resize') => void,
  step?: number,
  className?: string,
  style?: React.CSSProperties,
  paneClassName?: string,
  paneStyle?: React.CSSProperties,
  pane1ClassName?: string,
  pane1Style?: React.CSSProperties,
  pane2ClassName?: string,
  pane2Style?: React.CSSProperties,
  resizerClassName?: string,
  resizerStyle?: React.CSSProperties,
}

interface SplitPanePlusState {
  collapseWarning: 0 | 1 | 2;
  dragInProgress: boolean;
}

const SplitPanePlusHook = (props: SplitPanePlusProps) => {
  const [state, setState] = useState<SplitPanePlusState>({
    collapseWarning: 0,
    dragInProgress: false,
  });

  // Unpack props with defaults
  const {
    children,
    size,
    collapsed = 0,
    primary = 'first',
    split = 'vertical',
    allowResize = true,
    minSize = 0,
    maxSize = 0,
    autoCollapse1 = 50,
    autoCollapse2 = 50,
    scaling = 'absolute',
    onChanged,
    onPaneChanged,
    step,
    className,
    style,
    paneClassName,
    paneStyle,
    pane1ClassName,
    pane1Style,
    pane2ClassName,
    pane2Style,
    resizerClassName,
    resizerStyle,
  } = props;

  const ref = useRef<HTMLDivElement | null>(null);

  const erdRef = useRef<elementResizeDetectorMaker.Erd | undefined>(undefined);
  const getErd = (): elementResizeDetectorMaker.Erd => {
    if (!erdRef.current) {
      erdRef.current = elementResizeDetectorMaker({ strategy: 'scroll' });
    }
    return erdRef.current;
  };

  const splitPaneNode = useCallback(() => {
    if (!ref.current || !(ref.current.firstChild instanceof HTMLElement)) {
      return undefined;
    }
    return ref.current.firstChild;
  }, []);

  const findChildByClass = useCallback((classNameSought: string): Element | undefined => {
    const root = splitPaneNode();
    return root && Array.from(root.children).find((n) => {
      return n.classList.contains(classNameSought);
    });
  }, [splitPaneNode]);

  const primaryPaneNode = useCallback((): Element | undefined => {
    return findChildByClass(`Pane${primary === 'first' ? 1 : 2}`);
  }, [findChildByClass, primary]);

  // Unused.
  /*
  const secondaryPaneNode = useCallback((): Element | undefined => {
    return findChildByClass(`Pane${primary === 'first' ? 2 : 1}`);
  }, [findChildByClass, primary]);
  */

  const resizerNode = useCallback((): Element | undefined => {
    return findChildByClass('Resizer');
  }, [findChildByClass]);

  const measure = useCallback((elem: Element | undefined): number => {
    if (!elem) {
      return NaN;
    }
    return split === 'vertical' ? elem.clientWidth : elem.clientHeight;
  }, [split]);

  const calculateCollapse = useCallback((proposedSize: number) => {
    const fullSize = measure(splitPaneNode());
    let autoCollapsePrimary = autoCollapse1;
    let autoCollapseSecondary = autoCollapse2;
    if (primary !== 'first') {
      autoCollapsePrimary = autoCollapse2;
      autoCollapseSecondary = autoCollapse1;
    }
    if (autoCollapsePrimary >= 0 && proposedSize <= autoCollapsePrimary) {
      return primary === 'first' ? 1 : 2;
    } else if (autoCollapseSecondary >= 0 && proposedSize >= fullSize - autoCollapseSecondary) {
      return primary === 'first' ? 2 : 1;
    }
    return 0;
  }, [measure, splitPaneNode, autoCollapse1, autoCollapse2, primary]);

  const onResize = useCallback(() => {
    if (!splitPaneNode()) {
      return;
    }
    let newSize: number = measure(primaryPaneNode());
    const fullSize = measure(splitPaneNode());
    const fullMax = maxSize <= 0 ? fullSize + maxSize : maxSize;
    newSize = Math.min(Math.max(minSize, newSize), fullMax);
    const newCollapsed = calculateCollapse(newSize);
    if (newSize !== size || newCollapsed !== collapsed) {
      if (onPaneChanged) {
        onPaneChanged(newSize, newCollapsed, 'resize');
      }
    }

    // TODO: figure out how to force this or what to setstate
    // this.forceUpdate();
  }, [
    splitPaneNode, measure, primaryPaneNode, maxSize, minSize, calculateCollapse,
    size, collapsed, onPaneChanged,
  ]);

  const preventDefault = useCallback((ev) => {
    ev.preventDefault();
  }, []);

  useEffect(() => {
    const erd = getErd();
    const node = splitPaneNode();
    if (node) {
      erd.listenTo(node, _.throttle(onResize, 50));
    }

    const resizerEl = resizerNode();
    if (resizerEl) {
      resizerEl.addEventListener('mousedown', preventDefault);
    }

    return () => {
      if (resizerEl) {
        resizerEl.removeEventListener('mousedown', preventDefault);
      }
      if (node) {
        erd.uninstall(node);
      }
    };
  }, [onResize, preventDefault, resizerNode, splitPaneNode]);

  const onChange = useCallback((newSize: number) => {
    // Setting dragInProgress in onDragStarted creates a frame of strangeness
    const nextCollapse = calculateCollapse(newSize);
    setState({
      dragInProgress: true,
      collapseWarning: nextCollapse,
    });
    if (onChanged) {
      onChanged(newSize, nextCollapse);
    }
  }, [calculateCollapse, onChanged]);

  const onDragFinished = useCallback((rawSize: number | string) => {
    setState({
      collapseWarning: 0,
      dragInProgress: false,
    });
    // May be called with a number or a string representing a percentage
    let newSize: number = Number(rawSize);
    if (typeof rawSize === 'string') {
      const rawSizeAsPercent: number = Number(rawSize.slice(0, -1));
      if (rawSize.slice(-1) === '%' && !Number.isNaN(rawSizeAsPercent)) {
        newSize = (rawSizeAsPercent * measure(splitPaneNode())) / 100.0;
      }
    }
    if (!Number.isNaN(newSize) && onPaneChanged) {
      onPaneChanged(newSize, calculateCollapse(newSize), 'drag');
    }
  }, [measure, splitPaneNode, onPaneChanged, calculateCollapse]);

  const paneProps: FullSplitPaneProps = {
    children,
    primary,
    split,
    allowResize,
    step,
    minSize,
    maxSize,
    className,
    style,
    paneClassName,
    paneStyle,
    pane1ClassName,
    pane1Style,
    pane2ClassName,
    pane2Style,
    resizerClassName,
    resizerStyle,
  };

  const defaultPaneStyle: React.CSSProperties = { overflow: 'auto' };
  paneProps.paneStyle = { ...defaultPaneStyle, ...paneStyle };
  // Prevents the flexbox from overfilling, accommodating large size passed as prop
  // Also allows use of 100% width in collapse (even though resizer takes up some space)
  const defaultResizerStyle: React.CSSProperties = { flexGrow: 0, flexShrink: 0 };
  paneProps.resizerStyle = { ...defaultResizerStyle, ...resizerStyle };
  const defaultPrimaryPaneStyle: React.CSSProperties = { flexShrink: 1 };
  if (primary === 'first') {
    paneProps.pane1Style = { ...defaultPrimaryPaneStyle, ...pane1Style };
  } else {
    paneProps.pane2Style = { ...defaultPrimaryPaneStyle, ...pane2Style };
  }
  paneProps.className = classnames(paneProps.className, { dragging: state.dragInProgress });
  paneProps.pane1ClassName = classnames(paneProps.pane1ClassName, {
    collapsing: state.collapseWarning === 1,
    collapsed: collapsed === 1 && !state.dragInProgress,
  });
  paneProps.pane2ClassName = classnames(paneProps.pane2ClassName, {
    collapsing: state.collapseWarning === 2,
    collapsed: collapsed === 2 && !state.dragInProgress,
  });
  paneProps.resizerClassName = classnames(paneProps.resizerClassName, {
    collapsedAdjacent: collapsed > 0 && !state.dragInProgress,
    collapsedPrevious: collapsed === 1 && !state.dragInProgress,
    collapsedNext: collapsed === 2 && !state.dragInProgress,
  });
  // If no resizerClassName is provided to SplitPane, a default is used, but if '' is provided,
  // no class is assigned. Any other provided string is appended to the default.
  // Work around this by never passing '' as resizerClassName.
  if (paneProps.resizerClassName === '') {
    delete paneProps.resizerClassName;
  }
  // The docs suggest that maxSize <= 0 should limit the primary pane to the the container
  // (representing size of the secondary). While this works with negative maxSize, it doesn't
  // seem to work with 0. This workaround using epsilon isn't ideal, but is good enough in
  // practice.
  if (paneProps.maxSize === 0) {
    paneProps.maxSize = -Number.MIN_VALUE;
  }
  paneProps.onDragFinished = onDragFinished;
  paneProps.onChange = onChange;
  if (!state.dragInProgress) {
    if (collapsed > 0) {
      if (collapsed === 1) {
        paneProps.size = primary === 'first' ? '0%' : '100%';
      } else {
        paneProps.size = primary === 'first' ? '100%' : '0%';
      }
    } else if (scaling === 'relative' && splitPaneNode()) {
      const relativeSize: number = size / measure(splitPaneNode());
      paneProps.size = `${relativeSize * 100.0}%`;
    } else {
      paneProps.size = size;
    }
  }
  return (
    <div className="SplitPanePlus" ref={ref}>
      <SplitPane {...paneProps} />
    </div>
  );
};

export default SplitPanePlusHook;
