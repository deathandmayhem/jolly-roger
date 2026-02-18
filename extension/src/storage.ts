export interface OptionsData {
  jollyRogerInstance: string;
  apiKey: string;
}

/** Stores extension configuration options. */
class StoredOptions {
  get: () => Promise<OptionsData> = async () => {
    const items = await chrome.storage.sync.get({
      jollyRogerInstance: "",
      apiKey: "",
    });
    return {
      jollyRogerInstance: items.jollyRogerInstance as string,
      apiKey: items.apiKey as string,
    };
  };

  put = async (options: OptionsData) => {
    await chrome.storage.sync.set({
      jollyRogerInstance: options.jollyRogerInstance,
      apiKey: options.apiKey,
    });
  };
}

/** Stores a small list of recently used tags. */
class StoredRecentTags {
  static readonly TAG_COUNT = 5;

  get: () => Promise<string[]> = async () => {
    const items = await chrome.storage.sync.get({
      recentTags: [],
    });
    return items.recentTags as string[];
  };

  put: (tags: string[]) => Promise<string[]> = async (tags) => {
    // Put the newest tags to front, followed by previous tags (filtering out newest ones), then
    // truncate to the TAG_COUNT limit.
    const newTags = tags
      .concat((await this.get()).filter((tag) => !tags.includes(tag)))
      .slice(0, StoredRecentTags.TAG_COUNT);
    await chrome.storage.sync.set({
      recentTags: newTags,
    });
    return newTags;
  };
}

/** Store the most recently selected hunt. */
class StoredSelectedHuntId {
  get: () => Promise<string> = async () => {
    const items = await chrome.storage.sync.get({
      selectedHuntId: "",
    });
    return items.selectedHuntId as string;
  };

  put = async (huntId: string) => {
    await chrome.storage.sync.set({
      selectedHuntId: huntId,
    });
  };
}

const storedOptions = new StoredOptions();
const storedRecentTags = new StoredRecentTags();
const storedSelectedHuntId = new StoredSelectedHuntId();

export { storedOptions, storedRecentTags, storedSelectedHuntId };
