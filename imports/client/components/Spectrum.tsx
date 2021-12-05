import React, {
  useCallback, useEffect, useImperativeHandle, useRef,
} from 'react';
import styled from 'styled-components';

// Note: this is incomplete; I didn't figure out how I wanted to feed a stream
// to the Spectrum component.  I don't love making it a prop, since I really need
// to do stuff on change, to make sure that my WebAudio graph is appropriately updated.
// But I also don't wanna like make it a whole ref and then call methods on it because
// that also feels a bit weird.  Maybe that's the way to go though?

const SpectrumCanvas = styled.canvas`
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
`;

interface SpectrumProps {
  width: number;
  height: number;
  audioContext: AudioContext;
  barCount?: number;
  throttleFps?: number;
  barFloor?: number;
  smoothingTimeConstant?: number;
}

const DEFAULT_THROTTLE_MAX_FPS = 30;

export type SpectrumHandle = {
  connect: (stream: MediaStream) => void;
}

const Spectrum = React.forwardRef((
  props: SpectrumProps, forwardedRef: React.Ref<SpectrumHandle>
) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferLength = useRef<number>(0);
  const analyserNode = useRef<AnalyserNode | undefined>(undefined);
  const analyserBuffer = useRef<Uint8Array | undefined>(undefined);
  if (analyserNode.current === undefined) {
    analyserNode.current = props.audioContext.createAnalyser();
    analyserNode.current.fftSize = props.barCount !== undefined ? props.barCount * 2 : 32;
    analyserNode.current.smoothingTimeConstant = (props.smoothingTimeConstant !== undefined ?
      props.smoothingTimeConstant : 0.4);
    bufferLength.current = analyserNode.current.frequencyBinCount;
    analyserBuffer.current = new Uint8Array(bufferLength.current);
  }

  const periodicHandle = useRef<number | undefined>(undefined);
  const lastPainted = useRef<number>(0);
  const throttleMinMsecValue = 1000 / (props.throttleFps !== undefined ?
    props.throttleFps : DEFAULT_THROTTLE_MAX_FPS);
  const throttleMinMsecElapsed = useRef<number>(throttleMinMsecValue);

  useEffect(() => {
    return () => {
      if (periodicHandle.current) {
        window.cancelAnimationFrame(periodicHandle.current);
        periodicHandle.current = undefined;
      }
    };
  }, []);

  const drawSpectrum = useCallback((time: number) => {
    // request call on next animation frame
    periodicHandle.current = window.requestAnimationFrame(drawSpectrum);

    // Throttle: only do work if throttleMinMsecElapsed have passed since
    // the last time we did work.
    if (lastPainted.current + throttleMinMsecElapsed.current > time) {
      return;
    }

    lastPainted.current = time;
    analyserNode.current!.getByteFrequencyData(analyserBuffer.current!);
    const canvas = canvasRef.current;
    if (canvas) {
      const canvasCtx = canvas.getContext('2d');
      if (canvasCtx) {
        const WIDTH = props.width;
        const HEIGHT = props.height;
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        const barWidth = (WIDTH / (bufferLength.current / 2));
        let x = 0;
        for (let i = 0; i < (bufferLength.current / 2); i++) {
          // minimum bar height reduces some flickering
          const barFloor = props.barFloor !== undefined ? props.barFloor : 32;
          const barHeight = (Math.max(analyserBuffer.current![i], barFloor) * HEIGHT) / 255;

          // bootstrap blue is rgb(0, 123, 255)
          const redness = analyserBuffer.current![i] - 60 < 0 ?
            0 :
            analyserBuffer.current![i] / 2;
          const greenness = analyserBuffer.current![i] - 60 < 0 ?
            123 :
            123 + (analyserBuffer.current![i] - 123) / 2;
          canvasCtx.fillStyle = `rgb(${redness},${greenness},255)`;
          canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    }
  }, [props.width, props.height, props.barFloor]);

  const connect = useCallback((stream: MediaStream) => {
    // This audio element is a workaround for
    // https://bugs.chromium.org/p/chromium/issues/detail?id=933677 wherein
    // audio tracks from a peer connection never deliver data into a WebAudio
    // context unless they are first made the srcObject of some audio or
    // video element.
    const stubAudioElement = document.createElement('audio');
    stubAudioElement.muted = true;
    stubAudioElement.srcObject = stream;
    const wrapperStreamSource = props.audioContext.createMediaStreamSource(stream);
    wrapperStreamSource.connect(analyserNode.current!);

    // Schedule periodic spectrogram paintings, if not already running.
    if (!periodicHandle.current) {
      periodicHandle.current = window.requestAnimationFrame(drawSpectrum);
    }
  }, [props.audioContext, drawSpectrum]);

  useImperativeHandle(forwardedRef, () => ({
    connect,
  }));

  return (
    <SpectrumCanvas
      width={props.width}
      height={props.height}
      ref={canvasRef}
    />
  );
});

export default React.memo(Spectrum);
