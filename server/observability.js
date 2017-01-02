import { MeteorX } from 'meteor/meteorhacks:meteorx';
import { _ } from 'meteor/underscore';
import { honeyBuilder } from '/imports/server/honey.js';

/* eslint-disable no-underscore-dangle */

const origHandleConnect = MeteorX.Server.prototype._handleConnect;
const onConnect = function onConnect(socket, ...rest) {
  const ret = origHandleConnect.call(this, socket, ...rest);
  const session = socket._meteorSession;
  if (session) {
    session.pendingSubscriptions = {};
    session.pendingMethods = {};
    session.honey = honeyBuilder.newBuilder({
      connection: session.id,
      ip: session.connectionHandle.clientAddress,
    }, {
      user: () => session.userId,
      admin: () => Roles.userHasRole(session.userId, 'admin'),
    });
  }

  return ret;
};

const origSub = MeteorX.Session.prototype.protocol_handlers.sub;
const onSub = function onSub(msg, ...rest) {
  this.pendingSubscriptions[msg.id] = {
    type: 'sub',
    name: msg.name,
    start: process.hrtime(),
  };
  origSub.call(this, msg, ...rest);
};

const origMethod = MeteorX.Session.prototype.protocol_handlers.method;
const onMethod = function onMethod(msg, ...rest) {
  this.pendingMethods[msg.id] = {
    type: 'method',
    name: msg.method,
    start: process.hrtime(),
  };
  origMethod.call(this, msg, ...rest);
};

const formatTimestamp = function formatTimestamp(ts) {
  return (ts[0] * 1000) + (ts[1] / 1e6);
};

const origSend = MeteorX.Session.prototype.send;
const onSend = function onSend(msg) {
  const events = [];
  if (msg.msg === 'result') {
    events.push(_.extend(
      this.pendingMethods[msg.id],
      {
        success: !!msg.result,
      },
    ));
    delete this.pendingMethods[msg.id];
  } else if (msg.msg === 'ready') {
    _.forEach(msg.subs, (id) => {
      events.push(this.pendingSubscriptions[id]);
      delete this.pendingSubscriptions[id];
    });
  }

  _.compact(events).forEach(evt => {
    const honeyEvent = this.honey.newEvent();
    honeyEvent.dataset = 'DDPMessages';
    honeyEvent.add(_.omit(evt, 'start'));
    honeyEvent.add({
      durationMillis: formatTimestamp(process.hrtime(evt.start)),
    });
    honeyEvent.send();
  });

  return origSend.call(this, msg);
};

MeteorX.Server.prototype._handleConnect = onConnect;
MeteorX.Session.prototype.protocol_handlers.sub = onSub;
MeteorX.Session.prototype.protocol_handlers.method = onMethod;
MeteorX.Session.prototype.send = onSend;
