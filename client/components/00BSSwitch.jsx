import React from 'react';
import BS from 'react-bootstrap';

const switchPropTypes = {
  bsSize: React.PropTypes.oneOf(['mini', 'small', 'normal', 'large']),
  animate: React.PropTypes.bool,
  inverse: React.PropTypes.bool,
  onColor: React.PropTypes.oneOf(['primary', 'info', 'success', 'warning', 'danger', 'default']),
  offColor: React.PropTypes.oneOf(['primary', 'info', 'success', 'warning', 'danger', 'default']),
  onText: React.PropTypes.string,
  offText: React.PropTypes.string,
  labelText: React.PropTypes.string,
};

BSSwitch = React.createClass({
  propTypes: _.extend(switchPropTypes, BS.Input.propTypes),

  getDefaultProps() {
    return {
      animate: true,
      inverse: false,
      onColor: 'primary',
      offColor: 'default',
      onText: 'ON',
      offText: 'OFF',
      labelText: '&nbsp;',
    };
  },

  getChecked() {
    return this.refs.checkbox.getChecked();
  },

  componentDidMount() {
    this.bsSwitch = $(this.refs.checkbox.getInputDOMNode()).bootstrapSwitch();
    this.bsSwitch.on('switchChange.bootstrapSwitch', (e, state) => {
      if (this.props.onChange) {
        this.props.onChange(e, state);
      }
    });
  },

  componentDidUpdate() {
    this.bsSwitch.bootstrapSwitch('state', this.props.checked);
    this.bsSwitch.bootstrapSwitch('size', this.props.bsSize);
    this.bsSwitch.bootstrapSwitch('animate', this.props.animate);
    this.bsSwitch.bootstrapSwitch('inverse', this.props.inverse);
    this.bsSwitch.bootstrapSwitch('onColor', this.props.onColor);
    this.bsSwitch.bootstrapSwitch('offColor', this.props.offColor);
    this.bsSwitch.bootstrapSwitch('onText', this.props.onText);
    this.bsSwitch.bootstrapSwitch('offText', this.props.offText);
    this.bsSwitch.bootstrapSwitch('labelText', this.props.labelText);
  },

  render() {
    const inputProps = _.omit(this.props, _.keys(switchPropTypes));
    const switchProps = {
      'data-size': this.props.bsSize,
      'data-animate': this.props.animate,
      'data-inverse': this.props.inverse,
      'data-on-color': this.props.onColor,
      'data-off-color': this.props.offColor,
      'data-on-text': this.props.onText,
      'data-off-text': this.props.offText,
      'data-label-text': this.props.labelText,
    };
    return <BS.Input ref="checkbox" type="checkbox" {..._.extend(inputProps, switchProps)}/>;
  },
});
