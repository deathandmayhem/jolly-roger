import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faCaretRight } from "@fortawesome/free-solid-svg-icons/faCaretRight";
import { faMicrophoneSlash } from "@fortawesome/free-solid-svg-icons/faMicrophoneSlash";
import { faVolumeMute } from "@fortawesome/free-solid-svg-icons/faVolumeMute";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { MouseEvent } from "react";
import React, {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Overlay from "react-bootstrap/Overlay";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Flags from "../../Flags";
import MeteorUsers from "../../lib/models/MeteorUsers";
import type { PeerType } from "../../lib/models/mediasoup/Peers";
import mediasoupRemoteMutePeer from "../../methods/mediasoupRemoteMutePeer";
import type { Action, CallState } from "../hooks/useCallState";
import Avatar from "./Avatar";
import { useBootstrapContainer } from "./BootstrapScopeContext";
import Loading from "./Loading";
import Spectrum from "./Spectrum";
import {
  AVActions,
  AVButton,
  ChatterSubsection,
  ChatterSubsectionHeader,
  PeopleItemDiv,
  PeopleListDiv,
} from "./styling/PeopleComponents";

const CallStateIcon = styled.span`
  font-size: 10px;
  width: 14px;
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.callStateIcon};
  position: absolute;
  right: 0;
  background: white;
`;

const MutedIcon = styled(CallStateIcon)<{ $local?: boolean }>`
  top: 0;
  border-bottom-left-radius: 6px;
  border: 0.5px solid ${({ theme }) => theme.colors.mutedIconBorder};
  border-left: 0.5px solid ${({ theme }) => theme.colors.mutedIconBorder};
  border-bottom: 1px solid ${({ theme }) => theme.colors.mutedIconBorder};
  color: ${({ $local, theme }) => ($local ? theme.colors.localMutedIconText : theme.colors.mutedIconText)};
`;

const DeafenedIcon = styled(CallStateIcon)`
  bottom: 0;
  border-top-left-radius: 6px;
  border: 0.5px solid ${({ theme }) => theme.colors.deafenedIconBorder};
  border-left: 0.5px solid ${({ theme }) => theme.colors.deafenedIconBorder};
  border-top: 1px solid ${({ theme }) => theme.colors.deafenedIconBorder};
  text-align: right;
  color: ${({ theme }) => theme.colors.mutedIconText};
  font-size: 9px;
`;

const PeerMuteButton = styled.div`
  position: absolute;
  inset: 0;
  font-size: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  color: transparent;

  &:hover {
    background-color: ${({ theme }) =>
      theme.colors.remoteMuteButtonHoverBackground};
    color: ${({ theme }) => theme.colors.remoteMuteButtonHoverText};
  }
`;

// If we're waiting for a particular piece of server state for more than 1s,
// something might be wrong so throw up a warning
const JoiningCall = ({ details }: { details?: string }) => {
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const handle = Meteor.setTimeout(() => setShowAlert(true), 1000);
    return () => Meteor.clearTimeout(handle);
  }, []);

  if (!showAlert) {
    return null;
  }

  return (
    <Alert variant="warning">
      <p>
        <Loading inline />
        Waiting for server to confirm your connection. This can happen if a new
        version of Jolly Roger was just deployed or if one of our servers
        failed. It should recover on its own shortly, but if not try leaving and
        rejoining the call.
      </p>

      {details && <p>Details: {details}</p>}
    </Alert>
  );
};

