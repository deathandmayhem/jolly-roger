import React from "react";
import { Outlet, useParams } from "react-router-dom";

import { useBreadcrumb } from "../hooks/breadcrumb";

const HuntersApp = React.memo(() => {
  const huntId = useParams<"huntId">().huntId!;
  useBreadcrumb({ title: "Hunters", path: `/hunts/${huntId}/hunters` });

  return <Outlet />;
});

export default HuntersApp;
