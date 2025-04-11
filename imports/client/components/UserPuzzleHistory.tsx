import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCircleQuestion as faCircleRegular } from "@fortawesome/free-regular-svg-icons";
import {
  faCircleQuestion,
  faSortDown,
  faSortUp,
} from "@fortawesome/free-solid-svg-icons";
import { faBan } from "@fortawesome/free-solid-svg-icons/faBan";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faCaretRight } from "@fortawesome/free-solid-svg-icons/faCaretRight";
import { faMessage } from "@fortawesome/free-solid-svg-icons/faMessage";
import { faPencil } from "@fortawesome/free-solid-svg-icons/faPencil";
import { faPhone } from "@fortawesome/free-solid-svg-icons/faPhone";
import { faStar } from "@fortawesome/free-solid-svg-icons/faStar";
import { faThumbsDown } from "@fortawesome/free-solid-svg-icons/faThumbsDown";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons/faThumbsUp";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useMemo, useState } from "react";
import { FormControl, OverlayTrigger, Table, Tooltip } from "react-bootstrap";
import { Link } from "react-router-dom";
import Select from "react-select";
import styled, { useTheme } from "styled-components";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import CallActivities from "../../lib/models/CallActivities";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import ChatMessages from "../../lib/models/ChatMessages";
import type { DocumentActivityType } from "../../lib/models/DocumentActivities";
import DocumentActivities from "../../lib/models/DocumentActivities";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import ActivitySummaryForUser from "../../lib/publications/ActivitySummaryForUser";
import PuzzleHistorySummaryForUser from "../../lib/publications/PuzzleHistorySummaryForUser";
import huntsAll from "../../lib/publications/huntsAll";
import puzzleHistoryForUser from "../../lib/publications/puzzleHistoryForUser";
import tagsAll from "../../lib/publications/tagsAll";
import type { Solvedness } from "../../lib/solvedness";
import type { CallActivityType } from "../../server/models/CallActivities";
import ActivityHistorySummaries from "../ActivityHistorySummaries";
import PuzzleHistorySummaries from "../PuzzleHistorySummaries";
import type { PuzzleHistoryItem } from "../UserPuzzleHistory";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import type { Theme } from "../theme";
import type { ActivityItem } from "./ContributionGraph";
import ContributionGraph from "./ContributionGraph";
import TagList from "./TagList";

const StyledFAIcon = styled(FontAwesomeIcon)<{
  theme: Theme;
  $active: boolean;
}>`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.success : theme.colors.secondary};
`;

const PuzzleHistoryTR = styled.tr<{ $solvedness: string; theme: Theme }>`
  background-color: ${({ theme, $solvedness }) => {
    return theme.colors.solvedness[$solvedness as Solvedness];
  }};
`;

const FilterBar = styled.div`
  margin-bottom: 1rem;
  display: flex;
`;

const FilterSection = styled.div`
  margin-right: 1rem;
`;

const NoHistoryMessage = styled.td`
  text-align: center;
  font-style: italic;
`;
const PuzzleInteractionSpan = ({
  bookmarked,
  calls,
  document,
  messages,
  guesses,
  correctGuesses,
}: {
  bookmarked: number;
  calls: number;
  document: number;
  messages: number;
  guesses: number;
  correctGuesses: number;
}) => {
  const tooltip = (
    <Tooltip>
      <div>Bookmarked: {bookmarked > 0 ? "Yes" : "No"}</div>
      <div>Voice chat: {calls > 0 ? "Yes" : "No"}</div>
      <div>Text chat: {messages > 0 ? "Yes" : "No"}</div>
      <div>Edited doc: {document > 0 ? "Yes" : "No"}</div>
      <div>Submitted guess: {guesses > 0 ? "Yes" : "No"}</div>
      <div>Submitted correct guess: {correctGuesses > 0 ? "Yes" : "No"}</div>
    </Tooltip>
  );

  let guessIcon;
  if (correctGuesses > 0) {
    guessIcon = faCircleQuestion;
  } else {
    guessIcon = faCircleRegular;
  }

  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      <span>
        <StyledFAIcon $active={bookmarked > 0} icon={faStar} fixedWidth />
        <StyledFAIcon $active={calls > 0} icon={faPhone} fixedWidth />
        <StyledFAIcon $active={document > 0} icon={faPencil} fixedWidth />
        <StyledFAIcon $active={messages > 0} icon={faMessage} fixedWidth />
        <StyledFAIcon $active={guesses > 0} icon={guessIcon} fixedWidth />
      </span>
    </OverlayTrigger>
  );
};

