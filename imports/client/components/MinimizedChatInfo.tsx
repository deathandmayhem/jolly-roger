import { useTracker } from "meteor/react-meteor-data";
import {
  faPhone,
  faPhoneSlash,
  faMicrophone,
  faMicrophoneSlash,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import styled from "styled-components";
import Peers from "../../lib/models/mediasoup/Peers";
import type { Action, CallState } from "../hooks/useCallState";
import { CallJoinState } from "../hooks/useCallState";
import { Subscribers } from "../subscribers";
import type { Theme } from "../theme";
import { trace } from "../tracing";
import { PREFERRED_AUDIO_DEVICE_STORAGE_KEY } from "./AudioConfig";

const MinimizedChatInfoContainer = styled.div<{ theme: Theme }>`
  position: absolute;
  top: 40%;
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

const VoiceButton = styled(Button)<{ theme: Theme }>`
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
}: {
  huntId: string;
  puzzleId: string;
  callState: CallState;
  callDispatch: React.Dispatch<Action>;
}) => {
  const subscriberTopic = `puzzle:${puzzleId}`;
  const viewers = useTracker(
    () => Subscribers.find({ name: subscriberTopic }).count(),
    [subscriberTopic],
  );
  const callers = useTracker(
    () => Peers.find({ hunt: huntId, call: puzzleId }).count(),
    [huntId, puzzleId],
  );

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

  return (
    <MinimizedChatInfoContainer>
      <OverlayTrigger
        placement="right"
        overlay={<Tooltip id="mini-call">{tooltipText}</Tooltip>}
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
              <Tooltip id="mini-mute">{muted ? "Unmute" : "Mute"}</Tooltip>
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
            overlay={<Tooltip id="mini-leave-call">Leave call</Tooltip>}
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
            <Tooltip id="mini-join-call">
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
