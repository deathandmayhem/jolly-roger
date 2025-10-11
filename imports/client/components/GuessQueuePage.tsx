import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  useCallback,
  useRef,
  useState,
} from "react";
import Button from "react-bootstrap/Button";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import InputGroup from "react-bootstrap/InputGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
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
import useFocusRefOnFindHotkey from "../hooks/useFocusRefOnFindHotkey";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import type { Theme } from "../theme";
import CopyToClipboardButton from "./CopyToClipboardButton";
import GuessState from "./GuessState";
import Markdown from "./Markdown";
import PuzzleAnswer from "./PuzzleAnswer";
import { formatGuessDirection } from "./guessDetails";
import Breakable from "./styling/Breakable";
import type { Breakpoint } from "./styling/responsive";
import { mediaBreakpointDown } from "./styling/responsive";
import { ToggleButtonGroup, Badge, FormLabel, ButtonToolbar, ToggleButton } from "react-bootstrap";

const StyledToggleButtonGroup = styled(ToggleButtonGroup)`
  @media (width < 360px) {
    width: 100%;
  }
`;

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

const StyledHeader = styled.div<{ theme: Theme }>`
  position: sticky;
  top: 0;
  background-color: ${({ theme }) => theme.colors.background};
  font-weight: bold;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      display: none;
    `,
  )}
`;

const StyledRow = styled.div<{ $state: GuessType["state"]; theme: Theme }>`
  display: contents;
  margin-bottom: 8px;
  background-color: ${({ theme, $state }) => {
    switch ($state) {
      case "correct":
        return theme.colors.guessColorCorrectBackground;
      case "intermediate":
        return theme.colors.guessColorIntermediateBackground;
      case "incorrect":
        return theme.colors.guessColorIncorrectBackground;
      case "rejected":
        return theme.colors.guessColorRejectedBackground;
      case "pending":
        return theme.colors.guessColorPendingBackground;
      default:
        return "transparent";
    }
  }};

  &::before {
    content: " ";
    border-top: 1px solid #ddd;
    grid-column: 1 / -1;
  }

  :hover {
    background-color: ${({ theme, $state }) => {
      switch ($state) {
        case "correct":
          return theme.colors.guessColorCorrectHoverBackground;
        case "intermediate":
          return theme.colors.guessColorIntermediateHoverBackground;
        case "incorrect":
          return theme.colors.guessColorIncorrectHoverBackground;
        case "rejected":
          return theme.colors.guessColorRejectedHoverBackground;
        case "pending":
          return theme.colors.guessColorPendingHoverBackground;
        default:
          return "transparent";
      }
    }};
  }
`;

const StyledCell = styled.div`
  overflow: hidden;
  padding: 4px;
  background-color: inherit;
`;

const StyledCopyToClipboardButton = styled(CopyToClipboardButton)`
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
  color: #888;
  font-size: 0.9rem;

  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      line-height: 1.7;
      margin-right: 0.5em;

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
  ${mediaBreakpointDown(compactViewBreakpoint)}
`;

const StyledGuessCell = styled(StyledCell)`
  display: flex;
  align-items: start;
  overflow: hidden;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      /* &::before { */
        /* content: "Guess: "; */
        /* white-space: pre; */
      /* } */
    `,
  )}
`;




