import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faSkullCrossbones } from "@fortawesome/free-solid-svg-icons/faSkullCrossbones";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  type ComponentPropsWithRef,
  type FC,
  useCallback,
  useEffect,
  useRef,
} from "react";
import Button from "react-bootstrap/Button";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import InputGroup from "react-bootstrap/InputGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import CopyToClipboard from "react-copy-to-clipboard";
import { Link, useParams, useSearchParams } from "react-router-dom";
import styled, { css } from "styled-components";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import { indexedById } from "../../lib/listUtils";
import Guesses from "../../lib/models/Guesses";
import type { GuessType } from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import type { HuntType } from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import type { PuzzleType } from "../../lib/models/Puzzles";
import { userMayUpdateGuessesForHunt } from "../../lib/permission_stubs";
import guessesForGuessQueue from "../../lib/publications/guessesForGuessQueue";
import setGuessState from "../../methods/setGuessState";
import { guessURL } from "../../model-helpers";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import GuessState from "./GuessState";
import Markdown from "./Markdown";
import PuzzleAnswer from "./PuzzleAnswer";
import {
  GuessConfidence,
  GuessDirection,
  formatGuessDirection,
} from "./guessDetails";
import Breakable from "./styling/Breakable";
import { guessColorLookupTable } from "./styling/constants";
import type { Breakpoint } from "./styling/responsive";
import { mediaBreakpointDown } from "./styling/responsive";

const compactViewBreakpoint: Breakpoint = "md";

const StyledTable = styled.div<{ $hasGuessQueue: boolean }>`
  display: grid;
  grid-template-columns:
    [timestamp] auto
    [submitter] minmax(auto, 8em)
    [puzzle] minmax(10em, auto)
    [answer] minmax(10em, auto)
    ${(props) => props.$hasGuessQueue && "[direction] minmax(6em, auto)"}
    ${(props) => props.$hasGuessQueue && "[confidence] minmax(6em, auto)"}
    [status] auto
    ${(props) => props.$hasGuessQueue && "[actions] auto"};
  border-bottom: 1px solid #ddd;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      grid-template-columns: 100%;
    `,
  )}
`;

const StyledHeaderRow = styled.div`
  display: contents;
`;

const StyledHeader = styled.div`
  position: sticky;
  top: 0;
  background-color: white;
  font-weight: bold;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      display: none;
    `,
  )}
`;

const StyledRow = styled.div<{ $state: GuessType["state"] }>`
  display: contents;
  margin-bottom: 8px;
  background-color: ${(props) =>
    guessColorLookupTable[props.$state].background};

  &::before {
    content: " ";
    border-top: 1px solid #ddd;
    grid-column: 1 / -1;
  }

  :hover {
    background-color: ${(props) =>
      guessColorLookupTable[props.$state].hoverBackground};
  }
`;

const StyledCell = styled.div`
  overflow: hidden;
  padding: 4px;
  background-color: inherit;
`;

const StyledGuessDirection = styled(GuessDirection)`
  padding: 4px;
  background-color: inherit;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      padding: 0;
      max-width: 200px;
    `,
  )}
`;

const StyledGuessConfidence = styled(GuessConfidence)`
  padding: 4px;
  background-color: inherit;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      padding: 0;
      max-width: 200px;
    `,
  )}
`;

const StyledLinkButton: FC<ComponentPropsWithRef<typeof Button>> = styled(
  Button,
)`
  padding: 0;
  vertical-align: baseline;
`;

const StyledPuzzleTimestampAndSubmitter = styled.div`
  display: contents;
  background-color: inherit;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      padding: 4px;
      display: flex;

      & > * {
        padding: 0;
      }
    `,
  )}
`;

const StyledPuzzleTimestamp = styled(StyledCell)`
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      ::after {
        content: " submitted by ";
        white-space: pre;
      }
    `,
  )}
`;

const StyledPuzzleCell = styled(StyledCell)`
  display: flex;
  align-items: start;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      &::before {
        content: "Puzzle: ";
        white-space: pre;
      }
    `,
  )}
`;

const StyledGuessCell = styled(StyledCell)`
  display: flex;
  align-items: start;
  overflow: hidden;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      &::before {
        content: "Guess: ";
        white-space: pre;
      }
    `,
  )}
`;

const StyledGuessDetails = styled.div`
  display: contents;
  background-color: inherit;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      display: flex;
    `,
  )}
`;

const StyledGuessDetailWithLabel = styled(StyledCell)`
  display: contents;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      display: flex;
      flex-direction: column;
      align-items: stretch;
      flex-grow: 1;
    `,
  )}
`;

const StyledGuessDetailLabel = styled.span`
  display: none;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      display: inline;
    `,
  )}
`;

const StyledAdditionalNotes = styled(StyledCell)`
  grid-column: 1 / -1;
  overflow: hidden;

  p {
    margin-bottom: 0;
  }
