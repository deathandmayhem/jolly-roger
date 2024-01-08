import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { mediasoupProducerId: string; paused: boolean },
  void
>("Mediasoup.ProducerClients.methods.setPaused");
