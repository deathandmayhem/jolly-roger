import { useTracker } from "meteor/react-meteor-data";
import { faArrowsLeftRight } from "@fortawesome/free-solid-svg-icons/faArrowsLeftRight";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faList } from "@fortawesome/free-solid-svg-icons/faList";
import { faTable } from "@fortawesome/free-solid-svg-icons/faTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Accordion from "react-bootstrap/Accordion";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import Container from "react-bootstrap/Container";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import InputGroup from "react-bootstrap/InputGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Table from "react-bootstrap/Table";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import Tooltip from "react-bootstrap/Tooltip";
import { Link, useParams } from "react-router-dom";
import styled, { css } from "styled-components";
import { indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import Tags from "../../lib/models/Tags";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import { computeSolvedness } from "../../lib/solvedness";
import { useBreadcrumb } from "../hooks/breadcrumb";
import {
  useNotesPageShowSolved,
  useNotesPageViewMode,
} from "../hooks/persisted-state";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import RelativeTime from "./RelativeTime";
import TagList from "./TagList";

// Renamed to avoid confusion with the main view table
const AccordionInnerTable = styled(Table)`
  color: ${({ theme }) => theme.colors.text};
`;

const StyledToggleButtonGroup = styled(ToggleButtonGroup)`
  @media (width < 360px) {
    width: 100%;
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: flex-end;
`;

const SearchFormGroup = styled(FormGroup)`
  flex-grow: 1;
  min-width: 250px;
`;

const PuzzleListToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5em;
`;

// Styled component for the sticky header table
const StickyHeaderTable = styled(Table)`
  thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 2px 2px -1px rgb(0 0 0 / 20%);
    border-bottom: 2px solid #dee2e6;
  }
`;

// Styles for expandable cell content
const ExpandableContent = styled.div<{
  $expanded: boolean;
  $clickable: boolean;
}>`
  position: relative;
  ${(props) =>
    props.$clickable &&
    css`
      cursor: pointer;

      &:hover {
        background-color: rgb(0 0 0 / 2%);
      }
    `}

  ${(props) =>
    !props.$expanded &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`;

const ExpandButton = styled(Button)`
  padding: 0;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  text-decoration: none;
  vertical-align: baseline;
`;

const ExpandableCell = ({ text }: { text: string | undefined | null }) => {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      const element = contentRef.current;
      if (element && !expanded) {
        setIsOverflowing(element.scrollHeight > element.clientHeight);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [expanded]);

  // --- Interaction Handlers ---

  const handleMouseDown = useCallback(() => {
    if (expanded) return;

    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setExpanded(true);
    }, 300);
  }, [expanded]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isLongPress.current) {
      setExpanded(false);
    } else {
      setExpanded((prev) => !prev);
    }
    isLongPress.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isLongPress.current) {
      setExpanded(false);
      isLongPress.current = false;
    }
  }, []);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  if (!text) return null;

  const showInteractions = isOverflowing || expanded;

  const content = (
    <ExpandableContent
      ref={contentRef}
      $expanded={expanded}
      $clickable={showInteractions}
      // Attach our new hybrid event listeners
      onMouseDown={showInteractions ? handleMouseDown : undefined}
      onMouseUp={showInteractions ? handleMouseUp : undefined}
      onMouseLeave={showInteractions ? handleMouseLeave : undefined}
    >
      {text}
    </ExpandableContent>
  );

  return (
    <div>
      {showInteractions ? (
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-${id}`}>
              {expanded ? (
                isLongPress ? (
                  "Release to collapse"
                ) : (
                  "Click to collapse"
                )
              ) : (
                <>
                  Click to expand
                  <br />
                  <em>Hold to peek</em>
                </>
              )}
            </Tooltip>
          }
        >
          {content}
        </OverlayTrigger>
      ) : (
        content
      )}

      {showInteractions && (
        <ExpandButton variant="link" size="sm" onClick={handleButtonClick}>
          {expanded ? (
            <>
              Show less <FontAwesomeIcon icon={faChevronUp} />
            </>
          ) : (
            <>
              Show more <FontAwesomeIcon icon={faChevronDown} />
            </>
          )}
        </ExpandButton>
      )}
    </div>
  );
};

