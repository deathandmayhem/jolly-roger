import { Meteor } from "meteor/meteor";
import React, { useCallback, useId, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import FormCheck from "react-bootstrap/FormCheck";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import Row from "react-bootstrap/Row";
import { useTranslation } from "react-i18next";
import type { ActionMeta } from "react-select";
import { useTheme } from "styled-components";
import type { GdriveMimeTypesType } from "../../lib/GdriveMimeTypes";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import { useAddPuzzleHuntRecentTags } from "../hooks/persisted-state";
import LabelledRadioGroup from "./LabelledRadioGroup";

// Casting away the React.lazy because otherwise we lose access to the generic parameter
const Creatable = React.lazy(
  () => import("react-select/creatable"),
) as typeof import("react-select/creatable").default;

export type TagSelectOption = { value: string; label: string };

export interface PuzzleModalFormSubmitPayload {
  huntId: string;
  title: string;
  url: string | undefined;
  tags: string[];
  docType?: GdriveMimeTypesType;
  expectedAnswerCount: number;
  allowDuplicateUrls?: boolean;
  completedWithNoAnswer?: boolean;
}

export enum PuzzleModalFormSubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  FAILED = "failed",
}

export interface UsePuzzleFormDefaults {
  title?: string;
  url?: string;
}

export interface UsePuzzleFormArgs {
  huntId: string;
  tags: TagType[];
  onSubmit: (
    payload: PuzzleModalFormSubmitPayload,
    callback: (error?: Error) => void,
  ) => void;
  puzzle?: PuzzleType;
  defaults?: UsePuzzleFormDefaults;
}

export interface UsePuzzleFormResult {
  title: string;
  fields: React.ReactNode;
  submit: (callback?: () => void) => void;
  reset: () => void;
  disabled: boolean;
}