const SelfBox = ({
  muted,
  deafened,
  audioContext,
  stream,
  popperBoundaryRef,
}: {
  muted: boolean;
  deafened: boolean;
  audioContext: AudioContext;
  stream: MediaStream;
  popperBoundaryRef: React.RefObject<HTMLElement | null>;
}) => {
  const spectraDisabled = useTracker(() => Flags.active("disable.spectra"));
  const { userId, name, discordAccount } = useTracker(() => {
    const user = Meteor.user()!;
    return {
      userId: user._id,
      name: user.displayName,
      discordAccount: user.discordAccount,
    };
  });

  const tooltipId = useId();

  const container = useBootstrapContainer();
  const { t } = useTranslation();

  return (
    <OverlayTrigger
      container={container}
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
      overlay={
        <Tooltip id={tooltipId}>
          <div>{t("audio.tooltip.inTheCall", "You are in the call.")}</div>
          {muted && (
            <div>
              {t(
                "audio.tooltip.selfMuted",
                "You are currently muted and will transmit no audio.",
              )}
            </div>
          )}
          {deafened && (
            <div>
              {t(
                "audio.tooltip.selfDeafened",
                "You are currently deafened and will hear no audio.",
              )}
            </div>
          )}
        </Tooltip>
      }
    >
      <PeopleItemDiv>
        <Avatar
          _id={userId}
          displayName={name}
          discordAccount={discordAccount}
          size={44}
          isSelf
        />
        <div>
          {muted && (
            <MutedIcon>
              <FontAwesomeIcon icon={faMicrophoneSlash} />
            </MutedIcon>
          )}
          {deafened && (
            <DeafenedIcon>
              <FontAwesomeIcon icon={faVolumeMute} />
            </DeafenedIcon>
          )}
          {!spectraDisabled && !muted && !deafened ? (
            <Spectrum
              width={44}
              height={44}
              audioContext={audioContext}
              stream={stream}
            />
          ) : null}
        </div>
      </PeopleItemDiv>
    </OverlayTrigger>
  );
};

const ChatterTooltip = styled(Tooltip)`
  /* Force chatter tooltip overlay to get larger than the default
     react-bootstrap stylesheet permits.  We can only apply classes to the root
     tooltip <div>; the .tooltip-inner className is controlled by
     react-bootstrap/popper. */
  .tooltip-inner {
    max-width: 300px;
  }
`;

type PeerMuteConfirmModalHandle = {
  show: () => void;
};

