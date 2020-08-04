import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import compression from 'compression';
import helmet from 'helmet';
import nconf from 'nconf';
import { logger } from './config/conf';
import createSeeMiddleware from './middleware/seeMiddleware';

const FRONT_BUILD_PATH = './public';

const createApp = (apolloServer) => {
  // Init the http server
  const app = express();
  const sessionSecret = nconf.get('app:session_secret');
  app.use(session({ secret: sessionSecret, saveUninitialized: true, resave: true }));
  app.use(cookieParser());
  app.use(compression());
  app.use(helmet());
  app.use(bodyParser.json({ limit: '100mb' }));

  app.use('/', express.static(FRONT_BUILD_PATH));

  const serverHealthCheck = () => {
    return new Promise((resolve) => {
      resolve();
    });
  };
  apolloServer.applyMiddleware({ app, onHealthCheck: serverHealthCheck });

  const seeMiddleware = createSeeMiddleware();
  seeMiddleware.applyMiddleware({ app });

  // Other routes
  const deliverIndexHtml = (res) => res.sendFile('index.html', { root: FRONT_BUILD_PATH });
  app.all('*', (req, res) => deliverIndexHtml(res));

  // Error handling
  app.use((err, req, res, next) => {
    logger.error(`[EXPRESS] Error http call`, { error: err });
    res.redirect('/');
    next();
  });

  return app;
};

export default createApp;
