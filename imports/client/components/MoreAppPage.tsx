import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { shortCalendarTimeFormat } from "../../lib/calendarTimeFormat";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import type { PuzzleType } from "../../lib/models/Puzzles";
import nodeIsMention from "../../lib/nodeIsMention";
import FixedLayout from "./styling/FixedLayout";
import { Alert } from "react-bootstrap";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import { useTracker } from "meteor/react-meteor-data";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";

const FirehosePageLayout = styled.div`
  padding: 8px 15px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  height: 100%;

  > * {
    width: 100%;
  }
`;

interface MessageProps {
  msg: ChatMessageType;
  displayNames: Map<string, string>;
  puzzle: PuzzleType | undefined;
}

const PreWrapSpan = styled.span`
  display: block;
  white-space: pre-wrap;
  padding-left: 1em;
`;

function asFlatString(
  chatMessage: ChatMessageType,
  displayNames: Map<string, string>,
): string {
  return chatMessage.content.children
    .map((child) => {
      if (nodeIsMention(child)) {
        return ` @${displayNames.get(child.userId) ?? "???"} `;
      } else {
        return child.text;
      }
    })
    .join(" ");
}

const Message = React.memo(({ msg, displayNames, puzzle }: MessageProps) => {
  const ts = shortCalendarTimeFormat(msg.timestamp);
  const displayName = msg.sender
    ? (displayNames.get(msg.sender) ?? "???")
    : "jolly-roger";
  const messageText = asFlatString(msg, displayNames);
  const hasNewline = messageText.includes("\n");
  return (
    <div>
      <span>
        [{ts}] [
        {puzzle !== undefined ? (
          <>
            <span>{`${puzzle.deleted ? "deleted: " : ""}`}</span>
            <a
              href={`/hunts/${msg.hunt}/puzzles/${msg.puzzle}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {puzzle.title}
            </a>
          </>
        ) : (
          <span>deleted: no data</span>
        )}
        {"] "}
        {displayName}
        {": "}
      </span>
      {hasNewline ? (
        <PreWrapSpan>{messageText}</PreWrapSpan>
      ) : (
        <span>{messageText}</span>
      )}
    </div>
  );
});

const MessagesPane = styled.div`
  overflow-y: scroll;
  flex: 1;

  &.live {
    border-bottom: 1px solid black;
  }
`;

const MoreAppPage = () => {
  const huntId = useParams<"huntId">().huntId!;

  useBreadcrumb({ title: "More", path: `/hunts/${huntId}/more` });

  const puzzlesLoading = useTypedSubscribe(puzzlesForPuzzleList, {
    huntId,
    includeDeleted: false,
  });

  const loading = puzzlesLoading();

  const administriviaTag = useTracker(() => {
    if (!huntId || loading) {
      return null;
    }
    return Tags.findOne({ hunt: huntId, name: "administrivia" });
  }, [huntId, loading]);

  const administriviaPuzzles = useTracker(() => {
    if (!huntId || !administriviaTag || loading) {
      return null;
    }
    return Puzzles.find({ hunt: huntId, tags: administriviaTag._id }).fetch();
  }, [huntId, loading, administriviaTag]);

  const jr_hostname = window.location.hostname;
  const bookmarklet = useMemo(() => {
    const code = `
      (function() {
        window.location.href = "https://${jr_hostname}/hunts/${huntId}/puzzles#title=" + document.title + "&url=" + window.location.href;
      })();
    `;
    return `javascript:${encodeURIComponent(code)}`;
  }, [huntId]);

  return (
    <FixedLayout>
      <FirehosePageLayout>
        <h1>More resources</h1>
        {administriviaPuzzles?.length > 0 && (
          <>
            <h2>Administrivia</h2>
            <ul>
              {administriviaPuzzles
                .sort((a, b) => (a.title > b.title ? 1 : -1))
                .map((p) => {
                  return (
                    <li key={p._id}>
                      <a href={`/hunts/${huntId}/puzzles/${p._id}`}>
                        {p.title}
                      </a>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
        <h2>Bookmarklet</h2>

        <p>This bookmarklet will:</p>
        <ul>
          <li>
            If the puzzle exists in Jolly Roger, take you to the puzzle page, or
          </li>
          <li>
            If the puzzle doesn't yet exist in Jolly Roger, take you to the list
            of puzzles with the title and URL prepopulated.
          </li>
        </ul>

        <p>Drag this bookmarklet to your bookmarks bar!</p>

        <p>
          <a href={bookmarklet}>Add to Jolly Roger</a>
        </p>

        <Alert variant="warning">
          Note: You'll need a new/different version of this for each hunt.
        </Alert>
      </FirehosePageLayout>
    </FixedLayout>
  );
};

export default MoreAppPage;
