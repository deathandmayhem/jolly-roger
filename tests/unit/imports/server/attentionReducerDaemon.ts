import { Random } from "meteor/random";
import { assert } from "chai";
import {
  appendClose,
  appendContext,
} from "../../../../imports/server/attentionLog";
import { runReducer } from "../../../../imports/server/daemons/attentionReducerDaemon";
import AttentionReducerCheckpoints from "../../../../imports/server/models/AttentionReducerCheckpoints";
import AttentionStates from "../../../../imports/server/models/AttentionStates";
import resetDatabase from "../../../lib/resetDatabase";
import waitForAssertion from "../../../lib/waitForAssertion";

interface Key {
  user: string;
  connection: string;
  tab: string;
}

function key(): Key {
  return { user: Random.id(), connection: Random.id(), tab: Random.id() };
}

function open(k: Key, hunt: string) {
  return appendContext(k, { hunt }, Random.id(), new Date());
}

function close(k: Key) {
  return appendClose({ user: k.user, tab: k.tab }, k.connection, new Date());
}

async function huntFor(k: Key) {
  const state = await AttentionStates.findOneAsync({
    user: k.user,
    connection: k.connection,
    tab: k.tab,
  });
  return state?.hunt;
}

function waitForHunt(k: Key, hunt: string | undefined) {
  return waitForAssertion(async () => {
    assert.equal(await huntFor(k), hunt);
  }, 5000);
}

function startReducer(): AsyncDisposable {
  const controller = new AbortController();
  const done = runReducer(controller.signal);
  return {
    async [Symbol.asyncDispose]() {
      controller.abort();
      await done;
    },
  };
}

describe("attention reducer daemon", function () {
  this.timeout(15000);

  beforeEach(async function () {
    await resetDatabase("attention reducer daemon");
  });

  it("folds transitions appended while running", async function () {
    await using _reducer = startReducer();

    const k = key();
    const hunt = Random.id();
    await open(k, hunt);
    await waitForHunt(k, hunt);

    await close(k);
    await waitForHunt(k, undefined);
  });

  it("folds transitions appended while stopped", async function () {
    const first = key();
    const firstHunt = Random.id();
    await open(first, firstHunt);
    {
      await using _firstRun = startReducer();
      await waitForHunt(first, firstHunt);
    }

    const second = key();
    const secondHunt = Random.id();
    await open(second, secondHunt);
    await close(first);

    await using _secondRun = startReducer();
    await waitForHunt(second, secondHunt);
    await waitForHunt(first, undefined);
  });

  it("rebuilds when it can't resume from the checkpoint", async function () {
    await AttentionReducerCheckpoints.upsertAsync("default", {
      $set: { resumeToken: { _data: "00" } },
    });
    const first = key();
    const firstHunt = Random.id();
    await open(first, firstHunt);

    // The first run deletes the checkpoint and fails, and the retry rebuilds.
    await assert.isRejected(runReducer(new AbortController().signal));
    await using _reducer = startReducer();
    await waitForHunt(first, firstHunt);

    const second = key();
    const secondHunt = Random.id();
    await open(second, secondHunt);
    await waitForHunt(second, secondHunt);
  });
});
