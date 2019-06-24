import { SubsCache } from 'meteor/ccorcos:subs-cache';

export default new SubsCache({ cacheLimit: -1, expireAfter: 1 });
