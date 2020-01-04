import marked from 'marked';

(marked.InlineLexer.rules.gfm as marked.Rules).em = /^\b_((?:__|[^_])+?)_\b/;
(marked.InlineLexer.rules.gfm as marked.Rules).strong = /^\*\b((?:\*\*|[^*])+?)\b\*/;

const renderer = new class extends marked.Renderer {
  link(href: string, title: string, link: string) {
    const realLinkFunc = marked.Renderer.prototype.link.bind(this);
    return realLinkFunc(href, title, link)
      .replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
  }
}();

marked.setOptions({ renderer });
