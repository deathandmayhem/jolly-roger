import { useTracker } from "meteor/react-meteor-data";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import React, { useCallback, useRef, useState } from "react";
import { Alert, ButtonGroup, InputGroup } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import FormControl, { FormControlProps } from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import Row from "react-bootstrap/Row";
import { FormProps, useParams, useSearchParams } from "react-router-dom";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import Tags, { TagType } from "../../lib/models/Tags";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import ActionButtonRow from "./ActionButtonRow";
import Puzzles, { PuzzleType } from "../../lib/models/Puzzles";
import { indexedById } from "../../lib/listUtils";
import styled, { css } from "styled-components";
import { computeSolvedness, Solvedness } from "../../lib/solvedness";
import { backgroundColorLookupTable } from "./styling/constants";
import { mediaBreakpointDown } from "./styling/responsive";
import TagList from "./TagList";
import addPuzzleTag from "../../methods/addPuzzleTag";
import removePuzzleTag from "../../methods/removePuzzleTag";
import { faCross, faTags, faTrash } from "@fortawesome/free-solid-svg-icons";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import ModalForm, { ModalFormHandle } from "./ModalForm";
import renameTag from "../../methods/renameTag";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import Select, { ActionMeta } from "react-select";
import Hunts from "../../lib/models/Hunts";

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
  // align-items: baseline;
  margin-bottom: 0.5em;
`;

const TagPuzzleDiv = styled.div<{
  $solvedness: Solvedness;
}>`
  ${({ $solvedness }) => css`
    background-color: ${backgroundColorLookupTable[$solvedness]};
  `}

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

