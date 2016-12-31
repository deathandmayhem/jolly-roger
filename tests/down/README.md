Jolly Roger Down
================

This is a load-testing rig for Jolly Roger. It uses meteor-down (or
actually, a fork of meteor-down that leaves us with execution control
flow).

How to Run
----------

From the `tests/down/` directory, run:

```
npm run down [concurrency [server]]
```

How it Works
------------

At startup, we prompt for an email address and password to login with;
we'll use that for all load-test sessions.

Each session simulates a Mystery Hunter on speed - they connect with a
pre-existing login session, open up an unsolved puzzle page, and look
at it for a short number of seconds.

The specific subscriptions and method calls that each session
establishes are based on inspection of live sessions, but there's
nothing to keep this in sync. It's worth checking the list of
subscriptions here against the subscriptions a browser makes. (It's
worth noting that operators have a few more subscriptions that aren't
reflected here.)

The concurrency level and the server to connect to are accepted as
positional arguments.
