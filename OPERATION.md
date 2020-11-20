# Jolly Roger deployment

(This document is a work in progress, and is currently incomplete.)

This document describes how to deploy and operate a production-grade Jolly Roger instance.

You will need:

* A MongoDB instance.
* Compute nodes on which to run the Meteor node.js backend.
* A reverse proxy to do HTTPS termination and forward traffic to the Meteor backend.
* A domain name which resolves to the IP address of the reverse proxy.
* A way to send automated email, for onboarding and password reset flows.
* A Google account and OAuth application, for automated document creation and sharing.

You may optionally add:

* A Kerberos keytab for mailinglist integration.

TODO: finish writing about what's needed for a production build/deployment
