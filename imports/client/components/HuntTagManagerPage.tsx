import { useTracker } from "meteor/react-meteor-data";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTags } from "@fortawesome/free-solid-svg-icons/faTags";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  type ChangeEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import InputGroup from "react-bootstrap/InputGroup";
import Row from "react-bootstrap/Row";
import type { FormProps } from "react-router-dom";
import { useParams } from "react-router-dom";
import type { ActionMeta } from "react-select";
import Select from "react-select";
import styled, { css, useTheme } from "styled-components";
import { indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import Tags from "../../lib/models/Tags";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import type { Solvedness } from "../../lib/solvedness";
import { computeSolvedness } from "../../lib/solvedness";
import addPuzzleTag from "../../methods/addPuzzleTag";
import removePuzzleTag from "../../methods/removePuzzleTag";
import renameTag from "../../methods/renameTag";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import { compilePuzzleMatcher } from "../search";
import type { ModalFormHandle } from "./ModalForm";
import ModalForm from "./ModalForm";
import { mediaBreakpointDown } from "./styling/responsive";
import TagList from "./TagList";

enum SubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  FAILED = "failed",
}

type TagSelectOption = { value: string; label: string };

const SearchFormGroup = styled(FormGroup)`
  grid-column: -3;
  ${mediaBreakpointDown(
    "sm",
    css`
      grid-column: 1 / -1;
    `,
  )}
`;

const PuzzleListToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5em;
`;

const TagPuzzleDiv = styled.div<{ $solvedness: Solvedness }>`
  background-color: ${({ theme, $solvedness }) => {
    return theme.colors.solvedness[$solvedness];
  }};
  display: flex;
  flex-direction: row;
  align-items: first baseline;
  justify-content: flex-start;
  line-height: 24px;
  padding: 4px 2px;
  margin-bottom: 4px;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex-wrap: wrap;
    `,
  )}
`;

const PuzzleColumn = styled.div`
  padding: 0 2px;
  display: inline-block;
  flex: none;
  overflow: hidden;
`;

const PuzzleControlButtonsColumn = styled(PuzzleColumn)`
  align-self: flex-start;
  order: -1;
`;

const PuzzleTitleColumn = styled(PuzzleColumn)`
  flex: 4;
  overflow-wrap: break-word;
  order: -1;
`;

const TagManagerTagListColumn = styled(TagList)`
  padding: 0 2px;
  display: inline-block;
  flex: 3;
  margin: -2px -4px -2px 0;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex: 0 0 100%;
    `,
  )}
