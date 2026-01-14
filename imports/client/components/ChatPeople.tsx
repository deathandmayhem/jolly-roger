import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faCaretRight } from "@fortawesome/free-solid-svg-icons/faCaretRight";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type React from "react";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import styled from "styled-components";
import Flags from "../../Flags";
import { RECENT_ACTIVITY_TIME_WINDOW_MS } from "../../lib/config/webrtc";
import type { DiscordAccountType } from "../../lib/models/DiscordAccount";
import MeteorUsers from "../../lib/models/MeteorUsers";
import CallHistories from "../../lib/models/mediasoup/CallHistories";
import Peers from "../../lib/models/mediasoup/Peers";
import relativeTimeFormat from "../../lib/relativeTimeFormat";
import type { Action, CallState } from "../hooks/useCallState";
import { CallJoinState } from "../hooks/useCallState";
import useSubscribeAvatars from "../hooks/useSubscribeAvatars";
import { Subscribers } from "../subscribers";
import { trace } from "../tracing";
import Avatar from "./Avatar";
import CallSection from "./CallSection";
import { PuzzlePagePadding } from "./styling/constants";
import {
  AVActions,
  AVButton,
  ChatterSubsection,
  ChatterSubsectionHeader,
  PeopleItemDiv,
  PeopleListDiv,
} from "./styling/PeopleComponents";

interface ViewerSubscriber {
  user: string;
  name: string | undefined;
  discordAccount: DiscordAccountType | undefined;
  tab: string | undefined;
}

interface PersonBoxProps extends ViewerSubscriber {
  children?: ReactNode;
  popperBoundaryRef: React.RefObject<HTMLElement | null>;
}

const ViewerPersonBox = ({
  user,
  name,
  discordAccount,
  children,
  popperBoundaryRef,
}: PersonBoxProps) => {
  const id = useId();

  return (
    <OverlayTrigger
      placement="bottom"
      popperConfig={{
        modifiers: [
          {
            name: "preventOverflow",
            enabled: true,
            options: {
              boundary: popperBoundaryRef.current,
              padding: 0,
            },
          },
        ],
      }}
      overlay={<Tooltip id={id}>{name}</Tooltip>}
    >
      <PeopleItemDiv>
        <Avatar
          _id={user}
          displayName={name}
          discordAccount={discordAccount}
          size={44}
        />
        {children}
      </PeopleItemDiv>
    </OverlayTrigger>
  );
};

const PeopleListHeader = styled(ChatterSubsectionHeader)`
  padding-left: 1rem;
  text-indent: -1rem;
`;

const ChatterSection = styled.section`
  flex: 0;
  background-color: ${({ theme }) => theme.colors.chatterSectionBackground};
  font-size: 12px;
  line-height: 12px;
  padding: ${PuzzlePagePadding};
`;

