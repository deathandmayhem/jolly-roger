import { cachedDBMappings, defaultMappings } from './assets';

export default function lookupUrl(image: string) {
  const mapping = cachedDBMappings.get(image) ?? defaultMappings.get(image);
  return `/asset/${mapping}`;
}