const TagListColumn = styled(TagList)`
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
    }, [puzzleId, bulkTags, puzzle.tags]);

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

const TagBulkEditPage = () => {
  const huntId = useParams<{ huntId: string }>().huntId!;
  useTypedSubscribe(puzzlesForPuzzleList, {
    huntId,
    includeDeleted: true,
  });
  const hunt = useTracker(() => Hunts.findOne(huntId)!, [huntId]);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dirtyRename, setDirtyRename] = useState<Boolean>(false);
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);

  const allPuzzles = useTracker(
    () => Puzzles.find({ hunt: huntId }).fetch(),
    [huntId],
  );

  const [bulkTags, setBulkTags] = useState<string[]>([]);

  const [searchString, setSearchString] = useState<string>("");

  const [selectedTag, setSelectedTag] = useState<string | undefined>("");

  const onNameChanged = useCallback<NonNullable<FormControlProps["onChange"]>>(
    (e) => {
      setNewTagName(e.currentTarget.value);
      setDirtyRename(tagToRename?.name.trim() != newTagName?.trim());
    },
    [],
  );

  const tagToRename = useTracker(
    () => (selectedTag ? Tags.findOne({ _id: selectedTag }) : null),
    [selectedTag, submitState],
  );
  const [newTagName, setNewTagName] = useState<string | undefined>(
    tagToRename?.name ?? "",
  );

  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );

  const selectOptions: TagSelectOption[] = useTracker(
    () =>
      allTags.map((t) => {
        return { value: t._id, label: t.name };
      }),
    [allTags],
  );

  const onRenameTagChanged = useCallback(
    (value: TagSelectOption, action: ActionMeta<TagSelectOption>) => {
      setSelectedTag(value.value);
      setNewTagName(value.label);
      setDirtyRename(false);
    },
    [],
  );

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

  const compileMatcher = useCallback(
    (searchKeys: string[]): ((p: PuzzleType) => boolean) => {
      const tagNames: Record<string, string> = {};
      allTags.forEach((t) => {
        tagNames[t._id] = t.name.toLowerCase();
      });
      const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
      return function (puzzle) {
        const titleWords = puzzle.title.toLowerCase().split(" ");
        return lowerSearchKeys.every((key) => {
          // Every key should match at least one of the following:
          // * prefix of word in title
          // * substring of any answer
          // * substring of any tag
          if (titleWords.some((word) => word.startsWith(key))) {
            return true;
          }

          if (
            puzzle.answers.some((answer) => {
              return answer.toLowerCase().includes(key);
            })
          ) {
            return true;
          }

          const tagMatch = puzzle.tags.some((tagId) => {
            const tagName = tagNames[tagId];
            return tagName?.includes(key);
          });

          if (tagMatch) {
            return true;
          }

          return false;
        });
      };
    },
    [allTags],
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
        const isInteresting = compileMatcher(searchKeysWithEmptyKeysRemoved);
        return puzzles.filter(isInteresting);
      }
    },
    [searchString, compileMatcher],
  );

  const matchingSearch = puzzlesMatchingSearchString(allPuzzles);

  const deleteModalRef = useRef<ModalFormHandle>(null);
  const addModalRef = useRef<ModalFormHandle>(null);
  const onRemoveFromAll = useCallback(
    (callback: () => void) => {
      matchingSearch.forEach((puzzle) => {
        bulkTags.forEach((tagId) => {
          const puzzleId = puzzle._id;
          removePuzzleTag.call({ puzzleId, tagId }, callback);
        });
      });
    },
    [huntId, bulkTags, matchingSearch],
  );

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
          // const tagName = tag?.name;
          addPuzzleTag.call({ puzzleId, tagName }, callback);
        });
      });
    },
    [huntId, bulkTags, matchingSearch],
  );

  const searchBarRef = useRef<HTMLInputElement>(null);

  const onSearchStringChange: NonNullable<FormControlProps["onChange"]> =
    useCallback(
      (e) => {
        setSearchString(e.currentTarget.value);
      },
      [setSearchString],
    );

  const clearSearch = useCallback(() => {
    setSearchString("");
  }, [setSearchString]);

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
      const puzzleId = puzzle._id;
      const huntId = puzzle.hunt;
      const solvedness = computeSolvedness(puzzle);

      const tagIndex = indexedById(allTags);
      const puzzleTags = puzzle.tags.map((tagId) => {
        return tagIndex.get(tagId);
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
          <TagListColumn
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

  const renderList = useCallback(
    (allPuzzles: PuzzleType[], allTags: TagType[], bulkTags: string[]) => {
      return (
        <PuzzlesForTagList
          puzzles={allPuzzles}
          allTags={allTags}
          bulkTags={bulkTags}
        />
      );
    },
    [allPuzzles, allTags, bulkTags],
  );

  const disableBulkTagActions = bulkTags.length === 0;

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

  const disableRename = !dirtyRename || submitState === SubmitState.SUBMITTING;

  const onUpdateCallback = useCallback((error?: Error) => {
    if (error) {
      setSubmitState(SubmitState.FAILED);
      setErrorMessage(error.message);
    } else {
      setSubmitState(SubmitState.SUCCESS);
      setErrorMessage("");
    }
  });

  const onFormSubmit = useCallback<NonNullable<FormProps["onSubmit"]>>(
    (e) => {
      e.preventDefault();
      setSubmitState(SubmitState.SUBMITTING);
      renameTag.call(
        { tagId: selectedTag, name: newTagName },
        onUpdateCallback,
      );
    },
    [selectedTag, newTagName],
  );

  return (
    <Container>
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
      <h1>Tag Manager</h1>
      <h2>Rename tag</h2>
      <p>
        Select a tag from the drop-down, then type it's new name, and choose
        "Rename".
      </p>
      <Form onSubmit={onFormSubmit}>
        <FormGroup as={Row} className="mb-3">
          <Col xs={5}>
            <Select
              id="tag-rename-selected-tag"
              options={selectOptions}
              onChange={onRenameTagChanged}
            />
          </Col>
          <Col xs={5}>
            <FormControl
              id="tag-rename-new-name"
              type="text"
              onChange={onNameChanged}
              placeholder={tagToRename?.name}
              value={newTagName}
            />
          </Col>
          <Col xs={2}>
            <Button variant="primary" type="submit" disabled={disableRename}>
              Rename
            </Button>
          </Col>
        </FormGroup>
      </Form>
      <hr />
      <h2>Bulk add/remove tags</h2>
      <p>
        Select a tag from the drop-down, then click "+" on the puzzles you want
        to have that tag. If you'd like to add the tag to all puzzles, select
        the tag and choose "Add to all".
      </p>
      <FormGroup as={Row} className="mb-3">
        <Col xs={8}>
          <Select
            id="tag-bulk-selected-tags"
            isMulti
            options={selectOptions}
            onChange={onSelectedTagsChanged}
          />
        </Col>
        <Col xs={4}>
          <ButtonGroup>
            <Button
              variant="danger"
              onClick={showRemoveAllModal}
              disabled={disableBulkTagActions}
            >
              <FontAwesomeIcon fixedWidth icon={faTimes}></FontAwesomeIcon>
              Remove from all
            </Button>
            <Button
              variant="warning"
              onClick={showAddAllModal}
              disabled={disableBulkTagActions}
            >
              <FontAwesomeIcon fixedWidth icon={faTags}></FontAwesomeIcon>
              Add to all
            </Button>
          </ButtonGroup>
        </Col>
      </FormGroup>
      <SearchFormGroup>
        <InputGroup>
          <FormControl
            id="jr-puzzle-search"
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
      {renderList(matchingSearch, allTags, bulkTags)}
    </Container>
  );
};

export default TagBulkEditPage;
