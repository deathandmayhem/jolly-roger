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
import { FormProps, useParams, useSearchParams } from "react-router-dom"
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import Tags, {TagType} from "../../lib/models/Tags";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import ActionButtonRow from "./ActionButtonRow";
import Puzzles, {PuzzleType} from "../../lib/models/Puzzles";
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

enum SubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  FAILED = "failed",
}

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

const PuzzleListToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5em;
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


const SearchFormGroup = styled(FormGroup)`
  grid-column: -3;
  ${mediaBreakpointDown(
    "sm",
    css`
      grid-column: 1 / -1;
    `,
  )}
`;

const SearchFormLabel = styled(FormLabel)`
  display: inline-block;
  ${mediaBreakpointDown(
    "sm",
    css`
      display: none;
    `,
  )}
`;


const TagToggleButton = React.memo(
  ({
    puzzle,
    tag,
    hasTag,
  }: {
    puzzle: PuzzleType;
    tag: TagType;
    hasTag: boolean;
  }) => {

    const puzzleId = puzzle._id;
    const tagId = tag._id;
    const tagName = tag.name;
    const onPuzzleTagChanged = useCallback (() => {
        puzzle.tags.includes(tagId) ? (
          removePuzzleTag.call({ puzzleId, tagId })
        ) : (
          addPuzzleTag.call({ puzzleId, tagName })
        )
        return false;
      },
      [puzzleId, tag, puzzle.tags]
    );

    return (
      <Button
      size="sm"
      variant={hasTag ? "danger" : "success"}
      title={hasTag ? "Remove tag" : "Add tag"}
      onClick={onPuzzleTagChanged}
      >
        <FontAwesomeIcon fixedWidth icon={hasTag ? faMinus : faPlus} />
      </Button>
    )

  }
);

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

const TagPuzzle = React.memo(
  ({
    puzzle,
    allTags,
    tag,
  }: {
    puzzle: PuzzleType;
    allTags: TagType[];
    tag: TagType;
  }) => {
    const puzzleId = puzzle._id;
    const huntId = puzzle.hunt;
    const solvedness = computeSolvedness(puzzle);
    const tagId = tag._id;

    const tagIndex = indexedById(allTags);
    const puzzleTags = puzzle.tags.map((tagId) => {return tagIndex.get(tagId)});
    const puzzleHasTag = puzzle.tags.includes(tagId);

    return (
    <TagPuzzleDiv $solvedness={solvedness}>
    <PuzzleControlButtonsColumn>
      <ButtonGroup size="sm">
        <TagToggleButton
          puzzle={puzzle}
          tag={tag}
          hasTag={puzzleHasTag}
        />
      </ButtonGroup>
    </PuzzleControlButtonsColumn>
      <PuzzleTitleColumn>
        {puzzle.title}
      </PuzzleTitleColumn>
        <TagListColumn
          puzzle={puzzle}
          tags={puzzleTags}
          linkToSearch
          popoverRelated={false}
        />
    </TagPuzzleDiv>
    )
  }
);

const PuzzlesForTagList = React.memo(
  ({
    puzzles,
    allTags,
    tag,
  }: {
    puzzles: PuzzleType[];
    allTags: TagType[];
    tag: TagType;
  }) => {
    return (
      <div>
      {puzzles.map((puzzle) => {
        return(
          <TagPuzzle
          key={puzzle._id}
          puzzle={puzzle}
          allTags={allTags}
          tag={tag}
          />)
        })}
        </div>
    )
  }
);