`;

const TagPuzzle = React.memo(
  ({
    puzzle,
    allTags,
    bulkTags,
  }: {
    puzzle: PuzzleType;
    allTags: TagType[];
    bulkTags: string[];
  }) => {
    const solvedness = computeSolvedness(puzzle);

    const tagIndex = indexedById(allTags);
    const puzzleTags = puzzle.tags.map((tagId) => {
      return tagIndex.get(tagId)!;
    });

    return (
      <TagPuzzleDiv $solvedness={solvedness}>
        <PuzzleControlButtonsColumn>
          <TagToggleButtons
            puzzle={puzzle}
            bulkTags={bulkTags}
            allTags={allTags}
          />
        </PuzzleControlButtonsColumn>
        <PuzzleTitleColumn>{puzzle.title}</PuzzleTitleColumn>
        <TagManagerTagListColumn
          puzzle={puzzle}
          tags={puzzleTags}
          linkToSearch
          popoverRelated={false}
        />
      </TagPuzzleDiv>
    );
  },
);

const PuzzlesForTagList = React.memo(
  ({
    puzzles,
    allTags,
    bulkTags,
  }: {
    puzzles: PuzzleType[];
    allTags: TagType[];
    bulkTags: string[];
  }) => {
    return (
      <div>
        {puzzles.map((puzzle) => {
          return (
            <TagPuzzle
              key={puzzle._id}
              puzzle={puzzle}
              allTags={allTags}
              bulkTags={bulkTags}
            />
          );
        })}
      </div>
    );
  },
);

const TagToggleButtons = React.memo(
  ({
    puzzle,
    allTags,
    bulkTags,
  }: {
    puzzle: PuzzleType;
    allTags: TagType[];
    bulkTags: string[];
  }) => {
    const tagNamesForIds = useCallback(
      (tagIds: string[]) => {
        const tagNames: Record<string, string> = {};
        allTags.forEach((t) => {
          tagNames[t._id] = t.name;
        });
        return tagIds.map((t) => tagNames[t] ?? t);
      },
      [allTags],
    );

    const puzzleId = puzzle._id;
    const removeBulkTagsFromPuzzle = useCallback(() => {
      bulkTags.forEach((tagId) => {
        if (puzzle.tags.includes(tagId)) {
          removePuzzleTag.call({ puzzleId, tagId });
        }
      });
      return false;
    }, [puzzleId, bulkTags, puzzle.tags]);
    const addBulkTagsToPuzzle = useCallback(() => {
      bulkTags.forEach((tagId) => {
        if (!puzzle.tags.includes(tagId)) {
          const tagName = tagNamesForIds([tagId])[0] ?? "";
          addPuzzleTag.call({ puzzleId, tagName });
        }
      });
      return false;
    }, [puzzleId, bulkTags, tagNamesForIds, puzzle.tags]);

    const disableBulkTagActions = bulkTags.length === 0;
    const disableBulkAdd = bulkTags.every((t) => puzzle.tags.includes(t));
    const disableBulkRemove = bulkTags.every((t) => !puzzle.tags.includes(t));

    return (
      <ButtonGroup size="sm">
        <Button
          size="sm"
          variant="danger"
          title="Remove tag"
          onClick={removeBulkTagsFromPuzzle}
          disabled={disableBulkTagActions || disableBulkRemove}
        >
          <FontAwesomeIcon fixedWidth icon={faMinus} />
        </Button>
        <Button
          size="sm"
          variant="success"
          title="Add tag"
          onClick={addBulkTagsToPuzzle}
          disabled={disableBulkTagActions || disableBulkAdd}
        >
          <FontAwesomeIcon fixedWidth icon={faPlus} />
        </Button>
      </ButtonGroup>
    );
  },
);

const RenameTagSection = ({ huntId }: { huntId: string }) => {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);

  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [newTagName, setNewTagName] = useState<string>("");

  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );

  const tagToRename = useTracker(
    () => (selectedTagId ? Tags.findOne({ _id: selectedTagId }) : undefined),
    [selectedTagId],
  );

  const selectOptions: TagSelectOption[] = useTracker(
    () =>
      allTags
        .map((t) => {
          return { value: t._id, label: t.name };
        })
        .sort((a, b) =>
          a.label.toLowerCase().localeCompare(b.label.toLowerCase()),
        ),
    [allTags],
  );
  const selectedOption = useMemo(() => {
    return tagToRename
      ? { value: tagToRename._id, label: tagToRename.name }
      : undefined;
  }, [tagToRename]);

  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onSelectedTagChanged = useCallback((value: TagSelectOption | null) => {
    if (value) {
      setSelectedTagId(value.value);
      setNewTagName(value.label);
    } else {
      setSelectedTagId("");
      setNewTagName("");
    }
  }, []);

  const onNameChanged = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewTagName(e.currentTarget.value);
    },
    [],
  );

  const onFormSubmit = useCallback<NonNullable<FormProps["onSubmit"]>>(
    (e) => {
      e.preventDefault();
      setSubmitState(SubmitState.SUBMITTING);
      renameTag.call(
        { tagId: selectedTagId, name: newTagName },
        (error?: Error) => {
          if (error) {
            setSubmitState(SubmitState.FAILED);
            setErrorMessage(error.message);
          } else {
            setSubmitState(SubmitState.SUCCESS);
            setErrorMessage("");
          }
        },
      );
    },
    [selectedTagId, newTagName],
  );

  const isNameDirtied = tagToRename?.name.trim() !== newTagName.trim();
  const disableRename =
    !isNameDirtied || submitState === SubmitState.SUBMITTING;

  const idPrefix = useId();
  const theme = useTheme();

  return (
    <section>
      <h2>Rename tag</h2>
      <p>
        Select a tag from the drop-down, then type its new name, and choose
        &quot;Rename&quot;.
      </p>
      <Form onSubmit={onFormSubmit}>
        {submitState === SubmitState.FAILED ? (
          <Alert variant="danger" dismissible onClose={dismissAlert}>
            {errorMessage}
          </Alert>
        ) : null}
        <Row className="mb-3">
          <Col xs={5}>
            <FormGroup className="mb-3" controlId={`${idPrefix}-rename-source`}>
              <FormLabel>Tag to rename</FormLabel>
              <Select
                inputId={`${idPrefix}-rename-source`}
                options={selectOptions}
                value={selectedOption}
                onChange={onSelectedTagChanged}
                theme={theme.reactSelectTheme}
              />
            </FormGroup>
          </Col>
          <Col xs={5}>
            <FormGroup
              className="mb-3"
              controlId={`${idPrefix}-rename-destination`}
            >
              <FormLabel>New name</FormLabel>
              <FormControl
                type="text"
                onChange={onNameChanged}
                placeholder={tagToRename?.name}
                value={newTagName}
              />
            </FormGroup>
          </Col>
          <Col xs={2}>
            <Button variant="primary" type="submit" disabled={disableRename}>
              Rename
            </Button>
          </Col>
        </Row>
      </Form>
    </section>
  );
};

const BulkAddRemoveSection = ({
  loading,
  huntId,
}: {
  loading: boolean;
  huntId: string;
}) => {
  // List of tag IDs
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [searchString, setSearchString] = useState<string>("");

  const searchBarRef = useRef<HTMLInputElement>(null);
  const addModalRef = useRef<ModalFormHandle>(null);
  const deleteModalRef = useRef<ModalFormHandle>(null);

  const allPuzzles = useTracker(
    () => Puzzles.find({ hunt: huntId }).fetch(),
    [huntId],
  );
  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );

  const selectOptions: TagSelectOption[] = useTracker(
    () =>
      allTags
        .map((t) => {
          return { value: t._id, label: t.name };
        })
        .sort((a, b) =>
          a.label.toLowerCase().localeCompare(b.label.toLowerCase()),
        ),
    [allTags],
  );

  const onSearchStringChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSearchString(e.currentTarget.value);
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchString("");
  }, []);

  const showRemoveAllModal = useCallback(() => {
    if (deleteModalRef.current) {
      deleteModalRef.current.show();
    }
  }, []);

  const showAddAllModal = useCallback(() => {
    if (addModalRef.current) {
      addModalRef.current.show();
    }
  }, []);

  const onSelectedTagsChanged = useCallback(
    (
      value: readonly TagSelectOption[],
      action: ActionMeta<TagSelectOption>,
    ) => {
      let newRoles = [];
      switch (action.action) {
        case "clear":
        case "deselect-option":
        case "remove-value":
        case "create-option":
        case "pop-value":
        case "select-option":
          newRoles = value.map((v) => v.value);
          break;
        default:
          return;
      }
      setBulkTags(newRoles);
    },
    [],
  );

  const puzzlesMatchingSearchString = useCallback(
    (puzzles: PuzzleType[]): PuzzleType[] => {
      const searchKeys = searchString.split(" ");
      if (searchKeys.length === 1 && searchKeys[0] === "") {
        // No search query, so no need to do fancy search computation
        return puzzles;
      } else {
        const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => {
          return key.length > 0;
        });
        const isInteresting = compilePuzzleMatcher(
          allTags,
          searchKeysWithEmptyKeysRemoved,
        );
        return puzzles.filter(isInteresting);
      }
    },
    [searchString, allTags],
  );

  const matchingSearch = puzzlesMatchingSearchString(allPuzzles);

  const tagNamesForIds = useCallback(
    (tagIds: string[]) => {
      const tagNames: Record<string, string> = {};
      allTags.forEach((t) => {
        tagNames[t._id] = t.name;
      });
      return tagIds.map((t) => tagNames[t] ?? t);
    },
    [allTags],
  );

  const onAddToAll = useCallback(
    (callback: () => void) => {
      matchingSearch.forEach((puzzle) => {
        const tagNames = tagNamesForIds(bulkTags);
        tagNames.forEach((tagName) => {
          const puzzleId = puzzle._id;
          addPuzzleTag.call({ puzzleId, tagName }, callback);
        });
      });
    },
    [matchingSearch, bulkTags, tagNamesForIds],
  );

  const onRemoveFromAll = useCallback(
    (callback: () => void) => {
      matchingSearch.forEach((puzzle) => {
        bulkTags.forEach((tagId) => {
          const puzzleId = puzzle._id;
          removePuzzleTag.call({ puzzleId, tagId }, callback);
        });
      });
    },
    [matchingSearch, bulkTags],
  );

  const disableBulkTagActions = bulkTags.length === 0;

  const idPrefix = useId();
  const theme = useTheme();

  return (
    <section>
      <ModalForm
        ref={deleteModalRef}
        title="Remove tag from all"
        submitLabel="Remove"
        submitStyle="danger"
        onSubmit={onRemoveFromAll}
      >
        Are you sure you want to remove this tag from {matchingSearch.length}{" "}
        puzzle{matchingSearch.length === 1 ? "" : "s"}?
        {allPuzzles.length === matchingSearch.length ? (
          <Alert variant="danger">
            You are removing this tag from all puzzles!
          </Alert>
        ) : null}
      </ModalForm>
      <ModalForm
        ref={addModalRef}
        title="Add tag to all"
        submitLabel="Add"
        submitStyle="success"
        onSubmit={onAddToAll}
      >
        Are you sure you want to add this tag to {matchingSearch.length} puzzle
        {matchingSearch.length === 1 ? "" : "s"}?
        {allPuzzles.length === matchingSearch.length ? (
          <Alert
            variant="danger"
            title="You are about to add this tag to all items!"
          >
            You are adding this tag to all puzzles!
          </Alert>
        ) : null}
      </ModalForm>
      <h2>Bulk add/remove tags</h2>
      <p>
        Select a tag from the drop-down, then click &quot;+&quot; on the puzzles
        you want to have that tag. If you&apos;d like to add the tag to all
        puzzles, select the tag and choose &quot;Add to all&quot;.
      </p>
      <FormGroup
        as={Row}
        className="mb-3"
        controlId={`${idPrefix}-bulk-selected-tags`}
      >
        <Col xs={8}>
          <Select
            inputId={`${idPrefix}-bulk-selected-tags`}
            isMulti
            options={selectOptions}
            onChange={onSelectedTagsChanged}
            theme={theme.reactSelectTheme}
          />
        </Col>
        <Col xs={4}>
          <ButtonGroup>
            <Button
              variant="danger"
              onClick={showRemoveAllModal}
              disabled={disableBulkTagActions}
            >
              <FontAwesomeIcon fixedWidth icon={faTimes} />
              Remove from all
            </Button>
            <Button
              variant="warning"
              onClick={showAddAllModal}
              disabled={disableBulkTagActions}
            >
              <FontAwesomeIcon fixedWidth icon={faTags} />
              Add to all
            </Button>
          </ButtonGroup>
        </Col>
      </FormGroup>
      <SearchFormGroup controlId={`${idPrefix}-puzzle-search`}>
        <InputGroup>
          <FormControl
            as="input"
            type="text"
            ref={searchBarRef}
            placeholder="Filter by title, answer, or tag"
            value={searchString}
            onChange={onSearchStringChange}
          />
          <Button variant="secondary" onClick={clearSearch}>
            <FontAwesomeIcon icon={faEraser} />
          </Button>
        </InputGroup>
      </SearchFormGroup>
      <PuzzleListToolbar>
        <span>
          Showing {matchingSearch.length} of {allPuzzles.length} items
        </span>
      </PuzzleListToolbar>
      {!loading && (
        <PuzzlesForTagList
          puzzles={matchingSearch}
          allTags={allTags}
          bulkTags={bulkTags}
        />
      )}
    </section>
  );
};

const HuntTagManagerPage = React.memo(() => {
  const huntId = useParams<{ huntId: string }>().huntId!;
  useBreadcrumb({ title: "Tags", path: `/hunts/${huntId}/tags` });

  const puzzlesLoading = useTypedSubscribe(puzzlesForPuzzleList, {
    huntId,
    includeDeleted: true,
  });
  const loading = puzzlesLoading();

  return (
    <Container>
      <h1>Tag Manager</h1>
      <RenameTagSection huntId={huntId} />
      <hr />
      <BulkAddRemoveSection loading={loading} huntId={huntId} />
    </Container>
  );
});

export default HuntTagManagerPage;
