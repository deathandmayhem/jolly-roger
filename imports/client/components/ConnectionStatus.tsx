import { DDP } from 'meteor/ddp';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Ansible from '../../ansible';

interface WaitingAlertProps {
  retryTime: DDP.DDPStatus['retryTime'];
}

const WaitingAlert = (props: WaitingAlertProps) => {
  const now = Date.now();
  const retryTime = props.retryTime || now;
  const [lastUpdated, setLastUpdated] = useState<number>(now);

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
      We can&apos;t connect to Jolly Roger right now. We&apos;ll try again in
      {' '}
      {timeToRetry}
      s. Your pending changes will be pushed to the server when we reconnect.
      {' '}
      <Button variant="link" onClick={Meteor.reconnect}>retry now</Button>
    </Alert>
  );
};

const ConnectionStatus = () => {
  const meteorStatus: DDP.DDPStatus = useTracker(() => {
    return Meteor.status();
  }, []);

  switch (meteorStatus.status) {
    case 'connecting':
      return (
        <Alert variant="warning">
          Trying to reconnect to Jolly Roger...
        </Alert>
      );
    case 'failed':
      return (
        <Alert variant="danger">
          <strong>Oh no!</strong>
          {' '}
          Unable to connect to Jolly Roger:
          {meteorStatus.reason}
        </Alert>
      );
    case 'waiting': {
      return (
        <WaitingAlert retryTime={meteorStatus.retryTime} />
      );
    }
    case 'offline':
      return (
        <Alert variant="warning">
          <strong>Warning!</strong>
          {' '}
          Currently not connected to Jolly Roger server. Changes will be synced when you
          reconnect.
          <Button variant="link" onClick={Meteor.reconnect}>reconnect now</Button>
        </Alert>
      );
    case 'connected':
      return null;
    default:
      Ansible.warn('Unknown connection status', { state: meteorStatus.status });
      return null;
  }
};

export default ConnectionStatus;
