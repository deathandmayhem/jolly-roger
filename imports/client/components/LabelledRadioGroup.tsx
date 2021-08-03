import React, { useCallback, useState } from 'react';

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
const LabelledRadio = (props: LabelledRadioProps) => {
  return (
    <label style={labelledRadioStyles.radiolabel} htmlFor={props.id}>
      <input
        id={props.id}
        style={labelledRadioStyles.radio}
        type="radio"
        name={props.name}
        onChange={props.onChange}
        value={props.value}
        defaultChecked={!!props.defaultChecked}
      />
      {props.label}
    </label>
  );
};

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

const LabelledRadioGroup = (props: LabelledRadioGroupProps) => {
  const [value, setValue] = useState<string>(props.initialValue);

  const { onChange } = props;

  const onValueChanged = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const v = event.target.value;
    setValue(v);
    onChange(v);
  }, [onChange]);

  const buttons = props.options.map((option, index) => {
    return (
      <LabelledRadio
        id={`radiobutton-${props.name}-${index}`}
        key={option.value}
        name={props.name}
        onChange={onValueChanged}
        label={option.label}
        value={option.value}
        defaultChecked={value === option.value}
      />
    );
  });
  return (
    <div className="radio-group">
      <span style={labelledRadioGroupStyles.radioheader}>{props.header}</span>
      <fieldset>
        {buttons}
      </fieldset>
      {props.help && <span className="help-block">{props.help}</span>}
    </div>
  );
};

export default LabelledRadioGroup;
