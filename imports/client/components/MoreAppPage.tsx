import { useTracker } from "meteor/react-meteor-data";
import React, { useMemo } from "react";
import { Alert } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import Hunts from "../../lib/models/Hunts";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import nodeIsMention from "../../lib/nodeIsMention";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import Markdown from "./Markdown";
import FixedLayout from "./styling/FixedLayout";

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

const MoreAppPage = () => {
  const huntId = useParams<"huntId">().huntId!;

  useBreadcrumb({ title: "More", path: `/hunts/${huntId}/more` });

  const jr_host = window.location.host;
  const protocol = window.location.protocol;
  const bookmarklet = useMemo(() => {
    const code = `
      (function() {
        var title = encodeURIComponent(document.title)
        var url = encodeURIComponent(window.location.href)
        window.location.href = "${protocol}//${jr_host}/hunts/${huntId}/puzzles?title=" + title + "&url=" + url;
      })();
    `;
    return `javascript:${encodeURIComponent(code)}`;
  }, [huntId]);

  const hunt = useTracker(
    () => (huntId ? Hunts.findOne(huntId) : null),
    [huntId],
  );

  const theme = useTheme();

  return (
    <FixedLayout>
      <FirehosePageLayout>
        <h1>More Resources</h1>
        {hunt && <Markdown text={hunt.moreInfo ?? ""} />}
        <hr />
        <h2>Bookmarklet</h2>

        <p>
          <strong>Drag this bookmarklet 👇 to your bookmarks bar!</strong>
        </p>

        <p>
          <a
            style={{
              border: "1px solid #ccc",
              borderRadius: "6px",
              padding: ".5rem .8rem",
              fontSize: "1.2rem",
              boxShadow: "1px",
              background: theme.colors.background,
            }}
            href={bookmarklet}
          >
            ➡ Jolly Roger
          </a>
        </p>
        <p>
          When a new puzzle gets unlocked, navigate to the puzzle page (on the
          hunt site) and click this bookmarklet in your bookmarks bar. Then:{" "}
        </p>
        <ul>
          <li>
            If the puzzle doesn't exist in Jolly Roger, you'll get sent to Add
            Puzzle screen with the title and URL prepopulated, or
          </li>
          <li>
            If the puzzle <em>does</em> exist in Jolly Roger, you'll get sent to
            the puzzle's page in JR.
          </li>
        </ul>

        {/* 
        <Alert variant="warning">
        Note: You'll need a new/different version of this for each hunt.
        </Alert> 
        */}

        <hr />
        <h2>Notes</h2>
        <p>
          <a
            style={{
              border: "1px solid #ccc",
              borderRadius: "6px",
              padding: ".5rem .8rem",
              fontSize: "1.2rem",
              boxShadow: "1px",
              background: theme.colors.background,
            }}
            href={`/hunts/${huntId}/notes`}
          >
            🗒️ Notes page
          </a>
          <br />
          <br />
          Visit this page to view a list of all puzzles and their notes.
        </p>
      </FirehosePageLayout>
    </FixedLayout>
  );
};

export default MoreAppPage;
