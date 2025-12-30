import type React from "react";
import { useCallback, useId, useState } from "react";
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
  group,
  value,
  label,
  defaultChecked,
  onChange,
}: {
  group: string;
  value: string;
  label: string | Element;
  defaultChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const id = useId();
  return (
    <RadioLabel htmlFor={id}>
      <Radio
        id={id}
        type="radio"
        name={group}
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
  options,
  onChange,
  initialValue,
  help,
}: {
  header: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  initialValue: string;
  help: string;
}) => {
  const [value, setValue] = useState<string>(initialValue);
  const group = useId();

  const onValueChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const v = event.target.value;
      setValue(v);
      onChange(v);
    },
    [onChange],
  );

  const buttons = options.map((option) => {
    return (
      <LabelledRadio
        key={option.value}
        group={group}
        onChange={onValueChanged}
        label={option.label}
        value={option.value}
        defaultChecked={value === option.value}
      />
    );
  });
  return (
    <div>
      <RadioHeader>{header}</RadioHeader>
      <fieldset>{buttons}</fieldset>
      {help && <span>{help}</span>}
    </div>
  );
};

export default LabelledRadioGroup;
