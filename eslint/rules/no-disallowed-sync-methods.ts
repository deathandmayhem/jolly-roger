import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";
import ts from "typescript";

const bannedMethods: Map<
  string /* fully qualified base type */,
  Map<string /* method name */, string /* replacement method name */>
> = new Map([
  [
    '"meteor/mongo".Mongo.Collection',
    new Map([
      ["_createCappedCollection", "createCappedCollectionAsync"],
      ["_dropCollection", "dropCollectionAsync"],
      ["_dropIndex", "dropIndexAsync"],
      ["createIndex", "createIndexAsync"],
      ["findOne", "findOneAsync"],
      ["insert", "insertAsync"],
      ["remove", "removeAsync"],
      ["update", "updateAsync"],
      ["upsert", "upsertAsync"],
    ]),
  ],
  [
    '"meteor/mongo".Mongo.Cursor',
    new Map([
      ["count", "countAsync"],
      ["fetch", "fetchAsync"],
      ["forEach", "forEachAsync"],
      ["map", "mapAsync"],
    ]),
  ],
  [
    '"meteor/accounts-base".Accounts',
    new Map([
      ["createUser", "createUserAsync"],
      ["setPassword", "setPasswordAsync"],
    ]),
  ],
  [
    '"meteor/meteor".Meteor',
    new Map([
      ["user", "userAsync"],
      ["call", "callAsync"],
      ["apply", "applyAsync"],
    ]),
  ],
  ['"meteor/email".Email', new Map([["send", "sendAsync"]])],

  // This is a somewhat unfortunate footgun, but TypeScript resolves the fully
  // qualified name differently depending on whether the object is exported as
  // part of its declaration or as a separate statement.
  ["Model", new Map([["findOne", "findOneAsync"]])],
  [
    "SoftDeletedModel",
    new Map([
      ["findOne", "findOneAsync"],
      ["findOneDeleted", "findOneDeletedAsync"],
      ["findOneAllowingDeleted", "findOneAllowingDeletedAsync"],
      ["destroy", "destroyAsync"],
      ["undestroy", "undestroyAsync"],
    ]),
  ],
  ["Flags", new Map([["active", "activeAsync"]])],
  ["TypedMethod", new Map([["call", "callAsync"]])],
]);

const cleanupFullyQualifiedName = (name: string) => {
  // At some point, Meteor's types started returning absolute paths (e.g.
  // "/Users/evan/src/jolly-roger/.meteor/local/types/node_modules/package-types/mongo/package/os/packages/mongo/mongo")
  // so clean that up

  const match = name.match(/".*\/.meteor\/local\/types\/node_modules\/package-types\/([^\/]+)\/.*"/);
  if (!match) return name;
  return name.replace(/"[^"]+"/, `"meteor/${match[1]}"`);
}

const findParent = <T extends ts.Node>(
  node: ts.Node,
  predicate: (node: ts.Node) => node is T,
) => {
  let current: ts.Node | undefined = node;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return undefined;
};

const allSyncMethods = [...bannedMethods.values()].reduce((acc, map) => {
  map.forEach((_, key) => acc.add(key));
  return acc;
}, new Set<string>());

const isObjectType = (type: ts.Type): type is ts.ObjectType => {
  return !!(type.flags & ts.TypeFlags.Object);
};

const isTypeReference = (type: ts.Type): type is ts.TypeReference => {
  return isObjectType(type) && !!(type.objectFlags & ts.ObjectFlags.Reference);
};

const fetchAllBaseTypes = (checker: ts.TypeChecker, type: ts.Type) => {
  const types: ts.Type[] = [];
  const visit = (t: ts.Type) => {
    // It shouldn't be possible for a type to not have a symbol, but it seems to
    // happen with (at least) const arrays
    if (!t.symbol) return;

    const realType = isTypeReference(t) ? t.target : t;

    types.push(realType);

    if (realType.isClassOrInterface()) {
      checker.getBaseTypes(realType).forEach(visit);
    }
  };
  visit(type);
  return types;
};

export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      preferAsync: "Prefer async methods over sync methods",
    },
    fixable: "code",
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (node.callee.property.type !== AST_NODE_TYPES.Identifier) return;

        const { property } = node.callee;
        const methodName = node.callee.property.name;
        if (!allSyncMethods.has(methodName)) return;

        const parserServices = ESLintUtils.getParserServices(context, false);
        const checker = parserServices.program.getTypeChecker();

        // See if we're in the middle of defining a forbidden method - forbidden
        // methods are allowed to call forbidden methods!
        const currentDeclarationMethod = findParent(
          parserServices.esTreeNodeToTSNodeMap.get(node),
          (n): n is ts.MethodDeclaration =>
            n.kind === ts.SyntaxKind.MethodDeclaration,
        );
        const currentDeclarationType = currentDeclarationMethod?.parent
          ? checker.getTypeAtLocation(currentDeclarationMethod.parent)
          : undefined;
        if (currentDeclarationMethod && currentDeclarationType?.symbol) {
          const currentDeclarationTypeName = checker.getFullyQualifiedName(
            currentDeclarationType.symbol,
          );
          const currentDeclarationMethodName =
            currentDeclarationMethod.name.getText();
          if (
            bannedMethods
              .get(currentDeclarationTypeName)
              ?.get(currentDeclarationMethodName)
          ) {
            return;
          }
        }

        const calleeType = checker.getTypeAtLocation(
          parserServices.esTreeNodeToTSNodeMap.get(node.callee.object),
        );
        const allTypes = fetchAllBaseTypes(checker, calleeType);

        for (const type of allTypes) {
          if (!type.symbol) continue;

          const bannedMethodsForType = bannedMethods.get(
            cleanupFullyQualifiedName(checker.getFullyQualifiedName(type.symbol)),
          );
          if (!bannedMethodsForType) continue;

          const replacement = bannedMethodsForType.get(methodName);
          if (!replacement) continue;

          context.report({
            node,
            messageId: "preferAsync",
            *fix(fixer) {
              yield fixer.replaceText(property, replacement);
              yield fixer.insertTextBefore(node, "(await ");
              yield fixer.insertTextAfter(node, ")");
            },
          });
        }
      },
    };
  },
});
