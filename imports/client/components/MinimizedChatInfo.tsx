import { useTracker } from "meteor/react-meteor-data";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons/faChevronRight";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons/faMicrophone";
import { faMicrophoneSlash } from "@fortawesome/free-solid-svg-icons/faMicrophoneSlash";
import { faPhone } from "@fortawesome/free-solid-svg-icons/faPhone";
import { faPhoneSlash } from "@fortawesome/free-solid-svg-icons/faPhoneSlash";
import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useId } from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import styled from "styled-components";
import Peers from "../../lib/models/mediasoup/Peers";
import type { Action, CallState } from "../hooks/useCallState";
import { CallJoinState } from "../hooks/useCallState";
import { Subscribers } from "../subscribers";
import { trace } from "../tracing";
import { PREFERRED_AUDIO_DEVICE_STORAGE_KEY } from "./AudioConfig";

const MinimizedChatInfoContainer = styled.div`
  position: absolute;
  top: calc(50% - 65px);
  left: 1px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.text};
  color: ${({ theme }) => theme.colors.text};
  border-left: none;
  gap: 8px;
  background-color: ${({ theme }) => theme.colors.chatterSectionBackground};
  padding: 4px 2px;
  border-radius: 0 4px 4px 0;
  z-index: 10;
`;

const InfoPill = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
`;

const VoiceButton = styled(Button)`
  font-size: 12px;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MinimizedChatInfo = ({
  huntId,
  puzzleId,
  callState,
  callDispatch,
  onRestore,
}: {
  huntId: string;
  puzzleId: string;
  callState: CallState;
  callDispatch: React.Dispatch<Action>;
  onRestore: () => void;
}) => {
  const subscriberTopic = `puzzle:${puzzleId}`;
  const { callers, viewers } = useTracker(() => {
    const callerIds = Peers.find(
      { hunt: huntId, call: puzzleId },
      { fields: { _id: 1 } },
    ).map((peer) => peer._id);

    const viewerIds = Subscribers.find(
      { name: subscriberTopic },
      { fields: { user: 1 } },
    ).map((sub) => sub.user);

    const uniqueCallers = new Set(callerIds);

    const uniqueViewersNotCallers = new Set(
      viewerIds.filter((id) => !uniqueCallers.has(id)),
    );

    return {
      callers: callerIds.length,
      viewers: uniqueViewersNotCallers.size,
    };
  }, [huntId, puzzleId, subscriberTopic]);

  const joinCall = React.useCallback(() => {
    void (async () => {
      trace("MinimizedChatInfo joinCall");
      if (navigator.mediaDevices) {
        callDispatch({ type: "request-capture" });
        const preferredAudioDeviceId =
          localStorage.getItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY) ?? undefined;
        const mediaStreamConstraints = {
          audio: {
            echoCancellation: { ideal: true },
            autoGainControl: { ideal: true },
            noiseSuppression: { ideal: true },
            deviceId: preferredAudioDeviceId,
          },
        };

        let mediaSource: MediaStream;
        try {
          mediaSource = await navigator.mediaDevices.getUserMedia(
            mediaStreamConstraints,
          );
        } catch (e) {
          // TODO: Show an error to the user
          callDispatch({ type: "capture-error", error: e as Error });
          return;
        }

        const AudioContext =
          window.AudioContext ||
          (window as { webkitAudioContext?: AudioContext }).webkitAudioContext;
        const audioContext = new AudioContext();

        callDispatch({
          type: "join-call",
          audioState: {
            mediaSource,
            audioContext,
          },
        });
      } else {
        const msg =
          "Couldn't get local microphone: browser denies access on non-HTTPS origins";
        // TODO: show an error to the user
        callDispatch({ type: "capture-error", error: new Error(msg) });
      }
    })();
  }, [callDispatch]);

  const onToggleMute = React.useCallback(() => {
    callDispatch({ type: "toggle-mute" });
  }, [callDispatch]);

  const onLeaveCall = React.useCallback(() => {
    callDispatch({ type: "leave-call" });
  }, [callDispatch]);

  const { muted } = callState.audioControls;

  const tooltipText = useTracker(() => {
    return `${viewers === 0 ? "No" : viewers} ${viewers !== 1 ? "viewers" : "viewer"} and ${callers === 0 ? "no" : callers} ${
      callers !== 1 ? "callers" : "caller"
    }`;
  }, [callers, viewers]);

  const idPrefix = useId();

  return (
    <MinimizedChatInfoContainer>
      <OverlayTrigger
        placement="right"
        overlay={
          <Tooltip id={`${idPrefix}-mini-restore`}>Restore Chat</Tooltip>
        }
      >
        <VoiceButton onClick={onRestore} style={{ marginBottom: "4px" }}>
          <FontAwesomeIcon icon={faChevronRight} />
        </VoiceButton>
      </OverlayTrigger>
      <OverlayTrigger
        placement="right"
        overlay={<Tooltip id={`${idPrefix}-mini-call`}>{tooltipText}</Tooltip>}
      >
        <div>
          <InfoPill>
            <FontAwesomeIcon icon={faUsers} />
            {viewers}
          </InfoPill>
          <InfoPill>
            <FontAwesomeIcon icon={faPhone} />
            {callers}
          </InfoPill>
        </div>
      </OverlayTrigger>
      {callState.callState === CallJoinState.IN_CALL ? (
        <>
          <OverlayTrigger
            placement="right"
            overlay={
              <Tooltip id={`${idPrefix}-mini-mute`}>
                {muted ? "Unmute" : "Mute"}
              </Tooltip>
            }
          >
            <VoiceButton
              variant={muted ? "secondary" : "light"}
              onClick={onToggleMute}
            >
              <FontAwesomeIcon
                icon={muted ? faMicrophoneSlash : faMicrophone}
              />
            </VoiceButton>
          </OverlayTrigger>

          <OverlayTrigger
            placement="right"
            overlay={
              <Tooltip id={`${idPrefix}-mini-leave-call`}>Leave call</Tooltip>
            }
          >
            <VoiceButton variant="danger" onClick={onLeaveCall}>
              <FontAwesomeIcon icon={faPhoneSlash} />
            </VoiceButton>
          </OverlayTrigger>
        </>
      ) : (
        <OverlayTrigger
          placement="right"
          overlay={
            <Tooltip id={`${idPrefix}-mini-join-call`}>
              {callers > 0 ? "Join audio call" : "Start audio call"}
            </Tooltip>
          }
        >
          <VoiceButton
            variant="primary"
            onClick={joinCall}
            title={callers > 0 ? "Join audio call" : "Start audio call"}
          >
            <FontAwesomeIcon icon={faPhone} />
          </VoiceButton>
        </OverlayTrigger>
      )}
    </MinimizedChatInfoContainer>
  );
};

export default MinimizedChatInfo;