const NotesPuzzle = React.memo(
  ({ puzzle, allTags }: { puzzle: PuzzleType; allTags: TagType[] }) => {
    const solvedness = computeSolvedness(puzzle);
    const tagIndex = indexedById(allTags);
    const puzzleTags = puzzle.tags.map((tagId) => {
      return tagIndex.get(tagId);
    });

    const noteRelativeTime = useTracker(() => {
      return (
        <RelativeTime
          date={puzzle.noteUpdateTs}
          minimumUnit="minute"
          maxElements={2}
        />
      );
    }, [puzzle.noteUpdateTs]);
    const note = puzzle.noteContent ?? null;

    return (
      <Accordion
        defaultActiveKey={
          puzzle.noteUpdateTs ? `puzzle-accordion-${puzzle._id}` : null
        }
      >
        <Accordion.Item eventKey={`puzzle-accordion-${puzzle._id}`}>
          <Accordion.Header>
            {solvedness === "solved" ? (
              <Badge pill bg="success" className="me-2">
                Solved
              </Badge>
            ) : null}
            <Link
              to={`../puzzles/${puzzle._id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {puzzle.title}
            </Link>
            <span className="ms-2">
              {puzzle.noteUpdateTs ? (
                <>: Last updated {noteRelativeTime}</>
              ) : (
                <em>: No notes recorded</em>
              )}
            </span>
          </Accordion.Header>
          <Accordion.Body>
            {note ? (
              <AccordionInnerTable
                striped
                variant="secondary"
                responsive
                hover
                bordered
              >
                <tbody>
                  <tr>
                    <td>Flavor text</td>
                    <td>{note.flavor ? note.flavor : null}</td>
                  </tr>
                  <tr>
                    <td>Who should people contact?</td>
                    <td>{note.contactPerson ? note.contactPerson : null}</td>
                  </tr>
                  <tr>
                    <td>What&apos;s going on?</td>
                    <td>{note.summary ? note.summary : null}</td>
                  </tr>
                  <tr>
                    <td>Theories</td>
                    <td>{note.theories ? note.theories : null}</td>
                  </tr>
                  <tr>
                    <td>Any other solving location?</td>
                    <td>
                      {note.externalLinkUrl ? (
                        <a
                          target="_blank"
                          href={note.externalLinkUrl}
                          rel="noreferrer noopener"
                        >
                          {note.externalLinkText ?? note.externalLinkUrl}
                        </a>
                      ) : null}
                    </td>
                  </tr>
                  <tr>
                    <td>Tags</td>
                    <td>
                      {puzzleTags ? (
                        <TagList puzzle={puzzle} tags={puzzleTags} />
                      ) : null}
                    </td>
                  </tr>
                </tbody>
              </AccordionInnerTable>
            ) : (
              "No notes"
            )}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    );
  },
);

const PuzzleNotesTable = React.memo(
  ({ puzzles, allTags }: { puzzles: PuzzleType[]; allTags: TagType[] }) => {
    // Memoize the tag index so we don't rebuild it for every row
    const tagIndex = useMemo(() => indexedById(allTags), [allTags]);

    return (
      // Removed 'responsive' prop to allow sticky header to work against the window scroll
      <StickyHeaderTable striped bordered hover size="sm">
        <thead>
          <tr>
            <th style={{ width: "140px" }}>Updated</th>
            <th style={{ width: "20%" }}>Puzzle</th>
            <th>Summary</th>
            <th>Theories</th>
            <th style={{ width: "10%" }}>Contact</th>
            <th style={{ width: "10%" }}>Link</th>
            <th style={{ width: "15%" }}>Tags</th>
          </tr>
        </thead>
        <tbody>
          {puzzles.map((puzzle) => {
            const solvedness = computeSolvedness(puzzle);
            const note = puzzle.noteContent;
            const puzzleTags = puzzle.tags
              .map((tagId) => tagIndex.get(tagId))
              .filter(Boolean);

            return (
              <tr key={puzzle._id}>
                <td style={{ minWidth: "120px" }}>
                  {puzzle.noteUpdateTs ? (
                    <RelativeTime
                      date={puzzle.noteUpdateTs}
                      minimumUnit="minute"
                      maxElements={2}
                    />
                  ) : (
                    <Badge bg="danger" pill>
                      Never
                    </Badge>
                  )}
                </td>
                <td>
                  {solvedness === "solved" && (
                    <div className="mb-1">
                      <Badge pill bg="success">
                        Solved
                      </Badge>
                    </div>
                  )}
                  <Link to={`../puzzles/${puzzle._id}`}>{puzzle.title}</Link>
                </td>
                <td>
                  <ExpandableCell text={note?.summary} />
                </td>
                <td>
                  <ExpandableCell text={note?.theories} />
                </td>
                <td>{note?.contactPerson}</td>
                <td>
                  {note?.externalLinkUrl ? (
                    <a
                      target="_blank"
                      href={note.externalLinkUrl}
                      rel="noreferrer noopener"
                    >
                      {note.externalLinkText ?? note.externalLinkUrl}
                    </a>
                  ) : null}
                </td>
                <td>
                  {puzzleTags ? (
                    <TagList puzzle={puzzle} tags={puzzleTags} />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </StickyHeaderTable>
    );
  },
);

const PuzzlesForTagList = React.memo(
  ({ puzzles, allTags }: { puzzles: PuzzleType[]; allTags: TagType[] }) => {
    return (
      <div>
        {puzzles.map((puzzle) => {
          return (
            <NotesPuzzle key={puzzle._id} puzzle={puzzle} allTags={allTags} />
          );
        })}
      </div>
    );
  },
);

const NotesPage = () => {
  const huntId = useParams<{ huntId: string }>().huntId!;
  const puzzlesLoading = useTypedSubscribe(puzzlesForPuzzleList, {
    huntId,
    includeDeleted: true,
  });

  const loading = puzzlesLoading();
  const [viewMode, setViewMode] = useNotesPageViewMode();
  const [showSolved, setShowSolved] = useNotesPageShowSolved();
  const [searchString, setSearchString] = useState<string>("");

  useBreadcrumb({ title: "Notes", path: `/hunts/${huntId}/notes` });

  const allPuzzles = useTracker(
    () =>
      Puzzles.find(
        { hunt: huntId },
        { sort: { noteUpdateTs: 1, updatedTimestamp: 1 } },
      ).fetch(),
    [huntId],
  );

  const setShowSolvedString = useCallback(
    (value: string) => {
      setShowSolved(value === "show");
    },
    [setShowSolved],
  );

  const setViewModeString = useCallback(
    (value: string) => {
      if (value === "list" || value === "table" || value === "fullwidth") {
        setViewMode(value);
      }
    },
    [setViewMode],
  );

  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
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

  const searchBarRef = useRef<HTMLInputElement>(null);

  const onSearchStringChange: NonNullable<FormControlProps["onChange"]> =
    useCallback((e) => {
      setSearchString(e.currentTarget.value);
    }, []);

  const clearSearch = useCallback(() => {
    setSearchString("");
  }, []);

  const renderList = useCallback(
    (showPuzzles: PuzzleType[]) => {
      if (viewMode === "table" || viewMode === "fullwidth") {
        return <PuzzleNotesTable puzzles={showPuzzles} allTags={allTags} />;
      }
      return <PuzzlesForTagList puzzles={showPuzzles} allTags={allTags} />;
    },
    [allTags, viewMode],
  );

  const puzzlesMatchingSolvedFilter = useCallback(
    (puzzles: PuzzleType[]): PuzzleType[] => {
      if (showSolved) {
        return puzzles;
      } else {
        return puzzles.filter((puzzle) => {
          const solvedness = computeSolvedness(puzzle);
          return solvedness !== "solved";
        });
      }
    },
    [showSolved],
  );

  const matchingSearchAndSolved = puzzlesMatchingSolvedFilter(matchingSearch);

  const filterMessage = `Showing ${matchingSearchAndSolved.length} of ${allPuzzles.length} items`;
  const idPrefix = useId();

  return loading ? (
    <span>loading...</span>
  ) : (
    <Container fluid={viewMode === "fullwidth"}>
      <h1>Notes</h1>
      <ControlsContainer>
        <FormGroup>
          <FormLabel>Puzzles</FormLabel>
          <ButtonToolbar>
            <StyledToggleButtonGroup
              type="radio"
              name="show-solved"
              defaultValue="show"
              value={showSolved ? "show" : "hide"}
              onChange={setShowSolvedString}
            >
              <ToggleButton
                id={`${idPrefix}-solved-hide-button`}
                variant="outline-info"
                value="hide"
              >
                ⚪️ Unsolved
              </ToggleButton>
              <ToggleButton
                id={`${idPrefix}-solved-show-button`}
                variant="outline-info"
                value="show"
              >
                🌏 All
              </ToggleButton>
            </StyledToggleButtonGroup>
          </ButtonToolbar>
        </FormGroup>

        <FormGroup>
          <FormLabel>View</FormLabel>
          <ButtonToolbar>
            <StyledToggleButtonGroup
              type="radio"
              name="view-mode"
              defaultValue="list"
              value={viewMode}
              onChange={setViewModeString}
            >
              <ToggleButton
                id={`${idPrefix}-view-list-button`}
                variant="outline-info"
                value="list"
              >
                <FontAwesomeIcon icon={faList} /> List
              </ToggleButton>
              <ToggleButton
                id={`${idPrefix}-view-table-button`}
                variant="outline-info"
                value="table"
              >
                <FontAwesomeIcon icon={faTable} /> Table
              </ToggleButton>
              <ToggleButton
                id={`${idPrefix}-view-full-width-table-button`}
                variant="outline-info"
                value="fullwidth"
              >
                <FontAwesomeIcon icon={faArrowsLeftRight} /> Full width
              </ToggleButton>
            </StyledToggleButtonGroup>
          </ButtonToolbar>
        </FormGroup>

        <SearchFormGroup>
          <FormLabel>Search</FormLabel>
          <InputGroup>
            <FormControl
              id={`${idPrefix}-jr-puzzle-search`}
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
      </ControlsContainer>

      <PuzzleListToolbar>
        <div />
        <div>{filterMessage}</div>
      </PuzzleListToolbar>
      {!loading && renderList(matchingSearchAndSolved)}
    </Container>
  );
};

export default NotesPage;
