Meteor.methods({
  sendChatMessage(puzzleId, message) {
    check(this.userId, String);
    check(puzzleId, String);
    check(message, String);

    /* TODO: implement Slack bridging
    let slackInfo = {
      // TODO: look up slack userId from this.userId's Profile, if available.
      userId:
      // TODO: look up Slack channelId from this puzzleId's ChatMetadata, if available.
      channelId:
      direction: 'sent-to-slack',
      state: 'sending'
    };
    */

    Models.ChatMessages.insert({
      puzzleId: puzzleId,
      text: message,
      sender: this.userId,
      timestamp: new Date(),
      /* TODO: implement Slack bridge
      slackInfo: {
      },
      */
    });

    // TODO: Fire off a request to Slack to post this message there, too.
    // If we have a Slack API key for this user, use that - otherwise,
    // send as the globally-configured jolly-roger/deathfromdata bot.
  },
});
