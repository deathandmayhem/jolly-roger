import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router-dom";
import { useBreadcrumb } from "../hooks/breadcrumb";

const HuntersApp = React.memo(() => {
  const { t } = useTranslation("ProfileList");
  const huntId = useParams<"huntId">().huntId!;
  useBreadcrumb({
    title: t("breadcrumbTitle", "Hunters"),
    path: `/hunts/${huntId}/hunters`,
  });

  return <Outlet />;
});

export default HuntersApp;
