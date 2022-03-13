import { Meteor } from 'meteor/meteor';
import { useFind, useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faArrowCircleLeft } from '@fortawesome/free-solid-svg-icons/faArrowCircleLeft';
import { faBroadcastTower } from '@fortawesome/free-solid-svg-icons/faBroadcastTower';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons/faMicrophone';
import { faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons/faMicrophoneSlash';
import { faPause } from '@fortawesome/free-solid-svg-icons/faPause';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { faSlash } from '@fortawesome/free-solid-svg-icons/faSlash';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { faUpload } from '@fortawesome/free-solid-svg-icons/faUpload';
import { faVideo } from '@fortawesome/free-solid-svg-icons/faVideo';
import { faVolumeMute } from '@fortawesome/free-solid-svg-icons/faVolumeMute';
import { faVolumeOff } from '@fortawesome/free-solid-svg-icons/faVolumeOff';
import { faVolumeUp } from '@fortawesome/free-solid-svg-icons/faVolumeUp';
import { faWifi } from '@fortawesome/free-solid-svg-icons/faWifi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useContext, useEffect, useMemo, useState,
} from 'react';
import Accordion from 'react-bootstrap/Accordion';
import AccordionContext from 'react-bootstrap/AccordionContext';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Tooltip from 'react-bootstrap/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { RECENT_ACTIVITY_TIME_WINDOW_MS } from '../../lib/config/webrtc';
import { userIdIsAdmin } from '../../lib/is-admin';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import Servers from '../../lib/models/Servers';
import CallHistories from '../../lib/models/mediasoup/CallHistories';
import ConnectAcks from '../../lib/models/mediasoup/ConnectAcks';
import ConnectRequests from '../../lib/models/mediasoup/ConnectRequests';
import ConsumerAcks from '../../lib/models/mediasoup/ConsumerAcks';
import Consumers from '../../lib/models/mediasoup/Consumers';
import Peers from '../../lib/models/mediasoup/Peers';
import ProducerClients from '../../lib/models/mediasoup/ProducerClients';
import ProducerServers from '../../lib/models/mediasoup/ProducerServers';
import Rooms from '../../lib/models/mediasoup/Rooms';
import Routers from '../../lib/models/mediasoup/Routers';
import TransportRequests from '../../lib/models/mediasoup/TransportRequests';
import TransportStates from '../../lib/models/mediasoup/TransportStates';
import Transports from '../../lib/models/mediasoup/Transports';
import { ServerType } from '../../lib/schemas/Server';
import { ConsumerType } from '../../lib/schemas/mediasoup/Consumer';
import { PeerType } from '../../lib/schemas/mediasoup/Peer';
import { ProducerClientType } from '../../lib/schemas/mediasoup/ProducerClient';
import { RoomType } from '../../lib/schemas/mediasoup/Room';
import { RouterType } from '../../lib/schemas/mediasoup/Router';
import { TransportType } from '../../lib/schemas/mediasoup/Transport';
import Avatar from './Avatar';
import Loading from './Loading';

const ClipButton = ({ text }: { text: string }) => (
  <>
    <CopyToClipboard text={text}>
      <Button variant="secondary" aria-label="Copy" size="sm"><FontAwesomeIcon icon={faCopy} /></Button>
    </CopyToClipboard>
    {' '}
  </>
);

const CallDisplay = ({ call }: { call: string }) => {
  const puzzle = useTracker(() => Puzzles.findOne(call), [call]);

  if (!puzzle) {
    return (
      <>
        <ClipButton text={call} />
        <code>
          {call}
        </code>
      </>
    );
  }

  return (
    <>
      <Link to={`/hunts/${puzzle.hunt}/puzzles/${call}`} target="_blank">
        <FontAwesomeIcon icon={faPuzzlePiece} />
      </Link>
      {' '}
      {puzzle.title}
      {' ('}
      <ClipButton text={call} />
      <code>{call}</code>
      )
    </>
  );
};