// ChatPeople is the component that deals with all user presence and
// WebRTC call subscriptions, state, and visualization.
const ChatPeople = ({
  huntId,
  puzzleId,
  disabled,
  onHeightChange,
  callState,
  callDispatch,
  joinCall,
}: {
  huntId: string;
  puzzleId: string;
  disabled: boolean;
  onHeightChange: () => void;
  callState: CallState;
  callDispatch: React.Dispatch<Action>;
  joinCall: () => void;
}) => {
  const chatterRef = useRef<HTMLDivElement>(null);

  const { audioControls, audioState } = callState;

  const [callersExpanded, setCallersExpanded] = useState<boolean>(true);
  const [viewersExpanded, setViewersExpanded] = useState<boolean>(true);

  const subscriberTopic = `puzzle:${puzzleId}`;
  const subscribersLoading = useSubscribe("subscribers.fetch", subscriberTopic);
  const callMembersLoading = useSubscribe(
    "mediasoup:metadata",
    huntId,
    puzzleId,
  );
  const avatarsLoading = useSubscribeAvatars(huntId);

  const loading =
    subscribersLoading() || callMembersLoading() || avatarsLoading();

  // A note on this feature flag: we still do the subs for call *metadata* for
  // simplicity even when webrtc is flagged off; we simply avoid rendering
  // anything in the UI (which prevents clients from subbing to 'mediasoup:join'
  // or doing signalling).
  const rtcDisabled = useTracker(() => Flags.active("disable.webrtc"), []);

  const recentVoiceActivity = useTracker(
    () => CallHistories.findOne({ call: puzzleId })?.lastActivity,
    [puzzleId],
  );
  const [voiceActivityRelative, setVoiceActivityRelative] = useState<string>();
  useEffect(() => {
    let interval: number | undefined;
    if (recentVoiceActivity) {
      const formatter = () =>
        relativeTimeFormat(recentVoiceActivity, {
          minimumUnit: Meteor.isDevelopment ? "second" : "minute",
        });
      setVoiceActivityRelative(formatter());
      interval = Meteor.setInterval(() => {
        setVoiceActivityRelative(formatter());
      }, RECENT_ACTIVITY_TIME_WINDOW_MS);
    }
    return () => {
      if (interval) {
        Meteor.clearInterval(interval);
      }
    };
  }, [recentVoiceActivity]);

  const { unknown, viewers, rtcViewers } = useTracker(() => {
    if (loading) {
      return {
        unknown: 0,
        viewers: [],
        rtcViewers: [],
        selfPeer: undefined,
      };
    }

    let unknownCount = 0;
    const viewersAcc: ViewerSubscriber[] = [];

    const rtcViewersAcc: ViewerSubscriber[] = [];
    const rtcViewerIndex: Record<string, boolean> = {};

    const rtcParticipants = Peers.find({
      hunt: huntId,
      call: puzzleId,
    }).fetch();
    rtcParticipants.forEach((p) => {
      const user = MeteorUsers.findOne(p.createdBy);
      if (!user?.displayName) {
        unknownCount += 1;
        return;
      }

      // If the same user is joined twice (from two different tabs), dedupe in
      // the viewer listing. (We include both in rtcParticipants still.)
      rtcViewersAcc.push({
        user: user._id,
        name: user.displayName,
        discordAccount: user.discordAccount,
        tab: p.tab,
      });
      rtcViewerIndex[user._id] = true;
    });

    Subscribers.find({ name: subscriberTopic }).forEach((s) => {
      if (rtcViewerIndex[s.user]) {
        // already counted among rtcViewers, don't duplicate
        return;
      }

      const user = MeteorUsers.findOne(s.user);
      if (!user?.displayName) {
        unknownCount += 1;
        return;
      }

      viewersAcc.push({
        user: s.user,
        name: user.displayName,
        discordAccount: user.discordAccount,
        tab: undefined,
      });
    });

    return {
      unknown: unknownCount,
      viewers: viewersAcc,
      rtcViewers: rtcViewersAcc,
    };
  }, [loading, subscriberTopic, huntId, puzzleId]);

  const toggleCallersExpanded = useCallback(() => {
    setCallersExpanded((prevState) => {
      return !prevState;
    });
  }, []);

  const toggleViewersExpanded = useCallback(() => {
    setViewersExpanded((prevState) => {
      return !prevState;
    });
  }, []);

  const { muted, deafened } = audioControls;

  // biome-ignore lint/correctness/useExhaustiveDependencies(disabled): We want the parent to re-render when anything might have changed our rendered size
  useLayoutEffect(() => {
    trace("ChatPeople useLayoutEffect", {
      loading,
      rtcViewers: rtcViewers.length,
      viewers: viewers.length,
      callersExpanded,
      viewersExpanded,
      callState,
      voiceActivityRelative,
    });
    // Notify parent whenever we might have changed size:
    // * on viewers or rtcViewers counts change
    // * on expand/collapse of the callers or viewers
    // * when joining the audiocall
    onHeightChange();
  }, [
    onHeightChange,
    loading,
    rtcViewers.length,
    viewers.length,
    callersExpanded,
    viewersExpanded,
    callState,
    voiceActivityRelative,
    disabled,
  ]);

  trace("ChatPeople render", { loading });

  if (loading) {
    return null;
  }

  // TODO: find osme way to factor this out other than "immediately invoked fat-arrow function"
  const callersSubsection = (() => {
    const callersHeaderIcon = callersExpanded ? faCaretDown : faCaretRight;
    switch (callState.callState) {
      case CallJoinState.CHAT_ONLY:
      case CallJoinState.REQUESTING_STREAM: {
        const joinLabel =
          rtcViewers.length > 0 ? "Join audio call" : "Start audio call";
        return (
          <>
            <AVActions>
              <AVButton variant="primary" size="sm" onClick={joinCall}>
                {joinLabel}
              </AVButton>
            </AVActions>
            <ChatterSubsection>
              <PeopleListHeader onClick={toggleCallersExpanded}>
                <FontAwesomeIcon fixedWidth icon={callersHeaderIcon} />
                {`${rtcViewers.length} caller${
                  rtcViewers.length !== 1 ? "s" : ""
                }`}
                {voiceActivityRelative && (
                  <>
                    {" (last voice activity: "}
                    {voiceActivityRelative})
                  </>
                )}
              </PeopleListHeader>
              <PeopleListDiv $collapsed={!callersExpanded}>
                {rtcViewers.map((viewer) => (
                  <ViewerPersonBox
                    key={`person-${viewer.user}-${viewer.tab}`}
                    popperBoundaryRef={chatterRef}
                    {...viewer}
                  />
                ))}
              </PeopleListDiv>
            </ChatterSubsection>
          </>
        );
      }
      case CallJoinState.IN_CALL:
        return (
          <CallSection
            muted={muted || deafened}
            deafened={deafened}
            audioContext={audioState!.audioContext!}
            localStream={audioState!.mediaSource!}
            callersExpanded={callersExpanded}
            onToggleCallersExpanded={toggleCallersExpanded}
            callState={callState}
            callDispatch={callDispatch}
          />
        );
      case CallJoinState.STREAM_ERROR:
        return <div>{`ERROR GETTING MIC: ${callState.error?.message}`}</div>;
      default:
        // Unreachable.  TypeScript knows this, but eslint doesn't.
        return <div />;
    }
  })();

  const totalViewers = viewers.length + unknown;
  const viewersHeaderIcon = viewersExpanded ? faCaretDown : faCaretRight;
  return (
    <ChatterSection>
      {!rtcDisabled && !disabled && callersSubsection}
      <ChatterSubsection ref={chatterRef}>
        <PeopleListHeader onClick={toggleViewersExpanded}>
          <FontAwesomeIcon fixedWidth icon={viewersHeaderIcon} />
          {`${totalViewers} viewer${totalViewers !== 1 ? "s" : ""}`}
        </PeopleListHeader>
        <PeopleListDiv $collapsed={!viewersExpanded}>
          {viewers.map((viewer) => (
            <ViewerPersonBox
              key={`person-${viewer.user}`}
              popperBoundaryRef={chatterRef}
              {...viewer}
            />
          ))}
        </PeopleListDiv>
      </ChatterSubsection>
    </ChatterSection>
  );
};

export default ChatPeople;