const PeerMuteConfirmModal = ({
  peerId,
  name,
  isLocallyMuted,
  onLocalMuteToggle,
  ref,
}: {
  peerId: string;
  name: string;
  isLocallyMuted: boolean;
  onLocalMuteToggle: () => void;
  ref: React.Ref<PeerMuteConfirmModalHandle>;
}) => {
  const [visible, setVisible] = useState(true);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  useImperativeHandle(ref, () => ({ show }), [show]);

  const container = useBootstrapContainer();

  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<Error>();
  const clearError = useCallback(() => setError(undefined), []);

  const mute = useCallback(() => {
    mediasoupRemoteMutePeer.call({ peerId }, (err) => {
      setDisabled(false);
      if (err) {
        setError(err);
      } else {
        hide();
      }
    });
    setDisabled(true);
  }, [peerId, hide]);

  const handleLocalMuteToggle = useCallback(() => {
    onLocalMuteToggle(); // Call the callback to update PeerBox's state and track.enabled
    hide();
  }, [onLocalMuteToggle, hide]);

  const { t } = useTranslation();

  const modal = (
    <Modal show={visible} onHide={hide} container={container}>
      <Modal.Header closeButton>
        <Modal.Title>
          {t("audio.peerMuteModal.title", "Manage audio for {{name}}", {
            name,
          })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          <h4>{t("audio.peerMuteModal.muteForMe", "Mute for me")}</h4>
          <p>
            {t(
              "audio.peerMuteModal.muteForMeHelp",
              `Toggle hearing audio from {{name}}. This will not affect what others
              hear and you can (un)mute them here anytime. You will need to set
              this each time you connect to a call.`,
              { name },
            )}
          </p>
          <Button
            variant={isLocallyMuted ? "primary" : "outline-primary"}
            onClick={handleLocalMuteToggle}
            className="mb-2"
          >
            {isLocallyMuted
              ? t("audio.peerMuteModal.unmuteForMe", "Unmute for me")
              : t("audio.peerMuteModal.muteForMe", "Mute for me")}
          </Button>
        </div>
        <hr className="my-3" />
        <div>
          <h4>
            {t("audio.peerMuteModal.muteForEveryone", "Mute for everyone")}
          </h4>
          <p>
            <Trans
              i18nKey="audio.peerMuteModal.muteForEveryoneHelp"
              t={t}
              defaults={`This will mute {{name}} for <strong>everyone</strong>
                  on the call. Use this only as a last resort if they are
                  disruptive and cannot mute themselves. Only they will be able
                  to unmute themselves.`}
              values={{ name }}
              components={{
                strong: <strong />,
              }}
            />
          </p>

          <p>
            {t(
              "audio.peerMuteModal.areYouSure",
              "Are you sure you want to mute {{name}}?",
              { name },
            )}
          </p>

          {error && (
            <Alert variant="danger" dismissible onClose={clearError}>
              {error.message}
            </Alert>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={hide} disabled={disabled}>
          {t("common.cancel", "Cancel")}
        </Button>
        <Button variant="danger" onClick={mute} disabled={disabled}>
          {t("audio.peerMuteModal.muteForEveryone", "Mute for everyone")}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return modal;
};

const PeerBox = ({
  audioContext,
  selfDeafened,
  peer,
  popperBoundaryRef,
  stream,
}: {
  audioContext: AudioContext;
  selfDeafened: boolean;
  peer: PeerType;
  popperBoundaryRef: React.RefObject<HTMLElement | null>;
  stream: MediaStream | undefined;
}) => {
  const spectraDisabled = useTracker(() => Flags.active("disable.spectra"));
  const audioRef = React.createRef<HTMLAudioElement>();
  const { userId, name, discordAccount } = useTracker(() => {
    const user = MeteorUsers.findOne(peer.createdBy);
    return {
      userId: user?._id,
      name: user?.displayName,
      discordAccount: user?.discordAccount,
    };
  }, [peer.createdBy]);
  useEffect(() => {
    if (audioRef.current) {
      if (stream) {
        audioRef.current.srcObject = stream;
      } else {
        audioRef.current.srcObject = null;
      }
    }
  }, [stream, audioRef]);

  const [renderMuteModal, setRenderMuteModal] = useState(false);
  const muteModalRef = useRef<PeerMuteConfirmModalHandle>(null);
  const showMuteModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (renderMuteModal && muteModalRef.current) {
        muteModalRef.current.show();
      } else {
        setRenderMuteModal(true);
      }
    },
    [renderMuteModal],
  );

  const { muted, deafened } = peer;

  const tooltipId = useId();

  const [isLocalMuted, setIsLocalMuted] = useState(false);

  const toggleLocalMute = useCallback(() => {
    setIsLocalMuted(!isLocalMuted);
  }, [isLocalMuted]);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.muted = isLocalMuted;
    }
  }, [isLocalMuted, audioRef, stream]);

  const container = useBootstrapContainer();
  const { t } = useTranslation();

  return (
    <>
      {renderMuteModal && (
        <PeerMuteConfirmModal
          ref={muteModalRef}
          peerId={peer._id}
          name={name ?? "this user"}
          isLocallyMuted={isLocalMuted}
          onLocalMuteToggle={toggleLocalMute}
        />
      )}
      <OverlayTrigger
        container={container}
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
        overlay={
          <ChatterTooltip id={tooltipId}>
            <div>{name}</div>
            {muted && (
              <div>
                {t("audio.tooltip.otherMuted", "Muted (no one can hear them)")}
              </div>
            )}
            {deafened && (
              <div>
                {t(
                  "audio.tooltip.otherDeafened",
                  "Deafened (they can't hear anyone)",
                )}
              </div>
            )}
            {isLocalMuted && !muted && (
              <div>
                {t(
                  "audio.tooltip.localMuted",
                  "Muted by you (others can hear them)",
                )}
              </div>
            )}
          </ChatterTooltip>
        }
      >
        <PeopleItemDiv>
          <Avatar
            _id={userId}
            displayName={name}
            discordAccount={discordAccount}
            size={44}
          />
          <div>
            {muted && (
              <MutedIcon>
                <FontAwesomeIcon icon={faMicrophoneSlash} />
              </MutedIcon>
            )}
            {!muted && isLocalMuted && (
              <MutedIcon $local>
                <FontAwesomeIcon icon={faMicrophoneSlash} />
              </MutedIcon>
            )}
            {deafened && (
              <DeafenedIcon>
                <FontAwesomeIcon icon={faVolumeMute} />
              </DeafenedIcon>
            )}
            {!spectraDisabled &&
            !muted &&
            stream &&
            stream.getTracks().length > 0 ? (
              <Spectrum
                width={44}
                height={44}
                audioContext={audioContext}
                stream={stream}
              />
            ) : null}
            {!muted && (
              <PeerMuteButton onClick={showMuteModal}>
                <FontAwesomeIcon icon={faMicrophoneSlash} />
              </PeerMuteButton>
            )}
          </div>
          <audio autoPlay muted={selfDeafened || isLocalMuted} ref={audioRef} />
        </PeopleItemDiv>
      </OverlayTrigger>
    </>
  );
};

