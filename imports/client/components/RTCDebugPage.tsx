import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { faArrowCircleLeft } from "@fortawesome/free-solid-svg-icons/faArrowCircleLeft";
import { faBroadcastTower } from "@fortawesome/free-solid-svg-icons/faBroadcastTower";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faCaretRight } from "@fortawesome/free-solid-svg-icons/faCaretRight";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons/faMicrophone";
import { faMicrophoneSlash } from "@fortawesome/free-solid-svg-icons/faMicrophoneSlash";
import { faPause } from "@fortawesome/free-solid-svg-icons/faPause";
import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faSlash } from "@fortawesome/free-solid-svg-icons/faSlash";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faUpload } from "@fortawesome/free-solid-svg-icons/faUpload";
import { faVideo } from "@fortawesome/free-solid-svg-icons/faVideo";
import { faVolumeMute } from "@fortawesome/free-solid-svg-icons/faVolumeMute";
import { faVolumeOff } from "@fortawesome/free-solid-svg-icons/faVolumeOff";
import { faVolumeUp } from "@fortawesome/free-solid-svg-icons/faVolumeUp";
import { faWifi } from "@fortawesome/free-solid-svg-icons/faWifi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Accordion from "react-bootstrap/Accordion";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import ProgressBar from "react-bootstrap/ProgressBar";
import Row from "react-bootstrap/Row";
import Table from "react-bootstrap/Table";
import Tooltip from "react-bootstrap/Tooltip";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { RECENT_ACTIVITY_TIME_WINDOW_MS } from "../../lib/config/webrtc";
import isAdmin from "../../lib/isAdmin";
import { groupedBy } from "../../lib/listUtils";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import type { ServerType } from "../../lib/models/Servers";
import Servers from "../../lib/models/Servers";
import CallHistories from "../../lib/models/mediasoup/CallHistories";
import ConnectAcks from "../../lib/models/mediasoup/ConnectAcks";
import ConnectRequests from "../../lib/models/mediasoup/ConnectRequests";
import ConsumerAcks from "../../lib/models/mediasoup/ConsumerAcks";
import Consumers from "../../lib/models/mediasoup/Consumers";
import type { ConsumerType } from "../../lib/models/mediasoup/Consumers";
import Peers from "../../lib/models/mediasoup/Peers";
import type { PeerType } from "../../lib/models/mediasoup/Peers";
import ProducerClients from "../../lib/models/mediasoup/ProducerClients";
import type { ProducerClientType } from "../../lib/models/mediasoup/ProducerClients";
import ProducerServers from "../../lib/models/mediasoup/ProducerServers";
import Rooms from "../../lib/models/mediasoup/Rooms";
import type { RoomType } from "../../lib/models/mediasoup/Rooms";
import Routers from "../../lib/models/mediasoup/Routers";
import type { RouterType } from "../../lib/models/mediasoup/Routers";
import TransportRequests from "../../lib/models/mediasoup/TransportRequests";
import TransportStates from "../../lib/models/mediasoup/TransportStates";
import type { TransportType } from "../../lib/models/mediasoup/Transports";
import Transports from "../../lib/models/mediasoup/Transports";
import Avatar from "./Avatar";
import CopyToClipboardButton from "./CopyToClipboardButton";
import Loading from "./Loading";

const ClipButton = ({ text, id }: { text: string; id: string }) => {
  return (
    <>
      <CopyToClipboardButton
        text={text}
        tooltipId={id}
        variant="secondary"
        aria-label="Copy"
        size="sm"
      >
        <FontAwesomeIcon icon={faCopy} />
      </CopyToClipboardButton>{" "}
    </>
  );
};

