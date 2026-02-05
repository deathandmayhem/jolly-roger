import { useTracker } from "meteor/react-meteor-data";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons/faChevronRight";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons/faMicrophone";
import { faMicrophoneSlash } from "@fortawesome/free-solid-svg-icons/faMicrophoneSlash";
import { faPhone } from "@fortawesome/free-solid-svg-icons/faPhone";
import { faPhoneSlash } from "@fortawesome/free-solid-svg-icons/faPhoneSlash";
import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useId, useMemo } from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flags from "../../Flags";
import Peers from "../../lib/models/mediasoup/Peers";
import type { Action, CallState } from "../hooks/useCallState";
import { CallJoinState } from "../hooks/useCallState";
import { Subscribers } from "../subscribers";
import { useBootstrapContainer } from "./BootstrapScopeContext";

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

const SquareIconButton = styled(Button)`
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
  joinCall,
  onRestore,
}: {
  huntId: string;
  puzzleId: string;
  callState: CallState;
  callDispatch: React.Dispatch<Action>;
  joinCall: () => void;
  onRestore: () => void;
}) => {
  const subscriberTopic = `puzzle:${puzzleId}`;
  const rtcDisabled = useTracker(() => Flags.active("disable.webrtc"), []);

  const { t } = useTranslation();

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

  const onToggleMute = React.useCallback(() => {
    callDispatch({ type: "toggle-mute" });
  }, [callDispatch]);

  const onLeaveCall = React.useCallback(() => {
    callDispatch({ type: "leave-call" });
  }, [callDispatch]);

  const { muted } = callState.audioControls;

  const tooltipText = useMemo(() => {
    const viewersString = t("chat.viewersContext", {
      context: `${viewers}`,
      count: viewers,
    });
    const callersString = t("audio.callersContext", {
      context: `${callers}`,
      count: callers,
    });
    const andString = t("common.and", " and ");
    return rtcDisabled
      ? viewersString
      : `${viewersString}${andString}${callersString}`;
  }, [rtcDisabled, callers, viewers, t]);

  const idPrefix = useId();
  const container = useBootstrapContainer();

  const callButtons =
    callState.callState === CallJoinState.IN_CALL ? (
      <>
        <OverlayTrigger
          placement="right"
          container={container}
          overlay={
            <Tooltip id={`${idPrefix}-mini-mute`}>
              {muted
                ? t("audio.unmute", "Unmute")
                : t("audio.muteSelf", "Mute")}
            </Tooltip>
          }
        >
          <SquareIconButton
            variant={muted ? "secondary" : "light"}
            onClick={onToggleMute}
          >
            <FontAwesomeIcon icon={muted ? faMicrophoneSlash : faMicrophone} />
          </SquareIconButton>
        </OverlayTrigger>

        <OverlayTrigger
          placement="right"
          container={container}
          overlay={
            <Tooltip id={`${idPrefix}-mini-leave-call`}>
              {t("audio.leave", "Leave call")}
            </Tooltip>
          }
        >
          <SquareIconButton variant="danger" onClick={onLeaveCall}>
            <FontAwesomeIcon icon={faPhoneSlash} />
          </SquareIconButton>
        </OverlayTrigger>
      </>
    ) : (
      <OverlayTrigger
        placement="right"
        container={container}
        overlay={
          <Tooltip id={`${idPrefix}-mini-join-call`}>
            {callers > 0
              ? t("audio.joinCall", "Join audio call")
              : t("audio.startCall", "Start audio call")}
          </Tooltip>
        }
      >
        <SquareIconButton
          variant="primary"
          onClick={joinCall}
          title={
            callers > 0
              ? t("audio.joinCall", "Join audio call")
              : t("audio.startCall", "Start audio call")
          }
        >
          <FontAwesomeIcon icon={faPhone} />
        </SquareIconButton>
      </OverlayTrigger>
    );

  return (
    <MinimizedChatInfoContainer>
      <OverlayTrigger
        placement="right"
        container={container}
        overlay={
          <Tooltip id={`${idPrefix}-mini-restore`}>
            {t("chat.restoreChat", "Restore Chat")}
          </Tooltip>
        }
      >
        <SquareIconButton onClick={onRestore} style={{ marginBottom: "4px" }}>
          <FontAwesomeIcon icon={faChevronRight} />
        </SquareIconButton>
      </OverlayTrigger>
      <OverlayTrigger
        placement="right"
        container={container}
        overlay={<Tooltip id={`${idPrefix}-mini-call`}>{tooltipText}</Tooltip>}
      >
        <div>
          <InfoPill>
            <FontAwesomeIcon icon={faUsers} />
            {viewers}
          </InfoPill>
          {!rtcDisabled && (
            <InfoPill>
              <FontAwesomeIcon icon={faPhone} />
              {callers}
            </InfoPill>
          )}
        </div>
      </OverlayTrigger>
      {rtcDisabled ? null : callButtons}
    </MinimizedChatInfoContainer>
  );
};

export default MinimizedChatInfo;
