import { useTracker } from "meteor/react-meteor-data";
import React, { Suspense, useCallback } from "react";
import styled, { useTheme } from "styled-components";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import Loading from "./Loading";
import { Theme } from "../theme";

// Casting away the React.lazy because otherwise we lose access to the generic parameter
const Creatable = React.lazy(
  () => import("react-select/creatable"),
) as typeof import("react-select/creatable").default;

const TagEditorSpan = styled.span<{ theme: Theme }>`
  display: inline;
  min-width: 200px;
  flex-basis: 100%;
  margin: 2px 0;
  background-color: ${({ theme }) => theme.colors.background};
`;

const TagEditor = ({
  puzzle,
  onSubmit,
  onCancel,
}: {
  puzzle: PuzzleType;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) => {
  const allTags = useTracker(() => {
    return Tags.find({ hunt: puzzle.hunt }).fetch();
  }, [puzzle.hunt]);

  const onBlur = useCallback(() => {
    // Treat blur as "no I didn't mean to do that".  We may have to change this
    // once we have autocomplete .
    onCancel();
  }, [onCancel]);

  const options = allTags
    .map((t) => t.name)
    .filter(Boolean)
    .map((t) => {
      return { value: t, label: t };
    })
    .sort((a, b) => {
      const aLower = a.label.toLowerCase();
      const bLower = b.label.toLowerCase();
      return aLower.localeCompare(bLower);
    });

  const theme = useTheme();

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`,
      boxShadow: "none", // Remove default box shadow
      "&:hover": {
        borderColor: theme.colors.borderHover,
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? theme.colors.primary
        : state.isFocused
          ? theme.colors.backgroundHover
          : theme.colors.background,
      color: theme.colors.text,
      "&:hover": {
        backgroundColor: theme.colors.backgroundHover,
      },
    }),
    input: (provided: any) => ({
      ...provided,
      color: theme.colors.text,
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: theme.colors.text,
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: theme.colors.textSecondary,
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: theme.colors.multiValueBackground,
      color: theme.colors.text,
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: theme.colors.text,
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: theme.colors.text,
      "&:hover": {
        backgroundColor: theme.colors.multiValueRemoveHover,
        color: theme.colors.text,
      },
    }),
    clearIndicator: (provided: any) => ({
      ...provided,
      color: theme.colors.textSecondary,
      "&:hover": {
        color: theme.colors.text,
      },
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: theme.colors.textSecondary,
      "&:hover": {
        color: theme.colors.text,
      },
    }),
  };

  return (
    <Suspense fallback={<Loading inline />}>
      <TagEditorSpan>
        <Creatable
          options={options}
          autoFocus
          openMenuOnFocus
          onChange={(v) => v && onSubmit(v.value)}
          onBlur={onBlur}
          styles={customStyles}
        />
      </TagEditorSpan>
    </Suspense>
  );
};

export default TagEditor;
