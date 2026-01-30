// A Random.Id(), used by default as _id for Meteor collections
export const Id =
  /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17}$/;

// This regex attempts to roughly reproduce a valid absolute-URL-with-fragment
// string (as per https://url.spec.whatwg.org/#url-writing). We limit ourselves
// to requiring http or https, and take a fairly inclusive view of what is an
// acceptable domain name and URL path segment
export const Url =
  /^[hH][tT][tT][pP][sS]?:\/\/(?:[^\s/?#@]+@)?(?:(?:[a-zA-Z0-9][a-zA-Z0-9_-]{0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9][a-zA-Z0-9_-]{0,61}[a-zA-Z0-9]?\.?|\[[0-9a-fA-F:.]+\])(?::[0-9]{0,5})?(?:[/?#][\s\S]*)?$/;
