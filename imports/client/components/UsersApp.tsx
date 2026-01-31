import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { useBreadcrumb } from "../hooks/breadcrumb";

// We don't have any user specific route configuration, other than setting a
// breadcrumb.
const UsersApp = React.memo(() => {
  const { t } = useTranslation();
  useBreadcrumb({ title: t("profile.users", "Users"), path: "/users" });
  return <Outlet />;
});

export default UsersApp;
