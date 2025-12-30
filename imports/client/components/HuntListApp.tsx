import { Outlet } from "react-router-dom";
import { useBreadcrumb } from "../hooks/breadcrumb";

const HuntListApp = () => {
  useBreadcrumb({ title: "Hunts", path: "/hunts" });
  return <Outlet />;
};

export default HuntListApp;