// button elements are not permitted as children of button elements, and the
// whole AccordionHeader is a button, so we can't have the single-click copy
// button inside the accordion header.  Instead, for the IDs we want to display
// and make copyable inside the AccordionHeader, do the self-selecting-input
// trick to make selection easier.
const CopyableInput = ({ value }: { value: string }) => {
  const ref = React.useRef<HTMLInputElement>(null);
  const onClick: NonNullable<React.DOMAttributes<HTMLInputElement>["onClick"]> =
    useCallback((e) => {
      if (ref.current) {
        ref.current.select();
        e.preventDefault();
        // We want to prevent the click from bubbling up to any of the
        // AccordionHeader <button> elements above us, lest the accordion
        // toggle as the user attempts to select this input.
        e.stopPropagation();
      }
    }, []);

  // Auto-sizing assuming a particular fixed-width typeface
  const width = `${value.length * 8.4 + 8}px`;
  return (
    <code>
      <input
        style={{ color: "red", width }}
        ref={ref}
        readOnly
        value={value}
        onClick={onClick}
      />
    </code>
  );
};

const CallDisplay = ({ call }: { call: string }) => {
  const puzzle = useTracker(() => Puzzles.findOne(call), [call]);

  if (!puzzle) {
    return <CopyableInput value={call} />;
  }

  return (
    <>
      <Link to={`/hunts/${puzzle.hunt}/puzzles/${call}`} target="_blank">
        <FontAwesomeIcon icon={faPuzzlePiece} />
      </Link>{" "}
      {puzzle.title}
      {" ("}
      <CopyableInput value={call} />)
    </>
  );
};

const StyledAvatar = styled(Avatar)`
  vertical-align: middle;
`;

const UserDisplay = ({ userId }: { userId: string }) => {
  const user = useTracker(() => MeteorUsers.findOne(userId), [userId]);
  return (
    <Link to={`/users/${userId}`} target="_blank">
      <StyledAvatar {...user} size={40} inline />{" "}
      {user?.displayName ?? "Unknown"}
    </Link>
  );
};

const StyledJSONDisplayContainer = styled(Container)`
  padding-left: 0;
  padding-top: 0;
`;

const StyledJSONDisplayButtonCol = styled(Col)`
  padding-right: 0;
`;

