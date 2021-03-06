import { Meteor } from 'meteor/meteor';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import ListGroupItem from 'react-bootstrap/ListGroupItem';
import * as RRBS from 'react-router-bootstrap';
import { ProfileType } from '../../lib/schemas/profiles';

interface ProfileListProps {
  huntId?: string;
  canInvite?: boolean;
  canSyncDiscord?: boolean;
  profiles: ProfileType[];
}

interface ProfileListState {
  searchString: string;
}

class ProfileList extends React.Component<ProfileListProps, ProfileListState> {
  private searchBarRef: React.RefObject<HTMLInputElement>

  constructor(props: ProfileListProps) {
    super(props);
    this.state = {
      searchString: '',
    };
    this.searchBarRef = React.createRef();
  }

  componentDidMount() {
    window.addEventListener('keydown', this.maybeStealCtrlF);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.maybeStealCtrlF);
  }

  maybeStealCtrlF = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      const node = this.searchBarRef.current;
      if (node) {
        node.focus();
      }
    }
  };

  // The type annotation on FormControl is wrong here - the event is from the
  // input element, not the FormControl React component
  onSearchStringChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      searchString: e.currentTarget.value,
    });
  };

  compileMatcher = () => {
    const searchKeys = this.state.searchString.split(' ');
    const toMatch = searchKeys.filter(Boolean).map((s) => s.toLowerCase());
    const isInteresting = (profile: ProfileType) => {
      for (let i = 0; i < toMatch.length; i++) {
        const searchKey = toMatch[i];
        if (profile.displayName.toLowerCase().indexOf(searchKey) === -1 &&
            profile.primaryEmail.toLowerCase().indexOf(searchKey) === -1 &&
            (!profile.phoneNumber || profile.phoneNumber.toLowerCase().indexOf(searchKey) === -1)) {
          return false;
        }
      }

      return true;
    };

    return isInteresting;
  };

  clearSearch = () => {
    this.setState({
      searchString: '',
    });
  };

  syncDiscordButton = () => {
    if (!this.props.huntId || !this.props.canSyncDiscord) {
      return null;
    }

    return (
      <FormGroup>
        <Button variant="warning" onClick={this.syncDiscord}>
          Sync this hunt&apos;s Discord role
        </Button>
        <FormText>
          (Click this if people are reporting that they can&apos; access hunt-specific channels)
        </FormText>
      </FormGroup>
    );
  }

  syncDiscord = () => {
    Meteor.call('syncDiscordRole', this.props.huntId);
  }

  inviteToHuntItem = () => {
    if (!this.props.huntId || !this.props.canInvite) {
      return null;
    }

    return (
      <RRBS.LinkContainer to={`/hunts/${this.props.huntId}/hunters/invite`}>
        <ListGroupItem action>
          <strong>Invite someone...</strong>
        </ListGroupItem>
      </RRBS.LinkContainer>
    );
  };

  globalInfo = () => {
    if (this.props.huntId) {
      return null;
    }

    return (
      <Alert variant="info">
        This shows everyone registered on Jolly Roger, not just those hunting in this year&apos;s
        Mystery Hunt. For that, go to the hunt page and click on &quot;Hunters&quot;.
      </Alert>
    );
  };

  render() {
    const profiles = this.props.profiles.filter(this.compileMatcher());
    return (
      <div>
        <h1>List of hunters</h1>
        <div className="profiles-summary">
          <div>
            Total hunters:
            {' '}
            {this.props.profiles.length}
          </div>
        </div>

        {this.syncDiscordButton()}

        <FormGroup>
          <FormLabel htmlFor="jr-profile-list-search">
            Search
          </FormLabel>
          <InputGroup>
            <FormControl
              id="jr-profile-list-search"
              type="text"
              ref={this.searchBarRef}
              placeholder="search by name..."
              value={this.state.searchString}
              onChange={this.onSearchStringChange}
            />
            <InputGroup.Append>
              <Button variant="secondary" onClick={this.clearSearch}>
                <FontAwesomeIcon icon={faEraser} />
              </Button>
            </InputGroup.Append>
          </InputGroup>
        </FormGroup>

        {this.globalInfo()}

        <ListGroup>
          {this.inviteToHuntItem()}
          {profiles.map((profile) => (
            <RRBS.LinkContainer key={profile._id} to={`/users/${profile._id}`}>
              <ListGroupItem action>
                {profile.displayName || '<no name provided>'}
              </ListGroupItem>
            </RRBS.LinkContainer>
          ))}
        </ListGroup>
      </div>
    );
  }
}

export default ProfileList;
