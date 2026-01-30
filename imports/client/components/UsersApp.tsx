import React from "react";
import { Outlet } from "react-router-dom";

import { useBreadcrumb } from "../hooks/breadcrumb";

// We don't have any user specific route configuration, other than setting a
// breadcrumb.
const UsersApp = React.memo(() => {
  useBreadcrumb({ title: "Users", path: "/users" });
  return <Outlet />;
});

export default UsersApp;