const PuzzleDetailMemo = React.memo(
  ({
    historyItem,
    userId,
    browserOffset,
  }: {
    historyItem: PuzzleHistoryItem;
    userId: string;
    browserOffset: number;
  }) => {
    const puzzleDetail = useTypedSubscribe(puzzleHistoryForUser, {
      userId,
      puzzleId: historyItem.puzzleId,
    });

    const puzzleDetailLoading = puzzleDetail();
    const puzzle = historyItem.puzzleId;
    const {
      chatsSent,
      chatMentions,
      thisPuzzle,
      tags,
      callActivities,
      documentActivities,
      guesses,
      chatMessagesSent,
      chatMessagesTagged,
    } = useTracker(() => {
      if (puzzleDetailLoading) {
        return {
          chatsSent: 0,
          chatMentions: 0,
          thisPuzzle: null,
          tags: [],
          callActivities: [],
          documentActivities: [],
          guesses: [],
        };
      }
      const chatMessages = ChatMessages.find({
        $or: [{ sender: userId }, { "content.children.userId": userId }],
        puzzle,
      }).fetch();
      const chatStats = {
        chatsSent: 0,
        chatMentions: 0,
      };
      const chatMessagesSent: ChatMessageType[] = [];
      const chatMessagesTagged: ChatMessageType[] = [];
      chatMessages.forEach((c) => {
        if (c.sender === userId) {
          chatStats.chatsSent += 1;
          chatMessagesSent.push(c);
        }
        if (c.content.children.some((o) => o.userId === userId)) {
          chatStats.chatMentions += 1;
          chatMessagesTagged.push(c);
        }
      });
      return {
        chatsSent: chatStats.chatsSent,
        chatMentions: chatStats.chatMentions,
        thisPuzzle: Puzzles.findOne({ _id: historyItem.puzzleId }),
        tags: Tags.find({}).fetch(),
        callActivities: CallActivities.find({
          call: puzzle,
          user: userId,
        }).fetch(),
        documentActivities: DocumentActivities.find({
          puzzle,
          user: userId,
        }).fetch(),
        guesses: Guesses.find({ puzzle, user: userId }).fetch(),
        chatMessagesSent,
        chatMessagesTagged,
      };
    }, [historyItem.puzzleId, puzzle, puzzleDetailLoading, userId]);

    const contributionsData: ActivityItem[] = [];

    chatMessagesSent?.forEach((c: ChatMessageType) => {
      contributionsData.push({
        dayOfWeek: c.createdAt.getUTCDay(),
        hour: c.createdAt.getUTCHours(),
        count: 1,
        type: "Message",
      });
    });

    callActivities?.forEach((c: CallActivityType) => {
      contributionsData.push({
        dayOfWeek: c.ts.getUTCDay(),
        hour: c.ts.getUTCHours(),
        count: 1,
        type: "Call",
      });
    });

    documentActivities?.forEach((d: DocumentActivityType) => {
      contributionsData.push({
        dayOfWeek: d.ts.getUTCDay(),
        hour: d.ts.getUTCHours(),
        count: 1,
        type: "Document",
      });
    });

    const guessLi = useMemo(() => {
      if (historyItem.guessCounter === 0) {
        return null;
      } else if (
        historyItem.guessCounter === 1 &&
        historyItem.correctGuessCounter === 1
      ) {
        return (
          <li>
            submitted <strong>one guess</strong>... and it was{" "}
            <strong>correct</strong>!
          </li>
        );
      } else if (
        historyItem.guessCounter > 1 &&
        historyItem.correctGuessCounter > 1
      ) {
        return (
          <li>
            submitted <strong>{historyItem.guessCounter} guesses</strong>
            ... and{" "}
            <strong>
              {historyItem.correctGuessCounter === historyItem.guessCounter
                ? "all"
                : historyItem.correctGuessCounter}{" "}
              of them
            </strong>{" "}
            were <strong>correct</strong>!
          </li>
        );
      } else if (historyItem.guessCounter > 1) {
        return (
          <li>
            submitted <strong>{historyItem.guessCounter} guesses</strong>
          </li>
        );
      } else {
        return null;
      }
    }, [historyItem.correctGuessCounter, historyItem.guessCounter]);

    const puzzleDetailInfo = (
      <>
        <p>In this puzzle, you...</p>
        <ul>
          {chatsSent > 0 && (
            <li>
              sent{" "}
              <strong>
                {chatsSent} message
                {chatsSent > 1 ? "s" : ""}/reaction{chatsSent > 1 ? "s" : ""}
              </strong>
            </li>
          )}
        </ul>
        <ul>
          {chatMentions > 0 && (
            <li>
              were mentioned in{" "}
              <strong>
                {chatMentions} message
                {chatMentions > 1 ? "s" : ""}
              </strong>
            </li>
          )}
          {historyItem.documentCounter > 0 && (
            <li>
              were seen editing the document{" "}
              <strong>{historyItem.documentCounter} times</strong>
            </li>
          )}
          {guessLi}
        </ul>
        <strong>Tags</strong>
        <p>
          <TagList
            puzzle={thisPuzzle}
            popoverRelated={false}
            tags={tags}
            emptyMessage="This puzzle has no tags"
            linkToSearch={false}
          />
        </p>
        {contributionsData.length > 0 && (
          <ContributionGraph
            data={contributionsData}
            timezoneOffset={browserOffset}
            title="Your activity for this puzzle"
            showCount
          />
        )}
      </>
    );
    return (
      <tr>
        <td colSpan={8}>
          {puzzleDetailLoading ? "Loading..." : puzzleDetailInfo}
        </td>
      </tr>
    );
  },
);