const StyledJSONDisplayTextCol = styled(Col)`
  padding-left: 0;
  padding-right: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const StyledJSONDisplayPre = styled.pre<{ $collapsed?: boolean }>`
  margin-bottom: 0;
  ${({ $collapsed }) =>
    $collapsed &&
    css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `}
`;

const JSONDisplay = ({ id, json }: { id: string; json: string }) => {
  const [collapse, setCollapse] = useState(true);

  return (
    <StyledJSONDisplayContainer fluid>
      <Row>
        <StyledJSONDisplayButtonCol xs="auto">
          <ClipButton id={id} text={json} />
          <Button variant="link" onClick={() => setCollapse(!collapse)}>
            <FontAwesomeIcon icon={collapse ? faCaretRight : faCaretDown} />
          </Button>
        </StyledJSONDisplayButtonCol>
        <StyledJSONDisplayTextCol xs={11}>
          {collapse ? (
            <StyledJSONDisplayPre $collapsed className="text-truncate">
              {json}
            </StyledJSONDisplayPre>
          ) : (
            <StyledJSONDisplayPre>
              {JSON.stringify(JSON.parse(json), null, 2)}
            </StyledJSONDisplayPre>
          )}
        </StyledJSONDisplayTextCol>
      </Row>
    </StyledJSONDisplayContainer>
  );
};

const Producer = ({ producer }: { producer: ProducerClientType }) => {
  const producerServer = useTracker(
    () => ProducerServers.findOne({ producerClient: producer._id }),
    [producer._id],
  );

  const [statusTooltip, statusIcon] = useMemo(() => {
    if (!producerServer) {
      return [
        "Connecting",
        <FontAwesomeIcon icon={faSpinner} spin fixedWidth />,
      ];
    } else if (producer.paused) {
      return ["Paused", <FontAwesomeIcon icon={faPause} fixedWidth />];
    } else {
      return [
        "Broadcasting",
        <FontAwesomeIcon icon={faBroadcastTower} fixedWidth />,
      ];
    }
  }, [producer.paused, producerServer]);

  return (
    <Accordion.Item eventKey={producer._id}>
      <Accordion.Header>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-producer-kind-${producer._id}`}>
              {producer.kind === "audio" ? "Audio" : "Video"}
            </Tooltip>
          }
        >
          <FontAwesomeIcon
            icon={producer.kind === "audio" ? faMicrophone : faVideo}
            fixedWidth
          />
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-producer-status-${producer._id}`}>
              {statusTooltip}
            </Tooltip>
          }
        >
          {statusIcon}
        </OverlayTrigger>
        {" ("}
        <CopyableInput value={producer._id} />)
      </Accordion.Header>

      <Accordion.Body>
        {!producerServer && (
          <Alert variant="warning">
            <p>
              <FontAwesomeIcon icon={faExclamationTriangle} /> Producer has not
              been acknowledged by the Mediasoup server. This can happen
              transiently when the producer is being created, but if it
              persists, it indicates a problem.
            </p>
          </Alert>
        )}

        <Row as="dl">
          {producerServer && (
            <>
              <Col as="dt" xs={2}>
                Producer ID (Meteor server-side)
              </Col>
              <Col as="dd" xs={10}>
                <ClipButton
                  id={`producer-server-${producerServer._id}`}
                  text={producerServer._id}
                />
                <code>{producerServer._id}</code>
              </Col>
              <Col as="dt" xs={2}>
                Producer ID (Mediasoup)
              </Col>
              <Col as="dd" xs={10}>
                <ClipButton
                  id={`producer-server-producer-id-${producerServer.producerId}`}
                  text={producerServer.producerId}
                />
                <code>{producerServer.producerId}</code>
              </Col>
            </>
          )}
          <Col as="dt" xs={2}>
            Track ID (client-side)
          </Col>
          <Col as="dd" xs={10}>
            <ClipButton
              id={`producer-track-id-${producer._id}`}
              text={producer.trackId}
            />
            <code>{producer.trackId}</code>
          </Col>
          <Col as="dt" xs={2}>
            RTP parameters
          </Col>
          <Col as="dd" xs={10}>
            <JSONDisplay
              id={`producer-rtp-parameters-${producer._id}`}
              json={producer.rtpParameters}
            />
          </Col>
        </Row>
      </Accordion.Body>
    </Accordion.Item>
  );
};

const Consumer = ({ consumer }: { consumer: ConsumerType }) => {
  const consumerAcked = useTracker(
    () => !!ConsumerAcks.findOne({ consumer: consumer._id }),
    [consumer._id],
  );

  const [statusTooltip, statusIcon] = useMemo(() => {
    if (!consumerAcked) {
      return [
        "Connecting",
        <FontAwesomeIcon icon={faSpinner} spin fixedWidth />,
      ];
    } else if (consumer.paused) {
      return ["Paused", <FontAwesomeIcon icon={faPause} fixedWidth />];
    } else {
      return ["Active", <FontAwesomeIcon icon={faPlay} fixedWidth />];
    }
  }, [consumer.paused, consumerAcked]);

  const producerPeer = useTracker(
    () => Peers.findOne(consumer.producerPeer),
    [consumer.producerPeer],
  );

  return (
    <Accordion.Item eventKey={consumer._id}>
      <Accordion.Header>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-consumer-kind-${consumer._id}`}>
              {consumer.kind === "audio" ? "Audio" : "Video"}
            </Tooltip>
          }
        >
          <FontAwesomeIcon
            icon={consumer.kind === "audio" ? faMicrophone : faVideo}
            fixedWidth
          />
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-consumer-status-${consumer._id}`}>
              {statusTooltip}
            </Tooltip>
          }
        >
          {statusIcon}
        </OverlayTrigger>
        {" ("}
        <CopyableInput value={consumer._id} />
        {") "}
        <FontAwesomeIcon icon={faArrowCircleLeft} fixedWidth />
        {producerPeer && <UserDisplay userId={producerPeer?.createdBy} />}
        {" ("}
        <CopyableInput value={consumer.producerPeer} />)
      </Accordion.Header>

      <Accordion.Body>
        {!consumerAcked && (
          <Alert variant="warning">
            <p>
              <FontAwesomeIcon icon={faExclamationTriangle} /> Client has not
              acknowledged creation of the consumer. This can happen transiently
              but if it persists, it indicates that the client is not creating
              the local copy of the consumer.
            </p>
          </Alert>
        )}

        <Row as="dl">
          <Col as="dt" xs={2}>
            Consumer ID (Mediasoup)
          </Col>
          <Col as="dd" xs={10}>
            <ClipButton
              id={`consumer-id-${consumer._id}`}
              text={consumer.consumerId}
            />
            <code>{consumer.consumerId}</code>
          </Col>
          <Col as="dt" xs={2}>
            RTP parameters
          </Col>
          <Col as="dd" xs={10}>
            <JSONDisplay
              id={`consumer-rtp-parameters-${consumer._id}`}
              json={consumer.rtpParameters}
            />
          </Col>
        </Row>
      </Accordion.Body>
    </Accordion.Item>
  );
};

