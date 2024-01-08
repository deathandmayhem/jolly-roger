import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ peerId: string }, void>(
  "Mediasoup.Peers.methods.ackRemoteMute",
);