const PuzzleHistoryRow = ({
  theme,
  historyItem,
  userId,
  browserOffset,
}: {
  theme: Theme;
  historyItem: PuzzleHistoryItem;
  userId: string;
  browserOffset: number;
}) => {
  let solvednessIcon;
  let solvednessColour;

  const [showDetail, setShowDetail] = useState<boolean>(false);

  const toggleDetail = useCallback(() => {
    setShowDetail(!showDetail);
  }, [showDetail]);

  switch (historyItem.solvedness) {
    case "solved":
      solvednessIcon = faThumbsUp;
      solvednessColour = theme.colors.success;
      break;
    case "unsolved":
      solvednessIcon = faThumbsDown;
      solvednessColour = theme.colors.secondary;
      break;
    default:
      solvednessIcon = faBan;
      solvednessColour = theme.colors.secondary;
      break;
  }

  return (
    <>
      <PuzzleHistoryTR
        $solvedness={historyItem.solvedness}
        key={historyItem.puzzleId}
        onClick={toggleDetail}
      >
        <td>
          <FontAwesomeIcon
            icon={showDetail ? faCaretDown : faCaretRight}
            fixedWidth
          />
        </td>
        <td>
          <Link to={`/hunts/${historyItem.huntId}/`}>
            {historyItem.huntName}
          </Link>
        </td>
        <td>
          <Link
            to={`/hunts/${historyItem.huntId}/puzzles/${historyItem.puzzleId}`}
          >
            {historyItem.name}
          </Link>
        </td>
        <td>{historyItem.answers?.join(", ")}</td>
        <td>
          <FontAwesomeIcon
            icon={solvednessIcon}
            color={solvednessColour}
            fixedWidth
            title={historyItem.solvedness}
          />
        </td>
        <td>
          {historyItem.firstInteraction
            ? calendarTimeFormat(historyItem.firstInteraction)
            : "N/A"}
        </td>
        <td>
          {historyItem.lastInteraction
            ? calendarTimeFormat(historyItem.lastInteraction)
            : "N/A"}
        </td>
        <td>
          <PuzzleInteractionSpan
            bookmarked={historyItem.bookmarkCounter}
            calls={historyItem.callCounter}
            document={historyItem.documentCounter}
            messages={historyItem.chatCounter}
            guesses={historyItem.guessCounter}
            correctGuesses={historyItem.correctGuessCounter}
          />
        </td>
      </PuzzleHistoryTR>
      {showDetail ? (
        <PuzzleDetailMemo
          browserOffset={browserOffset}
          historyItem={historyItem}
          userId={userId}
        />
      ) : null}
    </>
  );
};

