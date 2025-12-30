import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FormCheck from "react-bootstrap/FormCheck";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import styled from "styled-components";
import Spectrum from "./Spectrum";

enum AudioConfigStatus {
  IDLE = "idle",
  REQUESTING_STREAM = "requestingstream",
  STREAM_ERROR = "streamerror",
  STREAMING = "streaming",
}

export const PREFERRED_AUDIO_DEVICE_STORAGE_KEY = "preferredAudioDevice";

const AudioSelfTest = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: flex-start;
`;

const SpectrogramYAxisLabels = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
`;

const Spectrogram = styled.div`
  position: relative;
  margin: 10px 4px;
  border: 1px solid black;
  width: 600px;
  height: 400px;
`;

const AudioConfig = () => {
  const [status, setStatus] = useState<AudioConfigStatus>(
    AudioConfigStatus.IDLE,
  );
  const [preferredDeviceId, setPreferredDeviceId] = useState<
    string | undefined
  >(() => {
    return (
      localStorage.getItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY) ?? undefined
    );
  });
  const [knownDevices, setKnownDevices] = useState<MediaDeviceInfo[]>([]);
  const [loopback, setLoopback] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const [audioContext, setAudioContext] = useState<AudioContext | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const updateDeviceList: () => void = useCallback(() => {
    void (async () => {
      if (navigator.mediaDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((dev) => dev.kind === "audioinput");
        setKnownDevices(inputs);
      }
    })();
  }, []);

  const onStorageEvent = useCallback((e: StorageEvent) => {
    if (e.key === PREFERRED_AUDIO_DEVICE_STORAGE_KEY) {
      setPreferredDeviceId(e.newValue ?? undefined);
    }
  }, []);

  useEffect(() => {
    // Populate the device list.
    updateDeviceList();
    // Add device change watcher
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener("devicechange", updateDeviceList);
    }
    // Add storage watcher
    window.addEventListener("storage", onStorageEvent);

    return () => {
      // Remove device change watcher
      if (navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          updateDeviceList,
        );
      }
      // Remove storage watcher
      window.removeEventListener("storage", onStorageEvent);
    };
  }, [updateDeviceList, onStorageEvent]);

  const onDefaultDeviceChange: NonNullable<FormControlProps["onChange"]> =
    useCallback((e) => {
      const newPreferredDeviceId = e.target.value;
      // Save preferred input device id to local storage.
      localStorage.setItem(
        PREFERRED_AUDIO_DEVICE_STORAGE_KEY,
        newPreferredDeviceId,
      );
      // Also update the UI.
      setPreferredDeviceId(newPreferredDeviceId);
    }, []);

  const onStartButtonClicked = useCallback(
    (_e: React.FormEvent) => {
      void (async () => {
        if (navigator.mediaDevices) {
          setStatus(AudioConfigStatus.REQUESTING_STREAM);
          const freshPreferredAudioDeviceId =
            localStorage.getItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY) ??
            undefined;
          const mediaStreamConstraints = {
            audio: {
              echoCancellation: { ideal: true },
              autoGainControl: { ideal: true },
              noiseSuppression: { ideal: true },
              deviceId: freshPreferredAudioDeviceId,
            },
          };

          let mediaStream: MediaStream | undefined;
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia(
              mediaStreamConstraints,
            );
          } catch (e) {
            setStatus(AudioConfigStatus.STREAM_ERROR);
            setError(`Couldn't get local microphone: ${(e as Error).message}`);
            return;
          }

          const AudioContext =
            window.AudioContext ||
            (window as { webkitAudioContext?: AudioContext })
              .webkitAudioContext;
          const newAudioContext = new AudioContext();
          // Be sure to set audioContext *before* setting status to STREAMING, lest we try
          // to pass an undefined audioContext to a child component
          setStream(mediaStream);
          setAudioContext(newAudioContext);
          setStatus(AudioConfigStatus.STREAMING);

          // Hook up stream to loopback element.  Don't worry, it starts out muted.
          const audio = audioRef.current;
          if (audio) {
            audio.srcObject = mediaStream;
          }

          // Now that we have been granted a stream from the user, re-request the device
          // list, in case the first time we enumerated, the user agent had not yet
          // given us nonempty labels describing the devices from which to capture.
          // See https://developer.mozilla.org/en-US/docs/Web/API/MediaDeviceInfo/label#value
          // for additional background.
          updateDeviceList();
        } else {
          setStatus(AudioConfigStatus.STREAM_ERROR);
          setError(
            "Couldn't get local microphone: browser denies access on non-HTTPS origins",
          );
        }
      })();
    },
    [updateDeviceList],
  );

  const onStopButtonClicked = useCallback(
    (_e: React.FormEvent) => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setStatus(AudioConfigStatus.IDLE);
      setStream(undefined);
      setLoopback(false);
    },
    [stream],
  );

  const toggleLoopback = useCallback(() => {
    setLoopback((prevLoopback) => !prevLoopback);
  }, []);

  const idPrefix = useId();

  return (
    <section>
      <h2>Audio</h2>

      <FormGroup
        className="mb-3"
        controlId={`${idPrefix}-default-capture-device`}
      >
        <FormLabel>Selected audio input device</FormLabel>
        <FormControl
          as="select"
          onChange={onDefaultDeviceChange}
          value={preferredDeviceId}
        >
          {knownDevices.map((dev) => (
            <option value={dev.deviceId} key={dev.deviceId}>
              {dev.label}
            </option>
          ))}
        </FormControl>
      </FormGroup>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      <p>You can test your microphone levels here.</p>

      <p>
        Click Start, then try speaking a few phrases, and typing for a bit to
        see how loud your environment is. While we&apos;ve enabled automatic
        gain control, some microphones are more sensitive than others. Some
        rough guidance:
      </p>

      <ul>
        <li>
          When you aren&apos;t speaking, all bars should be below -70dBFS. If
          they aren&apos;t, consider moving to a quieter location if available.
        </li>
        <li>
          When you are speaking: bars on the left should peak over -60dBFS or
          you&apos;ll probably be somewhat hard to hear, so you may need to
          speak up.
        </li>
        <li>
          If you get louder than -35dBFS or so, you will probably come across as
          quite loud, and it might be polite to either speak in a softer tone or
          reduce your microphone volume.
        </li>
      </ul>

      {status !== AudioConfigStatus.STREAMING ? (
        <Button variant="secondary" onClick={onStartButtonClicked}>
          Start
        </Button>
      ) : (
        <Button variant="secondary" onClick={onStopButtonClicked}>
          Stop
        </Button>
      )}

      <p>
        You can check this box to play your microphone output out through your
        speakers, but if you&apos;re not wearing headphones, you&apos;ll likely
        produce feedback. You have been warned!
      </p>
      <FormGroup
        className="mb-3"
        controlId={`${idPrefix}-audio-self-test-loopback`}
      >
        <FormCheck
          type="checkbox"
          label="Play captured audio"
          checked={loopback}
          onChange={toggleLoopback}
        />
      </FormGroup>

      <AudioSelfTest>
        <SpectrogramYAxisLabels>
          <div>-30dBFS</div>
          <div>-40dBFS</div>
          <div>-50dBFS</div>
          <div>-60dBFS</div>
          <div>-70dBFS</div>
          <div>-80dBFS</div>
          <div>-90dBFS</div>
          <div>-100dBFS</div>
        </SpectrogramYAxisLabels>
        <Spectrogram>
          {status === AudioConfigStatus.STREAMING && (
            <Spectrum
              width={600}
              height={400}
              audioContext={audioContext!}
              stream={stream!}
              barCount={128}
              throttleFps={60}
              barFloor={0}
              smoothingTimeConstant={0.7}
            />
          )}
        </Spectrogram>
      </AudioSelfTest>
      <audio ref={audioRef} autoPlay muted={!loopback} />
    </section>
  );
};

export default AudioConfig;
