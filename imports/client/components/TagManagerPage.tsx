import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import React from "react";
import { useParams } from "react-router-dom";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import Tags from "../../lib/models/Tags";
import { userMayCreateHunt } from "../../lib/permission_stubs";

const TagManagerPage = () => {
  const hunts = useTracker(() =>
    Tags.find({}, {sort: { name: 1 }}).fetch(),
  );

  const canAdd = useTracker(() => {
    return userMayCreateHunt(Meteor.user());
  }, []);





}

export default TagManagerPage;
