import PropTypes from 'prop-types';
import React from 'react';

/* eslint-disable max-len */

const LabelledRadio = React.createClass({
  // Bootstrap's approach to exclusive options does not look particularly good nor does it produce
  // accessibility-friendly markup, so here's a touch of our own instead.  Uses some bootstrap
  // styles.
  propTypes: {
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    defaultChecked: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
  },

  styles: {
    radiolabel: {
      display: 'block',
      fontWeight: 'normal',
    },
    radio: {
      margin: '8px',
    },
  },

  render() {
    return (
      <label style={this.styles.radiolabel} htmlFor={this.props.id}>
        <input
          id={this.props.id}
          style={this.styles.radio}
          type="radio"
          name={this.props.name}
          onChange={this.props.onChange}
          value={this.props.value}
          defaultChecked={!!this.props.defaultChecked}
        />
        {this.props.label}
      </label>
    );
  },
});

const LabelledRadioGroup = React.createClass({
  propTypes: {
    header: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired, // The name of the exclusive group for the radio buttons
    options: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
      }).isRequired
    ).isRequired,
    onChange: PropTypes.func.isRequired,
    initialValue: PropTypes.string,
    help: PropTypes.string,
  },

  getInitialState() {
    return {
      value: this.props.initialValue,
    };
  },

  setValue(event) {
    const value = event.target.value;
    this.setState({
      value,
    });
    this.props.onChange(value);
  },

  styles: {
    radioheader: {
      fontWeight: 'bold',
    },
  },

  render() {
    const buttons = this.props.options.map((option, index) => {
      return (
        <LabelledRadio
          id={`radiobutton-${this.props.name}-${index}`}
          key={option.value}
          name={this.props.name}
          onChange={this.setValue}
          label={option.label}
          value={option.value}
          defaultChecked={this.state.value === option.value}
        />
      );
    });
    return (
      <div className="radio-group">
        <span style={this.styles.radioheader}>{this.props.header}</span>
        <fieldset>
          {buttons}
        </fieldset>
        {this.props.help && <span className="help-block">{this.props.help}</span>}
      </div>
    );
  },
});

export default LabelledRadioGroup;
