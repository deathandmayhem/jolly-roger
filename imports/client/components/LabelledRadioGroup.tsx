import React, { useCallback, useState } from "react";
import styled from "styled-components";

const RadioHeader = styled.span`
  font-weight: bold;
`;

const RadioLabel = styled.label`
  display: block;
  font-weight: normal;
`;

const Radio = styled.input`
  margin: 8px;
`;

// Bootstrap's approach to exclusive options does not look particularly good nor
// does it produce accessibility-friendly markup, so here's a touch of our own
// instead.  Uses some bootstrap styles.
const LabelledRadio = ({
  id,
  name,
  value,
  label,
  defaultChecked,
  onChange,
}: {
  id: string;
  // The name of the exclusive group for the radio buttons
  name: string;
  value: string;
  label: string | Element;
  defaultChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <RadioLabel htmlFor={id}>
      <Radio
        id={id}
        type="radio"
        name={name}
        onChange={onChange}
        value={value}
        defaultChecked={!!defaultChecked}
      />
      {label}
    </RadioLabel>
  );
};

const LabelledRadioGroup = ({
  header,
  name,
  options,
  onChange,
  initialValue,
  help,
}: {
  header: string;
  name: string; // The name of the exclusive group for the radio buttons
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  initialValue: string;
  help: string;
}) => {
  const [value, setValue] = useState<string>(initialValue);

  const onValueChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const v = event.target.value;
      setValue(v);
      onChange(v);
    },
    [onChange],
  );

  const buttons = options.map((option, index) => {
    return (
      <LabelledRadio
        id={`radiobutton-${name}-${index}`}
        key={option.value}
        name={name}
        onChange={onValueChanged}
        label={option.label}
        value={option.value}
        defaultChecked={value === option.value}
      />
    );
  });
  return (
    <div className="radio-group">
      <RadioHeader>{header}</RadioHeader>
      <fieldset>{buttons}</fieldset>
      {help && <span className="help-block">{help}</span>}
    </div>
  );
};

export default LabelledRadioGroup;
