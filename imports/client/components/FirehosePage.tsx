import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { shortCalendarTimeFormat } from '../../lib/calendarTimeFormat';
import ChatMessages from '../../lib/models/ChatMessages';
import { indexedDisplayNames } from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import { ChatMessageType } from '../../lib/schemas/ChatMessage';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import { useBreadcrumb } from '../hooks/breadcrumb';
import useSubscribeDisplayNames from '../hooks/useSubscribeDisplayNames';
import FixedLayout from './styling/FixedLayout';

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
  displayName: string;
  puzzle: PuzzleType | undefined;
}

const Message = ({ msg, displayName, puzzle }: MessageProps) => {
  const ts = shortCalendarTimeFormat(msg.timestamp);
  return (
    <div>
      [
      {ts}
      ] [
      {puzzle !== undefined ? (
        <>
          <span>{`${puzzle.deleted ? 'deleted: ' : ''}`}</span>
          <Link to={`/hunts/${msg.hunt}/puzzles/${msg.puzzle}`}>{puzzle.title}</Link>
        </>
      ) : (
        <span>deleted: no data</span>
      )}
      {'] '}
      {displayName}
      {': '}
      {msg.text}
    </div>
  );
};

const MessagesPane = styled.div`
  overflow-y: scroll;
  flex: 1;

  &.live {
    border-bottom: 1px solid black;
  }
`;

const FirehosePage = () => {
  const huntId = useParams<'huntId'>().huntId!;
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get('q') || '';

  useBreadcrumb({ title: 'Firehose', path: `/hunts/${huntId}/firehose` });

  const profilesLoading = useSubscribeDisplayNames(huntId);
  // We have some hunts where we've soft-deleted puzzles for various reasons
  // after chat messages were sent.  To handle these situations more gracefully,
  // we subscribe and fetch puzzles including those soft-deleted.
  const puzzlesLoading = useSubscribe('mongo.puzzles.allowingDeleted', { hunt: huntId });
  const chatMessagesLoading = useSubscribe('mongo.chatmessages', { hunt: huntId });
  const loading = profilesLoading() || puzzlesLoading() || chatMessagesLoading();

  const displayNames = useTracker(() => (loading ? {} : indexedDisplayNames()), [loading]);
  const puzzles = useTracker(() => (
    loading ?
      {} :
      _.indexBy(Puzzles.findAllowingDeleted({ hunt: huntId }).fetch(), '_id')
  ), [loading, huntId]);
  const chatMessages = useTracker(() => (
    loading ?
      [] :
      ChatMessages.find({ hunt: huntId }, { sort: { timestamp: 1 } }).fetch()
  ), [loading, huntId]);

  const messagesPaneRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLInputElement>(null);

  const maybeStealCtrlF = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      const node = searchBarRef.current;
      if (node) {
        node.focus();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', maybeStealCtrlF);
    return () => {
      window.removeEventListener('keydown', maybeStealCtrlF);
    };
  }, [maybeStealCtrlF]);

  const setSearchString = useCallback((val: string) => {
    const u = new URLSearchParams(searchParams);
    if (val) {
      u.set('q', val);
    } else {
      u.delete('q');
    }
    setSearchParams(u);
  }, [searchParams, setSearchParams]);

  const onSearchStringChange: FormControlProps['onChange'] = useCallback((e) => {
    setSearchString(e.currentTarget.value);
  }, [setSearchString]);

  const clearSearch = useCallback(() => {
    setSearchString('');
  }, [setSearchString]);

  const compileMatcher = useCallback((searchKeys: string[]): (c: ChatMessageType) => boolean => {
    // Given a list a search keys, compileMatcher returns a function that,
    // given a chat message, returns true if all search keys match that message in
    // some way, and false if any of the search keys cannot be found.
    const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
    return (chatMessage) => {
      return lowerSearchKeys.every((key) => {
        return chatMessage.text.toLowerCase().indexOf(key) !== -1;
      });
    };
  }, []);

  const filteredChats = useCallback((allChatMessages: ChatMessageType[]) => {
    const searchKeys = searchString.split(' ');
    let interestingChatMessages;

    if (searchKeys.length === 1 && searchKeys[0] === '') {
      interestingChatMessages = allChatMessages;
    } else {
      const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => { return key.length > 0; });
      const isInteresting = compileMatcher(searchKeysWithEmptyKeysRemoved);
      interestingChatMessages = allChatMessages.filter(isInteresting);
    }

    return interestingChatMessages;
  }, [searchString, compileMatcher]);

  const [shouldScrollBottom, setShouldScrollBottom] = useState<boolean>(true);

  const saveShouldScroll = useCallback(() => {
    const pane = messagesPaneRef.current;
    if (pane) {
      const basicallyAtBottom = pane.clientHeight + pane.scrollTop + 5 >= pane.scrollHeight;
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
    return filteredChats(chatMessages);
  }, [filteredChats, chatMessages]);

  const onLayoutMaybeChanged = useCallback(() => {
    // Any time the length of the chat changes, jump to the end if we were already there
    maybeForceScrollBottom();

    // Any time the contents of the backscroll become shorter than the space
    // available, stick to the bottom.
    saveShouldScroll();
  }, [maybeForceScrollBottom, saveShouldScroll]);

  useEffect(() => {
    window.addEventListener('resize', onLayoutMaybeChanged);

    return () => {
      window.removeEventListener('resize', onLayoutMaybeChanged);
    };
  }, [onLayoutMaybeChanged]);

  useLayoutEffect(() => {
    onLayoutMaybeChanged();
  }, [loading, onLayoutMaybeChanged, chats.length]);

  if (loading) {
    return <div>loading...</div>;
  }

  return (
    <FixedLayout>
      <FirehosePageLayout>
        <h1>Firehose</h1>
        <p>This log includes all chat messages hunt-wide. Expect some lag.</p>
        <FormGroup>
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
            <InputGroup.Append>
              <Button variant="secondary" onClick={clearSearch}>
                <FontAwesomeIcon icon={faEraser} />
              </Button>
            </InputGroup.Append>
          </InputGroup>
        </FormGroup>
        <MessagesPane ref={messagesPaneRef} onScroll={saveShouldScroll} className={shouldScrollBottom ? 'live' : ''}>
          {chats.map((msg) => {
            return (
              <Message
                key={msg._id}
                msg={msg}
                puzzle={puzzles[msg.puzzle]}
                displayName={msg.sender ? displayNames[msg.sender] : 'jolly-roger'}
              />
            );
          })}
        </MessagesPane>
      </FirehosePageLayout>
    </FixedLayout>
  );
};

export default FirehosePage;
