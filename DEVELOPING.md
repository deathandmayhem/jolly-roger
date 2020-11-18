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

However, you can't do much until you create an account.

## Create admin account

While `meteor` is running in the first terminal, open a second terminal,
navigate to your jolly-roger clone, spawn a Meteor interactive shell, create a
user, and make it an admin:

```js
meteor shell
> Accounts.createUser({email: 'broder@mit.edu', password: 'password'})
'WaoEku3wBrWLLc7pK'
> Roles.addUserToRoles('WaoEku3wBrWLLc7pK', 'admin')
```

Now, you should be able to log in at
[http://localhost:3000](http://localhost:3000) with the email and password you
created from the shell.

## Additional server setup

Users with the `admin` role can configure other server options from the setup
page at [http://localhost:3000/setup](http://localhost:3000/setup).  This is
where you'd go to configure various Google integration configuration options.