const StyledGuessStatuses = styled.div`
  display: contents;
  background-color: inherit;
  ${mediaBreakpointDown(
    compactViewBreakpoint,
    css`
      padding: 4px;
      display: flex;

      & > * {
        padding: 0;
        margin-right: 0.5em;
      }
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
      <Tooltip id={`guess-${guess._id}-puzzle-tooltip`}>
        Open original puzzle
      </Tooltip>
    );
    const discussionTooltip = (
      <Tooltip id={`guess-${guess._id}-discussion-tooltip`}>
        Open on Jolly Roger
      </Tooltip>
    );
    const requeueTooltip = <Tooltip>Return this guess to the queue</Tooltip>;

    let directionLabel;
    let directionVariant;
    if (guess?.direction > 5) {
      directionLabel = "Forward";
      directionVariant = "primary";
    } else if (guess?.direction > 0) {
      directionLabel = "Forward*";
      directionVariant = "primary";
    } else if (guess?.direction < -5) {
      directionLabel = "Back";
      directionVariant = "danger";
    } else if (guess?.direction < 0) {
      directionLabel = "Back*";
      directionVariant = "danger";
    } else {
      directionLabel = "Mixed";
      directionVariant = "secondary";
    }

    let confidenceLabel;
    let confidenceVariant;

    if (guess?.confidence > 50) {
      confidenceLabel = "High";
      confidenceVariant = "success";
    } else if (guess?.confidence < 50) {
      confidenceLabel = "Low";
      confidenceVariant = "danger";
    } else {
      confidenceLabel = "Medium";
      confidenceVariant = "warning";
    }

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
              <Breakable>{puzzle.title}</Breakable>
            </Link>
          </OverlayTrigger>{" "}
        </StyledPuzzleCell>
        <StyledGuessCell>
          <StyledCopyToClipboardButton
            variant="link"
            aria-label="Copy"
            tooltipId={`guess-${guess._id}-copy-tooltip`}
            text={guess.guess}
          >
            <FontAwesomeIcon icon={faCopy} fixedWidth />
          </StyledCopyToClipboardButton>
          <PuzzleAnswer answer={guess.guess} breakable indented />
        </StyledGuessCell>
        {hunt.hasGuessQueue && (
          <StyledGuessStatuses>
            <StyledCell>
              <Badge bg={directionVariant}>{directionLabel}</Badge>
            </StyledCell>
            <StyledCell>
              <Badge bg={confidenceVariant}>{confidenceLabel}</Badge>
            </StyledCell>
            <StyledCell>
              <GuessState id={`guess-${guess._id}-state`} state={guess.state} />
            </StyledCell>
            <StyledCell>
              {canEdit && guess.state !== "pending" && (
                <OverlayTrigger placement="top" overlay={requeueTooltip}>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={markPending}
                  >
                    Re-queue
                  </Button>
                </OverlayTrigger>
              )}
            </StyledCell>
          </StyledGuessStatuses>
        )}
        {guess.additionalNotes && (
          <Markdown as={StyledAdditionalNotes} text={guess.additionalNotes} />
        )}
      </StyledRow>
    );
  },
);

const GuessQueuePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [displayMode, setDisplayMode] = useState<string[]>([
    "correct",
    "intermediate",
    "incorrect",
    "rejected",
  ]); // pending guesses are always shown
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
        : Guesses.find({ hunt: huntId }, { sort: { createdAt: -1 } })
            .fetch()
            .filter(
              (x) => displayMode.includes(x.state) || x.state === "pending",
            ),
    [huntId, loading, displayMode],
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
  useFocusRefOnFindHotkey(searchBarRef);

  const onChangeDisplayMode = useCallback((value: string[]) => {
    setDisplayMode(value);
  }, []);

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
      <FormGroup>
        <FormLabel>Guesses to show</FormLabel>
        <ButtonToolbar>
          <StyledToggleButtonGroup
            type="checkbox"
            name="guess-view"
            value={displayMode}
            onChange={onChangeDisplayMode}
          >
            <ToggleButton
              id="view-group-button-correct"
              variant="outline-success"
              value="correct"
              // checked={displayMode.includes("correct")}
            >
              Correct
            </ToggleButton>
            <ToggleButton
              id="view-group-button-intermediate"
              variant="outline-warning"
              value="intermediate"
              // checked={displayMode.includes("intermediate")}
            >
              Intermediate
            </ToggleButton>
            <ToggleButton
              id="view-group-button-incorrect"
              variant="outline-danger"
              value="incorrect"
              // checked={displayMode.includes("incorrect")}
            >
              Incorrect
            </ToggleButton>
            <ToggleButton
              id="view-group-button-rejected"
              variant="outline-secondary"
              value="rejected"
              // checked={displayMode.includes("rejected")}
            >
              Rejected
            </ToggleButton>
          </StyledToggleButtonGroup>
        </ButtonToolbar>
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
