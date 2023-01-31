import { ESLintUtils } from '@typescript-eslint/utils';
import ts from 'typescript';

const syncModelMethods = new Set([
  /* These methods are taken from upstream Meteor */
  '_createCappedCollection',
  '_dropCollection',
  '_dropIndex',
  'createIndex',
  'findOne',
  'insert',
  'remove',
  'update',
  'upsert',

  /* These are methods that we've introduced */
  'destroy',
  'undestroy',
  'findOneDeleted',
  'findOneAllowingDeleted',
]);

const syncCursorMethods = new Set([
  'count',
  'fetch',
  'forEach',
  'map',
]);

const syncMethods = new Set([...syncModelMethods, ...syncCursorMethods]);

const isObjectType = (type: ts.Type): type is ts.ObjectType => {
  // eslint-disable-next-line no-bitwise
  return !!(type.flags & ts.TypeFlags.Object);
};

const isTypeReference = (type: ts.Type): type is ts.TypeReference => {
  // eslint-disable-next-line no-bitwise
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
    type: 'suggestion',
    schema: [],
    messages: {
      preferAsync: 'Prefer async methods over sync methods',
    },
    fixable: 'code',
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        if (node.callee.property.type !== 'Identifier') return;

        const { property } = node.callee;
        const methodName = node.callee.property.name;
        if (!syncMethods.has(methodName)) return;

        const parserServices = ESLintUtils.getParserServices(context, false);
        const checker = parserServices.program.getTypeChecker();

        const calleeType = checker.getTypeAtLocation(
          parserServices.esTreeNodeToTSNodeMap.get(node.callee.object)
        );
        const allTypes = fetchAllBaseTypes(checker, calleeType);

        const isMeteorCollection = allTypes.some((type) => {
          return type.symbol &&
            checker.getFullyQualifiedName(type.symbol) === '"meteor/mongo".Mongo.Collection';
        });
        const isMeteorCursor = allTypes.some((type) => {
          return type.symbol &&
            checker.getFullyQualifiedName(type.symbol) === '"meteor/mongo".Mongo.Cursor';
        });

        if (isMeteorCollection && syncModelMethods.has(methodName)) {
          context.report({
            node,
            messageId: 'preferAsync',
            * fix(fixer) {
              yield fixer.replaceText(property, `${property.name.replace('_', '')}Async`);
              yield fixer.insertTextBefore(node, '(await ');
              yield fixer.insertTextAfter(node, ')');
            },
          });
        } else if (isMeteorCursor && syncCursorMethods.has(methodName)) {
          context.report({
            node,
            messageId: 'preferAsync',
            fix: methodName === 'forEach' ? null : function* (fixer) {
              yield fixer.replaceText(property, `${property.name}Async`);
              yield fixer.insertTextBefore(node, '(await ');
              yield fixer.insertTextAfter(node, ')');
            },
          });
        }
      },
    };
  },
});
