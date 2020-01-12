import { _ } from 'meteor/underscore';
import elementResizeDetectorMaker from 'element-resize-detector';
import React from 'react';
import SplitPane, { Props as SplitPaneProps } from 'react-split-pane';

/*
  Wraps react-split-pane with a few extra features:
    Improved Styles for Better Cross Browser Support:
      Changes default pane1Style and pane2Style, but can still be overridden by passing props
    Automatic Collapse on Drag or Resize:
      Collapse does not occur if programmatically set to sizes which would cause collapse during
      drag.  Adds classes Collapsing1 and Collapsing2 as respective panes are dragged through the
      collapse range, which is useful to style a warning.  Adds classes Collapsed1 and Collapsed2
      as respective panes are actively collapsed (reduced to 0 size), which is useful to hide
      Resizer if no further adjustment is desired.
    Relative Scaling Option:
      Preserves relative sizes of the two panes during resize instead of absolute size of the
      primary.
    Dragging Class:
      Identifies a SplitPane currently being dragged with a 'dragging' class, which can be used to
      style the Resizer, for instance

  New Props:
    autoCollapse1     - Number of pixels (from center of Resizer) in Pane1 or Pane2 before
    autoCollapse2       collapsing.  Set 0 or negative to
                        disable (If 0, collapse flags will still set if dragged to extremes).
                        Defaults to 50.
    collapsed         - If 1 or 2, collapses the appropriate pane.  Ignored if size is set.
                        Defaults to 0.
    scaling           - If 'absolute' (default) maintains fixed size during resizes of the parent.
                        If 'relative' maintains fixed percentage.
    onCollapseChanged - Callback triggered when a pane collapses as a result of user input.
                        Argument is 0 if uncollapsed and 1 or 2 indicating the pane that
                        collapsed.

  Prop Changes:
    pane1Style        - Default now includes overflow: auto in both panes as well as maxHeight:
    pane2Style          100% or maxWidth: 100% as
                        appropriate in the primary pane
    minSize           - Default is now 0
    maxSize           - Default is now 0
    onDragFinished    - Callback arguments are now (size, collapsed) where collapsed is 0 if
                        uncollapsed and 1 or 2 indicating the pane that collapsed.  If collapsed,
                        the size reported is the position when the drag finished (before the
                        automatic collapse).
    size              - If size is specified , the appropriate panes are collapsed only if the
                        setting is exactly '0%', '100%', 0, or the Pane size.  It is possible to
                        set size within the automatic collapse zone without triggering a collapse.
*/

interface SplitPanePlusProps extends SplitPaneProps {
  autoCollapse1?: number;
  autoCollapse2?: number;
  collapsed?: 0 | 1 | 2;
  scaling?: 'absolute' | 'relative';
  onCollapseChanged?: (collapse: 0 | 1 | 2) => void;
  onDragFinished?: (size: number, collapse?: 0 | 1 | 2) => void;
}

interface SplitPanePlusState {
  collapseWarning: 0 | 1 | 2;
  lastSize: number;
  lastRelSize: number;
  dragInProgress: boolean;
}

class SplitPanePlus extends React.Component<SplitPanePlusProps, SplitPanePlusState> {
  ref: React.RefObject<HTMLDivElement>

  erd?: elementResizeDetectorMaker.Erd

  static defaultProps = _.extend({}, (SplitPane as any).defaultProps, {
    minSize: 0,
    maxSize: 0,
    className: '',
    autoCollapse1: 50,
    autoCollapse2: 50,
    collapsed: 0,
    scaling: 'absolute',
  });

  constructor(props: SplitPanePlusProps) {
    super(props);
    this.state = {
      // collapseWarning and collapsed are equal to the number of the pane being collapsed
      // or 0 if none
      collapseWarning: 0,
      lastSize: NaN,
      lastRelSize: NaN,
      dragInProgress: false,
    };
    this.ref = React.createRef();
  }

