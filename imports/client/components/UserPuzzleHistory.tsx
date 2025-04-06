import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faBan } from "@fortawesome/free-solid-svg-icons/faBan";
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
import Bookmarks from "../../lib/models/Bookmarks";
import CallActivities from "../../lib/models/CallActivities";
import ChatMessages from "../../lib/models/ChatMessages";
import DocumentActivities from "../../lib/models/DocumentActivities";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import puzzleHistoryForUser from "../../lib/publications/puzzleHistoryForUser";
import type { Solvedness } from "../../lib/solvedness";
import { computeSolvedness } from "../../lib/solvedness";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import type { SolvednessState, Theme } from "../theme";

interface PuzzleHistoryItem {
  puzzleId: string;
  name: string;
  url: string;
  huntId: string;
  huntName: string;
  firstInteraction: Date | null;
  lastInteraction: Date | null;
  interactionCount: number;
  callCounter: number;
  documentCounter: number;
  chatCounter: number;
  bookmarkCounter: number;
  solvedness: string;
  answers: string[] | null;
}

const StyledFAIcon = styled(FontAwesomeIcon)<{
  theme: Theme;
  active: boolean;
}>`
  color: ${({ theme, active }) =>
    active ? theme.colors.success : theme.colors.secondary};
`;

const PuzzleHistoryRow = styled.tr<{ $solvedness: string; theme: Theme }>`
  background-color: ${({ theme, $solvedness }) => {
    return theme.colors.solvedness[$solvedness as Solvedness];
  }};
`;

const FilterBar = styled.div`
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FilterSection = styled.div`
  margin-right: 1rem;
