import { _ } from 'meteor/underscore';
import classnames from 'classnames';
import elementResizeDetectorMaker from 'element-resize-detector';
import React from 'react';
import SplitPane, { Props as SplitPaneProps } from 'react-split-pane';

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

interface SplitPanePlusProps {
  children: React.ReactNode[],
  size: number,
  collapsed: 0 | 1 | 2,
  primary: 'first' | 'second',
  split: 'vertical' | 'horizontal',
  allowResize: boolean,
  minSize: number,
  maxSize: number,
  autoCollapse1: number,
  autoCollapse2: number,
  scaling: 'absolute' | 'relative',
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

class SplitPanePlus extends React.Component<SplitPanePlusProps, SplitPanePlusState> {
  private ref: React.RefObject<HTMLDivElement>

  private erd?: elementResizeDetectorMaker.Erd

  static defaultProps: Partial<SplitPanePlusProps> = {
    collapsed: 0,
    primary: 'first',
    split: 'vertical',
    allowResize: true,
    minSize: 0,
    maxSize: 0,
    autoCollapse1: 50,
    autoCollapse2: 50,
    scaling: 'absolute',
  };

  constructor(props: SplitPanePlusProps) {
    super(props);
    this.state = {
      collapseWarning: 0,
      dragInProgress: false,
    };
    this.ref = React.createRef();
  }

  componentDidMount() {
    this.erd = elementResizeDetectorMaker({ strategy: 'scroll' });
    this.erd.listenTo(this.splitPaneNode()!, _.throttle(this.onResize, 50));
    // This is an inelegant way of preventing the browser from going into selection mode and
    // overriding the cursor. It also has to be accompanied by additional cursor styles for the
    // pane below (in puzzle.scss).
    if (this.ref && this.ref.current) {
      const resizerEl = this.ref.current.querySelector(':scope > .SplitPane > .Resizer');
      if (resizerEl) {
        resizerEl.addEventListener('mousedown', (ev) => { ev.preventDefault(); });
      }
    }
  }

  componentWillUnmount() {
    if (this.erd) {
      this.erd.uninstall(this.splitPaneNode()!);
    }
  }

  onResize = () => {
    if (!this.splitPaneNode()) {
      return;
    }
    let newSize: number = this.measure(this.primaryPaneNode());
    const fullSize = this.measure(this.splitPaneNode());
    const fullMax = this.props.maxSize <= 0 ? fullSize + this.props.maxSize : this.props.maxSize;
    newSize = Math.min(Math.max(this.props.minSize, newSize), fullMax);
    const newCollapsed = this.calculateCollapse(newSize);
    if (newSize !== this.props.size || newCollapsed !== this.props.collapsed) {
      if (this.props.onPaneChanged) {
        this.props.onPaneChanged(newSize, newCollapsed, 'resize');
      }
      this.forceUpdate();
    }
  }

  onChange = (size: number) => {
    // Setting dragInProgress in onDragStarted creates a frame of strangeness
    this.setState({ dragInProgress: true, collapseWarning: this.calculateCollapse(size) });
  }

  onDragFinished = (rawSize: number | string) => {
    this.setState({
      collapseWarning: 0,
      dragInProgress: false,
    });
    // May be called with a number or a string representing a percentage
    let size: number = Number(rawSize);
    if (typeof rawSize === 'string') {
      const rawSizeAsPercent: number = Number(rawSize.slice(0, -1));
      if (rawSize.slice(-1) === '%' && !Number.isNaN(rawSizeAsPercent)) {
        size = (rawSizeAsPercent * this.measure(this.splitPaneNode())) / 100.0;
      }
    }
    if (!Number.isNaN(size) && this.props.onPaneChanged) {
      this.props.onPaneChanged(size, this.calculateCollapse(size), 'drag');
    }
  }

  calculateCollapse(size: number) {
    const fullSize = this.measure(this.splitPaneNode());
    let autoCollapsePrimary = this.props.autoCollapse1;
    let autoCollapseSecondary = this.props.autoCollapse2;
    if (this.props.primary !== 'first') {
      autoCollapsePrimary = this.props.autoCollapse2;
      autoCollapseSecondary = this.props.autoCollapse1;
    }
    if (autoCollapsePrimary >= 0 && size <= autoCollapsePrimary) {
      return this.props.primary === 'first' ? 1 : 2;
    } else if (autoCollapseSecondary >= 0 && size >= fullSize - autoCollapseSecondary) {
      return this.props.primary === 'first' ? 2 : 1;
    }
    return 0;
  }

