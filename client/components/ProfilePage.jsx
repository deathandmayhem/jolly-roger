import React from 'react';
import BS from 'react-bootstrap';
import { LabelledRadioGroup } from '/imports/client/components/LabelledRadioGroup.jsx';
// TODO: ReactMeteorData
// TODO: JRPropTypes

OthersProfilePage = React.createClass({
  propTypes: {
    profile: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
    viewerIsAdmin: React.PropTypes.bool.isRequired,
    targetIsAdmin: React.PropTypes.bool.isRequired,
  },

  makeOperator() {
    Meteor.call('makeOperator', this.props.profile._id);
  },

  render() {
    // TODO: figure out something for profile pictures - gravatar?
    const profile = this.props.profile;
    const showOperatorBadge = this.props.targetIsAdmin;
    const showMakeOperatorButton = this.props.viewerIsAdmin && !this.props.targetIsAdmin;
    return (
      <div>
        <h1>{profile.displayName}</h1>
        { showOperatorBadge && <BS.Label>operator</BS.Label> }
        { showMakeOperatorButton && <BS.Button onClick={this.makeOperator}>Make operator</BS.Button> }
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
    operating: React.PropTypes.bool,
    isOperator: React.PropTypes.bool,
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

  toggleOperating() {
    const newState = !this.props.operating;
    Meteor.users.update(Meteor.userId(), {
      $set: {
        'profile.operating': newState,
      },
    });
  },

  handleSaveForm() {
    this.setState({
      submitState: 'submitting',
    });
    const newProfile = {
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
        {this.props.isOperator ? <BS.Checkbox type='checkbox' checked={this.props.operating} onChange={this.toggleOperating}>Operating</BS.Checkbox> : null}
        {/*TODO: picture/gravatar*/}
        <BS.Input id="jr-profile-edit-email"
                  type='text'
                  value={this.props.initialProfile.primaryEmail}
                  disabled={true}
                  label='Email address'
                  help='This is the email address associated with your account.'
        />
        {this.state.submitState === 'submitting' ? <BS.Alert bsStyle="info">Saving...</BS.Alert> : null}
        {this.state.submitState === 'success' ? <BS.Alert bsStyle="success" dismissAfter={5000} onDismiss={this.dismissAlert}>Saved changes.</BS.Alert> : null}
        {this.state.submitState === 'error' ? <BS.Alert bsStyle="danger" onDismiss={this.dismissAlert}>Saving failed: {this.state.submitError}</BS.Alert> : null}
        <BS.Input id="jr-profile-edit-display-name"
                  type='text'
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
        <BS.Input id="jr-profile-edit-location"
                  type='text'
                  value={this.state.locationDuringHuntValue}
                  label='Location during hunt'
                  disabled={shouldDisableForm}
                  help='Building + room number can help others find you.  HQ is 32-261.'
                  ref='locationDuringHunt'
                  onChange={this.handleLocationFieldChange}
        />
        <BS.Input id="jr-profile-edit-phone"
                  type='text'
                  value={this.state.phoneNumberValue}
                  label='Phone number (optional)'
                  disabled={shouldDisableForm}
                  help='In case we need to reach you via phone.'
                  ref='phoneNumber'
                  onChange={this.handlePhoneNumberFieldChange}
        />
        <BS.Input id="jr-profile-edit-slack"
                  type='text'
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

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  getMeteorData() {
    const uid = this.props.params.userId === 'me' ? Meteor.userId() : this.props.params.userId;

    const profileHandle = this.context.subs.subscribe('mongo.profiles', {_id: uid});
    const userRolesHandle = this.context.subs.subscribe('userRoles', uid);
    const user = Meteor.user();
    const defaultEmail = user && user.emails && user.emails.length > 0 && user.emails[0] && user.emails[0].address;
    let data = {
      ready: user && profileHandle.ready() && userRolesHandle.ready(),
      isSelf: (Meteor.userId() === uid),
      profile: Models.Profiles.findOne(uid) || {
        _id: uid,
        displayName: '',
        locationDuringHunt: '',
        primaryEmail: defaultEmail,
        phoneNumber: '',
        slackHandle: '',
        deleted: false,
        createdAt: new Date(),
        createdBy: Meteor.userId(),
      },
      viewerIsAdmin: Roles.userHasRole(Meteor.userId(), 'admin'),
      targetIsAdmin: Roles.userHasRole(uid, 'admin'),
      viewerIsOperating: user && user.profile && user.profile.operating,
    };
    return data;
  },

  render() {
    if (!this.data.ready) return <div>loading...</div>;
    if (this.data.isSelf) return <OwnProfilePage initialProfile={this.data.profile}
                                                 isOperator={this.data.viewerIsAdmin}
                                                 operating={this.data.viewerIsOperating}
                                                 />;
    return <OthersProfilePage profile={this.data.profile}
                              viewerIsAdmin={this.data.viewerIsAdmin}
                              targetIsAdmin={this.data.targetIsAdmin}/>;
  },
});