const UserDisplay = ({ userId }: { userId: string }) => {
  const user = useTracker(() => MeteorUsers.findOne(userId), [userId]);
  return (
    <Link to={`/users/${userId}`} target="_blank">
      <Avatar {...user} size={40} inline />
      {' '}
      {user?.displayName || 'Unknown'}
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

const StyledJSONDisplayPre = styled.pre<{ collapsed?: boolean }>`
  margin-bottom: 0;
  ${({ collapsed }) => collapsed && css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
`;

const JSONDisplay = ({ json }: { json: string }) => {
  const [collapse, setCollapse] = useState(true);

  return (
    <StyledJSONDisplayContainer fluid>
      <Row>
        <StyledJSONDisplayButtonCol xs="auto">
          <ClipButton text={json} />
          <Button variant="link" onClick={() => setCollapse(!collapse)}>
            <FontAwesomeIcon icon={collapse ? faCaretRight : faCaretDown} />
          </Button>
        </StyledJSONDisplayButtonCol>
        <StyledJSONDisplayTextCol xs={11}>
          {collapse ? (
            <StyledJSONDisplayPre collapsed className="text-truncate">
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

const StyledToggleButton = styled(FontAwesomeIcon)`
  && {
    width: 1.25rem;
    margin-right: 0.25rem;
  }
`;

const Producer = ({ producer }: { producer: ProducerClientType }) => {
  const currentProducer = useContext(AccordionContext);
  const active = currentProducer === producer._id;

  const producerServer = useTracker(() => (
    ProducerServers.findOne({ producerClient: producer._id })
  ), [producer._id]);

  const [statusTooltip, statusIcon] = useMemo(() => {
    if (!producerServer) {
      return ['Connecting', <FontAwesomeIcon icon={faSpinner} spin fixedWidth />];
    } else if (producer.paused) {
      return ['Paused', <FontAwesomeIcon icon={faPause} fixedWidth />];
    } else {
      return ['Broadcasting', <FontAwesomeIcon icon={faBroadcastTower} fixedWidth />];
    }
  }, [producer.paused, producerServer]);

  return (
    <Card>
      <Accordion.Toggle as={Card.Header} eventKey={producer._id}>
        <StyledToggleButton icon={active ? faCaretDown : faCaretRight} />
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-producer-kind-${producer._id}`}>
              {producer.kind === 'audio' ? 'Audio' : 'Video'}
            </Tooltip>
          )}
        >
          <FontAwesomeIcon icon={producer.kind === 'audio' ? faMicrophone : faVideo} fixedWidth />
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-producer-status-${producer._id}`}>
              {statusTooltip}
            </Tooltip>
          )}
        >
          {statusIcon}
        </OverlayTrigger>
        {' ('}
        <ClipButton text={producer._id} />
        <code>{producer._id}</code>
        )
      </Accordion.Toggle>

      <Accordion.Collapse eventKey={producer._id}>
        <Card.Body>
          {!producerServer && (
            <Alert variant="warning">
              <p>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {' '}
                Producer has not been acknowledged by the Mediasoup server. This can happen
                transiently when the producer is being created, but if it persists, it indicates
                a problem.
              </p>
            </Alert>
          )}

          <Row as="dl">
            {producerServer && (
              <>
                <Col as="dt" xs={2}>Producer ID (Meteor server-side)</Col>
                <Col as="dd" xs={10}>
                  <ClipButton text={producerServer._id} />
                  <code>{producerServer._id}</code>
                </Col>
                <Col as="dt" xs={2}>Producer ID (Mediasoup)</Col>
                <Col as="dd" xs={10}>
                  <ClipButton text={producerServer.producerId} />
                  <code>{producerServer.producerId}</code>
                </Col>
              </>
            )}
            <Col as="dt" xs={2}>Track ID (client-side)</Col>
            <Col as="dd" xs={10}>
              <ClipButton text={producer.trackId} />
              <code>{producer.trackId}</code>
            </Col>
            <Col as="dt" xs={2}>RTP parameters</Col>
            <Col as="dd" xs={10}>
              <JSONDisplay json={producer.rtpParameters} />
            </Col>
          </Row>
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
};

const Consumer = ({ consumer }: { consumer: ConsumerType }) => {
  const currentConsumer = useContext(AccordionContext);
  const active = currentConsumer === consumer._id;

  const consumerAcked = useTracker(() => (
    !!ConsumerAcks.findOne({ consumer: consumer._id })
  ), [consumer._id]);

  const [statusTooltip, statusIcon] = useMemo(() => {
    if (!consumerAcked) {
      return ['Connecting', <FontAwesomeIcon icon={faSpinner} spin fixedWidth />];
    } else if (consumer.paused) {
      return ['Paused', <FontAwesomeIcon icon={faPause} fixedWidth />];
    } else {
      return ['Active', <FontAwesomeIcon icon={faPlay} fixedWidth />];
    }
  }, [consumer.paused, consumerAcked]);

  const producerPeer = useTracker(() => (
    Peers.findOne(consumer.producerPeer)
  ), [consumer.producerPeer]);

  return (
    <Card>
      <Accordion.Toggle as={Card.Header} eventKey={consumer._id}>
        <StyledToggleButton icon={active ? faCaretDown : faCaretRight} />
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-consumer-kind-${consumer._id}`}>
              {consumer.kind === 'audio' ? 'Audio' : 'Video'}
            </Tooltip>
          )}
        >
          <FontAwesomeIcon icon={consumer.kind === 'audio' ? faMicrophone : faVideo} fixedWidth />
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-consumer-status-${consumer._id}`}>
              {statusTooltip}
            </Tooltip>
          )}
        >
          {statusIcon}
        </OverlayTrigger>
        {' ('}
        <ClipButton text={consumer._id} />
        <code>{consumer._id}</code>
        {') '}
        <FontAwesomeIcon icon={faArrowCircleLeft} fixedWidth />
        {producerPeer && <UserDisplay userId={producerPeer?.createdBy} />}
        {' ('}
        <ClipButton text={consumer.producerPeer} />
        <code>{consumer.producerPeer}</code>
        )
      </Accordion.Toggle>

      <Accordion.Collapse eventKey={consumer._id}>
        <Card.Body>
          {!consumerAcked && (
            <Alert variant="warning">
              <p>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {' '}
                Client has not acknowledged creation of the consumer. This can happen transiently
                but if it persists, it indicates that the client is not creating the local copy of
                the consumer.
              </p>
            </Alert>
          )}

          <Row as="dl">
            <Col as="dt" xs={2}>Consumer ID (Mediasoup)</Col>
            <Col as="dd" xs={10}>
              <ClipButton text={consumer.consumerId} />
              <code>{consumer.consumerId}</code>
            </Col>
            <Col as="dt" xs={2}>RTP parameters</Col>
            <Col as="dd" xs={10}>
              <JSONDisplay json={consumer.rtpParameters} />
            </Col>
          </Row>
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
};

