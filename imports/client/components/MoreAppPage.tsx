import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import type { PuzzleType } from "../../lib/models/Puzzles";
import nodeIsMention from "../../lib/nodeIsMention";
import FixedLayout from "./styling/FixedLayout";
import { Alert } from "react-bootstrap";
import { useBreadcrumb } from "../hooks/breadcrumb";
import Markdown from "./Markdown";
import { useTracker } from "meteor/react-meteor-data";
import Hunts from "../../lib/models/Hunts";

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

  return (
    <FixedLayout>
      <FirehosePageLayout>
        <h1>More resources</h1>
        {hunt && <Markdown text={hunt.moreInfo ?? ""} />}
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
          <a href={bookmarklet}>➡ Jolly Roger</a>
        </p>

        <Alert variant="warning">
          Note: You'll need a new/different version of this for each hunt.
        </Alert>
      </FirehosePageLayout>
    </FixedLayout>
  );
};

export default MoreAppPage;
