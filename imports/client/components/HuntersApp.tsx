import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router-dom";
import { useBreadcrumb } from "../hooks/breadcrumb";

const HuntersApp = React.memo(() => {
  const { t } = useTranslation();
  const huntId = useParams<"huntId">().huntId!;
  useBreadcrumb({
    title: t("hunterList.breadcrumbTitle", "Hunters"),
    path: `/hunts/${huntId}/hunters`,
  });

  return <Outlet />;
});

export default HuntersApp;
