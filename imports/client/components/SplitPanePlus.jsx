import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import SplitPane from 'react-split-pane';
import elementResizeDetectorMaker from 'element-resize-detector';

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

class SplitPanePlus extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // collapseWarning and collapsed are equal to the number of the pane being collapsed
      // or 0 if none
      collapseWarning: 0,
      collapsed: props.collapsed ? props.collapsed : 0,
      lastSize: NaN,
      lastRelSize: NaN,
      dragInProgress: false,
    };
    this.onResize = this.onResize.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onDragStarted = this.onDragStarted.bind(this);
    this.onDragFinished = this.onDragFinished.bind(this);
  }

  componentDidMount() {
    this.erd = elementResizeDetectorMaker({ strategy: 'scroll' });
    this.erd.listenTo(this.splitPaneNode(), _.throttle(this.onResize, 50));
    // Measure to handle relative defaultSize correctly
    if (this.state.collapsed === 0) {
      this.recordSize(this.measure(this.primaryPaneNode()));
    }
  }

  componentWillReceiveProps(nextProps) {
    if ('size' in nextProps) {
      const fullSize = this.measure(this.splitPaneNode());
      if (nextProps.size === '0%' || nextProps.size <= 0) {
        // Collapse primary pane
        this.setState({ collapsed: nextProps.primary === 'first' ? 1 : 2 });
      } else if (nextProps.size === '100%' || nextProps.size >= fullSize()) {
        // Collapse secondary pane
        this.setState({ collapsed: nextProps.primary === 'first' ? 2 : 1 });
      } else {
        this.setState({ collapsed: 0 });
      }
    } else if ('collapsed' in nextProps) {
      this.setState({ collapsed: nextProps.collapsed });
    }
  }

  componentWillUnmount() {
    this.erd.uninstall(this.splitPaneNode());
  }

  onResize() {
    if (!this.splitPaneNode()) {
      return;
    }
    if (this.state.collapsed === 0) {
      // Actively measure instead of using lastSize to capture the relative case correctly
      this.attemptCollapse(this.measure(this.primaryPaneNode()));
    }
  }

  onChange(size) {
    this.setState({ collapseWarning: this.calculateCollapse(size) });
    if ('onChange' in this.props) {
      this.props.onChange(size);
    }
  }

  onDragStarted(size) {
    this.setState({
      dragInProgress: true,
    });
    if ('onDragStarted' in this.props) {
      this.props.onDragStarted(size);
    }
  }

  onDragFinished(size) {
    this.setState({
      collapseWarning: 0,
      dragInProgress: false,
    });
    this.attemptCollapse(size);
    if (this.state.collapsed === 0) {
      this.recordSize(size);
    }
    if ('onDragFinished' in this.props) {
      this.props.onDragFinished(size, this.state.collapsed);
    }
  }

  recordSize(size) {
    this.setState({
      lastSize: size,
      lastRelSize: size / this.measure(this.splitPaneNode()),
    });
  }

  attemptCollapse(size) {
    const oldCollapsed = this.state.collapsed;
    const newCollapsed = this.calculateCollapse(size);
    this.setState({ collapsed: newCollapsed });
    if (oldCollapsed !== newCollapsed && 'onCollapseChanged' in this.props) {
      this.props.onCollapseChanged(newCollapsed);
    }
  }

  calculateCollapse(size) {
    const fullSize = this.measure(this.splitPaneNode());
    const halfResizerSize = this.measure(this.resizerNode()) / 2;
    let autoCollapsePrimary = this.props.autoCollapse1;
    let autoCollapseSecondary = this.props.autoCollapse2;
    if (this.props.primary !== 'first') {
      autoCollapsePrimary = this.props.autoCollapse2;
      autoCollapseSecondary = this.props.autoCollapse1;
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

  splitPaneNode() {
    return this.node ? this.node.firstChild : null;
  }

  primaryPaneNode() {
    const root = this.splitPaneNode();
    const className = `Pane${this.props.primary === 'first' ? 1 : 2}`;
    return root ? _.find(root.childNodes, n => n.classList.contains(className)) : null;
  }

  secondaryPaneNode() {
    const root = this.splitPaneNode();
    const className = `Pane${this.props.primary === 'first' ? 2 : 1}`;
    return root ? _.find(root.childNodes, n => n.classList.contains(className)) : null;
  }

  resizerNode() {
    const root = this.splitPaneNode();
    return root ? _.find(root.childNodes, n => n.classList.contains('Resizer')) : null;
  }

  measure(elem) {
    if (!elem) {
      return NaN;
    }
    return this.props.split === 'vertical' ? elem.clientWidth : elem.clientHeight;
  }

  render() {
    const paneProps = _.extend({}, this.props);

    const defaultPaneStyles = { overflow: 'auto' };
    const maxRangeStyles = (this.props.split === 'vertical' ?
      { maxWidth: '100%' } :
      { maxHeight: '100%' }
    );
    paneProps.pane1Style = _.extend({},
      defaultPaneStyles,
      this.props.primary === 'first' ? maxRangeStyles : {},
      this.props.pane1Style
    );
    paneProps.pane2Style = _.extend({},
      defaultPaneStyles,
      this.props.primary === 'first' ? {} : maxRangeStyles,
      this.props.pane2Style
    );

    paneProps.onDragFinished = this.onDragFinished;
    paneProps.onDragStarted = this.onDragStarted;
    paneProps.onChange = this.onChange;

    if (this.state.collapseWarning > 0) {
      paneProps.className = `${paneProps.className} collapsing${this.state.collapseWarning}`;
    }
    if (this.state.collapsed > 0) {
      paneProps.className = `${paneProps.className} collapsed${this.state.collapsed}`;
      if (this.state.collapsed === 1) {
        // Collapse Pane1
        paneProps.size = this.props.primary === 'first' ? '0%' : '100%';
      } else {
        // Collapse Pane2
        paneProps.size = this.props.primary === 'first' ? '100%' : '0%';
      }
    } else if (!('size' in this.props)) {
      if (this.props.scaling === 'relative' && !isNaN(this.state.lastRelSize)) {
        paneProps.size = `${this.state.lastRelSize * 100}%`;
      } else if (!isNaN(this.state.lastSize)) {
        paneProps.size = this.state.lastSize;
      }
    }
    if (!('size' in paneProps)) {
      paneProps.size = this.props.defaultSize;
    }

    paneProps.className = `${paneProps.className}${this.state.dragInProgress ? ' dragging' : ''}`;

    return (
      <div className={'SplitPanePlus'} ref={(node) => { this.node = node; }} >
        <SplitPane {...paneProps} />
      </div>
    );
  }
}

SplitPanePlus.propTypes = _.extend({}, SplitPane.propTypes, {
  autoCollapse1: PropTypes.number,
  autoCollapse2: PropTypes.number,
  collapsed: PropTypes.oneOf([0, 1, 2]),
  scaling: PropTypes.oneOf(['absolute', 'relative']),
  onCollapseChanged: PropTypes.func,
});

SplitPanePlus.defaultProps = _.extend({}, SplitPane.defaultProps, {
  minSize: 0,
  maxSize: 0,
  className: '',
  autoCollapse1: 50,
  autoCollapse2: 50,
  collapsed: 0,
  scaling: 'absolute',
});

export default SplitPanePlus;