`;

const PuzzleInteractionSpan = ({
  bookmarked,
  calls,
  document,
  messages,
}: {
  bookmarked: number;
  calls: number;
  document: number;
  messages: number;
}) => {
  const tooltip = (
    <Tooltip>
      <div>Bookmarked: {bookmarked > 0 ? "Yes" : "No"}</div>
      <div>Voice chat: {calls > 0 ? "Yes" : "No"}</div>
      <div>Edited doc: {document > 0 ? "Yes" : "No"}</div>
      <div>Text chat: {messages > 0 ? "Yes" : "No"}</div>
    </Tooltip>
  );

  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      <span>
        <StyledFAIcon active={bookmarked > 0} icon={faStar} fixedWidth />
        <StyledFAIcon active={calls > 0} icon={faPhone} fixedWidth />
        <StyledFAIcon active={document > 0} icon={faPencil} fixedWidth />
        <StyledFAIcon active={messages > 0} icon={faMessage} fixedWidth />
      </span>
    </OverlayTrigger>
  );
};

const PuzzleHistoryTable = ({ userId }: { userId: string }) => {
  const historyLoading = useTypedSubscribe(puzzleHistoryForUser, { userId });
  const loading = historyLoading();

  const [sortColumn, setSortColumn] = useState<keyof PuzzleHistoryItem | null>(
    "lastInteraction",
  );

  const interactionTypes = [
    { value: "bookmark", label: "Bookmark" },
    { value: "call", label: "Call" },
    { value: "document", label: "Document" },
    { value: "chat", label: "Chat" },
  ];
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [selectedHunt, setSelectedHunt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSolvedness, setSelectedSolvedness] = useState<string[]>([]);
  const [selectedInteractionTypes, setSelectedInteractionTypes] =
    useState<{ value: string; label: string }[]>(interactionTypes);

  const huntOptions = useMemo(() => {
    const huntsData = Hunts.find().fetch();
    return huntsData.map((hunt) => ({ value: hunt._id, label: hunt.name }));
  }, []);

  const solvednessOptions = useMemo(() => {
    return [
      { value: "solved", label: "Solved" },
      { value: "unsolved", label: "Unsolved" },
      { value: "noAnswers", label: "No Answers" },
    ];
  }, []);

  const handleHuntChange = useCallback((selectedOption) => {
    setSelectedHunt(selectedOption ? selectedOption.value : null);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSolvednessChange = useCallback((selectedOption) => {
    console.log(selectedOption.value);
    console.log(selectedOption);
    setSelectedSolvedness(
      selectedOption ? selectedOption.map((v) => v.value) : null,
    );
  }, []);

  const handleInteractionTypeChange = useCallback(
    (selectedOptions: { value: string; label: string }[]) => {
      setSelectedInteractionTypes(selectedOptions);
    },
    [],
  );

  const puzzleHistory: PuzzleHistoryItem[] = useTracker(() => {
    if (loading) return [];

    const bookmarks = Bookmarks.find({ user: userId }).fetch();
    const callActivities = CallActivities.find({ user: userId }).fetch();
    const documentActivities = DocumentActivities.find({
      user: userId,
    }).fetch();
    const chatMessages = ChatMessages.find({
      $or: [{ sender: userId }, { "content.children.userId": userId }], // not sure whether you should see things just because you're mentioned in them
    }).fetch();
    const puzzles = Puzzles.find().fetch();
    const hunts = Hunts.find().fetch();
    const huntNames: Record<string, string> = {};
    hunts.forEach((h) => {
      huntNames[h._id] = h.name;
    });
    const puzzleHistoryMap: Map<string, PuzzleHistoryItem> = new Map();

    for (const puzzle of puzzles) {
      puzzleHistoryMap.set(puzzle._id, {
        puzzleId: puzzle._id,
        name: puzzle.title,
        url: puzzle.url ?? "#",
        huntId: puzzle.hunt,
        huntName: huntNames[puzzle.hunt] ?? "No name hunt",
        firstInteraction: null,
        lastInteraction: null,
        interactionCount: 0,
        callCounter: 0,
        documentCounter: 0,
        chatCounter: 0,
        bookmarkCounter: 0,
        solvedness: computeSolvedness(puzzle),
        answers: puzzle.answers,
      });
    }

    const allActivities = [
      ...bookmarks.map((b) => ({
        ...b,
        type: "bookmark",
        ts: b.updatedAt,
        puzzle: b.puzzle,
      })),
      ...callActivities.map((c) => ({
        ...c,
        type: "call",
        ts: c.ts,
        puzzle: c.call,
      })),
      ...documentActivities.map((d) => ({
        ...d,
        type: "document",
        ts: d.ts,
        puzzle: d.puzzle,
      })),
      ...chatMessages.map((c) => ({
        ...c,
        type: "chat",
        ts: c.createdAt,
        puzzle: c.puzzle,
      })),
    ];

    for (const activity of allActivities) {
      const historyItem = puzzleHistoryMap.get(activity.puzzle);
      if (!historyItem) continue;

      historyItem.interactionCount += 1;

      switch (activity.type) {
        case "bookmark":
          historyItem.bookmarkCounter += 1;
          break;
        case "call":
          historyItem.callCounter += 1;
          break;
        case "document":
          historyItem.documentCounter += 1;
          break;
        case "chat":
          historyItem.chatCounter += 1;
          break;

        default:
          break;
      }

      if (
        !historyItem.firstInteraction ||
        activity.ts < historyItem.firstInteraction
      ) {
        historyItem.firstInteraction = activity.ts;
      }

      if (
        !historyItem.lastInteraction ||
        activity.ts > historyItem.lastInteraction
      ) {
        historyItem.lastInteraction = activity.ts;
      }
    }

    return Array.from(puzzleHistoryMap.values());
  }, [loading]);

  const sortedHistory = useMemo(() => {
    const data = [...puzzleHistory]; // Create a copy to avoid modifying the original array
    if (sortColumn) {
      data.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        let comparison;
        if (valA instanceof Date && valB instanceof Date) {
          comparison = valA.getTime() - valB.getTime();
        } else if (typeof valA === "string" && typeof valB === "string") {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === "number" && typeof valB === "number") {
          comparison = valA - valB;
        } else {
          comparison = 0; // Handle cases where types don't match for sorting
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    return data;
  }, [puzzleHistory, sortColumn, sortDirection]);

  const filteredHistory = useMemo(() => {
    return sortedHistory.filter((item) => {
      const huntMatch = selectedHunt === null || item.huntId === selectedHunt;
      const solvednessMatch =
        selectedSolvedness?.length === 0 ||
        selectedSolvedness?.includes(item.solvedness);
      const searchMatch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.huntName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answers?.some((a) =>
          a.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const interactionMatch =
        selectedInteractionTypes.length === interactionTypes.length ||
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
    interactionTypes.length,
  ]);

  const handleSort = useCallback(
    (column: keyof PuzzleHistoryItem) => {
      setSortColumn(column);
      setSortDirection(
        sortColumn === column && sortDirection === "asc" ? "desc" : "asc",
      );
    },
    [sortColumn, sortDirection],
  );

  const renderHeaderCell = useCallback(
    (column: keyof PuzzleHistoryItem, headerText: string) => (
      <th key={column} onClick={() => handleSort(column)}>
        {headerText}
        {sortColumn === column && (
          <span>{sortDirection === "asc" ? " \u2191" : " \u2193"}</span>
        )}
      </th>
    ),
    [handleSort, sortColumn, sortDirection],
  );

  const theme = useTheme();

  return (
    <>
      <FilterBar>
        <FilterSection>
          <Select
            options={huntOptions}
            onChange={handleHuntChange}
            placeholder="Select Hunt"
            theme={theme.reactSelectTheme}
          />
        </FilterSection>
        <FilterSection>
          <FormControl
            type="text"
            placeholder="Search by puzzle name, hunt name, or tag"
            title="Search by puzzle name, hunt name, or tag"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </FilterSection>
        <FilterSection>
          <Select
            options={solvednessOptions}
            onChange={handleSolvednessChange}
            placeholder="Select Solvedness"
            theme={theme.reactSelectTheme}
            isMulti
          />
        </FilterSection>
        <Select
          isMulti
          options={interactionTypes}
          value={selectedInteractionTypes}
          onChange={handleInteractionTypeChange}
          theme={theme.reactSelectTheme}
        />
      </FilterBar>
      <Table>
        <thead>
          <tr>
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
          {filteredHistory.map((historyItem) => (
            <PuzzleHistoryRow
              $solvedness={historyItem.solvedness}
              key={historyItem.puzzleId}
            >
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
                  icon={
                    historyItem.solvedness === "solved"
                      ? faThumbsUp
                      : historyItem.solvedness === "noAnswers"
                        ? faBan
                        : faThumbsDown
                  }
                  color={
                    historyItem.solvedness === "solved"
                      ? theme.colors.success
                      : theme.colors.secondary
                  }
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
                />
              </td>
            </PuzzleHistoryRow>
          ))}
        </tbody>
      </Table>
    </>
  );
};

const UserPuzzleHistory = () => {
  const userId = Meteor.userId()!;
  return (
    <>
      <h1>My Puzzle History</h1>
      <PuzzleHistoryTable userId={userId} />
    </>
  );
};

export default UserPuzzleHistory;
