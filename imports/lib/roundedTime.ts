export default function roundedTime(
  granularityMilliseconds: number,
  now = new Date(),
) {
  return new Date(
    Math.floor(now.getTime() / granularityMilliseconds) *
      granularityMilliseconds,
  );
}