export const usePuzzleForm = ({
  huntId,
  tags: propsTags,
  onSubmit,
  puzzle,
  defaults,
}: UsePuzzleFormArgs): UsePuzzleFormResult => {
  const tagNamesForIds = useCallback(
    (tagIds: string[]) => {
      const tagNames: Record<string, string> = {};
      propsTags.forEach((t) => {
        tagNames[t._id] = t.name;
      });
      return tagIds.map((t) => tagNames[t] ?? t);
    },
    [propsTags],
  );

  const [title, setTitle] = useState(puzzle?.title ?? defaults?.title ?? "");
  const [url, setUrl] = useState(puzzle?.url ?? defaults?.url ?? "");
  const [tags, setTags] = useState(puzzle ? tagNamesForIds(puzzle.tags) : []);
  const [docType, setDocType] = useState<GdriveMimeTypesType | undefined>(
    puzzle ? undefined : "spreadsheet",
  );
  const [expectedAnswerCount, setExpectedAnswerCount] = useState(
    puzzle ? puzzle.expectedAnswerCount : 1,
  );
  const [considerCompletedWithNoAnswer, setConsiderCompletedWithNoAnswer] =
    useState(puzzle?.completedWithNoAnswer);
  const [confirmingDuplicateUrl, setConfirmingDuplicateUrl] = useState(false);
  const [allowDuplicateUrls, setAllowDuplicateUrls] = useState(
    puzzle ? undefined : false,
  );
  const [submitState, setSubmitState] = useState(
    PuzzleModalFormSubmitState.IDLE,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [titleDirty, setTitleDirty] = useState(false);
  const [urlDirty, setUrlDirty] = useState(false);
  const [tagsDirty, setTagsDirty] = useState(false);
  const [expectedAnswerCountDirty, setExpectedAnswerCountDirty] =
    useState(false);
  const [
    considerCompletedWithNoAnswerDirty,
    setConsiderCompletedWithNoAnswerDirty,
  ] = useState(false);

  const [recentTags, addPuzzleHuntRecentTags] =
    useAddPuzzleHuntRecentTags(huntId);

  const onTitleChange: NonNullable<FormControlProps["onChange"]> = useCallback(
    (event) => {
      setTitle(event.currentTarget.value);
      setTitleDirty(true);
    },
    [],
  );

  const onUrlChange: NonNullable<FormControlProps["onChange"]> = useCallback(
    (event) => {
      setUrl(event.currentTarget.value);
      setUrlDirty(true);
    },
    [],
  );

  const onTagsChange = useCallback(
    (
      value: readonly TagSelectOption[],
      action: ActionMeta<TagSelectOption>,
    ) => {
      let newTags = [];
      switch (action.action) {
        case "clear":
        case "create-option":
        case "deselect-option":
        case "pop-value":
        case "remove-value":
        case "select-option":
          newTags = value.map((v) => v.value);
          break;
        default:
          return;
      }

      setTags(newTags);
      setTagsDirty(true);
    },
    [],
  );

  const onDocTypeChange = useCallback((newValue: string) => {
    setDocType(newValue as GdriveMimeTypesType);
  }, []);

  const onExpectedAnswerCountChange: NonNullable<FormControlProps["onChange"]> =
    useCallback((event) => {
      const string = event.currentTarget.value;
      const value = Number(string);
      setExpectedAnswerCount(value);
      setExpectedAnswerCountDirty(true);
      if (value === 0) {
        setConsiderCompletedWithNoAnswer(false);
      } else {
        setConsiderCompletedWithNoAnswer(undefined);
      }
      setConsiderCompletedWithNoAnswerDirty(true);
    }, []);

  const onAllowDuplicateUrlsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAllowDuplicateUrls(event.currentTarget.checked);
    },
    [],
  );

  const onConsiderSolvedWithNoAnswerChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setConsiderCompletedWithNoAnswer(event.currentTarget.checked);
      setConsiderCompletedWithNoAnswerDirty(true);
    },
    [],
  );

  const { t } = useTranslation();

  const currentTitle = useMemo(() => {
    if (!titleDirty && puzzle) {
      return puzzle.title;
    } else {
      return title;
    }
  }, [titleDirty, puzzle, title]);

  const currentUrl = useMemo(() => {
    if (!urlDirty && puzzle) {
      // Always make this a string so that currentUrl is not undefined, which
      // makes React confused about whether the input is controller or not.
      // If the string is empty, we'll turn it back into undefined in onFormSubmit.
      return puzzle.url ?? "";
    } else {
      return url;
    }
  }, [urlDirty, puzzle, url]);

  const currentTags = useMemo(() => {
    if (!tagsDirty && puzzle) {
      return tagNamesForIds(puzzle.tags);
    } else {
      return tags;
    }
  }, [tagsDirty, puzzle, tagNamesForIds, tags]);

  const currentExpectedAnswerCount = useMemo(() => {
    if (!expectedAnswerCountDirty && puzzle) {
      return puzzle.expectedAnswerCount;
    } else {
      return expectedAnswerCount;
    }
  }, [expectedAnswerCountDirty, puzzle, expectedAnswerCount]);

  const currentConsiderCompletedWithNoAnswer = useMemo(() => {
    if (!considerCompletedWithNoAnswerDirty && puzzle) {
      return puzzle.completedWithNoAnswer ?? false;
    } else {
      return considerCompletedWithNoAnswer ?? false;
    }
  }, [
    considerCompletedWithNoAnswerDirty,
    puzzle,
    considerCompletedWithNoAnswer,
  ]);

  const addTag = useCallback(
    (tag: string) => {
      if (currentTags.includes(tag)) return;
      setTags([...currentTags, tag]);
      setTagsDirty(true);
    },
    [currentTags],
  );

  const submit = useCallback(
    (callback?: () => void) => {
      setSubmitState(PuzzleModalFormSubmitState.SUBMITTING);
      const payload: PuzzleModalFormSubmitPayload = {
        huntId,
        title: currentTitle,
        url: currentUrl !== "" ? currentUrl : undefined, // Make sure we send undefined if url is falsy
        tags: currentTags,
        expectedAnswerCount: currentExpectedAnswerCount,
        completedWithNoAnswer: currentConsiderCompletedWithNoAnswer,
      };
      if (docType) {
        payload.docType = docType;
      }
      if (allowDuplicateUrls) {
        payload.allowDuplicateUrls = allowDuplicateUrls;
      }
      onSubmit(payload, (error) => {
        if (error) {
          if (
            error instanceof Meteor.Error &&
            typeof error.error === "number" &&
            error.error === 409
          ) {
            setErrorMessage(
              t(
                "puzzle.edit.duplicateUrlWarning",
                `A puzzle already exists with this URL - did someone else
                    already add this puzzle? To force creation anyway, check
                  the "Allow puzzles with identical URLs" box above and try
                  again.`,
              ),
            );
            setConfirmingDuplicateUrl(true);
          } else {
            setErrorMessage(error.message);
          }
          setSubmitState(PuzzleModalFormSubmitState.FAILED);
        } else {
          setSubmitState(PuzzleModalFormSubmitState.IDLE);
          setErrorMessage("");
          setTitleDirty(false);
          setUrlDirty(false);
          setTagsDirty(false);
          setExpectedAnswerCountDirty(false);
          setConsiderCompletedWithNoAnswerDirty(false);
          setConfirmingDuplicateUrl(false);
          setAllowDuplicateUrls(false);
          if (!puzzle) {
            addPuzzleHuntRecentTags(currentTags);
          }
          callback?.();
        }
      });
    },
    [
      onSubmit,
      puzzle,
      huntId,
      currentTitle,
      currentUrl,
      currentTags,
      currentExpectedAnswerCount,
      currentConsiderCompletedWithNoAnswer,
      docType,
      allowDuplicateUrls,
      addPuzzleHuntRecentTags,
      t,
    ],
  );

  const reset = useCallback(() => {
    setTitle(puzzle?.title ?? defaults?.title ?? "");
    setUrl(puzzle?.url ?? defaults?.url ?? "");
    setTags(puzzle ? tagNamesForIds(puzzle.tags) : []);
    setExpectedAnswerCount(puzzle ? puzzle.expectedAnswerCount : 1);
    setDocType(puzzle ? undefined : "spreadsheet");
    setConsiderCompletedWithNoAnswer(puzzle?.completedWithNoAnswer);
    setTitleDirty(false);
    setUrlDirty(false);
    setTagsDirty(false);
    setExpectedAnswerCountDirty(false);
    setConsiderCompletedWithNoAnswerDirty(false);
    setConfirmingDuplicateUrl(false);
    setAllowDuplicateUrls(puzzle ? undefined : false);
    setSubmitState(PuzzleModalFormSubmitState.IDLE);
    setErrorMessage("");
  }, [puzzle, defaults?.title, defaults?.url, tagNamesForIds]);

  const disableForm = submitState === PuzzleModalFormSubmitState.SUBMITTING;

  const selectOptions: TagSelectOption[] = [
    ...propsTags.map((t) => t.name),
    ...tags,
  ]
    .filter(Boolean)
    .map((t) => {
      return { value: t, label: t };
    });

  const knownTagNames = useMemo(
    () => new Set(propsTags.map((t) => t.name)),
    [propsTags],
  );

  const unselectedRecentTags = useMemo(
    () =>
      recentTags.filter(
        (rt) => knownTagNames.has(rt) && !currentTags.includes(rt),
      ),
    [recentTags, knownTagNames, currentTags],
  );

  const idPrefix = useId();

  const docTypeSelector =
    !puzzle && docType ? (
      <FormGroup as={Row} className="mb-3">
        <FormLabel column xs={3}>
          {t("puzzle.edit.documentType", "Document type")}
        </FormLabel>
        <Col xs={9}>
          <LabelledRadioGroup
            header=""
            options={[
              {
                value: "spreadsheet",
                label: "Spreadsheet",
              },
              {
                value: "document",
                label: "Document",
              },
            ]}
            initialValue={docType}
            help={t(
              "puzzle.edit.documentTypeHelp",
              `This can't be changed once a puzzle has been created. Unless
                you're absolutely sure, use a spreadsheet. We only expect to
                use documents for administrivia.`,
            )}
            onChange={onDocTypeChange}
          />
        </Col>
      </FormGroup>
    ) : null;

  const allowDuplicateUrlsCheckbox =
    !puzzle && allowDuplicateUrls !== undefined && confirmingDuplicateUrl ? (
      <FormCheck
        id={`${idPrefix}-allow-duplicate-urls`}
        label={t(
          "puzzle.edit.allowDuplicateUrls",
          "Allow puzzles with identical URLs",
        )}
        type="checkbox"
        disabled={disableForm}
        onChange={onAllowDuplicateUrlsChange}
        className="mt-1"
      />
    ) : null;

  const theme = useTheme();

  const formTitle = puzzle
    ? t("puzzle.edit.editPuzzle", "Edit puzzle")
    : t("puzzle.edit.addPuzzle", "Add puzzle");

  const formFields = (
    <>
      <FormGroup
        as={Row}
        className="mb-3"
        controlId={`${idPrefix}-new-puzzle-title`}
      >
        <FormLabel column xs={3}>
          {t("puzzle.edit.title", "Title")}
        </FormLabel>
        <Col xs={9}>
          <FormControl
            type="text"
            autoFocus
            disabled={disableForm}
            onChange={onTitleChange}
            value={currentTitle}
          />
        </Col>
      </FormGroup>

      <FormGroup
        as={Row}
        className="mb-3"
        controlId={`${idPrefix}-new-puzzle-url`}
      >
        <FormLabel column xs={3}>
          {t("puzzle.edit.url", "URL")}
        </FormLabel>
        <Col xs={9}>
          <FormControl
            type="text"
            disabled={disableForm}
            onChange={onUrlChange}
            value={currentUrl}
          />
          {allowDuplicateUrlsCheckbox}
        </Col>
      </FormGroup>

      <FormGroup
        as={Row}
        className="mb-3"
        controlId={`${idPrefix}-new-puzzle-tags`}
      >
        <FormLabel column xs={3}>
          {t("puzzle.edit.tags", "Tags")}
        </FormLabel>
        <Col xs={9}>
          <Creatable
            id={`${idPrefix}-new-puzzle-tags`}
            theme={theme.reactSelectTheme}
            options={selectOptions}
            isMulti
            isDisabled={disableForm}
            onChange={onTagsChange}
            value={currentTags.map((t) => {
              return { label: t, value: t };
            })}
          />
          {unselectedRecentTags.length > 0 && (
            <div className="mt-1 d-flex flex-wrap gap-1 align-items-center">
              <small className="text-muted me-1">
                {t("puzzle.edit.recentTags", "Recent:")}
              </small>
              {unselectedRecentTags.map((recentTag) => (
                <Button
                  key={recentTag}
                  variant="outline-secondary"
                  size="sm"
                  className="py-0 px-1"
                  style={{ fontSize: "0.8rem" }}
                  disabled={disableForm}
                  onClick={() => addTag(recentTag)}
                >
                  +{recentTag}
                </Button>
              ))}
            </div>
          )}
        </Col>
      </FormGroup>

      {docTypeSelector}

      <FormGroup
        as={Row}
        className="mb-3"
        controlId={`${idPrefix}-new-puzzle-expected-answer-count`}
      >
        <FormLabel column xs={3}>
          {t("puzzle.edit.answerCount", "Expected # of answers")}
        </FormLabel>
        <Col xs={9}>
          <FormControl
            type="number"
            disabled={disableForm}
            onChange={onExpectedAnswerCountChange}
            value={currentExpectedAnswerCount}
            min={0}
            step={1}
          />
        </Col>
      </FormGroup>

      {currentExpectedAnswerCount === 0 ? (
        <FormCheck
          id={`${idPrefix}-solved-with-no-answers`}
          label={t(
            "puzzle.edit.considerSolvedWithNoAnswer",
            "Consider solved with no answers",
          )}
          type="checkbox"
          checked={currentConsiderCompletedWithNoAnswer}
          disabled={disableForm}
          onChange={onConsiderSolvedWithNoAnswerChange}
          className="mt-1"
        />
      ) : undefined}

      {submitState === PuzzleModalFormSubmitState.FAILED && (
        <Alert variant="danger">{errorMessage}</Alert>
      )}
    </>
  );

  return {
    title: formTitle,
    fields: formFields,
    submit,
    reset,
    disabled: disableForm,
  };
};
