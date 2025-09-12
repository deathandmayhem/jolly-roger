import DOMPurify from "dompurify";
import { marked, Renderer, type Tokens } from "marked";
import React from "react";

const renderer = new (class extends Renderer {
  link(linkToken: Tokens.Link) {
    return super
      .link(linkToken)
      .replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
  }
})();

export interface AsProp<As extends React.ElementType = React.ElementType> {
  as?: As;
}

const Markdown = <As extends React.ElementType = "div">({
  as,
  text,
  ...rest
}: AsProp<As> & { text: string } & React.ComponentPropsWithRef<As>) => {
  const formatted = marked(DOMPurify.sanitize(text), { renderer });
  const Component = as ?? "div";
  return (
    <Component dangerouslySetInnerHTML={{ __html: formatted }} {...rest} />
  );
};

export default Markdown;
