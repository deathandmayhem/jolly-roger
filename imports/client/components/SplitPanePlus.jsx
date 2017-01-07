import { _ } from 'meteor/underscore';
import React from 'react';
import SplitPane from 'react-split-pane';
import elementResizeDetectorMaker from 'element-resize-detector';

/* eslint-disable max-len */
/* (Because this pulls in property definitions from react-split-pane and eslint doesn't understand that) */

/*
  Wraps react-split-pane with a few extra features:
    Improved Styles for Better Cross Browser Support:
      Changes default pane1Style and pane2Style, but can still be overridden by passing props
    Automatic Collapse on Drag:
      Collapse does not occur if programmatically set to sizes which would cause collapse during drag.  Adds classes
      Collapsing1 and Collapsing2 as respective panes are dragged through the collapse range, which is useful to style a
      warning.  Adds classes Collapsed1 and Collapsed2 as respective panes are actively collapsed (reduced to 0 size), which
      is useful to hide Resizer if no further adjustment is desired.

  New Props:
    autoCollapse1     - Number of pixels (from center of Resizer) in Pane1 or Pane2 before collapsing.  Set 0 or negative to
    autoCollapse2       disable (If 0, collapse flags will still set if dragged to extremes).  Defaults to 50.
    collapsed         - If 1 or 2, collapses the appropriate pane.  Ignored if size is set.  Defaults to 0.
    onCollapseChanged - Callback triggered when a pane collapses as a result of user input.  Argument is 0 if uncollapsed
                        and 1 or 2 indicating the pane that collapsed.

  Prop Changes:
    pane1Style        - Default now includes overflow: auto in both panes as well as maxHeight: 100% or maxWidth:100% as
    pane2Style          appropriate in the primary pane
    minSize           - Default is now 0
    maxSize           - Default is now 0
    onDragFinished    - Callback arguments are now (size, collapsed) where collapsed is 0 if uncollapsed and 1 or 2 indicating
                        the pane that collapsed.  If collapsed, the size reported is the position when the drag finished (before
                        the automatic collapse).
    size              - If size is specified , the appropriate panes are collapsed only if the setting is exactly '0%', '100%',
                        0, or the Pane size.  It is possible to set size within the automatic collapse zone without triggering a
                        collapse.
*/

const SplitPanePlus = React.createClass({
  propTypes: _.extend({}, SplitPane.propTypes, {
    autoCollapse1: React.PropTypes.number,
    autoCollapse2: React.PropTypes.number,
    collapsed: React.PropTypes.number,
    onCollapseChanged: React.PropTypes.func,
  }),

  getDefaultProps() {
    return _.extend({}, SplitPane.defaultProps, {
      minSize: 0,
      maxSize: 0,
      className: '',
      autoCollapse1: 50,
      autoCollapse2: 50,
      collapsed: 0,
    });
  },

  getInitialState() {
    return {
      // collapseWarning and collapsed are equal to the number of the pane being collapsed or 0 if none
      collapseWarning: 0,
      collapsed: 0,
      lastSize: -1,
    };
  },

  componentDidMount() {
    this.erd = elementResizeDetectorMaker({ strategy: 'scroll' });
    this.erd.listenTo(this.splitPaneNode(), _.throttle(this.onResize, 50));
    this.setState({ lastSize: this.measure(this.primaryPaneNode()) });
  },

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
  },

  componentWillUnmount() {
    this.erd.uninstall(this.splitPaneNode());
  },

  onResize() {
    if (this.state.collapsed === 0 && this.state.lastSize >= 0) {
      this.attemptCollapse(this.state.lastSize);
    }
  },

  onChange(size) {
    this.setState({ collapseWarning: this.calculateCollapse(size) });
    if ('onChange' in this.props) {
      this.props.onChange(size);
    }
  },

  onDragFinished(size) {
    this.setState({ collapseWarning: 0 });
    this.attemptCollapse(size);
    if (this.state.collapsed === 0) {
      this.setState({ lastSize: size });
    }
    if ('onDragFinished' in this.props) {
      this.props.onDragFinished(size, this.state.collapsed);
    }
  },

  attemptCollapse(size) {
    const oldCollapsed = this.state.collapsed;
    const newCollapsed = this.calculateCollapse(size);
    this.setState({ collapsed: newCollapsed });
    if (oldCollapsed !== newCollapsed && 'onCollapseChanged' in this.props) {
      this.props.onCollapseChanged(newCollapsed);
    }
  },

  calculateCollapse(size) {
    const fullSize = this.measure(this.splitPaneNode());
    const halfResizerSize = this.measure(this.resizerNode()) / 2;
    if (size + halfResizerSize <= this.props.autoCollapse1) {
      // Collapse Pane1
      return this.props.primary === 'first' ? 1 : 2;
    } else if (size + halfResizerSize >= fullSize - this.props.autoCollapse2) {
      // Collapse Pane2
      return this.props.primary === 'first' ? 2 : 1;
    }
    return 0;
  },

  splitPaneNode() {
    return this.node.firstChild;
  },

  primaryPaneNode() {
    return this.splitPaneNode().querySelector(`:scope > .Pane${this.props.primary === 'first' ? 1 : 2}`);
  },

  secondaryPaneNode() {
    return this.splitPaneNode().querySelector(`:scope > .Pane${this.props.primary === 'first' ? 2 : 1}`);
  },

  resizerNode() {
    return this.splitPaneNode().querySelector(':scope > .Resizer');
  },

  measure(elem) {
    return this.props.split === 'vertical' ? elem.clientWidth : elem.clientHeight;
  },

  render() {
    const paneProps = _.extend({}, this.props);

    const defaultPaneStyles = { overflow: 'auto' };
    const maxRangeStyles = this.props.split === 'vertical' ? { maxWidth: '100%' } : { maxHeight: '100%' };
    paneProps.pane1Style = _.extend({}, defaultPaneStyles, this.props.primary === 'first' ? maxRangeStyles : {}, this.props.pane1Style);
    paneProps.pane2Style = _.extend({}, defaultPaneStyles, this.props.primary === 'first' ? {} : maxRangeStyles, this.props.pane2Style);

    paneProps.onDragFinished = this.onDragFinished;
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
    } else {
      paneProps.size = this.state.lastSize >= 0 ? this.state.lastSize : this.props.defaultSize;
    }

    return (
      <div ref={(node) => { this.node = node; }} >
        <SplitPane {...paneProps} />
      </div>
    );
  },

});

export default SplitPanePlus;