  componentDidMount() {
    this.erd = elementResizeDetectorMaker({ strategy: 'scroll' });
    this.erd.listenTo(this.splitPaneNode()!, _.throttle(this.onResize, 50));
    // Measure to handle relative defaultSize correctly
    if (this.props.collapsed === 0) {
      this.recordSize(this.measure(this.primaryPaneNode()!));
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
    if (this.props.collapsed === 0) {
      // Actively measure instead of using lastSize to capture the relative case correctly
      this.attemptCollapse(this.measure(this.primaryPaneNode()!));
    }
  }

  onChange = (size: number) => {
    this.setState({ collapseWarning: this.calculateCollapse(size) });
    if (this.props.onChange) {
      this.props.onChange(size);
    }
  }

  onDragStarted = () => {
    this.setState({
      dragInProgress: true,
    });
    if (this.props.onDragStarted) {
      this.props.onDragStarted();
    }
  }

  onDragFinished = (size: number) => {
    this.setState({
      collapseWarning: 0,
      dragInProgress: false,
    });
    this.attemptCollapse(size);
    if (this.props.collapsed === 0) {
      this.recordSize(size);
    }
    if (this.props.onDragFinished) {
      this.props.onDragFinished(size, this.props.collapsed);
    }
  }

  recordSize(size: number) {
    this.setState({
      lastSize: size,
      lastRelSize: size / this.measure(this.splitPaneNode()!),
    });
  }

  attemptCollapse(size: number) {
    const oldCollapsed = this.props.collapsed;
    const newCollapsed = this.calculateCollapse(size);
    if (oldCollapsed !== newCollapsed && this.props.onCollapseChanged) {
      this.props.onCollapseChanged(newCollapsed);
    }
  }

  calculateCollapse(size: number) {
    const fullSize = this.measure(this.splitPaneNode()!);
    const halfResizerSize = this.measure(this.resizerNode()!) / 2;
    let autoCollapsePrimary = this.props.autoCollapse1!;
    let autoCollapseSecondary = this.props.autoCollapse2!;
    if (this.props.primary !== 'first') {
      autoCollapsePrimary = this.props.autoCollapse2!;
      autoCollapseSecondary = this.props.autoCollapse1!;
    }
    if (size + halfResizerSize <= autoCollapsePrimary) {
      // Collapse Primary
      return this.props.primary === 'first' ? 1 : 2;
    } else if (size + halfResizerSize >= fullSize - autoCollapseSecondary) {
      // Collapse Secondary
      return this.props.primary === 'first' ? 2 : 1;
    }
    return 0;
  }

  splitPaneNode(): HTMLElement | null {
    if (!this.ref.current) {
      return null;
    }
    if (!(this.ref.current.firstChild instanceof HTMLElement)) {
      return null;
    }
    return this.ref.current.firstChild;
  }

  primaryPaneNode() {
    const root = this.splitPaneNode();
    const className = `Pane${this.props.primary === 'first' ? 1 : 2}`;
    return root ? _.find(root.childNodes, (n) => (
      n instanceof Element &&
      n.classList.contains(className)
    )) as Element : null;
  }

  secondaryPaneNode() {
    const root = this.splitPaneNode();
    const className = `Pane${this.props.primary === 'first' ? 2 : 1}`;
    return root ? _.find(root.childNodes, (n) => (
      n instanceof Element &&
      n.classList.contains(className)
    )) as Element : null;
  }

  resizerNode() {
    const root = this.splitPaneNode();
    return root ? _.find(root.childNodes, (n) => (
      n instanceof Element &&
      n.classList.contains('Resizer')
    )) as Element : null;
  }

  measure(elem: Element) {
    if (!elem) {
      return NaN;
    }
    return this.props.split === 'vertical' ? elem.clientWidth : elem.clientHeight;
  }

  render() {
    const paneProps: SplitPaneProps = _.extend({}, this.props);

    const defaultPaneStyles = { overflow: 'auto' };
    const maxRangeStyles = (this.props.split === 'vertical' ?
      { maxWidth: '100%' } :
      { maxHeight: '100%' }
    );
    paneProps.pane1Style = _.extend({},
      defaultPaneStyles,
      this.props.primary === 'first' ? maxRangeStyles : {},
      this.props.pane1Style);
    paneProps.pane2Style = _.extend({},
      defaultPaneStyles,
      this.props.primary === 'first' ? {} : maxRangeStyles,
      this.props.pane2Style);

    paneProps.onDragFinished = this.onDragFinished;
    paneProps.onDragStarted = this.onDragStarted;
    paneProps.onChange = this.onChange;

    if (this.state.collapseWarning > 0) {
      paneProps.className = `${paneProps.className} collapsing${this.state.collapseWarning}`;
    }
    if (this.props.collapsed! > 0) {
      paneProps.className = `${paneProps.className} collapsed${this.props.collapsed}`;
      if (this.props.collapsed === 1) {
        // Collapse Pane1
        paneProps.size = this.props.primary === 'first' ? '0%' : '100%';
      } else {
        // Collapse Pane2
        paneProps.size = this.props.primary === 'first' ? '100%' : '0%';
      }
    } else if (!('size' in this.props)) {
      if (this.props.scaling === 'relative' && !Number.isNaN(this.state.lastRelSize)) {
        paneProps.size = `${this.state.lastRelSize * 100}%`;
      } else if (!Number.isNaN(this.state.lastSize)) {
        paneProps.size = this.state.lastSize;
      }
    }
    if (!('size' in paneProps)) {
      paneProps.size = this.props.defaultSize;
    }

    paneProps.className = `${paneProps.className}${this.state.dragInProgress ? ' dragging' : ''}`;

    return (
      <div className="SplitPanePlus" ref={this.ref}>
        <SplitPane {...paneProps} />
      </div>
    );
  }
}

export default SplitPanePlus;
