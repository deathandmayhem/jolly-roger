import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import GroupCall from './GroupCall';

interface GroupCallPageProps {
  huntId: string;
  puzzleId: string;
}

interface GroupCallPageState {
  haveStream: boolean;
}

class GroupCallPage extends React.Component<GroupCallPageProps, GroupCallPageState> {
  private localVideoRef: React.RefObject<HTMLVideoElement>;

  private localVideoStream: MediaStream | undefined;

  constructor(props: GroupCallPageProps) {
    super(props);
    this.state = {
      haveStream: false,
    };

    this.localVideoRef = React.createRef();
    this.localVideoStream = undefined;

    console.log('constructor done');
  }

  onGetMediaButtonClicked = () => {
    console.log('getUserMedia');
    const mediaStreamConstraints = {
      audio: true,
      video: true,
    };
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
      .then(this.gotLocalMediaStream)
      .catch(this.handleLocalMediaStreamError);
  };

  gotLocalMediaStream = (mediaStream: MediaStream) => {
    console.log('gotLocalMediaStream');
    console.log(mediaStream);

    // Save ref and update state.
    this.localVideoStream = mediaStream;
    this.setState({
      haveStream: true,
    });

    // IDK if this is needed
    // this.localVideoStream.addEventListener('loadedmetadata', this.onVideoMetadataLoaded);

    // Show video monitor element on page.
    const videoNode = this.localVideoRef.current;
    if (videoNode) {
      videoNode.srcObject = mediaStream;
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

  render() {
    return (
      <div className="rtc-page">
        <h3>Video</h3>
        <div>
          <video ref={this.localVideoRef} autoPlay playsInline muted />
        </div>
        <div>
          <button type="button" onClick={this.onGetMediaButtonClicked}>
            Start
          </button>
        </div>
        {this.state.haveStream &&
         this.localVideoStream && (
         <GroupCall
           huntId={this.props.huntId}
           puzzleId={this.props.puzzleId}
           stream={this.localVideoStream}
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