`;

const GuessBlock = React.memo(
  ({
    canEdit,
    hunt,
    guess,
    createdByDisplayName,
    puzzle,
  }: {
    canEdit: boolean;
    hunt: HuntType;
    guess: GuessType;
    createdByDisplayName: string;
    puzzle: PuzzleType;
  }) => {
    const markPending = useCallback(() => {
      setGuessState.call({ guessId: guess._id, state: "pending" });
    }, [guess._id]);

    const puzzleTooltip = (
      <Tooltip id={`guess-${guess._id}-puzzle-tooltip`}>Open puzzle</Tooltip>
    );
    const discussionTooltip = (
      <Tooltip id={`guess-${guess._id}-discussion-tooltip`}>
        Open Jolly Roger discussion
      </Tooltip>
    );
    const copyTooltip = (
      <Tooltip id={`guess-${guess._id}-copy-tooltip`}>
        Copy to clipboard
      </Tooltip>
    );

    return (
      <StyledRow $state={guess.state}>
        <StyledPuzzleTimestampAndSubmitter>
          <StyledPuzzleTimestamp>
            {calendarTimeFormat(guess.createdAt)}
          </StyledPuzzleTimestamp>
          <StyledCell>
            <Breakable>{createdByDisplayName}</Breakable>
          </StyledCell>
        </StyledPuzzleTimestampAndSubmitter>
        <StyledPuzzleCell>
          <OverlayTrigger placement="top" overlay={puzzleTooltip}>
            <a
              href={guessURL(hunt, puzzle)}
              target="_blank"
              rel="noopener noreferrer"
              aria-labelledby={`guess-${guess._id}-puzzle-tooltip`}
            >
              <FontAwesomeIcon icon={faPuzzlePiece} fixedWidth />
            </a>
          </OverlayTrigger>{" "}
          <OverlayTrigger placement="top" overlay={discussionTooltip}>
            <Link to={`/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`}>
              <FontAwesomeIcon icon={faSkullCrossbones} fixedWidth />
            </Link>
          </OverlayTrigger>{" "}
          <Breakable>{puzzle.title}</Breakable>
        </StyledPuzzleCell>
        <StyledGuessCell>
          <OverlayTrigger placement="top" overlay={copyTooltip}>
            {({ ref, ...triggerHandler }) => (
              <CopyToClipboard text={guess.guess} {...triggerHandler}>
                <StyledLinkButton ref={ref} variant="link" aria-label="Copy">
                  <FontAwesomeIcon icon={faCopy} fixedWidth />
                </StyledLinkButton>
              </CopyToClipboard>
            )}
          </OverlayTrigger>{" "}
          <PuzzleAnswer answer={guess.guess} breakable indented />
        </StyledGuessCell>
        {hunt.hasGuessQueue && (
          <StyledGuessDetails>
            <StyledGuessDetailWithLabel>
              <StyledGuessDetailLabel>Solve direction</StyledGuessDetailLabel>
              <StyledGuessDirection
                id={`guess-${guess._id}-direction`}
                value={guess.direction}
              />
            </StyledGuessDetailWithLabel>
            <StyledGuessDetailWithLabel>
              <StyledGuessDetailLabel>Confidence</StyledGuessDetailLabel>
              <StyledGuessConfidence
                id={`guess-${guess._id}-confidence`}
                value={guess.confidence}
              />
            </StyledGuessDetailWithLabel>
          </StyledGuessDetails>
        )}
        <StyledCell>
          <GuessState id={`guess-${guess._id}-state`} state={guess.state} />
        </StyledCell>
        {hunt.hasGuessQueue && (
          <StyledCell>
            {canEdit && guess.state !== "pending" && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={markPending}
              >
                Return to queue
              </Button>
            )}
          </StyledCell>
        )}
        {guess.additionalNotes && (
          <Markdown as={StyledAdditionalNotes} text={guess.additionalNotes} />
        )}
      </StyledRow>
    );
  },
);

const GuessQueuePage = () => {
  const huntId = useParams<"huntId">().huntId!;
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get("q") ?? "";

  const guessesLoading = useTypedSubscribe(guessesForGuessQueue, { huntId });
  const loading = guessesLoading();

  const hunt = useTracker(() => Hunts.findOne({ _id: huntId }), [huntId]);

  const pageTitle = useTracker(() => {
    if (loading || !hunt) {
      return "Loading...";
    } else if (hunt.hasGuessQueue) {
      return "Guess queue";
    } else {
      return "Answer log";
    }
  }, [hunt, loading]);

  useBreadcrumb({ title: pageTitle, path: `/hunts/${huntId}/guesses` });

  const guesses = useTracker(
    () =>
      loading
        ? []
        : Guesses.find({ hunt: huntId }, { sort: { createdAt: -1 } }).fetch(),
    [huntId, loading],
  );
  const puzzles = useTracker(
    () =>
      loading
        ? new Map<string, PuzzleType>()
        : indexedById(Puzzles.find({ hunt: huntId }).fetch()),
    [huntId, loading],
  );
  const displayNames = useTracker(
    () => (loading ? new Map<string, string>() : indexedDisplayNames()),
    [loading],
  );
  const canEdit = useTracker(
    () => userMayUpdateGuessesForHunt(Meteor.user(), hunt),
    [hunt],
  );

  const searchBarRef = useRef<HTMLInputElement>(null);

  const maybeStealCtrlF = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      const node = searchBarRef.current;
      if (node) {
        node.focus();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", maybeStealCtrlF);
    return () => {
      window.removeEventListener("keydown", maybeStealCtrlF);
    };
  }, [maybeStealCtrlF]);

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

  const compileMatcher = useCallback(
    (searchKeys: string[]): ((g: GuessType) => boolean) => {
      // Given a list a search keys, compileMatcher returns a function that,
      // given a guess, returns true if all search keys match that guess in
      // some way, and false if any of the search keys cannot be found in
      // either the guess or the puzzle title.
      const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
      return (guess) => {
        const puzzle = puzzles.get(guess.puzzle)!;
        const guessText = guess.guess.toLowerCase();
        const submitterDisplayName = (
          displayNames.get(guess.createdBy) ?? ""
        ).toLowerCase();

        const titleWords = puzzle.title.toLowerCase().split(" ");
        // For each search key, if nothing from the text or the title match,
        // reject this guess.
        return lowerSearchKeys.every((key) => {
          return (
            guessText.includes(key) ||
            titleWords.some((word) => word.startsWith(key)) ||
            submitterDisplayName.includes(key)
          );
        });
      };
    },
    [puzzles, displayNames],
  );

  const filteredGuesses = useCallback(
    (allGuesses: GuessType[], puzzleMap: Map<string, PuzzleType>) => {
      const searchKeys = searchString.split(" ");
      const guessesForKnownPuzzles = allGuesses.filter((guess) =>
        puzzleMap.has(guess.puzzle),
      );
      let interestingGuesses;

      if (searchKeys.length === 1 && searchKeys[0] === "") {
        interestingGuesses = guessesForKnownPuzzles;
      } else {
        const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => {
          return key.length > 0;
        });
        const isInteresting = compileMatcher(searchKeysWithEmptyKeysRemoved);
        interestingGuesses = guessesForKnownPuzzles.filter(isInteresting);
      }

      return interestingGuesses;
    },
    [searchString, compileMatcher],
  );

  if (loading || !hunt) {
    return <div>loading...</div>;
  }

  const directionTooltip = (
    <Tooltip id="direction-tooltip">
      Direction this puzzle was solved, ranging from completely backsolved (
      {formatGuessDirection(-10)}) to completely forward solved (
      {formatGuessDirection(10)})
    </Tooltip>
  );
  const confidenceTooltip = (
    <Tooltip id="confidence-tooltip">
      Submitter-estimated likelihood that this answer is correct
    </Tooltip>
  );

  return (
    <div>
      <h1>{pageTitle}</h1>
      <FormGroup className="mb-3">
        <InputGroup>
          <FormControl
            id="jr-guess-search"
            as="input"
            type="text"
            ref={searchBarRef}
            placeholder="Filter by title or answer"
            value={searchString}
            onChange={onSearchStringChange}
          />
          <Button variant="secondary" onClick={clearSearch}>
            <FontAwesomeIcon icon={faEraser} />
          </Button>
        </InputGroup>
      </FormGroup>
      <StyledTable $hasGuessQueue={hunt.hasGuessQueue}>
        <StyledHeaderRow>
          <StyledHeader>Time</StyledHeader>
          <StyledHeader>Submitter</StyledHeader>
          <StyledHeader>Puzzle</StyledHeader>
          <StyledHeader>Answer</StyledHeader>
          {hunt.hasGuessQueue && (
            <>
              <OverlayTrigger placement="top" overlay={directionTooltip}>
                <StyledHeader>Direction</StyledHeader>
              </OverlayTrigger>
              <OverlayTrigger placement="top" overlay={confidenceTooltip}>
                <StyledHeader>Confidence</StyledHeader>
              </OverlayTrigger>
            </>
          )}
          <StyledHeader>Status</StyledHeader>
          {hunt.hasGuessQueue && <StyledHeader>&nbsp;</StyledHeader>}
        </StyledHeaderRow>
        {filteredGuesses(guesses, puzzles).map((guess) => {
          return (
            <GuessBlock
              key={guess._id}
              hunt={hunt}
              guess={guess}
              createdByDisplayName={displayNames.get(guess.createdBy) ?? "???"}
              puzzle={puzzles.get(guess.puzzle)!}
              canEdit={canEdit}
            />
          );
        })}
      </StyledTable>
    </div>
  );
};

export default GuessQueuePage;
