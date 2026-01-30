// A Random.Id(), used by default as _id for Meteor collections
export const Id =
  /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17}$/;

// This regex attempts to roughly reproduce a valid absolute-URL-with-fragment
// string (as per https://url.spec.whatwg.org/#url-writing). We limit ourselves
// to requiring http or https, and take a fairly inclusive view of what is an
// acceptable domain name and URL path segment
export const URL =
  /[hH][tT][tT][pP][sS]?:\/\/((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})(:[0-9]{0,5})?(\/[a-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*)?#?/;
