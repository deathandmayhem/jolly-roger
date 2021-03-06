import React from 'react';

// Note: this is incomplete; I didn't figure out how I wanted to feed a stream
// to the Spectrum component.  I don't love making it a prop, since I really need
// to do stuff on change, to make sure that my WebAudio graph is appropriately updated.
// But I also don't wanna like make it a whole ref and then call methods on it because
// that also feels a bit weird.  Maybe that's the way to go though?

interface SpectrumProps {
  width: number;
  height: number;
  audioContext: AudioContext;
  className: string | undefined;
  barCount?: number;
  throttleFps?: number;
  barFloor?: number;
  smoothingTimeConstant?: number;
}

const DEFAULT_THROTTLE_MAX_FPS = 30;

class Spectrum extends React.Component<SpectrumProps> {
  private canvasRef: React.RefObject<HTMLCanvasElement>;

  private analyserNode: AnalyserNode;

  private bufferLength: number;

  private analyserBuffer: Uint8Array;

  private periodicHandle: number | undefined;

  private lastPainted: number;

  private throttleMinMsecElapsed: number;

  constructor(props: SpectrumProps) {
    super(props);

    this.canvasRef = React.createRef();
    this.analyserNode = props.audioContext.createAnalyser();
    this.analyserNode.fftSize = props.barCount !== undefined ? props.barCount * 2 : 32;
    this.analyserNode.smoothingTimeConstant = (props.smoothingTimeConstant !== undefined ?
      props.smoothingTimeConstant : 0.4);
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.analyserBuffer = new Uint8Array(this.bufferLength);
    this.lastPainted = 0;
    this.throttleMinMsecElapsed = 1000 / (props.throttleFps !== undefined ?
      props.throttleFps : DEFAULT_THROTTLE_MAX_FPS);
  }

  componentWillUnmount() {
    if (this.periodicHandle) {
      window.cancelAnimationFrame(this.periodicHandle);
      this.periodicHandle = undefined;
    }
  }

  connect = (stream: MediaStream) => {
    // This audio element is a workaround for
    // https://bugs.chromium.org/p/chromium/issues/detail?id=933677 wherein
    // audio tracks from a peer connection never deliver data into a WebAudio
    // context unless they are first made the srcObject of some audio or
    // video element.
    const stubAudioElement = document.createElement('audio');
    stubAudioElement.muted = true;
    stubAudioElement.srcObject = stream;
    const wrapperStreamSource = this.props.audioContext.createMediaStreamSource(stream);
    wrapperStreamSource.connect(this.analyserNode);

    // Schedule periodic spectrogram paintings
    this.periodicHandle = window.requestAnimationFrame(this.drawSpectrum);
  };

  drawSpectrum = (time: number) => {
    // request call on next animation frame
    this.periodicHandle = window.requestAnimationFrame(this.drawSpectrum);

    // Throttle: only do work if throttleMinMsecElapsed have passed since
    // the last time we did work.
    if (this.lastPainted + this.throttleMinMsecElapsed > time) {
      return;
    }

    this.lastPainted = time;
    this.analyserNode.getByteFrequencyData(this.analyserBuffer);
    const canvas = this.canvasRef.current;
    if (canvas) {
      const canvasCtx = canvas.getContext('2d');
      if (canvasCtx) {
        const WIDTH = this.props.width;
        const HEIGHT = this.props.height;
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        const barWidth = (WIDTH / (this.bufferLength / 2));
        let x = 0;
        for (let i = 0; i < (this.bufferLength / 2); i++) {
          // minimum bar height reduces some flickering
          const barFloor = this.props.barFloor !== undefined ? this.props.barFloor : 32;
          const barHeight = (Math.max(this.analyserBuffer[i], barFloor) * HEIGHT) / 255;

          // bootstrap blue is rgb(0, 123, 255)
          const redness = this.analyserBuffer[i] - 60 < 0 ?
            0 :
            this.analyserBuffer[i] / 2;
          const greenness = this.analyserBuffer[i] - 60 < 0 ?
            123 :
            123 + (this.analyserBuffer[i] - 123) / 2;
          canvasCtx.fillStyle = `rgb(${redness},${greenness},255)`;
          canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    }
  };

  render() {
    return (
      <canvas
        className={this.props.className}
        width={this.props.width}
        height={this.props.height}
        ref={this.canvasRef}
      />
    );
  }
}

export default Spectrum;