const Transport = ({ transport }: { transport: TransportType }) => {
  const connectionParams = useTracker(
    () => ConnectRequests.findOne({ transport: transport._id }),
    [transport._id],
  );
  const connectionStarted = !!connectionParams;
  const connectionCompleted = useTracker(
    () => !!ConnectAcks.findOne({ transport: transport._id }),
    [transport._id],
  );

  const transportState = useTracker(
    () => TransportStates.findOne({ transportId: transport.transportId }),
    [transport.transportId],
  );

  // TODO: consider using useFind once fixed upstream
  const producers = useTracker(
    () =>
      ProducerClients.find(
        { transport: transport._id },
        { sort: { createdAt: 1 } },
      ).fetch(),
    [transport._id],
  );

  // TODO: consider using useFind once fixed upstream
  const consumers = useTracker(
    () =>
      Consumers.find(
        { transportId: transport.transportId },
        { sort: { createdAt: 1 } },
      ).fetch(),
    [transport.transportId],
  );

  const [statusTooltip, statusIcon] = useMemo(() => {
    if (connectionCompleted) {
      return ["Connected", <FontAwesomeIcon icon={faWifi} fixedWidth />];
    } else if (connectionStarted) {
      return [
        "Connecting",
        <FontAwesomeIcon icon={faSpinner} fixedWidth spin />,
      ];
    } else {
      return [
        "Not connected",
        <span className="fa-layers fa-fw">
          <FontAwesomeIcon icon={faWifi} fixedWidth />
          <FontAwesomeIcon icon={faSlash} fixedWidth />
        </span>,
      ];
    }
  }, [connectionCompleted, connectionStarted]);

  const [directionIcon, directionTooltip] = useMemo(() => {
    if (transport.direction === "send") {
      return [faUpload, "Send"];
    } else {
      return [faDownload, "Receive"];
    }
  }, [transport.direction]);

  return (
    <Accordion.Item eventKey={transport._id}>
      <Accordion.Header>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-transport-status-${transport._id}`}>
              {statusTooltip}
            </Tooltip>
          }
        >
          {statusIcon}
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-transport-direction-${transport._id}`}>
              {directionTooltip}
            </Tooltip>
          }
        >
          <FontAwesomeIcon icon={directionIcon} fixedWidth />
        </OverlayTrigger>
        {" ("}
        <CopyableInput value={transport._id} />)
      </Accordion.Header>
      <Accordion.Body>
        {connectionStarted && !connectionCompleted && (
          <Alert variant="warning">
            <p>
              <FontAwesomeIcon icon={faExclamationTriangle} /> The client has
              initiated a connection but the server has not acknowledged it yet.
              This will happen transiently, but if it sticks around, it
              indicates a problem with the connection handshake.
            </p>
          </Alert>
        )}

        <Row as="dl">
          <Col as="dt" xs={2}>
            Transport ID (Mediasoup)
          </Col>
          <Col as="dd" xs={10}>
            <ClipButton
              id={`transport-id-${transport.transportId}`}
              text={transport.transportId}
            />
            <code>{transport.transportId}</code>
          </Col>
          <Col as="dt" xs={2}>
            ICE Parameters
          </Col>
          <Col as="dd" xs={10}>
            <JSONDisplay
              id={`transport-ice-parameters-${transport._id}`}
              json={transport.iceParameters}
            />
          </Col>
          <Col as="dt" xs={2}>
            ICE Candidates
          </Col>
          <Col as="dd" xs={10}>
            <JSONDisplay
              id={`transport-ice-candidates-${transport._id}`}
              json={transport.iceCandidates}
            />
          </Col>
          <Col as="dt" xs={2}>
            Server DTLS Parameters
          </Col>
          <Col as="dd" xs={10}>
            <JSONDisplay
              id={`transport-dtlsparameters-${transport._id}`}
              json={transport.dtlsParameters}
            />
          </Col>
          {connectionParams && (
            <>
              <Col as="dt" xs={2}>
                Client DTLS Parameters
              </Col>
              <Col as="dd" xs={10}>
                <JSONDisplay
                  id={`connection-params-${connectionParams._id}`}
                  json={connectionParams.dtlsParameters}
                />
              </Col>
            </>
          )}
          {transportState && (
            <>
              <Col as="dt" xs={2}>
                ICE State
              </Col>
              <Col as="dd" xs={10}>
                <code>{transportState.iceState ?? "undefined"}</code>
              </Col>
              <Col as="dt" xs={2}>
                ICE Selected Tuple
              </Col>
              <Col as="dd" xs={10}>
                {transportState.iceSelectedTuple ? (
                  <JSONDisplay
                    id={`transport-state-ice-selected-tuple-${transportState._id}`}
                    json={transportState.iceSelectedTuple}
                  />
                ) : (
                  <code>undefined</code>
                )}
              </Col>
              <Col as="dt" xs={2}>
                DTLS State
              </Col>
              <Col as="dd" xs={10}>
                <code>{transportState.dtlsState ?? "undefined"}</code>
              </Col>
            </>
          )}
        </Row>

        {producers.length > 0 && (
          <>
            <h5>Producers ({producers.length})</h5>

            <Accordion>
              {producers.map((p) => (
                <Producer key={p._id} producer={p} />
              ))}
            </Accordion>
          </>
        )}

        {consumers.length > 0 && (
          <>
            <h5>Consumers ({consumers.length})</h5>

            <Accordion>
              {consumers.map((c) => (
                <Consumer key={c._id} consumer={c} />
              ))}
            </Accordion>
          </>
        )}
      </Accordion.Body>
    </Accordion.Item>
  );
};

