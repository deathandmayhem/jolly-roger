import React, {
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Col from "react-bootstrap/Col";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import Row from "react-bootstrap/Row";
import type { ActionMeta } from "react-select";
import type { GdriveMimeTypesType } from "../../lib/GdriveMimeTypes";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import LabelledRadioGroup from "./LabelledRadioGroup";
import Loading from "./Loading";
import type { ModalFormHandle } from "./ModalForm";
import ModalForm from "./ModalForm";

// Casting away the React.lazy because otherwise we lose access to the generic parameter
const Creatable = React.lazy(
  () => import("react-select/creatable"),
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
) as typeof import("react-select/creatable").default;

type TagSelectOption = { value: string; label: string };

export interface PuzzleModalFormSubmitPayload {
  huntId: string;
  title: string;
  url: string | undefined;
  tags: string[];
  docType?: GdriveMimeTypesType;
  expectedAnswerCount: number;
}

enum PuzzleModalFormSubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  FAILED = "failed",
}

export type PuzzleModalFormHandle = {
  reset: () => void;
  show: () => void;
};

const PuzzleModalForm = React.forwardRef(
  (
    {
      huntId,
      puzzle,
      tags: propsTags,
      onSubmit,
      showOnMount,
    }: {
      huntId: string;
      puzzle?: PuzzleType;
      // All known tags for this hunt
      tags: TagType[];
      onSubmit: (
        payload: PuzzleModalFormSubmitPayload,
        callback: (error?: Error) => void,
      ) => void;
      showOnMount?: boolean;
    },
    forwardedRef: React.Ref<PuzzleModalFormHandle>,
  ) => {
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

    const [title, setTitle] = useState<string>(puzzle?.title ?? "");
    const [url, setUrl] = useState<string>(puzzle?.url ?? "");
    const [tags, setTags] = useState<string[]>(
      puzzle ? tagNamesForIds(puzzle.tags) : [],
    );
    const [docType, setDocType] = useState<GdriveMimeTypesType | undefined>(
      puzzle ? undefined : "spreadsheet",
    );
    const [expectedAnswerCount, setExpectedAnswerCount] = useState<number>(
      puzzle ? puzzle.expectedAnswerCount : 1,
    );
    const [submitState, setSubmitState] = useState<PuzzleModalFormSubmitState>(
      PuzzleModalFormSubmitState.IDLE,
    );
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [titleDirty, setTitleDirty] = useState<boolean>(false);
    const [urlDirty, setUrlDirty] = useState<boolean>(false);
    const [tagsDirty, setTagsDirty] = useState<boolean>(false);
    const [expectedAnswerCountDirty, setExpectedAnswerCountDirty] =
      useState<boolean>(false);

    const formRef = useRef<ModalFormHandle>(null);

    const onTitleChange: NonNullable<FormControlProps["onChange"]> =
      useCallback((event) => {
        setTitle(event.currentTarget.value);
        setTitleDirty(true);
      }, []);

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

    const onExpectedAnswerCountChange: NonNullable<
      FormControlProps["onChange"]
    > = useCallback((event) => {
      const string = event.currentTarget.value;
      const value = Number(string);
      setExpectedAnswerCount(value);
      setExpectedAnswerCountDirty(true);
    }, []);

    const onFormSubmit = useCallback(
      (callback: () => void) => {
        setSubmitState(PuzzleModalFormSubmitState.SUBMITTING);
        const payload: PuzzleModalFormSubmitPayload = {
          huntId,
          title,
          url: url !== "" ? url : undefined, // Make sure we send undefined if url is falsy
          tags,
          expectedAnswerCount,
        };
        if (docType) {
          payload.docType = docType;
        }
        onSubmit(payload, (error) => {
          if (error) {
            setErrorMessage(error.message);
            setSubmitState(PuzzleModalFormSubmitState.FAILED);
          } else {
            setSubmitState(PuzzleModalFormSubmitState.IDLE);
            setErrorMessage("");
            setTitleDirty(false);
            setUrlDirty(false);
            setTagsDirty(false);
            setExpectedAnswerCountDirty(false);
            callback();
          }
        });
      },
      [onSubmit, huntId, title, url, tags, expectedAnswerCount, docType],
    );

    const show = useCallback(() => {
      if (formRef.current) {
        formRef.current.show();
      }
    }, []);

    const reset = useCallback(() => {
      setTitle("");
      setUrl("");
      setTags([]);
      setExpectedAnswerCount(1);
      setDocType("spreadsheet");
    }, []);

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

    useImperativeHandle(forwardedRef, () => ({
      show,
      reset,
    }));

    useEffect(() => {
      if (showOnMount) {
        show();
      }
    }, [showOnMount, show]);

    const disableForm = submitState === PuzzleModalFormSubmitState.SUBMITTING;

    const selectOptions: TagSelectOption[] = [
      ...propsTags.map((t) => t.name),
      ...tags,
    ]
      .filter(Boolean)
      .map((t) => {
        return { value: t, label: t };
      });

    const docTypeSelector =
      !puzzle && docType ? (
        <FormGroup as={Row} className="mb-3">
          <FormLabel column xs={3} htmlFor="jr-new-puzzle-doc-type">
            Document type
          </FormLabel>
          <Col xs={9}>
            <LabelledRadioGroup
              header=""
              name="jr-new-puzzle-doc-type"
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
              help="This can't be changed once a puzzle has been created. Unless you're absolutely sure, use a spreadsheet. We only expect to use documents for administrivia."
              onChange={onDocTypeChange}
            />
          </Col>
        </FormGroup>
      ) : null;

    return (
      <Suspense
        fallback={
          <div>
            <Loading />
          </div>
        }
      >
        <ModalForm
          ref={formRef}
          title={puzzle ? "Edit puzzle" : "Add puzzle"}
          onSubmit={onFormSubmit}
          submitDisabled={disableForm}
        >
          <FormGroup as={Row} className="mb-3">
            <FormLabel column xs={3} htmlFor="jr-new-puzzle-title">
              Title
            </FormLabel>
            <Col xs={9}>
              <FormControl
                id="jr-new-puzzle-title"
                type="text"
                autoFocus
                disabled={disableForm}
                onChange={onTitleChange}
                value={currentTitle}
              />
            </Col>
          </FormGroup>

          <FormGroup as={Row} className="mb-3">
            <FormLabel column xs={3} htmlFor="jr-new-puzzle-url">
              URL
            </FormLabel>
            <Col xs={9}>
              <FormControl
                id="jr-new-puzzle-url"
                type="text"
                disabled={disableForm}
                onChange={onUrlChange}
                value={currentUrl}
              />
            </Col>
          </FormGroup>

          <FormGroup as={Row} className="mb-3">
            <FormLabel column xs={3} htmlFor="jr-new-puzzle-tags">
              Tags
            </FormLabel>
            <Col xs={9}>
              <Creatable
                id="jr-new-puzzle-tags"
                options={selectOptions}
                isMulti
                isDisabled={disableForm}
                onChange={onTagsChange}
                value={currentTags.map((t) => {
                  return { label: t, value: t };
                })}
              />
            </Col>
          </FormGroup>

          {docTypeSelector}

          <FormGroup as={Row} className="mb-3">
            <FormLabel
              column
              xs={3}
              htmlFor="jr-new-puzzle-expected-answer-count"
            >
              Expected # of answers
            </FormLabel>
            <Col xs={9}>
              <FormControl
                id="jr-new-puzzle-expected-answer-count"
                type="number"
                disabled={disableForm}
                onChange={onExpectedAnswerCountChange}
                value={currentExpectedAnswerCount}
                min={0}
                step={1}
              />
            </Col>
          </FormGroup>

          {submitState === PuzzleModalFormSubmitState.FAILED && (
            <Alert variant="danger">{errorMessage}</Alert>
          )}
        </ModalForm>
      </Suspense>
    );
  },
);

export default PuzzleModalForm;
