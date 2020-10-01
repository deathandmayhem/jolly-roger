import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import ListGroupItem from 'react-bootstrap/ListGroupItem';
import * as RRBS from 'react-router-bootstrap';
import { ProfileType } from '../../lib/schemas/profiles';

interface ProfileListProps {
  huntId?: string;
  canInvite?: boolean;
  profiles: ProfileType[];
}

interface ProfileListState {
  searchString: string;
}

class ProfileList extends React.Component<ProfileListProps, ProfileListState> {
  constructor(props: ProfileListProps) {
    super(props);
    this.state = {
      searchString: '',
    };
  }

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
            (!profile.slackHandle || profile.slackHandle.toLowerCase().indexOf(searchKey) === -1) &&
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

  inviteToHuntItem = () => {
    if (!this.props.huntId || !this.props.canInvite) {
      return null;
    }

    return (
      <RRBS.LinkContainer to={`/hunts/${this.props.huntId}/hunters/invite`}>
        <ListGroupItem>
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

        <FormGroup>
          <FormLabel htmlFor="jr-profile-list-search">
            Search
          </FormLabel>
          <InputGroup>
            <FormControl
              id="jr-profile-list-search"
              type="text"
              placeholder="search by name..."
              value={this.state.searchString}
              onChange={this.onSearchStringChange}
            />
            <InputGroup.Append>
              <Button variant="outline-secondary" onClick={this.clearSearch}>
                Clear
              </Button>
            </InputGroup.Append>
          </InputGroup>
        </FormGroup>

        {this.globalInfo()}

        <ListGroup>
          {this.inviteToHuntItem()}
          {profiles.map((profile) => (
            <RRBS.LinkContainer key={profile._id} to={`/users/${profile._id}`}>
              <ListGroupItem>
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
