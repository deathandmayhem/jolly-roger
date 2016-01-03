/* Adapted from Andrey Popp's react-textarea-autosize:
 * https://github.com/andreypopp/react-textarea-autosize/
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013 Andrey Popp
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * <TextareaAutosize />
 */

const emptyFunction = function() {};

TextareaAutosize = React.createClass({

  propTypes: {
    /**
     * Current textarea value.
     */
    value: React.PropTypes.string,

    /**
     * Callback on value change.
     */
    onChange: React.PropTypes.func,

    /**
     * Callback on height changes.
     */
    onHeightChange: React.PropTypes.func,

    /**
     * Try to cache DOM measurements performed by component so that we don't
     * touch DOM when it's not needed.
     *
     * This optimization doesn't work if we dynamically style <textarea />
     * component.
     */
    useCacheForDOMMeasurements: React.PropTypes.bool,

    /**
     * Minimal numbder of rows to show.
     */
    rows: React.PropTypes.number,

    /**
     * Alias for `rows`.
     */
    minRows: React.PropTypes.number,

    /**
     * Maximum number of rows to show.
     */
    maxRows: React.PropTypes.number,
  },

  getDefaultProps() {
    return {
      onChange: emptyFunction,
      onHeightChange: emptyFunction,
      useCacheForDOMMeasurements: false,
    };
  },

  getInitialState() {
    this._onNextFrameActionId = null;
    this._rootDOMNode = null;
    return {
      height: null,
      minHeight: -Infinity,
      maxHeight: Infinity,
    };
  },

  render() {
    let {valueLink, onChange, ...props} = this.props;
    props = {...props};
    if (typeof valueLink === 'object') {
      props.value = this.props.valueLink.value;
    }

    props.style = {
      ...props.style,
      height: this.state.height,
    };
    let maxHeight = Math.max(
      props.style.maxHeight ? props.style.maxHeight : Infinity,
      this.state.maxHeight);
    if (maxHeight < this.state.height) {
      props.style.overflow = 'hidden';
    }

    return (
      <textarea
        {...props}
        onChange={this._onChange}
        ref={this._onRootDOMNode}
        />
    );
  },

  componentDidMount() {
    this._resizeComponent();
    window.addEventListener('resize', this._resizeComponent);
  },

  componentWillReceiveProps() {
    // Re-render with the new content then recalculate the height as required.
    this._clearNextFrame();
    this._onNextFrameActionId = onNextFrame(this._resizeComponent);
  },

  componentDidUpdate(prevProps, prevState) {
    // Invoke callback when old height does not equal to new one.
    if (this.state.height !== prevState.height) {
      this.props.onHeightChange(this.state.height);
    }
  },

  componentWillUnmount() {
    // Remove any scheduled events to prevent manipulating the node after it's
    // been unmounted.
    this._clearNextFrame();
    window.removeEventListener('resize', this._resizeComponent);
  },

  _clearNextFrame() {
    if (this._onNextFrameActionId) {
      clearNextFrameAction(this._onNextFrameActionId);
    }
  },

  _onRootDOMNode(node) {
    this._rootDOMNode = node;
  },

  _onChange(e) {
    this._resizeComponent();
    let {valueLink, onChange} = this.props;
    if (valueLink) {
      valueLink.requestChange(e.target.value);
    } else {
      onChange(e);
    }
  },

  _resizeComponent() {
    let {useCacheForDOMMeasurements} = this.props;
    this.setState(calculateNodeHeight(
      this._rootDOMNode,
      useCacheForDOMMeasurements,
      this.props.rows || this.props.minRows,
      this.props.maxRows));
  },

  /**
   * Put focus on a <textarea /> DOM element.
   */
  focus() {
    this._rootDOMNode.focus();
  },

  /**
   * Shifts focus away from a <textarea /> DOM element.
   */
  blur() {
    this._rootDOMNode.blur();
  },
});

function onNextFrame(cb) {
  if (window.requestAnimationFrame) {
    return window.requestAnimationFrame(cb);
  }

  return window.setTimeout(cb, 1);
}

