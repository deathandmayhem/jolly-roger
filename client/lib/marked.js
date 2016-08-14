import marked from 'marked';

marked.InlineLexer.rules.gfm.em = /^\b_((?:__|[^_])+?)_\b/;
marked.InlineLexer.rules.gfm.strong = /^\*\b((?:\*\*|[^\*])+?)\b\*/;

const renderer = new class extends marked.Renderer {
  link(href, title, link) {
    const realLinkFunc = marked.Renderer.prototype.link.bind(this);
    return realLinkFunc(href, title, link)
      .replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
  }
}();

marked.setOptions({ renderer });
