# Jolly Roger development tips

Jolly Roger is written in TypeScript using the Meteor web framework (v3).
To run Jolly Roger locally, first [install Meteor](https://www.meteor.com/install).

## Running a local server for development

Obtain the source code:

```bash
git clone https://github.com/deathandmayhem/jolly-roger
cd jolly-roger
```

Install dependencies from `npm`:

```bash
meteor npm install
```

> [!NOTE]
> With Meteor, use `meteor npm` and `meteor node` instead of `npm` or `node`,
> to get the bundled version it needs.

Run Meteor:

```bash
meteor
```

This will start up a server on [http://localhost:3000](http://localhost:3000),
which you can navigate to with your web browser of choice.

## Linting

Run all linters in parallel:

```bash
meteor npm run lint
```

## Testing

```bash
meteor npm test
```

This runs the full test suite with Playwright.

## Setting up a fresh Jolly Roger server

When you start a server with an empty database (development or production),
the server will initialize itself but you have to do some setup steps in the
web interface.

### Admin account creation

Loading the Jolly Roger web interface for the first time will prompt you to
create a user with the `admin` role and log you in as that user. Once that's
done, you can begin using Jolly Roger, invite other users and so on.

### Server options and integrations

Users with the `admin` role can configure other server options from the setup
page (look for "Server setup" in the user pulldown menu in the upper right).
This is where you configure integration with Google, Discord, etc.; the page
walks you through the steps to generate the required keys and such.

### Example hunt data

Jolly Roger ships with a fixture representing data from the 2018 MIT Mystery
Hunt, to get a sense of what a fully-populated UI might look like.

If you haven't yet created any hunts in your Jolly Roger instance, then you can
load the homepage (click the logo in the upper left) and click the
"Create sample hunt" button. Otherwise, you can open the **browser** javascript
console (not the Meteor shell) and run the following:

```js
Meteor.call("Hunts.methods.createFixture");
```

Either way, upon success, you should see a hunt named "Mystery Hunt 2018" in the
list on the homepage.

## Production deployment

For instructions on running a production instance, see
[DEPLOYMENT.md](DEPLOYMENT.md).
