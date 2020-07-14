import { GraphQLDateTime } from 'graphql-iso-date';
import { mergeResolvers } from 'merge-graphql-schemas';
import { makeExecutableSchema } from 'graphql-tools';
import ConstraintDirective from 'graphql-constraint-directive';
import AuthDirectives, { AUTH_DIRECTIVE } from './authDirective';
import typeDefs from '../../config/schema/ghost.graphql';
import infoResolver from '../resolvers/info';

const createSchema = () => {
  const globalResolvers = {
    DateTime: GraphQLDateTime,
  };

  const resolvers = mergeResolvers([globalResolvers, infoResolver]);

  return makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      [AUTH_DIRECTIVE]: AuthDirectives,
      constraint: ConstraintDirective,
    },
    inheritResolversFromInterfaces: true,
  });
};

export default createSchema;