function clearNextFrameAction(nextFrameId) {
  if (window.cancelAnimationFrame) {
    window.cancelAnimationFrame(nextFrameId);
  } else {
    window.clearTimeout(nextFrameId);
  }
}

/**
 * calculateNodeHeight(uiTextNode, useCache = false)
 */

const HIDDEN_TEXTAREA_STYLE = `
  min-height:none !important;
  max-height:none !important;
  height:0 !important;
  visibility:hidden !important;
  overflow:hidden !important;
  position:absolute !important;
  z-index:-1000 !important;
  top:0 !important;
  right:0 !important
`;

const SIZING_STYLE = [
  'letter-spacing',
  'line-height',
  'padding-top',
  'padding-bottom',
  'font-family',
  'font-weight',
  'font-size',
  'text-rendering',
  'text-transform',
  'width',
  'padding-left',
  'padding-right',
  'border-width',
  'box-sizing',
];

let computedStyleCache = {};
let hiddenTextarea;

function calculateNodeHeight(uiTextNode, useCache = false, minRows = null, maxRows = null) {
  if (!hiddenTextarea) {
    hiddenTextarea = document.createElement('textarea');
    document.body.appendChild(hiddenTextarea);
  }

  // Copy all CSS properties that have an impact on the height of the content in
  // the textbox
  let {
    paddingSize, borderSize,
    boxSizing, sizingStyle,
  } = calculateNodeStyling(uiTextNode, useCache);

  // Need to have the overflow attribute to hide the scrollbar otherwise
  // text-lines will not calculated properly as the shadow will technically be
  // narrower for content
  hiddenTextarea.setAttribute('style', sizingStyle + ';' + HIDDEN_TEXTAREA_STYLE);
  hiddenTextarea.value = uiTextNode.value || uiTextNode.placeholder || '';

  let minHeight = -Infinity;
  let maxHeight = Infinity;
  let scrollHeight = hiddenTextarea.scrollHeight;
  let height = scrollHeight;

  if (boxSizing === 'border-box') {
    // border-box: add border, since height = content + padding + border
    height = height + borderSize;
  } else if (boxSizing === 'content-box') {
    // remove padding, since height = content
    height = height - paddingSize;
  }

  if (minRows !== null || maxRows !== null) {
    // measure height of a textarea with a single row
    hiddenTextarea.value = '';
    let singleRowHeight = scrollHeight - paddingSize;
    if (minRows !== null) {
      minHeight = singleRowHeight * minRows;

      if (boxSizing === 'border-box') {
        minHeight = minHeight + paddingSize + borderSize;
      }

      height = Math.max(minHeight, height);
    }

    if (maxRows !== null) {
      maxHeight = singleRowHeight * maxRows;

      if (boxSizing === 'border-box') {
        maxHeight = maxHeight + paddingSize + borderSize;
      }

      height = Math.min(maxHeight, height);
    }
  }

  return {height, minHeight, maxHeight};
}

function calculateNodeStyling(node, useCache = false) {
  let nodeRef = (
    node.getAttribute('id') ||
    node.getAttribute('data-reactid') ||
    node.getAttribute('name')
  );

  if (useCache && computedStyleCache[nodeRef]) {
    return computedStyleCache[nodeRef];
  }

  let style = window.getComputedStyle(node);

  let boxSizing = (
    style.getPropertyValue('box-sizing') ||
    style.getPropertyValue('-moz-box-sizing') ||
    style.getPropertyValue('-webkit-box-sizing')
  );

  let paddingSize = (
    parseFloat(style.getPropertyValue('padding-bottom')) +
    parseFloat(style.getPropertyValue('padding-top'))
  );

  let borderSize = (
    parseFloat(style.getPropertyValue('border-bottom-width')) +
    parseFloat(style.getPropertyValue('border-top-width'))
  );

  let sizingStyle = SIZING_STYLE
    .map(name => `${name}:${style.getPropertyValue(name)}`)
    .join(';');

  let nodeInfo = {
    sizingStyle,
    paddingSize,
    borderSize,
    boxSizing,
  };

  if (useCache && nodeRef) {
    computedStyleCache[nodeRef] = nodeInfo;
  }

  return nodeInfo;
}
