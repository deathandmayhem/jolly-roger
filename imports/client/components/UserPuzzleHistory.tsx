import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useCallback, useMemo, useState } from "react";
import { Badge, OverlayTrigger, Table, Tooltip } from "react-bootstrap";
import { shortCalendarTimeFormat } from "../../lib/calendarTimeFormat";
import Bookmarks from "../../lib/models/Bookmarks";
import CallActivities from "../../lib/models/CallActivities";
import ChatMessages from "../../lib/models/ChatMessages";
import Puzzles from "../../lib/models/Puzzles";
import puzzleHistoryForUser from "../../lib/publications/puzzleHistoryForUser";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import DocumentActivities from "../../lib/models/DocumentActivities";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMessage,
  faNotesMedical,
  faPencil,
  faPhone,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import styled from "styled-components";
import { Theme } from "../theme";
import { FontawesomeObject } from "@fortawesome/fontawesome-svg-core";
import Hunts from "../../lib/models/Hunts";

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
}

const StyledFAIcon = styled(FontAwesomeIcon)<{
  theme: Theme;
  active: boolean;
}>`
  color: ${({ theme, active }) =>
    active ? theme.colors.success : theme.colors.secondary};
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
    null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
        url: puzzle.url,
        huntId: puzzle.hunt,
        huntName: huntNames[puzzle.hunt],
        firstInteraction: null,
        lastInteraction: null,
        interactionCount: 0,
        callCounter: 0,
        documentCounter: 0,
        chatCounter: 0,
        bookmarkCounter: 0,
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

  return (
    <Table>
      <thead>
        <tr>
          {renderHeaderCell("huntName", "Hunt")}
          {renderHeaderCell("name", "Puzzle")}
          {renderHeaderCell("firstInteraction", "First Interaction")}
          {renderHeaderCell("lastInteraction", "Last Interaction")}
          <th>Interactions</th>
        </tr>
      </thead>
      <tbody>
        {sortedHistory.map((historyItem) => (
          <tr key={historyItem.puzzleId}>
            <td>
              <Link to={`/hunts/${historyItem.huntId}/}`}>
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
            <td>
              {historyItem.firstInteraction
                ? shortCalendarTimeFormat(historyItem.firstInteraction)
                : "N/A"}
            </td>
            <td>
              {historyItem.lastInteraction
                ? shortCalendarTimeFormat(historyItem.lastInteraction)
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
          </tr>
        ))}
      </tbody>
    </Table>
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
