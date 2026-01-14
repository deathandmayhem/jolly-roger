// A Random.Id(), used by default as _id for Meteor collections
export const Id =
  /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17}$/;

// An email address as described by
// https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
export const Email =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export const UUID =
  /^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[1-5][a-fA-F0-9]{3}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}|00000000-0000-0000-0000-000000000000)$/;

// This regex attempts to roughly reproduce a valid absolute-URL-with-fragment
// string (as per https://url.spec.whatwg.org/#url-writing). We limit ourselves
// to requiring http or https, and take a fairly inclusive view of what is an
// acceptable domain name and URL path segment
export const Url =
  /[hH][tT][tT][pP][sS]?:\/\/((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})(:[0-9]{0,5})?(\/[a-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*)?#?/;
