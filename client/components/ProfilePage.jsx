const BS = ReactBootstrap;

OthersProfilePage = React.createClass({
  propTypes: {
    profile: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
  },
  render() {
    // TODO: figure out something for profile pictures - gravatar?
    var profile = this.props.profile;
    return (
      <div>
        <h1>{profile.displayName}</h1>
        <div>Email: {profile.primaryEmail}</div>
        <div>Location: {profile.locationDuringHunt}</div>
        {profile.phoneNumber ? <div>Phone: {profile.phoneNumber}</div> : null}
        {profile.slackHandle ? <div>Slack handle: {profile.slackHandle}</div> : null}
      </div>
    );
  },
});

OwnProfilePage = React.createClass({
  propTypes: {
    initialProfile: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
  },
  getInitialState() {
    return {
      displayNameValue: this.props.initialProfile.displayName || '',
      locationDuringHuntValue: this.props.initialProfile.locationDuringHunt || '',
      phoneNumberValue: this.props.initialProfile.phoneNumber || '',
      slackHandleValue: this.props.initialProfile.slackHandle || '',
      localRemote: this.props.initialProfile.remote ? 'remote' : 'local',
      affiliation: this.props.initialProfile.affiliation || 'other',
      submitState: 'idle', // One of 'idle', 'submitting', 'success', or 'error'
      submitError: '',
    };
  },

  handleDisplayNameFieldChange() {
    this.setState({
      displayNameValue: this.refs.displayName.getValue(),
    });
  },

  handleLocationFieldChange() {
    this.setState({
      locationDuringHuntValue: this.refs.locationDuringHunt.getValue(),
    });
  },

  handlePhoneNumberFieldChange() {
    this.setState({
      phoneNumberValue: this.refs.phoneNumber.getValue(),
    });
  },

  handleSlackHandleFieldChange() {
    this.setState({
      slackHandleValue: this.refs.slackHandle.getValue(),
    });
  },

  setAffiliation(newAffiliation) {
    this.setState({
      affiliation: newAffiliation,
    });
  },

  setLocalRemote(newLocalRemote) {
    this.setState({
      localRemote: newLocalRemote,
    });
  },

  handleSaveForm() {
    this.setState({
      submitState: 'submitting',
    });
    var newProfile = {
      displayName: this.state.displayNameValue,
      locationDuringHunt: this.state.locationDuringHuntValue,
      phoneNumber: this.state.phoneNumberValue,
      slackHandle: this.state.slackHandleValue,
      affiliation: this.state.affiliation,
      remote: this.state.localRemote === 'remote',
    };
    Meteor.call('saveProfile', newProfile, (error) => {
      if (error) {
        this.setState({
          submitState: 'error',
          submitError: error.message,
        });
      } else {
        this.setState({
          submitState: 'success',
        });
      }
    });
  },

  dismissAlert() {
    this.setState({
      submitState: 'idle',
      submitError: '',
    });
  },

  styles: {
    radioheader: {
      fontWeight: 'bold',
    },
  },

  render() {
    let shouldDisableForm = (this.state.submitState === 'submitting');
    return (
      <div>
        <h1>Account information</h1>
        {/*TODO: picture/gravatar*//*TODO: picture/gravatar*/}
        <BS.Input type='text'
                  value={this.props.initialProfile.primaryEmail}
                  disabled={true}
                  label='Email address'
                  help='This is the email address associated with your account.'
        />
        {this.state.submitState === 'submitting' ? <BS.Alert bsStyle="info">Saving...</BS.Alert> : null}
        {this.state.submitState === 'success' ? <BS.Alert bsStyle="success" dismissAfter={5000} onDismiss={this.dismissAlert}>Saved changes.</BS.Alert> : null}
        {this.state.submitState === 'error' ? <BS.Alert bsStyle="danger" onDismiss={this.dismissAlert}>Saving failed: {this.state.submitError}</BS.Alert> : null}
        <BS.Input type='text'
                  value={this.state.displayNameValue}
                  disabled={shouldDisableForm}
                  label='Display name'
                  help='We suggest your full name, to avoid ambiguity.'
                  ref='displayName'
                  onChange={this.handleDisplayNameFieldChange}
        />
        <LabelledRadioGroup header="Where are you hunting from?"
                            name="location"
                            options={[
                              {
                                value: 'local',
                                label: 'At MIT',
                              }, {
                                value: 'remote',
                                label: 'Remote (anywhere else)',
                              },
                            ]}
                            initialValue={this.state.localRemote}
                            help="This is useful to the operators, so we know what fraction of our team is local vs. remote."
                            onChange={this.setLocalRemote}/>
        <BS.Input type='text'
                  value={this.state.locationDuringHuntValue}
                  label='Location during hunt'
                  disabled={shouldDisableForm}
                  help='Building + room number can help others find you.  HQ is 32-261.'
                  ref='locationDuringHunt'
                  onChange={this.handleLocationFieldChange}
        />
        <BS.Input type='text'
                  value={this.state.phoneNumberValue}
                  label='Phone number (optional)'
                  disabled={shouldDisableForm}
                  help='In case we need to reach you via phone.'
                  ref='phoneNumber'
                  onChange={this.handlePhoneNumberFieldChange}
        />
        <BS.Input type='text'
                  value={this.state.slackHandleValue}
                  label='Slack handle (optional)'
                  disabled={shouldDisableForm}
                  help='So we can connect your chat there with your account here.'
                  ref='slackHandle'
                  onChange={this.handleSlackHandleFieldChange}
        />
        <LabelledRadioGroup header="Affiliation with MIT"
                            name="affiliation"
                            options={[
                              {
                                value: 'undergrad',
                                label: 'Undergraduate Student',
                              }, {
                                value: 'grad',
                                label: 'Graduate student',
                              }, {
                                value: 'alum',
                                label: 'Alumnus/alumna',
                              }, {
                                value: 'employee',
                                label: 'Faculty/staff',
                              }, {
                                value: 'other',
                                label: 'Other',
                              }, {
                                value: 'unaffiliated',
                                label: 'Unaffiliated',
                              },
                            ]}
                            initialValue={this.state.affiliation}
                            help="The hunt organizers ask us for statistics about our team's affiliation."
                            onChange={this.setAffiliation}/>
        <BS.ButtonInput type='submit'
                        value='Save'
                        bsStyle='primary'
                        disabled={shouldDisableForm}
                        onClick={this.handleSaveForm}
        />
      </div>
    );
  },
});

ProfilePage = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    var profileHandle = Meteor.subscribe('mongo.profiles', {_id: this.props.params.userId});
    var user = Meteor.user();
    var defaultEmail = user && user.emails && user.emails.length > 0 && user.emails[0] && user.emails[0].address;
    let data = {
      ready: user && profileHandle.ready(),
      isSelf: (Meteor.userId() === this.props.params.userId),
      profile: Models.Profiles.findOne(this.props.params.userId) || {
        _id: Meteor.userId(),
        displayName: '',
        locationDuringHunt: '',
        primaryEmail: defaultEmail,
        phoneNumber: '',
        slackHandle: '',
        deleted: false,
        createdAt: new Date(),
        createdBy: Meteor.userId(),
      },
    };
    return data;
  },

  render() {
    if (!this.data.ready) return <div>loading...</div>;
    if (this.data.isSelf) return <OwnProfilePage initialProfile={this.data.profile}/>;
    return <OthersProfilePage profile={this.data.profile}/>;
  },
});
