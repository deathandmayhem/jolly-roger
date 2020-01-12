import React from 'react';

/* eslint-disable max-len */

const labelledRadioStyles: Record<string, React.CSSProperties> = {
  radiolabel: {
    display: 'block',
    fontWeight: 'normal',
  },
  radio: {
    margin: '8px',
  },
};

interface LabelledRadioProps {
  id: string;
  // eslint-disable-next-line no-restricted-globals
  // The name of the exclusive group for the radio buttons
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Bootstrap's approach to exclusive options does not look particularly good nor
// does it produce accessibility-friendly markup, so here's a touch of our own
// instead.  Uses some bootstrap styles.
class LabelledRadio extends React.Component<LabelledRadioProps> {
  render() {
    return (
      <label style={labelledRadioStyles.radiolabel} htmlFor={this.props.id}>
        <input
          id={this.props.id}
          style={labelledRadioStyles.radio}
          type="radio"
          name={this.props.name}
          onChange={this.props.onChange}
          value={this.props.value}
          defaultChecked={!!this.props.defaultChecked}
        />
        {this.props.label}
      </label>
    );
  }
}

const labelledRadioGroupStyles: Record<string, React.CSSProperties> = {
  radioheader: {
    fontWeight: 'bold',
  },
};

interface LabelledRadioGroupProps {
  header: string;
  // eslint-disable-next-line no-restricted-globals
  name: string; // The name of the exclusive group for the radio buttons
  options: {label: string, value: string}[];
  onChange: (value: string) => void;
  initialValue: string;
  help: string;
}

interface LabelledRadioGroupState {
  value: string;
}

class LabelledRadioGroup extends React.Component<LabelledRadioGroupProps, LabelledRadioGroupState> {
  constructor(props: LabelledRadioGroupProps) {
    super(props);
    this.state = {
      value: this.props.initialValue,
    };
  }

  setValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    this.setState({
      value,
    });
    this.props.onChange(value);
  };

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
        <span style={labelledRadioGroupStyles.radioheader}>{this.props.header}</span>
        <fieldset>
          {buttons}
        </fieldset>
        {this.props.help && <span className="help-block">{this.props.help}</span>}
      </div>
    );
  }
}

export default LabelledRadioGroup;
