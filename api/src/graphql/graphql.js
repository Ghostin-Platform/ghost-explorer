import * as jwt from 'jsonwebtoken';
import { ApolloServer } from 'apollo-server-express';
import { formatError as apolloFormatError } from 'apollo-errors';
import { GraphQLError } from 'graphql';
import { dissocPath } from 'ramda';
import createSchema from './schema';
import conf, { DEV_MODE } from '../config/conf';
import { UnknownError, ValidationError } from '../config/errors';
import loggerPlugin from './loggerPlugin';

const createApolloServer = () => {
  return new ApolloServer({
    schema: createSchema(),
    introspection: true,
    playground: {
      settings: {
        'request.credentials': 'same-origin',
      },
    },
    tracing: DEV_MODE,
    async context({ req, res, connection }) {
      if (connection) return { user: connection.context.user }; // For websocket connection.
      const token = req.cookies ? req.cookies.ghostin : null;
      if (!token) return { res, user: null };
      try {
        const decoded = jwt.verify(token, conf.get('app:secret'));
        return { res, user: decoded.data.user };
      } catch {
        return { res, user: null };
      }
    },
    plugins: [loggerPlugin],
    formatError: (error) => {
      let e = apolloFormatError(error);
      if (e instanceof GraphQLError) {
        const errorCode = e.extensions.exception.code;
        if (errorCode === 'ERR_GRAPHQL_CONSTRAINT_VALIDATION') {
          const { fieldName } = e.extensions.exception;
          const ConstraintError = ValidationError(fieldName);
          e = apolloFormatError(ConstraintError);
        } else {
          e = apolloFormatError(UnknownError(errorCode));
        }
      }
      // Remove the exception stack in production.
      return DEV_MODE ? e : dissocPath(['extensions', 'exception'], e);
    },
  });
};

export default createApolloServer;
