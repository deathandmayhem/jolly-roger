import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faSkullCrossbones } from "@fortawesome/free-solid-svg-icons/faSkullCrossbones";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useId, useRef } from "react";
import Button from "react-bootstrap/Button";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import InputGroup from "react-bootstrap/InputGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { useTranslation } from "react-i18next";
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
import { userHasPermissionForAction } from "../../lib/permission_stubs";
import guessesForGuessQueue from "../../lib/publications/guessesForGuessQueue";
import setGuessState from "../../methods/setGuessState";
import { guessURL } from "../../model-helpers";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useFocusRefOnFindHotkey from "../hooks/useFocusRefOnFindHotkey";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import { compileGuessMatcher } from "../search";
import CopyToClipboardButton from "./CopyToClipboardButton";
import GuessState from "./GuessState";
import {
  formatGuessDirection,
  GuessConfidence,
  GuessDirection,
} from "./guessDetails";
import Markdown from "./Markdown";
import PuzzleAnswer from "./PuzzleAnswer";
import Breakable from "./styling/Breakable";
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
  background-color: ${({ theme }) => theme.colors.background};
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
  background-color: ${({ theme, $state }) =>
    theme.colors.guess[$state].background};

  &::before {
    content: " ";
    border-top: 1px solid #ddd;
    grid-column: 1 / -1;
  }

  :hover {
    background-color: ${({ theme, $state }) =>
      theme.colors.guess[$state].hoverBackground};
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

    const idPrefix = useId();

    const { t, i18n } = useTranslation();

    const puzzleTooltip = (
      <Tooltip id={`${idPrefix}-puzzle-tooltip`}>
        {t("guessQueue.openPuzzleTooltip", "Open puzzle")}
      </Tooltip>
    );
    const discussionTooltip = (
      <Tooltip id={`${idPrefix}-discussion-tooltip`}>
        {t("guessQueue.openDiscussionTooltip", "Open Jolly Roger discussion")}
      </Tooltip>
    );
    return (
      <StyledRow $state={guess.state}>
        <StyledPuzzleTimestampAndSubmitter>
          <StyledPuzzleTimestamp>
            {calendarTimeFormat(guess.createdAt, t, i18n.language)}
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
              <FontAwesomeIcon icon={faPuzzlePiece} />
            </a>
          </OverlayTrigger>{" "}
          <OverlayTrigger placement="top" overlay={discussionTooltip}>
            <Link to={`/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`}>
              <FontAwesomeIcon icon={faSkullCrossbones} />
            </Link>
          </OverlayTrigger>{" "}
          <Breakable>{puzzle.title}</Breakable>
        </StyledPuzzleCell>
        <StyledGuessCell>
          <StyledCopyToClipboardButton
            variant="link"
            aria-label="Copy"
            text={guess.guess}
          >
            <FontAwesomeIcon icon={faCopy} />
          </StyledCopyToClipboardButton>
          <PuzzleAnswer answer={guess.guess} breakable indented />
        </StyledGuessCell>
        {hunt.hasGuessQueue && (
          <StyledGuessDetails>
            <StyledGuessDetailWithLabel>
              <StyledGuessDetailLabel>Solve direction</StyledGuessDetailLabel>
              <StyledGuessDirection
                id={`${idPrefix}-direction`}
                value={guess.direction}
              />
            </StyledGuessDetailWithLabel>
            <StyledGuessDetailWithLabel>
              <StyledGuessDetailLabel>Confidence</StyledGuessDetailLabel>
              <StyledGuessConfidence
                id={`${idPrefix}-confidence`}
                value={guess.confidence}
              />
            </StyledGuessDetailWithLabel>
          </StyledGuessDetails>
        )}
        <StyledCell>
          <GuessState state={guess.state} />
        </StyledCell>
        {hunt.hasGuessQueue && (
          <StyledCell>
            {canEdit && guess.state !== "pending" && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={markPending}
              >
                {t("guessQueue.returnToQueue", "Return to queue")}
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

  const { t } = useTranslation();

  const pageTitle = useTracker(() => {
    if (loading || !hunt) {
      return `${t("common.loading", "loading")}...`;
    } else if (hunt.hasGuessQueue) {
      return t("guessQueue.title.guess", "Guess queue");
    } else {
      return t("guessQueue.title.answer", "Answer log");
    }
  }, [hunt, loading, t]);

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
    () => userHasPermissionForAction(Meteor.user(), hunt, "operateGuessQueue"),
    [hunt],
  );

  const searchBarRef = useRef<HTMLInputElement>(null);
  useFocusRefOnFindHotkey(searchBarRef);

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
        const isInteresting = compileGuessMatcher(
          puzzles,
          displayNames,
          searchKeysWithEmptyKeysRemoved,
        );
        interestingGuesses = guessesForKnownPuzzles.filter(isInteresting);
      }

      return interestingGuesses;
    },
    [searchString, puzzles, displayNames],
  );

  const idPrefix = useId();

  if (loading || !hunt) {
    return <div>{t("common.loading", "loading")}...</div>;
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
      {t(
        "tableHeader.confidenceTooltip",
        "Submitter-estimated likelihood that this answer is correct",
      )}
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
            placeholder={t("guessQueue.filterBy", "Filter by title or answer")}
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
          <StyledHeader>
            {t("guessQueue.tableHeader.time", "Time")}
          </StyledHeader>
          <StyledHeader>
            {t("guessQueue.tableHeader.submitter", "Submitter")}
          </StyledHeader>
          <StyledHeader>
            {t("guessQueue.tableHeader.puzzle", "Puzzle")}
          </StyledHeader>
          <StyledHeader>
            {t("guessQueue.tableHeader.answer", "Answer")}
          </StyledHeader>
          {hunt.hasGuessQueue && (
            <>
              <OverlayTrigger placement="top" overlay={directionTooltip}>
                <StyledHeader>
                  {t("guessQueue.tableHeader.direction", "Direction")}
                </StyledHeader>
              </OverlayTrigger>
              <OverlayTrigger placement="top" overlay={confidenceTooltip}>
                <StyledHeader>
                  {t("guessQueue.tableHeader.confidence", "Confidence")}
                </StyledHeader>
              </OverlayTrigger>
            </>
          )}
          <StyledHeader>
            {t("guessQueue.tableHeader.status", "Status")}
          </StyledHeader>
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
