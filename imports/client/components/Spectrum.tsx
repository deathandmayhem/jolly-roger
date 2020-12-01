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
}

// How many milliseconds to ensure have passed before we do expensive
// repainting work again.
const THROTTLE_MAX_FPS = 30;
const THROTTLE_MIN_MSEC_ELAPSED = 1000 / THROTTLE_MAX_FPS;

class Spectrum extends React.Component<SpectrumProps> {
  private canvasRef: React.RefObject<HTMLCanvasElement>;

  private analyserNode: AnalyserNode;

  private bufferLength: number;

  private analyserBuffer: Uint8Array;

  private periodicHandle: number | undefined;

  private lastPainted: number;

  constructor(props: SpectrumProps) {
    super(props);

    this.canvasRef = React.createRef();
    this.analyserNode = this.props.audioContext.createAnalyser();
    this.analyserNode.fftSize = 32;
    this.analyserNode.smoothingTimeConstant = 0.4;
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.analyserBuffer = new Uint8Array(this.bufferLength);
    this.lastPainted = 0;
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

    // Throttle: only do work if THROTTLE_MIN_MSEC_ELAPSED have passed since
    // the last time we did work.
    if (this.lastPainted + THROTTLE_MIN_MSEC_ELAPSED > time) {
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
        // canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        // canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        const barWidth = (WIDTH / (this.bufferLength / 2));
        let barHeight;
        let x = 0;
        for (let i = 0; i < (this.bufferLength / 2); i++) {
          barHeight = (this.analyserBuffer[i] * HEIGHT) / 255;
          const greenness = this.analyserBuffer[i] + 100 > 255 ? 255 : this.analyserBuffer[i] + 100;
          canvasCtx.fillStyle = `rgb(50,${greenness},50)`;
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
