export type LoginOptions = {
  // Indication that our custom handler should be used - must set to true.
  isJrLogin?: boolean;
  // Google credentials, used either for new users (with a hunt invitation code) or existing users
  // (for standard log-in).
  googleCredentials?: {
    key: string;
    secret: string;
  };
  // Request to create a new user and sign in as that user. The hunt invitation code must be valid.
  newUserRequest?: {
    huntInvitationCode?: string;
    // Either password or Google credentials must be set in the request.
    passwordCredentials?: {
      email: string;
      passwordHash: {
        digest: string;
        algorithm: string;
      };
    };
  };
};
