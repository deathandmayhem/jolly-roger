import { useTracker } from "meteor/react-meteor-data";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Hunts from "../../lib/models/Hunts";
import { useBreadcrumb } from "../hooks/breadcrumb";
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

const MoreAppPage = () => {
  const huntId = useParams<"huntId">().huntId!;

  useBreadcrumb({ title: "More", path: `/hunts/${huntId}/more` });

  const jrHost = window.location.host;
  const protocol = window.location.protocol;
  const bookmarklet = useMemo(() => {
    const code = `
      (function() {
        var title = encodeURIComponent(document.title);
        var url = encodeURIComponent(window.location.href);
        var jrUrl = "${protocol}//${jrHost}/hunts/${huntId}/puzzles?title=" + title + "&url=" + url;
        window.open(jrUrl, '_blank');
      })();
    `;
    return `javascript:${code}`;
  }, [huntId, jrHost, protocol]);

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
              borderRadius: "12px",
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
        <h2>Firehose</h2>
        <p>
          <a
            style={{
              fontSize: "1.2rem",
            }}
            href={`/hunts/${huntId}/firehose`}
          >
            🧑‍🚒 Firehose page
          </a>
          <br />
          <br />
          The firehose includes all puzzle updates, including guesses, solves and chat messages.
        </p>
      </FirehosePageLayout>
    </FixedLayout>
  );
};

export default MoreAppPage;
