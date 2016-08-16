import React from 'react';
import { Random } from 'meteor/random';

/* eslint-disable max-len */

const LabelledRadio = React.createClass({
  // Bootstrap's approach to exclusive options does not look particularly good nor does it produce
  // accessibility-friendly markup, so here's a touch of our own instead.  Uses some bootstrap
  // styles.
  propTypes: {
    name: React.PropTypes.string.isRequired,
    value: React.PropTypes.string.isRequired,
    label: React.PropTypes.string.isRequired,
    defaultChecked: React.PropTypes.bool,
    onChange: React.PropTypes.func.isRequired,
  },

  componentWillMount() {
    this.id = Random.id();
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
      <label style={this.styles.radiolabel} htmlFor={this.id}>
        <input
          id={this.id}
          style={this.styles.radio}
          type="radio"
          name={this.props.name}
          onChange={this.props.onChange}
          value={this.props.value}
          defaultChecked={!!this.props.defaultChecked}
        />{this.props.label}
      </label>
    );
  },
});

const LabelledRadioGroup = React.createClass({
  propTypes: {
    header: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired, // The name of the exclusive group for the radio buttons
    options: React.PropTypes.arrayOf(
      React.PropTypes.shape({
        label: React.PropTypes.string.isRequired,
        value: React.PropTypes.string.isRequired,
      }).isRequired
    ).isRequired,
    onChange: React.PropTypes.func.isRequired,
    initialValue: React.PropTypes.string,
    help: React.PropTypes.string,
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
    let buttons = this.props.options.map((option) => {
      return (
        <LabelledRadio
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

export { LabelledRadioGroup };
