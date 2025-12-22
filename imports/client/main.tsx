import { Meteor } from "meteor/meteor";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { createGlobalStyle } from "styled-components";
import Routes from "./components/Routes";

const Reset = createGlobalStyle`
  @font-face {
    font-family: "Platform Emoji";
    src: local("Noto Color Emoji"), local("Apple Color Emoji"), local("Segoe UI Emoji");
    unicode-range: U+1F300-1FAFF, U+1F100-1F1FF, U+200D, U+2300-23FF, U+2600-27BF;
  }

  html {
    width: 100%;
    height: 100%;
  }

  /* Prevent mobile safari zoom */
  input[type="text"],
  textarea {
    font-size: 16px !important;
  }
`;

Meteor.startup(() => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <>
      <Reset />
      {!Meteor.isAppTest && (
        <React.StrictMode>
          <BrowserRouter>
            <Routes />
          </BrowserRouter>
        </React.StrictMode>
      )}
    </>,
  );
});
