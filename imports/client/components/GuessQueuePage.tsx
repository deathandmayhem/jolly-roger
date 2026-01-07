import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  Badge,
  ButtonToolbar,
  FormLabel,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
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
import type { GuessType } from "../../lib/models/Guesses";
import Guesses from "../../lib/models/Guesses";
import type { HuntType } from "../../lib/models/Hunts";
import Hunts from "../../lib/models/Hunts";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
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
import { formatGuessDirection } from "./guessDetails";
import Markdown from "./Markdown";
import PuzzleAnswer from "./PuzzleAnswer";
import Breakable from "./styling/Breakable";
import type { Breakpoint } from "./styling/responsive";
import { mediaBreakpointDown } from "./styling/responsive";

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
      &::before {
        content: "Guess: ";
        white-space: pre;
      }
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

    const idPrefix = useId();

    const puzzleTooltip = (
      <Tooltip id={`${idPrefix}-puzzle-tooltip`}>Open original puzzle</Tooltip>
    );
    const discussionTooltip = (
      <Tooltip id={`${idPrefix}-discussion-tooltip`}>
        Open on Jolly Roger
      </Tooltip>
    );
    const requeueTooltip = <Tooltip>Return this guess to the queue</Tooltip>;

    let directionLabel;
    let directionVariant;
    const guessDir = guess?.direction ?? 0;
    if (guessDir > 5) {
      directionLabel = "Forward";
      directionVariant = "primary";
    } else if (guessDir > 0) {
      directionLabel = "Forward*";
      directionVariant = "primary";
    } else if (guessDir < -5) {
      directionLabel = "Back";
      directionVariant = "danger";
    } else if (guessDir < 0) {
      directionLabel = "Back*";
      directionVariant = "danger";
    } else {
      directionLabel = "Mixed";
      directionVariant = "secondary";
    }

    let confidenceLabel;
    let confidenceVariant;

    const guessConf = guess?.confidence ?? 0;
    if (guessConf > 50) {
      confidenceLabel = "High";
      confidenceVariant = "success";
    } else if (guessConf < 50) {
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

  const data = useTracker(() => {
    if (loading) return null;

    return {
      hunt: Hunts.findOne({ _id: huntId }),
      // Fetch raw data; we will index/filter this in useMemo to avoid
      // creating new array references on every tracker heartbeat.
      rawGuesses: Guesses.find(
        { hunt: huntId },
        { sort: { createdAt: -1 } },
      ).fetch(),
      rawPuzzles: Puzzles.find({ hunt: huntId }).fetch(),
      rawDisplayNames: indexedDisplayNames(),
      canEdit: userMayUpdateGuessesForHunt(
        Meteor.user(),
        Hunts.findOne({ _id: huntId }),
      ),
    };
  }, [huntId, loading]);

  const puzzleMap = useMemo(() => {
    return data ? indexedById(data.rawPuzzles) : new Map<string, PuzzleType>();
  }, [data]);

  const finalGuesses = useMemo(() => {
    if (!data) return [];

    const keys = searchString
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 0);

    return data.rawGuesses
      .filter((g) => displayMode.includes(g.state) || g.state === "pending")
      .filter((guess) => {
        if (keys.length === 0) return true;

        const puzzle = puzzleMap.get(guess.puzzle);
        if (!puzzle) return false;

        const guessText = guess.guess.toLowerCase();
        const submitter = (
          data.rawDisplayNames.get(guess.createdBy) ?? ""
        ).toLowerCase();
        const title = puzzle.title.toLowerCase();

        return keys.every(
          (key) =>
            guessText.includes(key) ||
            title.includes(key) ||
            submitter.includes(key),
        );
      });
  }, [
    data?.rawGuesses,
    data?.rawDisplayNames,
    puzzleMap,
    displayMode,
    searchString,
    data,
  ]);

  const pageTitle = useMemo(() => {
    if (loading || !data?.hunt) {
      return "Loading...";
    } else if (data?.hunt.hasGuessQueue) {
      return "Guess queue";
    } else {
      return "Answer log";
    }
  }, [loading, data?.hunt]);

  useBreadcrumb({ title: pageTitle, path: `/hunts/${huntId}/guesses` });

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

  const idPrefix = useId();

  if (loading || !data?.hunt) {
    return <div>loading...</div>;
  }

  const directionTooltip = (
    <Tooltip id={`${idPrefix}-direction-tooltip`}>
      Direction this puzzle was solved, ranging from completely backsolved (
      {formatGuessDirection(-10)}) to completely forward solved (
      {formatGuessDirection(10)})
    </Tooltip>
  );
  const confidenceTooltip = (
    <Tooltip id={`${idPrefix}-confidence-tooltip`}>
      Submitter-estimated likelihood that this answer is correct
    </Tooltip>
  );

  return (
    <div>
      <h1>{pageTitle}</h1>
      <FormGroup className="mb-3" controlId={`${idPrefix}-guess-search`}>
        <InputGroup>
          <FormControl
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
              id={`${idPrefix}-view-group-button-correct`}
              variant="outline-success"
              value="correct"
              // checked={displayMode.includes("correct")}
            >
              Correct
            </ToggleButton>
            <ToggleButton
              id={`${idPrefix}-view-group-button-intermediate`}
              variant="outline-warning"
              value="intermediate"
              // checked={displayMode.includes("intermediate")}
            >
              Intermediate
            </ToggleButton>
            <ToggleButton
              id={`${idPrefix}-view-group-button-incorrect`}
              variant="outline-danger"
              value="incorrect"
              // checked={displayMode.includes("incorrect")}
            >
              Incorrect
            </ToggleButton>
            <ToggleButton
              id={`${idPrefix}-view-group-button-rejected`}
              variant="outline-secondary"
              value="rejected"
              // checked={displayMode.includes("rejected")}
            >
              Rejected
            </ToggleButton>
          </StyledToggleButtonGroup>
        </ButtonToolbar>
      </FormGroup>
      <StyledTable $hasGuessQueue={data?.hunt?.hasGuessQueue}>
        <StyledHeaderRow>
          <StyledHeader>Time</StyledHeader>
          <StyledHeader>Submitter</StyledHeader>
          <StyledHeader>Puzzle</StyledHeader>
          <StyledHeader>Answer</StyledHeader>
          {data?.hunt?.hasGuessQueue && (
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
          {data?.hunt?.hasGuessQueue && <StyledHeader>&nbsp;</StyledHeader>}
        </StyledHeaderRow>
        {finalGuesses.map((guess) => {
          return (
            <GuessBlock
              key={guess._id}
              hunt={data?.hunt}
              guess={guess}
              createdByDisplayName={
                data?.displayNames?.get(guess.createdBy) ?? "???"
              }
              puzzle={puzzleMap.get(guess.puzzle)!}
              canEdit={data?.canEdit ?? false}
            />
          );
        })}
      </StyledTable>
    </div>
  );
};

export default GuessQueuePage;
