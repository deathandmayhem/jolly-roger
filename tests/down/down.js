import crypto from 'crypto';

import _ from 'underscore';
import meteorDown from '@avital/meteor-down';
import OptionParser from 'option-parser';
import denodeify from 'denodeify';
import prompt from 'prompt';

/* eslint-disable no-param-reassign,no-console */

const Down = class Down {
  constructor() {
    this.sessionCounter = 0;
  }

  parseArgs() {
    const parser = new OptionParser();
    parser.addOption('h', 'help', 'Display this help message')
      .action(parser.helpAction());
    parser.addOption(
      null,
      'hunt',
      'Hunt to load test (defaults to most recent hunt user is joined to)',
      'hunt',
    )
      .argument('HUNT');
    parser.addOption(
      null,
      'puzzle',
      'Puzzle to load test (defaults to randomly selecting an unsolved puzzle in each session)',
      'puzzle',
    )
      .argument('PUZZLE');
    parser.addOption(
      null,
      'concurrency',
      'Number of parallel workers (defaults to 10)',
      'concurrency',
    )
      .argument('CONCURRENCY');
    parser.addOption(
      null,
      'idlers',
      'Number of workers to open a puzzle and keep it open (defaults to 0)',
      'idlers',
    )
      .argument('IDLERS');
    parser.addOption(
      null,
      'server',
      'URL of the server to load test (defaults to http://localhost:3000)',
      'server',
    )
      .argument('SERVER');
    parser.parse();

    this.options = {
      hunt: parser.hunt.value(),
      puzzle: parser.puzzle.value(),
      concurrency: parseInt(parser.concurrency.value() || 10, 10),
      idlers: parseInt(parser.idlers.value() || 0, 10),
      server: parser.server.value() || 'http://localhost:3000',
    };

    if (this.options.idlers >= this.options.concurrency) {
      throw new RangeError(
        `Can't set idlers to ${this.options.idlers} and concurrency to `
          + `${this.options.concurrency}; the load test will deadlock!`,
      );
    }
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

  selectHunt(Meteor, user) {
    if (this.options.hunt) {
      if (!Meteor.collections.jr_hunts[this.options.hunt]) {
        throw new RangeError(`Hunt ${this.options.hunt} does not exist`);
      }

      return this.options.hunt;
    }

    return _.chain(Meteor.collections.users[user].hunts)
      .map((h) => Meteor.collections.jr_hunts[h])
      .compact()
      .max((h) => h.createdAt)
      .value()
      ._id;
  }

  selectPuzzle(Meteor) {
    if (this.options.puzzle) {
      if (!Meteor.collections.jr_puzzles[this.options.puzzle]) {
        throw new RangeError(`Hunt ${this.options.puzzle} does not exist`);
      }

      return this.options.puzzle;
    }

    return _.chain(Meteor.collections.jr_puzzles)
      .values()
      .filter((p) => !p.answer)
      .sample()
      .value()
      ._id;
  }

  async session(Meteor) {
    const sessionId = this.sessionCounter;
    this.sessionCounter += 1;

    Meteor.call = denodeify(Meteor.call);
    Meteor.subscribe = denodeify(Meteor.subscribe);
    Meteor.subscribeAll = function subscribeAll(subs) {
      return Promise.all(subs.map((sub) => Meteor.subscribe(...sub)));
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
      ['mongo.profiles', {}, { fields: { displayName: 1 } }],
      ['mongo.announcements'],
      ['mongo.pending_announcements', { user }],
      ['mongo.profiles', { _id: user }],
      ['selfHuntMembership'],
      // Technically we don't subscribe to this, but it's hard to pick
      // a hunt to dig into without first viewing them
      ['mongo.hunts'],
    ]);

    const hunt = this.selectHunt(Meteor, user);

    // And this is everything independent of puzzle being viewed
    await Meteor.subscribeAll([
      ['mongo.hunts.allowingDeleted', { _id: hunt }],
      ['mongo.puzzles', { hunt }],
      ['mongo.tags', { hunt }],
      ['subscribers.counts', { hunt }],
    ]);

    // Open a random, unsolved puzzle
    const puzzle = this.selectPuzzle(Meteor);

    // And finally everything that's puzzle specific
    await Meteor.subscribeAll([
      ['subscribers.inc', `puzzle:${puzzle}`, { puzzle, hunt }],
      ['mongo.guesses', { puzzle }],
      ['mongo.documents', { puzzle }],
      [
        'mongo.chatmessages',
        { puzzle },
        {
          fields: {
            puzzle: 1, text: 1, sender: 1, timestamp: 1,
          },
        },
      ],
    ]);

    // Don't block on this method
    Meteor.call('ensureDocumentAndPermissions', puzzle);

    if (sessionId < this.options.idlers - 1) {
      // Spin forever - only non-idle sessions close/reopen the puzzle
      await new Promise(() => {});
    }
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
  new Down().main()
    .catch((e) => {
      console.log(e.stack);
      process.exit(1);
    });
}