const Callers = ({
  muted,
  deafened,
  audioContext,
  localStream,
  callersExpanded,
  onToggleCallersExpanded,
  otherPeers,
  peerStreams,
}: {
  muted: boolean;
  deafened: boolean;
  audioContext: AudioContext;
  localStream: MediaStream;
  callersExpanded: boolean;
  onToggleCallersExpanded: () => void;
  otherPeers: PeerType[];
  peerStreams: Map<string, MediaStream>;
}) => {
  const callersHeaderIcon = callersExpanded ? faCaretDown : faCaretRight;
  const callerCount = otherPeers.length + 1; // +1 for self
  const chatterRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();

  const peerBoxes = otherPeers.map((peer) => {
    const stream = peerStreams.get(peer._id);
    return (
      <PeerBox
        key={peer._id}
        selfDeafened={deafened}
        audioContext={audioContext}
        peer={peer}
        popperBoundaryRef={chatterRef}
        stream={stream}
      />
    );
  });

  return (
    <ChatterSubsection ref={chatterRef}>
      <ChatterSubsectionHeader onClick={onToggleCallersExpanded}>
        <FontAwesomeIcon icon={callersHeaderIcon} />
        {`${callerCount} ${t("audio.caller", { count: callerCount })}`}
      </ChatterSubsectionHeader>
      <PeopleListDiv $collapsed={!callersExpanded}>
        <SelfBox
          muted={muted}
          deafened={deafened}
          audioContext={audioContext}
          stream={localStream}
          popperBoundaryRef={chatterRef}
        />
        {peerBoxes}
      </PeopleListDiv>
    </ChatterSubsection>
  );
};

