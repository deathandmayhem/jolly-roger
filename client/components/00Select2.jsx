// Based on https://github.com/rkit/react-select2-wrapper/blob/57188cb291989140a14d9224f47317fcc61b5f65/src/components/Select2.js
//
// The MIT License (MIT)
//
// Copyright (c) 2015 Igor Romanov
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const {Component, PropTypes} = React;

ReactSelect2 = React.createClass({
  propTypes: {
    data: PropTypes.array,
    value: PropTypes.any,
    events: PropTypes.array,
    options: PropTypes.object,
    multiple: PropTypes.bool,
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
    onSelect: PropTypes.func,
    onChange: PropTypes.func,
    onUnselect: PropTypes.func,
  },

  getDefaultProps() {
    return {
      data: [],
      events: [
        ['change', 'onChange'],
        ['select2:open', 'onOpen'],
        ['select2:close', 'onClose'],
        ['select2:select', 'onSelect'],
        ['select2:unselect', 'onUnselect'],
      ],
      options: {},
      multiple: false,
    };
  },

  componentDidMount() {
    this.el = $(ReactDOM.findDOMNode(this));
    this.el.select2(this.props.options);

    this.props.events.forEach(event => {
      this.el.on(event[0], this.props[event[1]]);
    });
  },

  componentWillUnmount() {
    this.el.select2('destroy');
  },

  componentDidUpdate() {
    if (_.difference(this.el.val(), this.props.value).length !== 0 ||
        _.difference(this.props.value, this.el.val()).length !== 0) {
      this.el.val(this.props.value).trigger('change');
    }
  },

  render() {
    const remaining = _.omit(this.props, 'value', 'data', 'options', 'events', 'onOpen', 'onClose', 'onSelect', 'onChange', 'onUnselect');

    return (
      <select ref="select" {...remaining}>
        {this.props.data.map((item, k) => {
          if (typeof item === 'string' ||
              ((!!item && typeof item === 'object') && Object.prototype.toString.call(item) === '[object String]')) {
            return (<option key={'option-' + k} value={item}>{item}</option>);
          }

          return (<option key={'option-' + k} value={item.id}>{item.text}</option>);
        })}
      </select>
    );
  },
});
