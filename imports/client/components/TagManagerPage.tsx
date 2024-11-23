import { useTracker } from "meteor/react-meteor-data";
import React from "react";
import { useParams } from "react-router-dom";
import Tags from "../../lib/models/Tags";

const TagManagerPage = () => {
  const huntId = useParams<"huntId">().huntId!;

  const tags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );

  return (
    <div id='tags'>
      <h1>Tags</h1>
      {(
        <div>
          <ul>
          {/* {tags.map( (t) => {return <li>tag:{t.name}</li>} )} */}
          {tags.length}1
          </ul>
        </div>
      )}
    </div>
  )
}

export default TagManagerPage;
