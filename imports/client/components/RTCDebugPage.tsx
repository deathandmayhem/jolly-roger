import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faSearch } from '@fortawesome/free-solid-svg-icons/faSearch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import styled from 'styled-components';
import isAdmin from '../../lib/is-admin';
import CallParticipants from '../../lib/models/call_participants';
import CallSignals from '../../lib/models/call_signals';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { CallParticipantType } from '../../lib/schemas/call_participant';
import { CallSignalType } from '../../lib/schemas/call_signal';
import { ProfileType } from '../../lib/schemas/profile';
import { PuzzleType } from '../../lib/schemas/puzzle';

interface ParticipantSummaryProps {
  displayName: string;
  participant: CallParticipantType;
  tab: string;
  onFocusParticipant(participant: CallParticipantType): void;
}
function ParticipantSummary(props: ParticipantSummaryProps) {
  return (
    <li>
      <Button variant="light" onClick={() => props.onFocusParticipant(props.participant)}>
        <FontAwesomeIcon icon={faSearch} />
      </Button>
      {props.displayName}
      {' (user: '}
      <code>{props.participant.createdBy}</code>
      {', tab: '}
      <code>{props.tab}</code>
      {') '}
    </li>
  );
}

const CallSummaryParticipants = styled.ul`
  list-style-type: none;
  padding-left: 0;
`;

interface CallSummaryProps {
  participants: CallParticipantType[];
  onFocusParticipant(participant: CallParticipantType): void;
  profilesById: { [key: string]: ProfileType; };
  puzzle: PuzzleType;
}

function CallSummary(props: CallSummaryProps) {
  const participants = props.participants.map((p) => {
    return (
      <ParticipantSummary
        participant={p}
        key={`${p.createdBy}-${p.tab}`}
        displayName={props.profilesById[p.createdBy].displayName}
        tab={p.tab}
        onFocusParticipant={props.onFocusParticipant}
      />
    );
  });
  return (
    <div>
      <h3>
        {props.puzzle.title}
        {' '}
        (
        {props.participants.length}
        {' '}
        callers)
      </h3>
      <CallSummaryParticipants>
        {participants}
      </CallSummaryParticipants>
    </div>
  );
}

interface SignalMessageProps {
  m: {
    type: string;
    content: string;
  }
}
function SignalMessage(props: SignalMessageProps) {
  const contentObj = JSON.parse(props.m.content);
  let blob;
  if (props.m.type === 'sdp') {
    // Expect keys 'type', 'sdp'.  'sdp' will be like 10k of text that we don't
    // actually care about showing, so make it display: none and hide it in the
    // HTML.  If I really care, I can pull out the inspector.
    blob = (
      <div>
        <div>{contentObj.type}</div>
        <pre style={{ display: 'none' }}>{contentObj.sdp}</pre>
      </div>
    );
  } else if (props.m.type === 'iceCandidate') {
    // Expect keys 'candidate', 'sdpMid', 'sdpMLineIndex',
    // of which we only really care about 'candidate'.
    if (contentObj) {
      const candidateFields = contentObj.candidate.split(' ');
      const proto = candidateFields[2];
      const addr = candidateFields[4];
      blob = (
        <div>
          {`${proto} ${addr} `}
          <code>{contentObj.candidate}</code>
        </div>
      );
    } else {
      blob = 'null (end of candidates)';
    }
  }
  return (
    <tr>
      <td>{props.m.type}</td>
      <td>{blob}</td>
    </tr>
  );
}

const SignalsTableStyled = styled(Table)`
  margin-left: 2em;
`;

interface SignalsTableProps {
  messages: CallSignalType['messages'];
}
function SignalsTable(props: SignalsTableProps) {
  return (
    <SignalsTableStyled striped bordered hover size="sm">
      <thead>
        <tr>
          <th>type</th>
          <th>content</th>
        </tr>
      </thead>
      <tbody>
        {props.messages.map((m) => { return <SignalMessage key={m.content} m={m} />; })}
      </tbody>
    </SignalsTableStyled>
  );
}

const PeerSummarySignals = styled.div`
  margin-left: 2em;
`;

interface PeerSummaryProps {
  selfPeer: CallParticipantType;
  selfPeerDisplayName: string;
  otherPeer: CallParticipantType;
  otherPeerDisplayName: string;
  signalOut: CallSignalType | undefined;
  signalIn: CallSignalType | undefined;

}
function PeerSummary(props: PeerSummaryProps) {
  const selfRole = props.selfPeer._id < props.otherPeer._id ? 'initiator' : 'responder';
  const otherRole = props.selfPeer._id < props.otherPeer._id ? 'responder' : 'initiator';
  return (
    <div className="rtc-debug-peer-summary">
      <h3 className="rtc-debug-peer-summary-link">
        {props.selfPeerDisplayName}
        {' '}
        (part.
        <code>{props.selfPeer._id}</code>
        ,
        {selfRole}
        )
        {' '}
        &#x2194;
        {' '}
        {props.otherPeerDisplayName}
        {' '}
        (part.
        <code>{props.otherPeer._id}</code>
        ,
        {otherRole}
        )
      </h3>
      <PeerSummarySignals>
        <div>
          <h4>
            {`Signals sent (${props.signalOut ? props.signalOut.messages.length : 0}) `}
            &#x2192;
          </h4>
          {props.signalOut ? <SignalsTable messages={props.signalOut.messages} /> :
          <div>No signals sent</div>}
        </div>
        <div>
          <h4>
            {`Signals received (${props.signalIn ? props.signalIn.messages.length : 0}) `}
            &#x2190;
          </h4>
          {props.signalIn ? <SignalsTable messages={props.signalIn.messages} /> :
          <div>No signals received</div>}
        </div>
      </PeerSummarySignals>
    </div>
  );
}

