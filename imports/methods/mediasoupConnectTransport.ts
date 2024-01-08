import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { transportId: string; dtlsParameters: string },
  void
>("Mediasoup.Transports.methods.connect");
