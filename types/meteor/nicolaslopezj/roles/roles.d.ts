/* eslint-disable no-restricted-globals */
declare module 'meteor/nicolaslopezj:roles' {
  type RuleFuncThis = { userId: string };
  type RuleFunc = (this: RuleFuncThis, ...args: any[]) => boolean;
  type Rule = RuleFunc | boolean

  export module Roles {
    const Role: RoleStatic;
    interface RoleStatic {
      new (name: string): Role
    }
    interface Role {
      name: string;

      allow(action: string, func: Rule): void;
      deny(action: string, func: Rule): void;
    }

    const adminRole: Role;
    const loggedInRole: Role;
    const notAdminRole: Role;
    const notLoggedInRole: Role;
    const allRole: Role;

    function availableRoles(): string[];
    function userHasRole(userId: string, role: string): boolean;
    function registerAction(name: string, adminAllow?: Rule, adminDeny?: Rule): void;
    function getUserRoles(userId: string | null | undefined, includeSpecial?: boolean): string[];

    function allow(userId: string | null | undefined, action: string, ...args: any[]): boolean;
    function deny(userId: string | null | undefined, action: string, ...args: any[]): boolean;
    function userHasPermission(
      userId: string | null | undefined,
      action: string, ...args: any[]
    ): boolean;
    function checkPermission(
      userId: string | null | undefined,
      action: string, ...args: any[]
    ): void;

    // server-only methods, but no way to indicate that in ambient type files
    function addUserToRoles(userId: string, roles: string | string[]): void;
    function setUserRoles(userId: string, roles: string | string[]): void;
    function removeUserFromRoles(userId: string, roles: string | string[]): void;
  }
}
