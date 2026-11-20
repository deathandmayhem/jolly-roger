import { Random } from "meteor/random";

// A stable per-tab id that persists across internal navigation and DDP
// reconnects
const tabId = Random.id();

export default tabId;
