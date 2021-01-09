import { GraphQLDateTime } from 'graphql-iso-date';
import { mergeResolvers } from 'merge-graphql-schemas';
import { makeExecutableSchema } from 'graphql-tools';
import { constraintDirective } from 'graphql-constraint-directive';
import AuthDirectives, { AUTH_DIRECTIVE } from './authDirective';
import typeDefs from '../../config/schema/ghost.graphql';
import infoResolver from '../resolvers/info';
import addressResolver from '../resolvers/address';
import txResolver from '../resolvers/transaction';
import userResolver from '../resolvers/user';

const createSchema = () => {
  const globalResolvers = {
    DateTime: GraphQLDateTime,
  };

  const resolvers = mergeResolvers([globalResolvers, userResolver, infoResolver, addressResolver, txResolver]);

  return makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      [AUTH_DIRECTIVE]: AuthDirectives,
    },
    schemaTransforms: [constraintDirective()],
    inheritResolversFromInterfaces: true,
  });
};

export default createSchema;
