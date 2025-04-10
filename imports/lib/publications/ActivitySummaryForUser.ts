import TypedPublication from "./TypedPublication";

export default new TypedPublication<{
  userId: string;
  huntIds?: string[];
  excludeCallActivity?: boolean;
  excludeChatMessages?: boolean;
  excludeDocumentActivity?: boolean;
}>("ActivitySummary.publications.forUser");
