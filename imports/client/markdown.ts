import DOMPurify from 'dompurify';
import { marked, Renderer } from 'marked';

const renderer = new class extends Renderer {
  link(href: string, title: string, link: string) {
    return super.link(href, title, link)
      .replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
  }
}();

export default function markdown(text: string) {
  return marked(DOMPurify.sanitize(text), { renderer });
}
