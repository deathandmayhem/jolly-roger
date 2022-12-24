export default function roundedTime(granularityMilliseconds: number, now = new Date()) {
  return new Date(Math.round(now.getTime() / granularityMilliseconds) * granularityMilliseconds);
}
