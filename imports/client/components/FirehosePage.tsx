import { useFind, useTracker } from "meteor/react-meteor-data";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "react-bootstrap/Button";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import InputGroup from "react-bootstrap/InputGroup";
import { useParams, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { shortCalendarTimeFormat } from "../../lib/calendarTimeFormat";
import { indexedById } from "../../lib/listUtils";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import ChatMessages from "../../lib/models/ChatMessages";
import Puzzles from "../../lib/models/Puzzles";
import type { PuzzleType } from "../../lib/models/Puzzles";
import nodeIsMention from "../../lib/nodeIsMention";
import chatMessagesForFirehose from "../../lib/publications/chatMessagesForFirehose";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useSubscribeDisplayNames from "../hooks/useSubscribeDisplayNames";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
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

const FirehosePage = () => {
  const huntId = useParams<"huntId">().huntId!;
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get("q") ?? "";

  useBreadcrumb({ title: "Firehose", path: `/hunts/${huntId}/firehose` });

  const profilesLoading = useSubscribeDisplayNames(huntId);
  const chatMessagesLoading = useTypedSubscribe(chatMessagesForFirehose, {
    huntId,
  });
  const loading = profilesLoading() || chatMessagesLoading();

  const displayNames = useTracker(() => {
    return loading ? new Map<string, string>() : indexedDisplayNames();
  }, [loading]);
  const allPuzzles = useFind(
    () => (loading ? undefined : Puzzles.findAllowingDeleted({ hunt: huntId })),
    [loading, huntId],
  );
  const puzzles = useMemo(() => {
    if (!allPuzzles) {
      return new Map<string, PuzzleType>();
    }
    return indexedById(allPuzzles);
  }, [allPuzzles]);
  const chatMessages = useFind(
    () =>
      loading
        ? undefined
        : ChatMessages.find({ hunt: huntId }, { sort: { timestamp: 1 } }),
    [loading, huntId],
  );

  const messagesPaneRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLInputElement>(null);

  const maybeStealCtrlF = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      const node = searchBarRef.current;
      if (node) {
        node.focus();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", maybeStealCtrlF);
    return () => {
      window.removeEventListener("keydown", maybeStealCtrlF);
    };
  }, [maybeStealCtrlF]);

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
    (searchKeys: string[]): ((c: ChatMessageType) => boolean) => {
      // Given a list a search keys, compileMatcher returns a function that,
      // given a chat message, returns true if all search keys match that message in
      // some way, and false if any of the search keys cannot be found.
      const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
      return (chatMessage) => {
        const haystackString = asFlatString(
          chatMessage,
          displayNames,
        ).toLowerCase();
        const senderDisplayName = (
          chatMessage.sender
            ? (displayNames.get(chatMessage.sender) ?? "")
            : "jolly-roger"
        ).toLowerCase();
        const puzzleName =
          puzzles.get(chatMessage.puzzle)?.title.toLowerCase() ?? "";
        return lowerSearchKeys.every((key) => {
          return (
            haystackString.includes(key) ||
            senderDisplayName.includes(key) ||
            puzzleName.includes(key)
          );
        });
      };
    },
    [displayNames, puzzles],
  );

  const filteredChats = useCallback(
    (allChatMessages: ChatMessageType[]) => {
      const searchKeys = searchString.split(" ");
      let interestingChatMessages;

      if (searchKeys.length === 1 && searchKeys[0] === "") {
        interestingChatMessages = allChatMessages;
      } else {
        const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => {
          return key.length > 0;
        });
        const isInteresting = compileMatcher(searchKeysWithEmptyKeysRemoved);
        interestingChatMessages = allChatMessages.filter(isInteresting);
      }

      return interestingChatMessages;
    },
    [searchString, compileMatcher],
  );

  const [shouldScrollBottom, setShouldScrollBottom] = useState<boolean>(true);

  const saveShouldScroll = useCallback(() => {
    const pane = messagesPaneRef.current;
    if (pane) {
      const basicallyAtBottom =
        pane.clientHeight + pane.scrollTop + 5 >= pane.scrollHeight;
      setShouldScrollBottom(basicallyAtBottom);
    }
  }, []);

  const forceScrollBottom = useCallback(() => {
    const pane = messagesPaneRef.current;
    if (pane) {
      pane.scrollTop = pane.scrollHeight;
    }
  }, []);
  const maybeForceScrollBottom = useCallback(() => {
    if (shouldScrollBottom) {
      forceScrollBottom();
    }
  }, [shouldScrollBottom, forceScrollBottom]);

  const chats = useMemo(() => {
    return filteredChats(chatMessages ?? []);
  }, [filteredChats, chatMessages]);

  const onLayoutMaybeChanged = useCallback(() => {
    // Any time the length of the chat changes, jump to the end if we were already there
    maybeForceScrollBottom();

    // Any time the contents of the backscroll become shorter than the space
    // available, stick to the bottom.
    saveShouldScroll();
  }, [maybeForceScrollBottom, saveShouldScroll]);

  useEffect(() => {
    window.addEventListener("resize", onLayoutMaybeChanged);

    return () => {
      window.removeEventListener("resize", onLayoutMaybeChanged);
    };
  }, [onLayoutMaybeChanged]);

  useLayoutEffect(() => {
    onLayoutMaybeChanged();
  }, [loading, onLayoutMaybeChanged, chats.length]);

  if (loading) {
    return <div>Loading all chat messages. Expect this to take a while.</div>;
  }

  return (
    <FixedLayout>
      <FirehosePageLayout>
        <h1>Firehose</h1>
        <p>This log includes all chat messages hunt-wide. Expect some lag.</p>
        <FormGroup className="mb-3">
          <InputGroup>
            <FormControl
              id="jr-firehose-search"
              as="input"
              type="text"
              ref={searchBarRef}
              placeholder="Filter by message contents"
              value={searchString}
              onChange={onSearchStringChange}
            />
            <Button variant="secondary" onClick={clearSearch}>
              <FontAwesomeIcon icon={faEraser} />
            </Button>
          </InputGroup>
        </FormGroup>
        <div>
          {`Showing ${chats.length}/${(chatMessages ?? []).length} messages`}
        </div>
        <MessagesPane
          ref={messagesPaneRef}
          onScroll={saveShouldScroll}
          className={shouldScrollBottom ? "live" : ""}
        >
          {chats.map((msg) => {
            return (
              <Message
                key={msg._id}
                msg={msg}
                puzzle={puzzles.get(msg.puzzle)}
                displayNames={displayNames}
              />
            );
          })}
        </MessagesPane>
      </FirehosePageLayout>
    </FixedLayout>
  );
};

export default FirehosePage;
