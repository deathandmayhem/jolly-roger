// The ShareJS client requires something that looks like a
// WebSocket. The WebSocket-alike has to implement the following
// subset of the API (so that's all we'll implement):
//
// - readyState
// - close
// - send
// - onopen
// - onclose
// - onmessage
// - onerror

const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

ShareJSSocket = class ShareJSSocket {
  constructor() {
    this.canSendJSON = true;

    this.readyState = CONNECTING;

    this.connectionTrack = Tracker.autorun(() => {
      if (!Meteor.status().connected &&
          this.readyState !== CLOSING && this.readyState !== CLOSED) {
        this.readystate = CLOSED;
        this._cb(this.onclose, 'Request failed');

        // Immediately begin re-opening the connection. This is weird,
        // but we need to get back to state CONNECTING or OPEN before
        // we receive the initial message from the server (or the
        // ShareJS client state machine barfs), and the Tracker
        // computation doesn't seem to run until after the sub is
        // reestablished. ShareJS won't do anything until it gets that
        // message anyway (because canSendWhileConnecting isn't set)
        this.readyState = OPEN;
        this._cb(this.onopen);
      }
    });

    this.sub = Meteor.subscribe('sharejs', {
      onReady: () => {
        this.readyState = OPEN;
        this._cb(this.onopen);
      },

      onStop: () => {
        const startState = this.readyState;
        this.connectionTrack.stop();
        this.readyState = CLOSED;
        this._cb(this.onclose, startState === CLOSING ? 'Closed' : 'Stopped by server');
      },
    });

    this.collection = `sharejs_${this.sub.subscriptionId}`;
    Meteor.connection.registerStore(this.collection, {
      update: (msg) => {
        if (msg.msg === 'added') {
          this._cb(this.onmessage, new MessageEvent('message', {data: msg.fields}));
          Meteor.call('sharejsAck', this.sub.subscriptionId, MongoID.idParse(msg.id));
        }
      },
    });
  }

  send(msg) {
    if (this.readyState !== OPEN) {
      throw new Error('Can not send to an unopnened socket');
    }

    Meteor.call('sharejsSend', this.sub.subscriptionId, msg, (error) => {
      this.onerror(error);
    });
  }

  close() {
    this.readyState = CLOSING;
    this.sub.stop();
  }

  // Helper function for handling potentially unset callbacks
  _cb(cb, ...args) {
    if (cb) {
      cb(...args);
    }
  }
};