const PuzzleHistoryTable = ({ userId }: { userId: string }) => {
  const localTimezoneOffset = useMemo(
    () => new Date().getTimezoneOffset() / -60,
    [],
  );
  const userSummary = useTypedSubscribe(ActivitySummaryForUser, {
    userId,
  });
  const userSummaryLoading = userSummary();
  const historySub = useTypedSubscribe(PuzzleHistorySummaryForUser, { userId });
  const loading = historySub();

  const puzzleSummaries = useTracker(() => {
    if (loading) {
      return [];
    }

    const histories = PuzzleHistorySummaries.find(
      {},
      { sort: { lastInteraction: -1 } },
    ).fetch();

    return histories;
  }, [loading]);

  const [sortColumn, setSortColumn] = useState<keyof PuzzleHistoryItem | null>(
    "lastInteraction",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const interactionTypes = useMemo(
    () => [
      { value: "bookmark", label: "Bookmark" },
      { value: "call", label: "Call" },
      { value: "chat", label: "Chat" },
      { value: "document", label: "Document" },
      { value: "guess", label: "Guess" },
      { value: "correctGuess", label: "Correct Guess" },
    ],
    [],
  );
  const [selectedHunt, setSelectedHunt] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSolvedness, setSelectedSolvedness] = useState<string[]>([]);
  const [selectedInteractionTypes, setSelectedInteractionTypes] = useState<
    { value: string; label: string }[]
  >([]);

  const huntsSubscribe = useTypedSubscribe(huntsAll);
  const huntsLoading = huntsSubscribe();
  const tagsSubscribe = useTypedSubscribe(tagsAll);
  const tagsLoading = tagsSubscribe();
  const huntOptions = useTracker(() => {
    if (huntsLoading) {
      return [];
    }
    return Hunts.find({}, { sort: { createdAt: -1 } })
      .fetch()
      .map((hunt) => ({ value: hunt._id, label: hunt.name }));
  }, [huntsLoading]);
  const allTags = useTracker(() => {
    if (tagsLoading) {
      return [];
    }
    return Tags.find({});
  });

  const activitySummaries = useTracker(() => {
    if (userSummaryLoading) {
      return [];
    }
    const histories = ActivityHistorySummaries.find({}).fetch();
    return histories.filter((h) => {
      if (
        selectedHunt.length !== 0 &&
        !selectedHunt.some((hunt) => hunt === h.huntId)
      ) {
        return false;
      }
      if (
        !["call", "chat", "document"].some((v) => {
          return selectedInteractionTypes.some((t) => {
            return t.value === v;
          });
        })
      ) {
        return true;
      }
      if (
        h.type === "Call" &&
        !selectedInteractionTypes.some((t) => t.value === "call")
      ) {
        return false;
      }
      if (
        h.type === "Chat" &&
        !selectedInteractionTypes.some((t) => t.value === "chat")
      ) {
        return false;
      }
      if (
        h.type === "Document" &&
        !selectedInteractionTypes.some((t) => t.value === "document")
      ) {
        return false;
      }
      return true;
    });
  }, [selectedHunt, selectedInteractionTypes, userSummaryLoading]);

  const solvednessOptions = useMemo(
    () => [
      { value: "solved", label: "Solved" },
      { value: "unsolved", label: "Unsolved" },
      { value: "noAnswers", label: "No Answers" },
    ],
    [],
  );

  const handleHuntChange = useCallback(
    (selectedOptions: readonly { value: string; label: string }[]) => {
      setSelectedHunt(selectedOptions.map((h) => h.value));
    },
    [],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleSolvednessChange = useCallback(
    (selectedOptions: readonly { value: string; label: string }[]) => {
      setSelectedSolvedness(selectedOptions.map((s) => s.value));
    },
    [],
  );

  const handleInteractionTypeChange = useCallback(
    (selectedOptions: readonly { value: string; label: string }[]) => {
      setSelectedInteractionTypes([...selectedOptions]);
    },
    [],
  );

  const sortedHistory = useMemo(() => {
    const data = [...puzzleSummaries];
    if (sortColumn) {
      data.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        let comparison = 0;

        let timeA;
        let timeB;

        if (valA instanceof Date) {
          timeA = valA.getTime();
        } else if (sortDirection === "asc") {
          timeA = Infinity;
        } else {
          timeA = -Infinity;
        }

        if (valB instanceof Date) {
          timeB = valB.getTime();
        } else if (sortDirection === "asc") {
          timeB = Infinity;
        } else {
          timeB = -Infinity;
        }

        if (valA instanceof Date || valB instanceof Date) {
          comparison = timeA - timeB;
        } else if (typeof valA === "string" && typeof valB === "string") {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === "number" && typeof valB === "number") {
          comparison = valA - valB;
        } else if (typeof valA === "string" && typeof valB !== "string") {
          comparison = -1;
        } else if (typeof valA !== "string" && typeof valB === "string") {
          comparison = 1;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    return data;
  }, [puzzleSummaries, sortColumn, sortDirection]);

  const filteredHistory = useMemo(() => {
    return sortedHistory.filter((item) => {
      const huntMatch =
        selectedHunt.length === 0 || selectedHunt.includes(item.huntId);
      const solvednessMatch =
        selectedSolvedness?.length === 0 ||
        selectedSolvedness?.includes(item.solvedness);
      const searchMatch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.huntName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answers?.some((a) =>
          a.toLowerCase().includes(searchQuery.toLowerCase()),
        ) ||
        item.tags?.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const interactionMatch =
        selectedInteractionTypes.length === 0 ||
        selectedInteractionTypes.some((type) => {
          switch (type.value) {
            case "bookmark":
              return item.bookmarkCounter > 0;
            case "call":
              return item.callCounter > 0;
            case "document":
              return item.documentCounter > 0;
            case "chat":
              return item.chatCounter > 0;
            case "guess":
              return item.guessCounter > 0;
            case "correctGuess":
              return item.correctGuessCounter > 0;
            default:
              return false;
          }
        });

      return huntMatch && solvednessMatch && searchMatch && interactionMatch;
    });
  }, [
    sortedHistory,
    selectedHunt,
    selectedSolvedness,
    searchQuery,
    selectedInteractionTypes,
  ]);

  const handleSort = useCallback(
    (column: keyof PuzzleHistoryItem) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortColumn(column);
        setSortDirection("desc");
      }
    },
    [sortColumn, sortDirection],
  );

  const renderHeaderCell = useCallback(
    (column: keyof PuzzleHistoryItem, headerText: string) => (
      <th
        key={column}
        onClick={() => handleSort(column)}
        style={{ cursor: "pointer" }}
      >
        {headerText}
        {sortColumn === column && (
          <span>
            <FontAwesomeIcon
              icon={sortDirection === "asc" ? faSortUp : faSortDown}
            />
          </span>
        )}
      </th>
    ),
    [handleSort, sortColumn, sortDirection],
  );

  const theme = useTheme();

  if (loading) {
    return <p>Loading puzzle history...</p>;
  }

  return (
    <>
      <FilterBar>
        <FilterSection style={{ minWidth: "200px" }}>
          <Select
            options={huntOptions}
            onChange={handleHuntChange}
            placeholder="Filter by Hunt"
            theme={theme.reactSelectTheme}
            isMulti
            isLoading={huntsLoading}
          />
        </FilterSection>
        <FilterSection style={{ flexGrow: 1 }}>
          <FormControl
            type="text"
            placeholder="Search name, hunt, answer, tag..."
            title="Search by puzzle name, hunt name, answer, or tag"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </FilterSection>
        <FilterSection style={{ minWidth: "200px" }}>
          <Select
            options={solvednessOptions}
            onChange={handleSolvednessChange}
            placeholder="Filter by Solvedness"
            theme={theme.reactSelectTheme}
            isMulti
          />
        </FilterSection>
        <FilterSection style={{ minWidth: "250px" }}>
          <Select
            isMulti
            options={interactionTypes}
            value={selectedInteractionTypes}
            onChange={handleInteractionTypeChange}
            placeholder="Filter by Interaction"
            theme={theme.reactSelectTheme}
          />
        </FilterSection>
      </FilterBar>
      <ContributionGraph
        data={activitySummaries}
        timezoneOffset={localTimezoneOffset}
        title="Your overall activity"
        showCount
      />
      <Table striped bordered hover responsive size="sm">
        <thead>
          <tr>
            <th style={{ width: "30px" }}>
              <FontAwesomeIcon icon={faCaretRight} fixedWidth />
            </th>
            {renderHeaderCell("huntName", "Hunt")}
            {renderHeaderCell("name", "Puzzle")}
            <th>Answer(s)</th>
            {renderHeaderCell("solvedness", "Solved?")}
            {renderHeaderCell("firstInteraction", "First Interaction")}
            {renderHeaderCell("lastInteraction", "Last Interaction")}
            <th>Interactions</th>
          </tr>
        </thead>
        <tbody>
          {filteredHistory.length > 0 ? (
            filteredHistory.map((historyItem) => (
              <PuzzleHistoryRow
                key={historyItem._id}
                theme={theme}
                historyItem={historyItem}
                allTags={allTags}
                userId={userId}
                browserOffset={localTimezoneOffset}
              />
            ))
          ) : (
            <tr>
              <NoHistoryMessage colSpan={8}>
                No puzzle history matches your filters.
              </NoHistoryMessage>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

const UserPuzzleHistory = () => {
  const title = "My puzzle history";
  useDocumentTitle(`${title} :: Jolly Roger`);
  useBreadcrumb({ title, path: "/history" });
  const userId = Meteor.userId()!;

  return (
    <>
      <h1>{title}</h1>
      <PuzzleHistoryTable userId={userId} />
    </>
  );
};

export default UserPuzzleHistory;
