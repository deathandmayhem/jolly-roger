import React, { useCallback, useEffect, useRef } from "react";
import styled from "styled-components";

const SpectrumCanvas = styled.canvas`
  position: absolute;
  inset: 0;
`;

const DEFAULT_THROTTLE_MAX_FPS = 30;

const Spectrum = ({
  width,
  height,
  audioContext,
  stream,
  barCount,
  throttleFps,
  smoothingTimeConstant,
  // minimum bar height reduces some flickering
  barFloor = 32,
}: {
  width: number;
  height: number;
  audioContext: AudioContext;
  stream: MediaStream;
  barCount?: number;
  throttleFps?: number;
  barFloor?: number;
  smoothingTimeConstant?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferLength = useRef<number>(0);
  const analyserNode = useRef<AnalyserNode | undefined>(undefined);
  const analyserBuffer = useRef<Uint8Array<ArrayBuffer> | undefined>(undefined);
  if (analyserNode.current === undefined) {
    analyserNode.current = audioContext.createAnalyser();
    analyserNode.current.fftSize = barCount !== undefined ? barCount * 2 : 32;
    analyserNode.current.smoothingTimeConstant =
      smoothingTimeConstant !== undefined ? smoothingTimeConstant : 0.4;
    bufferLength.current = analyserNode.current.frequencyBinCount;
    analyserBuffer.current = new Uint8Array(bufferLength.current);
  }

  const periodicHandle = useRef<number | undefined>(undefined);
  const lastPainted = useRef<number>(0);
  const throttleMinMsecValue =
    1000 / (throttleFps !== undefined ? throttleFps : DEFAULT_THROTTLE_MAX_FPS);
  const throttleMinMsecElapsed = useRef<number>(throttleMinMsecValue);

  useEffect(() => {
    return () => {
      if (periodicHandle.current) {
        window.cancelAnimationFrame(periodicHandle.current);
        periodicHandle.current = undefined;
      }
    };
  }, []);

  const drawSpectrum = useCallback(
    (time: number) => {
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
        const canvasCtx = canvas.getContext("2d");
        if (canvasCtx) {
          const WIDTH = width;
          const HEIGHT = height;
          canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
          const barWidth = Math.floor((WIDTH - 4) / (bufferLength.current / 2));
          let x = 2;
          for (let i = 0; i < bufferLength.current / 2; i++) {
            const currentAmplitude = analyserBuffer.current![i]!;
            // minimum bar height reduces some flickering
            const barHeight =
              (Math.max(currentAmplitude, barFloor) * HEIGHT) / 255;

            // bootstrap blue is rgb(0, 123, 255)
            const redness =
              currentAmplitude - 60 < 0 ? 0 : currentAmplitude / 2;
            const greenness =
              currentAmplitude - 60 < 0
                ? 123
                : 123 + (currentAmplitude - 123) / 2;
            canvasCtx.fillStyle = `rgb(${redness},${greenness},255)`;
            canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        }
      }
    },
    [width, height, barFloor],
  );

  useEffect(() => {
    const wrapperStreamSource = audioContext.createMediaStreamSource(stream);
    wrapperStreamSource.connect(analyserNode.current!);

    // Schedule periodic spectrogram paintings, if not already running.
    if (!periodicHandle.current) {
      periodicHandle.current = window.requestAnimationFrame(drawSpectrum);
    }
    return () => {
      wrapperStreamSource.disconnect();
    };
  }, [audioContext, stream, drawSpectrum]);

  return <SpectrumCanvas width={width} height={height} ref={canvasRef} />;
};

export default React.memo(Spectrum);
