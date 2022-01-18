# Jolly Roger development

Jolly Roger is written in TypeScript using the Meteor web framework.  To run
Jolly Roger locally, you'll need to first
[install Meteor](https://www.meteor.com/install).

## Run the server

Obtain the source code:

```bash
git clone https://github.com/deathandmayhem/jolly-roger
cd jolly-roger
```

Install dependencies from `npm`:

```bash
meteor npm install
```

Run Meteor:

```bash
meteor
```

This will start up a server on [http://localhost:3000](http://localhost:3000),
which you can navigate to with your web browser of choice.

## Create admin account

Loading jolly-roger for the first time at
[http://localhost:3000](http://localhost:3000) will prompt you to create a user
with the `admin` role and log you in as that user. Once that's done, you can
begin using jolly-roger.

## Additional server setup

Users with the `admin` role can configure other server options from the setup
page at [http://localhost:3000/setup](http://localhost:3000/setup).  This is
where you'd go to configure various Google integration configuration options.


## Example hunt data

Jolly Roger ships with a fixture representing data from the 2015 MIT Mystery
Hunt, to get a sense of what a fully-populated UI might look like.

To create the fixture hunt on your instance, log in as an admin in a browser
window, then open the **browser** javascript console (not the Meteor shell we
were using above) and run the following:

```js
Meteor.call("createFixtureHunt")
```

Upon success, you should see a hunt named 2015 in the list at
[http://localhost:3000/hunts/](http://localhost:3000/hunts/).
