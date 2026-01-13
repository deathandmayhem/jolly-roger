import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { useBreadcrumb } from "../hooks/breadcrumb";

const HuntListApp = () => {
  const { t } = useTranslation("HuntListPage");
  useBreadcrumb({ title: t("breadcrumbTitle", "Hunts"), path: "/hunts" });
  return <Outlet />;
};

export default HuntListApp;
