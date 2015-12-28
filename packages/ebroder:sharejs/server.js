// ShareJS needs a bi-directional, object-based stream for
// communication, and we want it to be authenticated using the
// existing DDP rails (otherwise we'd use a normal websocket).
//
// We can use methods to send from the client to the server, but that
// doesn't provide any way for the server to send un-prompted messages
// to the client. Subscriptions let us push events from the server to
// the client.

const stream = Npm.require('stream');

ShareJS = Npm.require('share');
ShareJS.db.mongo = Npm.require('livedb-mongo');

const getShare = _.once(() => {
  const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
  const backend = ShareJS.db.client(ShareJS.db.mongo(db));

  const server = ShareJS.server.createClient({backend});
  server.use((request, callback) => {
    if (request.collection && request.collection !== 'docs') {
      callback(new Meteor.Error(401, 'Must access documents from the docs collection'));
    }

    callback();
  });

  return server;
});

const sockets = {};

class ShareJSStream extends stream.Duplex {
  constructor(publisher) {
    super({objectMode: true});

    this.publisher = publisher;
    this.subscription = publisher._subscriptionId;

    // We'll publish records to a pseudo-collection, using an
    // incrementing object-id
    this.collection = `sharejs_${this.subscription}`;
    this.id = 0;

    sockets[this.subscription] = this;
    this.publisher.onStop(() => {
      delete sockets[this.subscription];
      this.push(null);
      if (!this.closed) {
        this.emit('close');
      }
    });

    this.on('error', () => this.publisher.stop());
    this.on('close', () => {
      this.closed = true;
      this.publisher.stop();
    });
    this.publisher.ready();

    getShare().listen(this);
  }

  // Ignore - we'll trigger reads with this.push
  _read() {
  }

  _write(chunk, encoding, callback) {
    this.publisher.added(this.collection, this.id, chunk);
    this.id += 1;
    callback();
  }

  // This is just for clearing the local cache
  ack(id) {
    this.publisher.removed(this.collection, id);
  }
}

Meteor.methods({
  sharejsSend(sub, msg) {
    check(sub, String);
    check(msg, Object);

    if (!_.has(sockets, sub)) {
      throw new Meteor.Error(404, 'Subscription does not exist');
    }

    sockets[sub].push(msg);
  },

  sharejsAck(sub, id) {
    check(sub, String);
    check(id, Number);

    if (!_.has(sockets, sub)) {
      throw new Meteor.Error(404, 'Subscription does not exist');
    }

    sockets[sub].ack(id);
  },
});

Meteor.publish('sharejs', function() {
  if (!this.userId) {
    return [];
  }

  const stream = new ShareJSStream(this);
});
