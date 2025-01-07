import React from "react";
import { Outlet, useParams } from "react-router-dom";

const TagManagerApp = React.memo(() => {
  const huntId = useParams<"huntId">().huntId!;

  return <Outlet />;
});

export default TagManagerApp;
