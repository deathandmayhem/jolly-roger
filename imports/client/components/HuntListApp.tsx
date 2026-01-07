import { Outlet } from "react-router-dom";
import { useBreadcrumb } from "../hooks/breadcrumb";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse } from "@fortawesome/free-solid-svg-icons";

const HuntListApp = () => {
  useBreadcrumb({
    title: <FontAwesomeIcon icon={faHouse} />,
    path: "/hunts",
    hoverText: "List of hunts",
  });
  return <Outlet />;
};

export default HuntListApp;
