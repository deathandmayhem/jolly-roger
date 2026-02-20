/**
 * Attempt to capture an audio stream, trying the preferred device first and
 * falling back to the system default if it is unavailable.
 */
export default async function getAudioStream(
  preferredDeviceId?: string,
): Promise<MediaStream> {
  const audioConstraints = {
    echoCancellation: { ideal: true },
    autoGainControl: { ideal: true },
    noiseSuppression: { ideal: true },
  };
  if (preferredDeviceId) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { ...audioConstraints, deviceId: { exact: preferredDeviceId } },
      });
    } catch (e) {
      if ((e as Error).name !== "OverconstrainedError") {
        throw e;
      }
    }
  }

  // Try Chrome's "default" pseudo-device, which correctly tracks the OS
  // default. Without this, Chrome may pick the first device instead.
  // This throws OverconstrainedError on Firefox/Safari where "default"
  // doesn't exist, so we fall through to an unconstrained call.
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { ...audioConstraints, deviceId: { exact: "default" } },
    });
  } catch (e) {
    if ((e as Error).name !== "OverconstrainedError") {
      throw e;
    }
  }

  return navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
  });
}