const CallSection = ({
  muted,
  deafened,
  audioContext,
  localStream,
  callersExpanded,
  onToggleCallersExpanded,
  callState,
  callDispatch,
}: {
  muted: boolean;
  deafened: boolean;
  audioContext: AudioContext;
  localStream: MediaStream;
  callersExpanded: boolean;
  onToggleCallersExpanded: () => void;
  callState: CallState;
  callDispatch: React.Dispatch<Action>;
}) => {
  const onToggleMute = useCallback(() => {
    callDispatch({ type: "toggle-mute" });
  }, [callDispatch]);
  const onToggleDeafen = useCallback(() => {
    callDispatch({ type: "toggle-deafen" });
  }, [callDispatch]);
  const onLeaveCall = useCallback(() => {
    callDispatch({ type: "leave-call" });
  }, [callDispatch]);
  const onDismissPeerStateNotification = useCallback(() => {
    callDispatch({ type: "dismiss-peer-state-notification" });
  }, [callDispatch]);

  const muteRef = useRef(null);

  const mutedBy = useTracker(() => {
    return callState.remoteMutedBy
      ? Meteor.users.findOne(callState.remoteMutedBy)?.displayName
      : undefined;
  }, [callState.remoteMutedBy]);

  const [showMutedBy, setShowMutedBy] = useState<
    "hidden" | "show" | "dismissing"
  >("hidden");

  const container = useBootstrapContainer();
  const { t } = useTranslation();

  useEffect(() => {
    if (mutedBy !== undefined && showMutedBy === "hidden") {
      setShowMutedBy("show");
    }
  }, [mutedBy, showMutedBy]);

  const onDismissRemoteMuted = useCallback(() => {
    setShowMutedBy("dismissing");
  }, []);

  const onShowMutedByDismissed = useCallback(() => {
    callDispatch({ type: "dismiss-remote-muted" });
    setShowMutedBy("hidden");
  }, [callDispatch]);

  let joiningCallAlert;
  if (!callState.device) {
    joiningCallAlert = <JoiningCall details="Missing device" />;
  } else if (!callState.selfPeer) {
    joiningCallAlert = <JoiningCall details="Missing peer record for self" />;
  } else if (!callState.router) {
    joiningCallAlert = <JoiningCall details="Missing router" />;
  } else if (callState.transportStates.send !== "connected") {
    // We always negotiate the send transport immediately, even if nobody is
    // listening yet, so the only acceptable state is 'connected'
    joiningCallAlert = (
      <JoiningCall details="Unable to connect to WebRTC server for sending" />
    );
  } else if (callState.transportStates.recv === "failed") {
    // However, the recv transport is only negotiated when we have at least one
    // peer, so it can end up in an unestablished state for a while
    joiningCallAlert = (
      <JoiningCall details="Unable to connect to WebRTC server for receiving" />
    );
  }

  const idPrefix = useId();

  return (
    <>
      <AVActions>
        {!joiningCallAlert && (
          <>
            <AVButton
              ref={muteRef}
              variant={muted ? "secondary" : "light"}
              size="sm"
              onClick={onToggleMute}
            >
              {muted
                ? t("audio.unmute", "Un\u00ADmute")
                : t("audio.muteSelf", "Mute self")}
            </AVButton>
            {Meteor.isDevelopment && (
              <AVButton
                variant={deafened ? "secondary" : "light"}
                size="sm"
                onClick={onToggleDeafen}
              >
                {deafened
                  ? t("audio.undeafen", "Un\u00ADdeafen")
                  : t("audio.deafenSelf", "Deafen self")}
              </AVButton>
            )}
          </>
        )}
        <AVButton variant="danger" size="sm" onClick={onLeaveCall}>
          {t("audio.leave", "Leave call")}
        </AVButton>
      </AVActions>
      {joiningCallAlert}
      <Overlay
        container={container}
        target={muteRef.current}
        show={callState.allowInitialPeerStateNotification && muted}
        placement="bottom"
      >
        <Tooltip id={`${idPrefix}-muted-on-join-notification`}>
          <div>
            {t(
              "audio.mutedOnJoin",
              "We've left your mic muted for now given the number of people on the call. You can unmute yourself at any time.",
            )}
          </div>
          <Button onClick={onDismissPeerStateNotification}>
            {t("common.gotIt", "Got it")}
          </Button>
        </Tooltip>
      </Overlay>
      <Overlay
        container={container}
        target={muteRef.current}
        show={showMutedBy === "show"}
        placement="bottom"
        onExited={onShowMutedByDismissed}
      >
        <Tooltip id={`${idPrefix}-remote-muted-notification`}>
          <div>
            {t(
              "audio.mutedBySomeone",
              `You were muted by {{mutedBy}}. This usually happens
            when it seemed like you had stepped away from your computer without
            muting yourself, but your microphone was still on. You can unmute
            yourself at any time.`,
              { mutedBy: mutedBy ?? "someone else" },
            )}
          </div>
          <Button onClick={onDismissRemoteMuted}>
            {t("common.gotIt", "Got it")}
          </Button>
        </Tooltip>
      </Overlay>
      {!joiningCallAlert && (
        <Callers
          muted={muted}
          deafened={deafened}
          audioContext={audioContext}
          localStream={localStream}
          callersExpanded={callersExpanded}
          onToggleCallersExpanded={onToggleCallersExpanded}
          otherPeers={callState.otherPeers}
          peerStreams={callState.peerStreams}
        />
      )}
    </>
  );
};

export default CallSection;
