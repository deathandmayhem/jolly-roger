import type { ChatAttachmentType } from "../lib/models/ChatMessages";
import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    puzzleId: string;
    content: string;
    parentId?: string | null;
    attachments?: ChatAttachmentType[];
  },
  void
>("ChatMessages.methods.send");