const TagEditPage = () => {
  const huntId = useParams<{ huntId: string }>().huntId!;

  const puzzlesLoading = useTypedSubscribe(puzzlesForPuzzleList, {
    huntId,
    includeDeleted: true,
  });

  const allPuzzles = useTracker(
    () => (Puzzles.find({hunt:huntId}, { sort: { title:1 } } ).fetch() ),
    [huntId]
  );

  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );

  const tagId = useParams<{ tagId: string }>().tagId!;

  const tag = useTracker(
    () => (Tags.findOne({ hunt: huntId, _id: tagId })),
    [huntId, tagId]
  )

  useBreadcrumb({
    title: `${tag?.name}`,
    path: `/hunts/${huntId}/tags/${tagId}`,
  });

  const renderList = useCallback (
    (
      allPuzzles: PuzzleType[],
      allTags: TagType[],
    ) => {
      return <PuzzlesForTagList
      puzzles={allPuzzles}
      allTags={allTags}
      tag={tag}
      />
    },
    [allPuzzles, allTags]
  )

  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);

  const disableForm = submitState === SubmitState.SUBMITTING;
  const [name, setName] = useState<string>(tag?.name ?? "");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const onNameChanged = useCallback<NonNullable<FormControlProps["onChange"]>>(
    (e) => {
      setName(e.currentTarget.value);
    },
    [],
  );

  const deleteModalRef = useRef<ModalFormHandle>(null);
  const addModalRef = useRef<ModalFormHandle>(null);

  const onSuccessDismiss = useCallback(
    () => setSubmitState(SubmitState.IDLE),
    [],
  );

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

  const onUpdateCallback = useCallback(
    (error?: Error) => {
      if (error) {
        setSubmitState(SubmitState.FAILED);
        setErrorMessage(error.message);
      } else {
        setSubmitState(SubmitState.SUCCESS);
        setErrorMessage("");
      }
    }
  );

  const onFormSubmit = useCallback<NonNullable<FormProps["onSubmit"]>>(
    (e) => {
      e.preventDefault();
      setSubmitState(SubmitState.SUBMITTING);
      renameTag.call({tagId, name}, onUpdateCallback);
    },
    [tagId, name]
  )

  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get("q") ?? "";
  const searchBarRef = useRef<HTMLInputElement>(null);

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

  const setSearchString = useCallback(
    (val: string) => {
      const u = new URLSearchParams(searchParams);
      if (val) {
        u.set("q", val);
      } else {
        u.delete("q");
      }

      setSearchParams(u);
    },
    [searchParams, setSearchParams],
  );

  const clearSearch = useCallback(() => {
    setSearchString("");
  }, [setSearchString]);

  const onSearchStringChange: NonNullable<FormControlProps["onChange"]> =
    useCallback(
      (e) => {
        setSearchString(e.currentTarget.value);
      },
      [setSearchString],
    );


  const matchingSearch = puzzlesMatchingSearchString(allPuzzles);

  const updateDisabled = matchingSearch.length === 0;

  const onRemoveFromAll = useCallback(
    ( callback: () => void) => {
      matchingSearch.forEach((puzzle) => {
        const puzzleId = puzzle._id;
        removePuzzleTag.call({puzzleId, tagId}, callback)
      })
    },
    [huntId, tagId, matchingSearch]
  );

  const onAddToAll = useCallback(
    ( callback: () => void) => {
      matchingSearch.forEach((puzzle) => {
        const puzzleId = puzzle._id;
        const tagName = tag?.name;
        addPuzzleTag.call({puzzleId, tagName}, callback)
      })
    },
    [huntId, tag, matchingSearch]
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
      Are you sure you want to remove this tag from {matchingSearch.length} puzzle{matchingSearch.length === 1 ? "" : "s"}?
      {
        allPuzzles.length === matchingSearch.length ? (
          <Alert
            variant="danger"
          >
            You are removing this tag from all puzzles!
          </Alert>
        ) : null
      }
    </ModalForm>
    <ModalForm
      ref={addModalRef}
      title="Add tag to all"
      submitLabel="Add"
      submitStyle="success"
      onSubmit={onAddToAll}
    >
      Are you sure you want to add this tag to {matchingSearch.length} puzzle{matchingSearch.length === 1 ? "" : "s"}?
      {
        allPuzzles.length === matchingSearch.length ? (
          <Alert
            variant="danger"
            title="You are about to add this tag to all items!"
          >
            You are adding this tag to all puzzles!
          </Alert>
        ) : null
      }
    </ModalForm>
      <h1>Edit tag</h1>
      <Form onSubmit={onFormSubmit}>
      <h2>Rename tag</h2>
      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor="tag-name">
          Name
        </FormLabel>
        <Col xs={9}>
          <FormControl
            id="tag-form-name"
            type="text"
            value={name}
            onChange={onNameChanged}
            disabled={disableForm}
          />
        </Col>
      </FormGroup>
          {submitState === SubmitState.FAILED && (
            <Alert variant="danger">{errorMessage}</Alert>
          )}
          {submitState === SubmitState.SUCCESS && (
            <Alert variant="success" dismissible onClose={onSuccessDismiss}>
              Tag renamed
            </Alert>
          )}
      <ActionButtonRow>
        <FormGroup>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </FormGroup>
      </ActionButtonRow>
      </Form>
      <hr/>
      <h2>Quick add/remove tag</h2>
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
      <Row>
        <PuzzleListToolbar>
      <ButtonGroup>
      <Button
        variant="danger"
        onClick={showRemoveAllModal}
        disabled={updateDisabled}
        >
        <FontAwesomeIcon fixedWidth icon={faTimes}></FontAwesomeIcon>
        Remove from all
      </Button>
        <Button
          variant="warning"
          onClick={showAddAllModal}
          disabled={updateDisabled}
        >
        <FontAwesomeIcon fixedWidth icon={faTags}></FontAwesomeIcon>
        Add to all
        </Button>
        </ButtonGroup>
        <span>Showing {matchingSearch.length} of {allPuzzles.length} items</span>
      </PuzzleListToolbar>
      </Row>
      {renderList(matchingSearch, allTags)}
    </Container>
  );
};

export default TagEditPage;