const Peer = ({ peer }: { peer: PeerType }) => {
  // TODO: consider using useFind once fixed upstream
  const transportRequests = useTracker(
    () =>
      TransportRequests.find(
        { peer: peer._id },
        { sort: { createdAt: 1 } },
      ).fetch(),
    [peer._id],
  );
  // TODO: consider using useFind once fixed upstream
  const transports = useTracker(
    () =>
      Transports.find({ peer: peer._id }, { sort: { createdAt: 1 } }).fetch(),
    [peer._id],
  );
  const producerCount = useTracker(
    () => ProducerClients.find({ peer: peer._id }).count(),
    [peer._id],
  );
  const consumerCount = useTracker(
    () => Consumers.find({ peer: peer._id }).count(),
    [peer._id],
  );

  return (
    <Accordion.Item eventKey={peer._id}>
      <Accordion.Header>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-peer-muted-${peer._id}`}>
              {peer.muted ? "Muted" : "Unmuted"}
            </Tooltip>
          }
        >
          <FontAwesomeIcon
            icon={peer.muted ? faMicrophoneSlash : faMicrophone}
            fixedWidth
          />
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-peer-deafened-${peer._id}`}>
              {peer.deafened ? "Deafened" : "Undeafened"}
            </Tooltip>
          }
        >
          <FontAwesomeIcon
            icon={peer.deafened ? faVolumeMute : faVolumeUp}
            fixedWidth
          />
        </OverlayTrigger>
        <UserDisplay userId={peer.createdBy} />
        {" ("}
        <CopyableInput value={peer._id} />)
      </Accordion.Header>
      <Accordion.Body>
        {transportRequests.length === 0 && (
          <Alert variant="warning">
            <p>
              <FontAwesomeIcon icon={faExclamationTriangle} /> This peer has no
              transport requests. This will happen transiently when a peer first
              connects, but if it sticks around, it indicates that the client
              got stuck in the middle of the handshake.
            </p>
          </Alert>
        )}
        {transportRequests.length > 1 && (
          <Alert variant="warning">
            <p>
              <FontAwesomeIcon icon={faExclamationTriangle} /> This peer has
              multiple transport requests. It shouldn&apos;t be possible for one
              peer to subscribe to <code>mediasoup:transports</code> more than
              once, so this is a likely bug or leak. We&apos;re only showing the
              RTP capabilities for the first one.
            </p>
            <p>The complete list of IDs is:</p>
            <ul>
              {transportRequests.map(({ _id: id }) => (
                <li key={id}>
                  <ClipButton id={`transport-request-${id}`} text={id} />
                  <code>{id}</code>
                </li>
              ))}
            </ul>
          </Alert>
        )}
        <Row as="dl">
          <Col as="dt" xs={2}>
            Meteor Server
          </Col>
          <Col as="dd" xs={10}>
            <ClipButton
              id={`peer-created-server-${peer._id}`}
              text={peer.createdServer}
            />
            <code>{peer.createdServer}</code>
          </Col>
          <Col as="dt" xs={2}>
            Tab
          </Col>
          <Col as="dd" xs={10}>
            <ClipButton id={`peer-created-tab-${peer._id}`} text={peer.tab} />
            <code>{peer.tab}</code>
          </Col>
          {transportRequests.length > 0 && (
            <>
              <Col as="dt" xs={2}>
                RTP capabilities
              </Col>
              <Col as="dd" xs={10}>
                <JSONDisplay
                  id={`transport-requests-${transportRequests[0]!._id}`}
                  json={transportRequests[0]!.rtpCapabilities}
                />
              </Col>
            </>
          )}
        </Row>

        {transports.length > 0 && (
          <>
            <h4>
              Transports ({transports.length}
              {", "}
              {producerCount}
              {" producers, "}
              {consumerCount}
              {" consumers)"}
            </h4>

            <Accordion>
              {transports.map((t) => (
                <Transport key={t._id} transport={t} />
              ))}
            </Accordion>
          </>
        )}
      </Accordion.Body>
    </Accordion.Item>
  );
};

