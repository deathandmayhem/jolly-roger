import TypedMethod from './TypedMethod';

export default new TypedMethod<{ consumerId: string }, void>(
  'Mediasoup.Consumers.methods.ack'
);