const Transport = ({ transport }: { transport: TransportType }) => {
  const currentTransport = useContext(AccordionContext);
  const active = currentTransport === transport._id;

  const connectionParams = useTracker(() => (
    ConnectRequests.findOne({ transport: transport._id })
  ), [transport._id]);
  const connectionStarted = !!connectionParams;
  const connectionCompleted = useTracker(() => (
    !!ConnectAcks.findOne({ transport: transport._id })
  ), [transport._id]);

  const transportState = useTracker(() => (
    TransportStates.findOne({ transportId: transport.transportId })
  ), [transport.transportId]);

  const producers = useFind(() => (
    ProducerClients.find({ transport: transport._id }, { sort: { createdAt: 1 } })
  ), [transport._id]);

  const consumers = useFind(() => (
    Consumers.find({ transportId: transport.transportId }, { sort: { createdAt: 1 } })
  ), [transport.transportId]);

  const [statusTooltip, statusIcon] = useMemo(() => {
    if (connectionCompleted) {
      return ['Connected', <FontAwesomeIcon icon={faWifi} fixedWidth />];
    } else if (connectionStarted) {
      return ['Connecting', <FontAwesomeIcon icon={faSpinner} fixedWidth spin />];
    } else {
      return ['Not connected', (
        <span className="fa-layers fa-fw">
          <FontAwesomeIcon icon={faWifi} fixedWidth />
          <FontAwesomeIcon icon={faSlash} fixedWidth />
        </span>
      )];
    }
  }, [connectionCompleted, connectionStarted]);

  const [directionIcon, directionTooltip] = useMemo(() => {
    if (transport.direction === 'send') {
      return [faUpload, 'Send'];
    } else {
      return [faDownload, 'Receive'];
    }
  }, [transport.direction]);

  return (
    <Card>
      <Accordion.Toggle as={Card.Header} eventKey={transport._id}>
        <StyledToggleButton icon={active ? faCaretDown : faCaretRight} />
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-transport-status-${transport._id}`}>
              {statusTooltip}
            </Tooltip>
          )}
        >
          {statusIcon}
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-transport-direction-${transport._id}`}>
              {directionTooltip}
            </Tooltip>
          )}
        >
          <FontAwesomeIcon icon={directionIcon} fixedWidth />
        </OverlayTrigger>
        {' ('}
        <ClipButton text={transport._id} />
        <code>{transport._id}</code>
        )
      </Accordion.Toggle>
      <Accordion.Collapse eventKey={transport._id}>
        <Card.Body>
          {connectionStarted && !connectionCompleted && (
            <Alert variant="warning">
              <p>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {' '}
                The client has initiated a connection but the server has not acknowledged it yet.
                This will happen transiently, but if it sticks around, it indicates a problem with
                the connection handshake.
              </p>
            </Alert>
          )}

          <Row as="dl">
            <Col as="dt" xs={2}>Transport ID (Mediasoup)</Col>
            <Col as="dd" xs={10}>
              <ClipButton text={transport.transportId} />
              <code>{transport.transportId}</code>
            </Col>
            <Col as="dt" xs={2}>ICE Parameters</Col>
            <Col as="dd" xs={10}>
              <JSONDisplay json={transport.iceParameters} />
            </Col>
            <Col as="dt" xs={2}>ICE Candidates</Col>
            <Col as="dd" xs={10}>
              <JSONDisplay json={transport.iceCandidates} />
            </Col>
            <Col as="dt" xs={2}>Server DTLS Parameters</Col>
            <Col as="dd" xs={10}>
              <JSONDisplay json={transport.dtlsParameters} />
            </Col>
            {connectionParams && (
              <>
                <Col as="dt" xs={2}>Client DTLS Parameters</Col>
                <Col as="dd" xs={10}>
                  <JSONDisplay json={connectionParams.dtlsParameters} />
                </Col>
              </>
            )}
            {transportState && (
              <>
                <Col as="dt" xs={2}>ICE State</Col>
                <Col as="dd" xs={10}>
                  <code>{transportState.iceState || 'undefined'}</code>
                </Col>
                <Col as="dt" xs={2}>ICE Selected Tuple</Col>
                <Col as="dd" xs={10}>
                  {transportState.iceSelectedTuple ? (
                    <JSONDisplay json={transportState.iceSelectedTuple} />
                  ) : (
                    <code>undefined</code>
                  )}
                </Col>
                <Col as="dt" xs={2}>DTLS State</Col>
                <Col as="dd" xs={10}>
                  <code>{transportState.dtlsState || 'undefined'}</code>
                </Col>
              </>
            )}
          </Row>

          {producers.length > 0 && (
            <>
              <h5>
                Producers (
                {producers.length}
                )
              </h5>

              <Accordion>
                {producers.map((p) => <Producer key={p._id} producer={p} />)}
              </Accordion>
            </>
          )}

          {consumers.length > 0 && (
            <>
              <h5>
                Consumers (
                {consumers.length}
                )
              </h5>

              <Accordion>
                {consumers.map((c) => <Consumer key={c._id} consumer={c} />)}
              </Accordion>
            </>
          )}
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
};