  splitPaneNode(): HTMLElement | null {
    if (!this.ref.current || !(this.ref.current.firstChild instanceof HTMLElement)) {
      return null;
    }
    return this.ref.current.firstChild;
  }

  primaryPaneNode(): HTMLElement | null {
    const root = this.splitPaneNode();
    const className = `Pane${this.props.primary === 'first' ? 1 : 2}`;
    return root ? _.find(root.childNodes, (n) => (
      n instanceof Element &&
      n.classList.contains(className)
    )) as HTMLElement : null;
  }

  secondaryPaneNode(): HTMLElement | null {
    const root = this.splitPaneNode();
    const className = `Pane${this.props.primary === 'first' ? 2 : 1}`;
    return root ? _.find(root.childNodes, (n) => (
      n instanceof Element &&
      n.classList.contains(className)
    )) as HTMLElement : null;
  }

  resizerNode(): HTMLElement | null {
    const root = this.splitPaneNode();
    return root ? _.find(root.childNodes, (n) => (
      n instanceof Element &&
      n.classList.contains('Resizer')
    )) as HTMLElement : null;
  }

  measure(elem: HTMLElement | null): number {
    if (!elem) {
      return NaN;
    }
    return this.props.split === 'vertical' ? elem.clientWidth : elem.clientHeight;
  }

  render() {
    const paneProps: { [key: string]: any; } = _.pick(
      this.props,
      'children',
      'primary',
      'split',
      'allowResize',
      'step',
      'minSize',
      'maxSize',
      'className',
      'style',
      'paneClassName',
      'paneStyle',
      'pane1ClassName',
      'pane1Style',
      'pane2ClassName',
      'pane2Style',
      'resizerClassName',
      'resizerStyle',
    );
    const defaultPaneStyle: React.CSSProperties = { overflow: 'auto' };
    paneProps.paneStyle = _.extend(defaultPaneStyle, this.props.paneStyle);
    // Prevents the flexbox from overfilling, accommodating large size passed as prop
    // Also allows use of 100% width in collapse (even though resizer takes up some space)
    const defaultPrimaryPaneStyle: React.CSSProperties = { flexShrink: 1 };
    if (this.props.primary === 'first') {
      paneProps.pane1Style = _.extend(defaultPrimaryPaneStyle, this.props.pane1Style);
    } else {
      paneProps.pane2Style = _.extend(defaultPrimaryPaneStyle, this.props.pane2Style);
    }
    paneProps.className = classnames(paneProps.className, { dragging: this.state.dragInProgress });
    paneProps.pane1ClassName = classnames(paneProps.pane1ClassName, {
      collapsing: this.state.collapseWarning === 1,
      collapsed: this.props.collapsed === 1 && !this.state.dragInProgress,
    });
    paneProps.pane2ClassName = classnames(paneProps.pane2ClassName, {
      collapsing: this.state.collapseWarning === 2,
      collapsed: this.props.collapsed === 2 && !this.state.dragInProgress,
    });
    paneProps.resizerClassName = classnames(paneProps.resizerClassName, {
      collapsedAdjacent: this.props.collapsed > 0 && !this.state.dragInProgress,
      collapsedPrevious: this.props.collapsed === 1 && !this.state.dragInProgress,
      collapsedNext: this.props.collapsed === 2 && !this.state.dragInProgress,
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
    paneProps.onDragFinished = this.onDragFinished;
    paneProps.onChange = this.onChange;
    if (!this.state.dragInProgress) {
      if (this.props.collapsed > 0) {
        if (this.props.collapsed === 1) {
          paneProps.size = this.props.primary === 'first' ? '0%' : '100%';
        } else {
          paneProps.size = this.props.primary === 'first' ? '100%' : '0%';
        }
      } else if (this.props.scaling === 'relative' && this.splitPaneNode()) {
        const relativeSize: number = this.props.size / this.measure(this.splitPaneNode());
        paneProps.size = `${relativeSize * 100.0}%`;
      } else {
        paneProps.size = this.props.size;
      }
    }
    return (
      <div className="SplitPanePlus" ref={this.ref}>
        <SplitPane {...paneProps as SplitPaneProps} />
      </div>
    );
  }
}

export default SplitPanePlus;
