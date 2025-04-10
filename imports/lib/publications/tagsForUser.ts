import TypedPublication from "./TypedPublication";

export default new TypedPublication<{
  userId: string;
}>("Tags.publications.forUser");