const Peer = ({ peer }: { peer: PeerType }) => {
  const currentPeer = useContext(AccordionContext);
  const active = currentPeer === peer._id;

  const transportRequests = useFind(() => (
    TransportRequests.find({ peer: peer._id }, { sort: { createdAt: 1 } })
  ), [peer._id]);
  const transports = useFind(() => (
    Transports.find({ peer: peer._id }, { sort: { createdAt: 1 } })
  ), [peer._id]);
  const producerCount = useTracker(() => (
    ProducerClients.find({ peer: peer._id }).count()
  ), [peer._id]);
  const consumerCount = useTracker(() => (
    Consumers.find({ peer: peer._id }).count()
  ), [peer._id]);

  return (
    <Card>
      <Accordion.Toggle as={Card.Header} eventKey={peer._id}>
        <StyledToggleButton icon={active ? faCaretDown : faCaretRight} />
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-peer-muted-${peer._id}`}>
              {peer.muted ? 'Muted' : 'Unmuted'}
            </Tooltip>
          )}
        >
          <FontAwesomeIcon icon={peer.muted ? faMicrophoneSlash : faMicrophone} fixedWidth />
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-peer-deafened-${peer._id}`}>
              {peer.deafened ? 'Deafened' : 'Undeafened'}
            </Tooltip>
          )}
        >
          <FontAwesomeIcon icon={peer.deafened ? faVolumeMute : faVolumeUp} fixedWidth />
        </OverlayTrigger>
        <UserDisplay userId={peer.createdBy} />
        {' ('}
        <ClipButton text={peer._id} />
        <code>{peer._id}</code>
        )
      </Accordion.Toggle>
      <Accordion.Collapse eventKey={peer._id}>
        <Card.Body>
          {transportRequests.length === 0 && (
            <Alert variant="warning">
              <p>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {' '}
                This peer has no transport requests. This will happen transiently when a peer first
                connects, but if it sticks around, it indicates that the client got stuck in the
                middle of the handshake.
              </p>
            </Alert>
          )}
          {transportRequests.length > 1 && (
            <Alert variant="warning">
              <p>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {' '}
                This peer has multiple transport requests. It shouldn&apos;t be possible for one
                peer to subscribe to
                {' '}
                <code>mediasoup:transports</code>
                {' '}
                more than once, so this is a likely bug or leak. We&apos;re only showing the RTP
                capabilities for the first one.
              </p>
              <p>The complete list of IDs is:</p>
              <ul>
                {transportRequests.map(({ _id: id }) => (
                  <li key={id}>
                    <ClipButton text={id} />
                    <code>{id}</code>
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          <Row as="dl">
            <Col as="dt" xs={2}>Meteor Server</Col>
            <Col as="dd" xs={10}>
              <ClipButton text={peer.createdServer} />
              <code>{peer.createdServer}</code>
            </Col>
            <Col as="dt" xs={2}>Tab</Col>
            <Col as="dd" xs={10}>
              <ClipButton text={peer.tab} />
              <code>{peer.tab}</code>
            </Col>
            {transportRequests.length > 0 && (
              <>
                <Col as="dt" xs={2}>RTP capabilities</Col>
                <Col as="dd" xs={10}>
                  <JSONDisplay json={transportRequests[0].rtpCapabilities} />
                </Col>
              </>
            )}
          </Row>

          {transports.length > 0 && (
            <>
              <h4>
                Transports (
                {transports.length}
                {', '}
                {producerCount}
                {' producers, '}
                {consumerCount}
                {' consumers)'}
              </h4>

              <Accordion>
                {transports.map((t) => <Transport key={t._id} transport={t} />)}
              </Accordion>
            </>
          )}
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
};

const RouterDetails = ({ router }: { router: RouterType }) => {
  return (
    <>
      <Col as="dt" xs={2}>Router ID (Meteor)</Col>
      <Col as="dd" xs={10}>
        <ClipButton text={router._id} />
        <code>{router._id}</code>
      </Col>
      <Col as="dt" xs={2}>Router ID (Mediasoup)</Col>
      <Col as="dd" xs={10}>
        <ClipButton text={router.routerId} />
        <code>{router.routerId}</code>
      </Col>
      <Col as="dt" xs={2}>RTP capabilities</Col>
      <Col as="dd" xs={10}>
        <JSONDisplay json={router.rtpCapabilities} />
      </Col>
    </>
  );
};

const Room = ({ room }: { room: RoomType }) => {
  const currentRoom = useContext(AccordionContext);
  const active = currentRoom === room._id;
  const router = useTracker(() => Routers.findOne({ call: room.call }), [room.call]);
  const lastActivity = useTracker(() => (
    CallHistories.findOne({ call: room.call })?.lastActivity
  ), [room.call]);
  const [recentActivity, setRecentActivity] = useState<boolean>(false);
  useEffect(() => {
    let timeout: number | undefined;
    const lastActivityMs = lastActivity?.getTime() ?? 0;
    const recent = Date.now() - lastActivityMs < RECENT_ACTIVITY_TIME_WINDOW_MS;
    setRecentActivity(recent);
    if (recent) {
      timeout = window.setTimeout(() => setRecentActivity(false), RECENT_ACTIVITY_TIME_WINDOW_MS);
    }
    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [lastActivity]);
  const peers = useFind(() => (
    Peers.find({ call: room.call }, { sort: { createdAt: 1 } })
  ), [room.call]);
  return (
    <Card>
      <Accordion.Toggle as={Card.Header} eventKey={room._id}>
        <StyledToggleButton icon={active ? faCaretDown : faCaretRight} />
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`tooltip-room-active-${room._id}`}>
              {recentActivity ? `Recent activity in the last ${RECENT_ACTIVITY_TIME_WINDOW_MS / 1000} seconds` : 'No recent activity'}
            </Tooltip>
          )}
        >
          <FontAwesomeIcon icon={recentActivity ? faVolumeUp : faVolumeOff} fixedWidth />
        </OverlayTrigger>
        <CallDisplay call={room.call} />
      </Accordion.Toggle>

      <Accordion.Collapse eventKey={room._id}>
        <Card.Body>
          {!router && (
            <Alert variant="warning">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {' '}
              No router found for this room. This will happen transiently when the room record is
              first created, but if it persists, it indicates that the observer on the server-side
              failed to create the router that corresponds to this room.
            </Alert>
          )}
          <Row as="dl">
            <Col as="dt" xs={2}>Room ID</Col>
            <Col as="dd" xs={10}>
              <ClipButton text={room._id} />
              <code>{room._id}</code>
            </Col>
            <Col as="dt" xs={2}>Created</Col>
            <Col as="dd" xs={10}>
              {room.createdAt.toISOString()}
            </Col>
            <Col as="dt" xs={2}>Server</Col>
            <Col as="dd" xs={10}>
              <ClipButton text={room.routedServer} />
              <code>{room.routedServer}</code>
            </Col>
            <Col as="dt" xs={2}>Last activity</Col>
            <Col as="dd" xs={10}>
              {lastActivity?.toISOString() ?? 'Never'}
            </Col>
            {router && <RouterDetails router={router} />}
          </Row>

          <h3>
            Peers (
            {peers.length}
            )
          </h3>

          <Accordion>
            {peers.map((peer) => <Peer key={peer._id} peer={peer} />)}
          </Accordion>
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
};

const RoomList = ({ rooms }: { rooms: RoomType[] }) => {
  return (
    <Accordion>
      {rooms.map((room) => <Room key={room._id} room={room} />)}
    </Accordion>
  );
};

const RoomlessPeers = ({ calls }: { calls: string[] }) => {
  const peers = useFind(() => Peers.find({ call: { $nin: calls } }), [calls]);

  if (peers.length === 0) {
    return null;
  }

  return (
    <>
      <h2>Roomless Peers</h2>
      <p>
        Peers which have joined a call but that call has not created a room (which pins the router
        to a particular server). This should only occur transiently.
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
                <td><CallDisplay call={p.call} /></td>
                <td><UserDisplay userId={p.createdBy} /></td>
                <td>
                  <ClipButton text={p._id} />
                  <code>{p._id}</code>
                </td>
                <td>
                  <ClipButton text={p.tab} />
                  <code>{p.tab}</code>
                </td>
                <td>
                  <ClipButton text={p.createdServer} />
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
  const countByServer = useTracker(() => _.countBy(Rooms.find().fetch(), 'routedServer'), []);
  const totalRooms = Object.values(countByServer).reduce((a, b) => a + b, 0);
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
            const roomCount = countByServer[s._id] || 0;
            const roomPercentage = totalRooms > 0 ? 100 * (roomCount / totalRooms) : 0;
            return (
              <tr key={s._id}>
                <td>
                  <ClipButton text={s._id} />
                  <code>{s._id}</code>
                </td>
                <td>
                  <ClipButton text={s.hostname} />
                  <code>{s.hostname}</code>
                </td>
                <td>
                  <ClipButton text={s.pid.toString()} />
                  <code>{s.pid}</code>
                </td>
                <td>{s.updatedAt.toISOString()}</td>
                <td width="1%">{roomCount}</td>
                <td><ProgressBar now={roomPercentage} /></td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
};

const RTCDebugPage = () => {
  const viewerIsAdmin = useTracker(() => userIdIsAdmin(Meteor.userId()));
  const debugInfoLoading = useSubscribe('mediasoup:debug');
  const puzzlesLoading = useSubscribe('mongo.puzzles');
  const loading =
    debugInfoLoading() ||
    puzzlesLoading();

  const servers = useFind(() => Servers.find({}, { sort: { hostname: 1, pid: 1 } }), []);
  const rooms = useFind(() => Rooms.find({}, { sort: { createdAt: 1 } }));
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