interface RTCDebugPageTracker {
  ready: boolean;
  viewerIsAdmin: boolean;
  participants: CallParticipantType[];
  signals: CallSignalType[];
  puzzles: PuzzleType[];
  profiles: ProfileType[];
}

const RTCDebugPage = () => {
  const tracker = useTracker<RTCDebugPageTracker>(() => {
    const viewerIsAdmin = isAdmin(Meteor.userId());
    const rtcdebugSub = Meteor.subscribe('rtcdebug');
    const puzzlesSub = Meteor.subscribe('mongo.puzzles');
    const profilesSub = Profiles.subscribeDisplayNames();

    const ready = rtcdebugSub.ready() && puzzlesSub.ready() && profilesSub.ready();

    const participants = ready ? CallParticipants.find({}).fetch() : [];
    const signals = ready ? CallSignals.find({}).fetch() : [];
    const puzzles = ready ? Puzzles.find({}).fetch() : [];
    const profiles = ready ? Profiles.find({}).fetch() : [];

    return {
      viewerIsAdmin,
      ready,
      participants,
      signals,
      puzzles,
      profiles,
    };
  }, []);

  const [focusedParticipant, setFocusedParticipant] =
    useState<CallParticipantType | undefined>(undefined);
  const onFocusParticipant = useCallback((participant: CallParticipantType | undefined) => {
    setFocusedParticipant(participant);
  }, []);

  const renderPage = useCallback(() => {
    if (!tracker.viewerIsAdmin) {
      return <p>You are not an admin.</p>;
    }

    const participantsByCall = _.groupBy(tracker.participants, 'call');
    const puzzlesById = _.indexBy(tracker.puzzles, '_id');
    const callPuzzleIds = Object.keys(participantsByCall);
    const callsJoinedToPuzzles = callPuzzleIds.map((pId) => {
      return {
        puzzle: puzzlesById[pId],
        participants: participantsByCall[pId],
      };
    });
    const profilesById = _.indexBy(tracker.profiles, '_id');

    const callSummaries = callsJoinedToPuzzles.map((call) => {
      return (
        <CallSummary
          key={call.puzzle._id}
          puzzle={call.puzzle}
          participants={call.participants}
          profilesById={profilesById}
          onFocusParticipant={onFocusParticipant}
        />
      );
    });

    let focusedView;
    const fp = focusedParticipant;
    if (fp !== undefined) {
      // Okay, let's explore that participant.
      // Who else should they expect to be connected with?  All other members of the same call.
      const otherParticipants = (participantsByCall[fp.call] || []).filter((p) => p._id !== fp._id);

      const peerSummaries = otherParticipants.map((p) => {
        const signalOut = tracker.signals.find((s) => s.sender === fp._id && s.target === p._id);
        const signalIn = tracker.signals.find((s) => s.target === fp._id && s.sender === p._id);
        return (
          <PeerSummary
            key={p._id}
            selfPeer={fp}
            selfPeerDisplayName={profilesById[fp.createdBy].displayName}
            otherPeer={p}
            otherPeerDisplayName={profilesById[p.createdBy].displayName}
            signalOut={signalOut}
            signalIn={signalIn}
          />
        );
      });

      // For each other participant: look up shared call signals.
      focusedView = (
        <div>
          <h1>
            Focus on participant
            {' '}
            <code>{fp._id}</code>
            {' '}
            (
            {peerSummaries.length}
            {' '}
            peers)
          </h1>
          {peerSummaries}
        </div>
      );
    }

    return (
      <div>
        <div>
          <h1>
            Puzzles with calls (
            {callSummaries.length}
            ):
          </h1>
          {callSummaries}
        </div>
        {focusedView}
      </div>
    );
  }, [tracker, focusedParticipant, onFocusParticipant]);

  return (
    <div>
      <p>
        This page exists for server admins to examine server WebRTC state for
        all users, for the purposes of debugging issues with calls.  It can:
      </p>
      <ul>
        <li>Show all call participants and any related signaling information</li>
        <li>TODO: Attempt to recognize bad or incomplete signal states.</li>
      </ul>

      {tracker.ready ? renderPage() : <div>loading...</div>}
    </div>
  );
};

export default RTCDebugPage;
