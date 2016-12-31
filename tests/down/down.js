import crypto from 'crypto';

import _ from 'underscore';
import meteorDown from '@avital/meteor-down';
import OptionParser from 'option-parser';
import denodeify from 'denodeify';
import prompt from 'prompt';

/* eslint-disable no-param-reassign,no-console */

const Down = class Down {
  parseArgs() {
    const parser = new OptionParser();
    parser.addOption('h', 'help', 'Display this help message')
      .action(parser.helpAction());
    parser.addOption(
      null,
      'hunt',
      'Hunt to load test (defaults to most recent hunt user is joined to)',
      'hunt')
      .argument('HUNT');
    parser.addOption(
      null,
      'concurrency',
      'Number of parallel workers (defaults to 10)',
      'concurrency')
      .argument('CONCURRENCY');
    parser.addOption(
      null,
      'server',
      'URL of the server to load test (defaults to http://localhost:3000)',
      'server')
      .argument('SERVER');
    parser.parse();

    this.options = {
      hunt: parser.hunt.value(),
      concurrency: parser.concurrency.value() || 10,
      server: parser.server.value() || 'http://localhots:3000',
    };
  }

  async collectLoginInfo() {
    const schema = {
      properties: {
        email: {},
        password: {
          hidden: true,
          replace: '*',
        },
      },
    };
    console.log('Type fast before meteor-down starts making noise.');
    prompt.start();
    const { email, password } = await denodeify(prompt.get)(schema);
    prompt.stop();
    const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

    this.account = {
      user: { email },
      password: { digest: passwordDigest, algorithm: 'sha-256' },
    };
  }

  async login(Meteor) {
    if (!this.resume) {
      const results = await Meteor.call('login', this.account);
      this.resume = results.token;
    } else {
      // Save a new token for the next client to use
      const results = await Meteor.call('login', { resume: this.resume });
      this.resume = results.token;
    }
  }

  async selectHunt(Meteor, user) {
    if (this.options.hunt) {
      return this.options.hunt;
    }

    // Technically we don't subscribe to this, but it's hard to pick a
    // hunt to dig into without first viewing them
    await Meteor.subscribe('mongo.hunts');

    return _.chain(Meteor.collections.users[user].hunts)
      .map(h => Meteor.collections.jr_hunts[h])
      .compact()
      .max(h => h.createdAt)
      .value()
      ._id;
  }

  async session(Meteor) {
    Meteor.call = denodeify(Meteor.call);
    Meteor.subscribe = denodeify(Meteor.subscribe);
    Meteor.subscribeAll = function subscribeAll(subs) {
      return Promise.all(subs.map(sub => Meteor.subscribe(...sub)));
    };

    await Meteor.subscribeAll([
      ['meteor.loginServiceConfiguration'],
      ['meteor_autoupdate_clientVersions'],
      ['nicolaslopezj_roles'],
    ]);

    await this.login(Meteor);

    const user = _.keys(Meteor.collections.users)[0];

    // This is everything that non-operator users subscribe to
    // independent of what hunt they're viewing.
    await Meteor.subscribeAll([
      ['mongo.profiles'],
      ['mongo.announcements'],
      ['mongo.pending_announcements', { user }],
      ['mongo.profiles', { _id: user }],
      ['huntMembership'],
    ]);

    const hunt = await this.selectHunt(Meteor, user);

    // And this is everything independent of puzzle being viewed
    await Meteor.subscribeAll([
      ['mongo.hunts.allowingDeleted', { _id: hunt }],
      ['mongo.puzzles', { hunt }],
      ['mongo.tags', { hunt }],
      ['subCounter.fetch', { hunt }],
    ]);

    // Open a random, unsolved puzzle
    const puzzle = _.chain(Meteor.collections.jr_puzzles)
            .values()
            .filter(p => !p.answer)
            .sample()
            .value()
            ._id;

    // And finally everything that's puzzle specific
    await Meteor.subscribeAll([
      ['subCounter.inc', `puzzle:${puzzle}`, { puzzle, hunt }],
      ['mongo.guesses', { puzzle }],
      ['mongo.documents', { puzzle }],
      ['mongo.chatmessages', { puzzleId: puzzle }],
    ]);

    // Don't block on this method
    Meteor.call('ensureDocumentAndPermissions', puzzle);

    // "Work" on the puzzle for between 1-5 seconds
    await new Promise(r => setTimeout(r, 1000 + (Math.random() * 4000)));
  }

  async main() {
    this.parseArgs();
    await this.collectLoginInfo();

    meteorDown.init(async (Meteor) => {
      try {
        await this.session(Meteor);
      } catch (e) {
        console.log(`Error running test: ${e.stack}`);
      } finally {
        Meteor.kill();
      }
    });

    meteorDown.run({
      concurrency: this.options.concurrency,
      url: this.options.server,
    });
  }
};

if (require.main === module) {
  new Down().main();
}
