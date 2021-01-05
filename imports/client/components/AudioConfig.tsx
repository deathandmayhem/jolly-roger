import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import FormCheck from 'react-bootstrap/FormCheck';
import FormGroup from 'react-bootstrap/FormGroup';
import Spectrum from './Spectrum';

interface AudioConfigProps {
}

enum AudioConfigStatus {
  IDLE = 'idle',
  REQUESTING_STREAM = 'requestingstream',
  STREAM_ERROR = 'streamerror',
  STREAMING = 'streaming',
}

interface AudioConfigState {
  status: AudioConfigStatus;
  loopback: boolean;
  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  error: string | undefined;
}

class AudioConfig extends React.Component<AudioConfigProps, AudioConfigState> {
  private audioRef: React.RefObject<HTMLAudioElement>;

  constructor(props: AudioConfigProps) {
    super(props);
    this.state = {
      status: AudioConfigStatus.IDLE,
      loopback: false,
      stream: undefined,
      audioContext: undefined,
      error: undefined,
    };

    this.audioRef = React.createRef();
  }

  onStartButtonClicked = (_e: React.FormEvent) => {
    if (navigator.mediaDevices) {
      this.setState({
        status: AudioConfigStatus.REQUESTING_STREAM,
      });

      const mediaStreamConstraints = {
        audio: {
          echoCancellation: { ideal: true },
          autoGainControl: { ideal: true },
          noiseSuppression: { ideal: true },
          // TODO: opportunistically specify device constraint
        },
      };

      navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(this.gotMediaStream)
        .catch(this.handleMediaStreamError);
    } else {
      this.setState({
        status: AudioConfigStatus.STREAM_ERROR,
        error: 'Couldn\'t get local microphone: browser denies access on non-HTTPS origins',
      });
    }
  };

  onStopButtonClicked = (_e: React.FormEvent) => {
    if (this.state.stream) {
      this.state.stream.getTracks().forEach((t) => t.stop());
    }
    this.setState({
      status: AudioConfigStatus.IDLE,
      stream: undefined,
      loopback: false,
    });
  };

  gotMediaStream = (mediaStream: MediaStream) => {
    // @ts-ignore ts doesn't know about the possible existence of webkitAudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    this.setState({
      status: AudioConfigStatus.STREAMING,
      stream: mediaStream,
      audioContext,
    });

    // Hook up stream to loopback element.  Don't worry, it starts out muted.
    const audio = this.audioRef.current;
    if (audio) {
      audio.srcObject = mediaStream;
    }
  };

  handleMediaStreamError = (e: MediaStreamError) => {
    this.setState({
      status: AudioConfigStatus.STREAM_ERROR,
      error: `Couldn't get local microphone: ${e.message}`,
    });
  };

  toggleLoopback = () => {
    this.setState((oldState) => ({
      loopback: !oldState.loopback,
    }));
  };

  render() {
    return (
      <section className="audio-self-test-section">
        <h2>Audio self-test</h2>

        {this.state.error ? <Alert variant="danger">{this.state.error}</Alert> : null}
        <p>
          You can test your microphone levels here.
        </p>

        <p>
          Click Start, then try speaking a few phrases, and typing for a bit to
          see how loud your environment is.  While we&apos;ve enabled automatic gain
          control, some microphones are more sensitive than others.
          Some rough guidance:
        </p>

        <ul>
          <li>
            When you aren&apos;t speaking, all bars should be below -70dBFS.  If
            they aren&apos;t, consider moving to a quieter location if available.
          </li>
          <li>
            When you are speaking: bars on the left should peak over -60dBFS or
            you&apos;ll probably be somewhat hard to hear, so you may need to
            speak up.
          </li>
          <li>
            If you get louder than -35dBFS or so, you will probably come across
            as quite loud, and it might be polite to either speak in a softer
            tone or reduce your microphone volume.
          </li>
        </ul>

        {this.state.status !== AudioConfigStatus.STREAMING ? (
          <Button variant="secondary" onClick={this.onStartButtonClicked}>
            Start
          </Button>
        ) : (
          <Button variant="secondary" onClick={this.onStopButtonClicked}>
            Stop
          </Button>
        )}

        <p>
          You can check this box to play your microphone output out through
          your speakers, but if you&apos;re not wearing headphones, you&apos;ll likely
          produce feedback.  You have been warned!
        </p>
        <FormGroup controlId="audio-self-test-loopback">
          <FormCheck
            type="checkbox"
            label="Play captured audio"
            checked={this.state.loopback}
            onChange={this.toggleLoopback}
          />
        </FormGroup>

        <div className="audio-self-test">
          <div className="spectrogram-y-axis-labels">
            <div>-30dBFS</div>
            <div>-40dBFS</div>
            <div>-50dBFS</div>
            <div>-60dBFS</div>
            <div>-70dBFS</div>
            <div>-80dBFS</div>
            <div>-90dBFS</div>
            <div>-100dBFS</div>
          </div>
          {this.state.status === AudioConfigStatus.STREAMING ? (
            <Spectrum
              className="audio-self-test-spectrogram"
              width={600}
              height={400}
              audioContext={this.state.audioContext!}
              barCount={128}
              throttleFps={60}
              barFloor={0}
              smoothingTimeConstant={0.7}
              ref={((spectrum) => {
                if (spectrum) {
                  spectrum.connect(this.state.stream!);
                }
              }
              )}
            />
          ) : <div className="audio-self-test-spectrogram" />}
        </div>
        <audio
          ref={this.audioRef}
          className="audio-sink"
          autoPlay
          playsInline
          muted={!this.state.loopback}
        />
      </section>
    );
  }
}

export default AudioConfig;
