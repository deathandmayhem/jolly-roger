import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import FormControl from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import GroupCall from './GroupCall';

/* eslint-disable no-console */

interface GroupCallPageProps {
  huntId: string;
  puzzleId: string;
}

interface GroupCallPageState {
  haveStream: boolean;
  volumeLevel: number;
}

class GroupCallPage extends React.Component<GroupCallPageProps, GroupCallPageState> {
  private localVideoRef: React.RefObject<HTMLVideoElement>;

  // @ts-ignore we don't use this programatically, but it's convenient for debugging
  private rawStream: MediaStream | undefined;

  private audioContext: AudioContext | undefined;

  private wrapperStreamSource: MediaStreamAudioSourceNode | undefined;

  private wrapperStreamDestination: MediaStreamAudioDestinationNode | undefined;

  private gainNode: GainNode | undefined;

  private leveledStream: MediaStream | undefined;

  constructor(props: GroupCallPageProps) {
    super(props);
    this.state = {
      haveStream: false,
      volumeLevel: 100,
    };

    this.localVideoRef = React.createRef();
    this.rawStream = undefined;

    // AudioContext is not allowed to start until a user action takes place on
    // the page.  Defer constructing it (and the graph nodes we'd create
    // thereafter) until the "join call" button is clicked.
    this.audioContext = undefined;
    this.wrapperStreamSource = undefined;
    this.wrapperStreamDestination = undefined;
    this.gainNode = undefined;
    this.leveledStream = undefined;
  }

  onGetMediaButtonClicked = () => {
    console.log('getUserMedia');
    const mediaStreamConstraints = {
      audio: true,
      video: true,
    };

    // Do the deferred construction that we can only succeed at after a user
    // gesture (click) has occurred.
    this.audioContext = new AudioContext();
    this.wrapperStreamDestination = this.audioContext.createMediaStreamDestination();
    this.gainNode = this.audioContext.createGain();

    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
      .then(this.gotLocalMediaStream)
      .catch(this.handleLocalMediaStreamError);
  };

  gotLocalMediaStream = (mediaStream: MediaStream) => {
    console.log('gotLocalMediaStream');
    console.log(mediaStream);

    // Save ref and update state.
    this.rawStream = mediaStream;

    // Insert this stream into the node graph.
    this.leveledStream = new MediaStream();
    const rawTracks = mediaStream.getTracks();
    for (let i = 0; i < rawTracks.length; i++) {
      const rawTrack = rawTracks[i];
      if (rawTrack.kind === 'audio') {
        // Chrome doesn't support createMediaStreamTrackSource, so stuff the
        // track in another stream.
        const stubStream = new MediaStream();
        stubStream.addTrack(rawTrack);
        this.wrapperStreamSource = this.audioContext!.createMediaStreamSource(stubStream);

        // Wire up the audio track to the gain node.
        this.wrapperStreamSource.connect(this.gainNode!);

        // Then wire up the output of that gain node to our levels-adjusted track.
        this.gainNode!.connect(this.wrapperStreamDestination!);
        const innerTracks = this.wrapperStreamDestination!.stream.getTracks();
        const leveledAudioTrack = innerTracks[0];

        // Add that track to our post-level-adjustment stream.
        this.leveledStream.addTrack(leveledAudioTrack);
      }

      if (rawTrack.kind === 'video') {
        this.leveledStream.addTrack(rawTrack);
      }
    }

    this.setState({
      haveStream: true,
    });

    // IDK if this is needed
    // this.rawStream.addEventListener('loadedmetadata', this.onVideoMetadataLoaded);

    // Show video monitor element on page.
    const videoNode = this.localVideoRef.current;
    if (videoNode) {
      videoNode.srcObject = this.leveledStream;
    }
  };

  handleLocalMediaStreamError = (e: MediaStreamError) => {
    console.log('handleLocalMediaStreamError');
    console.error(e);
  };

  /*
  onVideoMetadataLoaded = (e: Event) => {
    const video = e.target;
    console.log(`${video.id} videoWidth: ${video.videoWidth}px, ` +
                `videoHeight: ${video.videoHeight}px`);
  };
  */

  onVolumeControlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volumeLevel = Number(e.target.value);
    this.setState({
      volumeLevel,
    });
    this.gainNode!.gain.setValueAtTime(volumeLevel / 100, this.audioContext!.currentTime);
  };

  render() {
    return (
      <div className="rtc-page">
        <h3>Video</h3>
        <div>
          <video ref={this.localVideoRef} autoPlay playsInline muted />
          {this.state.haveStream && (
            <FormGroup controlId="selfVolume">
              <FormLabel>Volume</FormLabel>
              <FormControl type="range" min="0" max="100" step="1" value={this.state.volumeLevel} onChange={this.onVolumeControlChange} />
            </FormGroup>
          )}
        </div>
        <div>
          <button type="button" onClick={this.onGetMediaButtonClicked}>
            Start
          </button>
        </div>
        {this.state.haveStream &&
         this.leveledStream &&
         this.audioContext && (
         <GroupCall
           huntId={this.props.huntId}
           puzzleId={this.props.puzzleId}
           stream={this.leveledStream}
           audioContext={this.audioContext}
         />
        )}
      </div>
    );
  }
}

const crumb = withBreadcrumb({ title: 'Group Call test page', path: '/groupcall' });
const tracker = withTracker((): GroupCallPageProps => {
  // We're not actually using Tracker for anything yet, but maybe we will some
  // day for Settings or something like that.  Leaving it here for editing
  // convenience for now.

  // TODO: filter this down to just those related to a puzzle some day
  const huntId = 'cSB2bWf3BToQ9NBju';
  const puzzleId = 'FSZn66yxnmDyJwAou';

  // TODO: wire up this pubsub
  return {
    huntId,
    puzzleId,
  };
});

export default crumb(tracker(GroupCallPage));
