import { DDP } from "meteor/ddp";
import { Meteor } from "meteor/meteor";
import { Tracker } from "meteor/tracker";

export const USER_EMAIL = "jolly-roger@deathandmayhem.com";
export const USER_PASSWORD = "password";

export const subscribeAsync = (name: string, ...args: any[]) =>
  new Promise<Meteor.SubscriptionHandle>((resolve, reject) => {
    const handle = Meteor.subscribe(name, ...args, {
      onStop: (reason?: Meteor.Error) => {
        if (reason) {
          reject(reason);
        }
      },
      onReady: () => {
        resolve(handle);
      },
    });
  });

// waitForSubscriptions and afterFlush both taken from
// https://guide.meteor.com/testing.html#full-app-integration-test

const waitForSubscriptions = () =>
  new Promise<void>((resolve) => {
    const poll = Meteor.setInterval(() => {
      if (DDP._allSubscriptionsReady()) {
        Meteor.clearInterval(poll);
        resolve();
      }
    }, 200);
  });

const afterFlush = () =>
  new Promise<void>((resolve) => {
    Tracker.afterFlush(resolve);
  });

export const stabilize = async () => {
  await waitForSubscriptions();
  await afterFlush();
};
