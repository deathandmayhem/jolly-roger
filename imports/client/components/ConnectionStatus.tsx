import type { DDP } from "meteor/ddp";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import styled from "styled-components";
import Logger from "../../Logger";

const WaitingAlert = ({
  retryTime = Date.now(),
}: {
  retryTime: DDP.DDPStatus["retryTime"];
}) => {
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastUpdated(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const timeToRetry = Math.ceil((retryTime - lastUpdated) / 1000);
  return (
    <Alert variant="warning">
      We can&apos;t connect to Jolly Roger right now. We&apos;ll try again in{" "}
      {timeToRetry}
      s. Your pending changes will be pushed to the server when we reconnect.{" "}
      <Button variant="link" onClick={Meteor.reconnect}>
        retry now
      </Button>
    </Alert>
  );
};

const ConnectionStatusContainer = styled.div`
  position: fixed;
  top: 50px;
  left: 0;
  right: 0;

  /* This z-index is chosen to be higher than any z-index used by Bootstrap
     (which are all in the 1000-1100 range) */
  z-index: 10000;
`;

const ConnectionStatus = () => {
  const meteorStatus: DDP.DDPStatus = useTracker(() => {
    return Meteor.status();
  }, []);

  switch (meteorStatus.status) {
    case "connecting":
      return (
        <ConnectionStatusContainer>
          <Alert variant="warning">Trying to reconnect to Jolly Roger...</Alert>
        </ConnectionStatusContainer>
      );
    case "failed":
      return (
        <ConnectionStatusContainer>
          <Alert variant="danger">
            <strong>Oh no!</strong> Unable to connect to Jolly Roger:
            {meteorStatus.reason}
          </Alert>
        </ConnectionStatusContainer>
      );
    case "waiting": {
      return (
        <ConnectionStatusContainer>
          <WaitingAlert retryTime={meteorStatus.retryTime} />
        </ConnectionStatusContainer>
      );
    }
    case "offline":
      return (
        <ConnectionStatusContainer>
          <Alert variant="warning">
            <strong>Warning!</strong> Currently not connected to Jolly Roger
            server. Changes will be synced when you reconnect.
            <Button variant="link" onClick={Meteor.reconnect}>
              reconnect now
            </Button>
          </Alert>
        </ConnectionStatusContainer>
      );
    case "connected":
      return null;
    default:
      Logger.warn("Unknown connection status", {
        error: new Error("Unknown connection status"),
        status: meteorStatus.status,
        reason: meteorStatus.reason,
      });
      return null;
  }
};

export default ConnectionStatus;
