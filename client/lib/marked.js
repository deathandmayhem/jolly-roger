marked.InlineLexer.rules.gfm.em = /^\b_((?:__|[^_])+?)_\b/;
marked.InlineLexer.rules.gfm.strong = /^\*\b((?:\*\*|[^\*])+?)\b\*/;

const renderer = new class extends marked.Renderer {
  link(href, title, link) {
    return marked.Renderer.prototype.link.bind(this)(href, title, link).replace(/^<a /, '<a target="_blank" ');
  }
}();

marked.setOptions({renderer});