const RouterDetails = ({ router }: { router: RouterType }) => {
  return (
    <>
      <Col as="dt" xs={2}>
        Router ID (Meteor)
      </Col>
      <Col as="dd" xs={10}>
        <ClipButton id={`router-${router._id}`} text={router._id} />
        <code>{router._id}</code>
      </Col>
      <Col as="dt" xs={2}>
        Router ID (Mediasoup)
      </Col>
      <Col as="dd" xs={10}>
        <ClipButton
          id={`router-router-id-${router._id}`}
          text={router.routerId}
        />
        <code>{router.routerId}</code>
      </Col>
      <Col as="dt" xs={2}>
        RTP capabilities
      </Col>
      <Col as="dd" xs={10}>
        <JSONDisplay
          id={`router-${router._id}`}
          json={router.rtpCapabilities}
        />
      </Col>
    </>
  );
};

const Room = ({ room }: { room: RoomType }) => {
  const router = useTracker(
    () => Routers.findOne({ call: room.call }),
    [room.call],
  );
  const lastActivity = useTracker(
    () => CallHistories.findOne({ call: room.call })?.lastActivity,
    [room.call],
  );
  const [recentActivity, setRecentActivity] = useState<boolean>(false);
  useEffect(() => {
    let timeout: number | undefined;
    const lastActivityMs = lastActivity?.getTime() ?? 0;
    const recent = Date.now() - lastActivityMs < RECENT_ACTIVITY_TIME_WINDOW_MS;
    setRecentActivity(recent);
    if (recent) {
      timeout = window.setTimeout(
        () => setRecentActivity(false),
        RECENT_ACTIVITY_TIME_WINDOW_MS,
      );
    }
    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [lastActivity]);
  // TODO: consider using useFind once fixed upstream
  const peers = useTracker(
    () => Peers.find({ call: room.call }, { sort: { createdAt: 1 } }).fetch(),
    [room.call],
  );
  return (
    <Accordion.Item eventKey={room._id}>
      <Accordion.Header>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-room-active-${room._id}`}>
              {recentActivity
                ? `Recent activity in the last ${
                    RECENT_ACTIVITY_TIME_WINDOW_MS / 1000
                  } seconds`
                : "No recent activity"}
            </Tooltip>
          }
        >
          <FontAwesomeIcon
            icon={recentActivity ? faVolumeUp : faVolumeOff}
            fixedWidth
          />
        </OverlayTrigger>
        <CallDisplay call={room.call} />
      </Accordion.Header>

      <Accordion.Body>
        {!router && (
          <Alert variant="warning">
            <FontAwesomeIcon icon={faExclamationTriangle} /> No router found for
            this room. This will happen transiently when the room record is
            first created, but if it persists, it indicates that the observer on
            the server-side failed to create the router that corresponds to this
            room.
          </Alert>
        )}
        <Row as="dl">
          <Col as="dt" xs={2}>
            Room ID
          </Col>
          <Col as="dd" xs={10}>
            <ClipButton id={`room-id-${room._id}`} text={room._id} />
            <code>{room._id}</code>
          </Col>
          <Col as="dt" xs={2}>
            Created
          </Col>
          <Col as="dd" xs={10}>
            {room.createdAt.toISOString()}
          </Col>
          <Col as="dt" xs={2}>
            Server
          </Col>
          <Col as="dd" xs={10}>
            <ClipButton
              id={`room-routed-server-${room._id}`}
              text={room.routedServer}
            />
            <code>{room.routedServer}</code>
          </Col>
          <Col as="dt" xs={2}>
            Last activity
          </Col>
          <Col as="dd" xs={10}>
            {lastActivity?.toISOString() ?? "Never"}
          </Col>
          {router && <RouterDetails router={router} />}
        </Row>

        <h3>Peers ({peers.length})</h3>

        <Accordion>
          {peers.map((peer) => (
            <Peer key={peer._id} peer={peer} />
          ))}
        </Accordion>
      </Accordion.Body>
    </Accordion.Item>
  );
};

const RoomList = ({ rooms }: { rooms: RoomType[] }) => {
  return (
    <Accordion>
      {rooms.map((room) => (
        <Room key={room._id} room={room} />
      ))}
    </Accordion>
  );
};

const RoomlessPeers = ({ calls }: { calls: string[] }) => {
  // TODO: consider using useFind once fixed upstream
  const peers = useTracker(
    () => Peers.find({ call: { $nin: calls } }).fetch(),
    [calls],
  );

  if (peers.length === 0) {
    return null;
  }

  return (
    <>
      <h2>Roomless Peers</h2>
      <p>
        Peers which have joined a call but that call has not created a room
        (which pins the router to a particular server). This should only occur
        transiently.
      </p>

      <Table hover size="sm">
        <thead>
          <tr>
            <th>Call ID</th>
            <th>User</th>
            <th>Peer ID</th>
            <th>Tab ID</th>
            <th>Server ID</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => {
            return (
              <tr key={p._id}>
                <td>
                  <CallDisplay call={p.call} />
                </td>
                <td>
                  <UserDisplay userId={p.createdBy} />
                </td>
                <td>
                  <ClipButton id={`roomless-peer-${p._id}`} text={p._id} />
                  <code>{p._id}</code>
                </td>
                <td>
                  <ClipButton id={`roomless-peer-tab-${p._id}`} text={p.tab} />
                  <code>{p.tab}</code>
                </td>
                <td>
                  <ClipButton
                    id={`roomless-peer-created-server-${p._id}`}
                    text={p.createdServer}
                  />
                  <code>{p.createdServer}</code>
                </td>
                <td>{p.createdAt.toISOString()}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
};

const ServerTable = ({ servers }: { servers: ServerType[] }) => {
  const roomsByServer = useTracker(() => {
    return groupedBy(Rooms.find().fetch(), (room) => room.routedServer);
  }, []);
  const totalRooms = [...roomsByServer.values()].reduce(
    (acc, roomsOnServer) => {
      return acc + roomsOnServer.length;
    },
    0,
  );
  return (
    <>
      <h2>Servers</h2>

      <Table hover size="sm">
        <thead>
          <tr>
            <th>Server ID</th>
            <th>Hostname</th>
            <th>PID</th>
            <th>Last heartbeat</th>
            <th colSpan={2}>Rooms</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((s) => {
            const roomCount = roomsByServer.get(s._id)?.length ?? 0;
            const roomPercentage =
              totalRooms > 0 ? 100 * (roomCount / totalRooms) : 0;
            return (
              <tr key={s._id}>
                <td>
                  <ClipButton id={`server-id-${s._id}`} text={s._id} />
                  <code>{s._id}</code>
                </td>
                <td>
                  <ClipButton
                    id={`server-hostname-${s._id}`}
                    text={s.hostname}
                  />
                  <code>{s.hostname}</code>
                </td>
                <td>
                  <ClipButton
                    id={`server-pid-${s._id}`}
                    text={s.pid.toString()}
                  />
                  <code>{s.pid}</code>
                </td>
                <td>{s.updatedAt.toISOString()}</td>
                <td width="1%">{roomCount}</td>
                <td>
                  <ProgressBar now={roomPercentage} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
};

const RTCDebugPage = () => {
  const viewerIsAdmin = useTracker(() => isAdmin(Meteor.user()));
  const debugInfoLoading = useSubscribe("mediasoup:debug");
  const loading = debugInfoLoading();

  // TODO: consider using useFind once fixed upstream
  const servers = useTracker(
    () => Servers.find({}, { sort: { hostname: 1, pid: 1 } }).fetch(),
    [],
  );
  // TODO: consider using useFind once fixed upstream
  const rooms = useTracker(
    () => Rooms.find({}, { sort: { createdAt: 1 } }).fetch(),
    [],
  );
  const callIds = useMemo(() => rooms.map((r) => r.call), [rooms]);

  if (!viewerIsAdmin) {
    return (
      <div>
        <p>You must be an admin to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <p>
        This page exists for server admins to examine server WebRTC state for
        all users, for the purposes of debugging issues with calls.
      </p>

      <ServerTable servers={servers} />

      <RoomlessPeers calls={callIds} />

      <h2>Active Calls</h2>

      {rooms.length > 0 ? <RoomList rooms={rooms} /> : <p>No active calls.</p>}
    </div>
  );
};

export default RTCDebugPage;
