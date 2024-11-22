import React from "react";
import { Outlet, useParams } from "react-router-dom";
import { useBreadcrumb } from "../hooks/breadcrumb";

const TagManagerApp = React.memo(() => {
  const huntId = useParams<"huntId">().huntId!;
  useBreadcrumb({ title: "Tags", path: `/hunts/${huntId}/tags` });

  return <Outlet />;
});

export default TagManagerApp;