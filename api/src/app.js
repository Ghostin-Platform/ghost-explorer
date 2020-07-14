import express from 'express';
// noinspection NodeJsCodingAssistanceForCoreModules
import { readFileSync } from 'fs';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import compression from 'compression';
import helmet from 'helmet';
import { isEmpty } from 'ramda';
import path from 'path';
import nconf from 'nconf';
import { logger } from './config/conf';
import createSeeMiddleware from './seeMiddleware';

const createApp = (apolloServer) => {
  // Init the http server
  const app = express();
  const sessionSecret = nconf.get('app:session_secret');
  app.use(session({ secret: sessionSecret, saveUninitialized: true, resave: true }));
  app.use(cookieParser());
  app.use(compression());
  app.use(helmet());
  app.use(bodyParser.json({ limit: '100mb' }));

  const AppBasePath = nconf.get('app:base_path');
  const basePath = isEmpty(AppBasePath) || AppBasePath.startsWith('/') ? AppBasePath : `/${AppBasePath}`;

  // -- Generated CSS with correct base path
  app.get('/static/css/*', (req, res) => {
    const data = readFileSync(path.join(__dirname, `../public${req.url}`), 'utf8');
    const withBasePath = data.replace(/%BASE_PATH%/g, basePath);
    res.header('Content-Type', 'text/css');
    res.send(withBasePath);
  });
  app.use('/static', express.static(path.join(__dirname, '../public/static')));

  const serverHealthCheck = () => {
    return new Promise((resolve) => {
      resolve();
    });
  };
  apolloServer.applyMiddleware({ app, onHealthCheck: serverHealthCheck });

  const seeMiddleware = createSeeMiddleware();
  seeMiddleware.applyMiddleware({ app });

  // Other routes
  app.get('*', (req, res) => {
    const data = readFileSync(`${__dirname}/../public/index.html`, 'utf8');
    const withOptionValued = data.replace(/%BASE_PATH%/g, basePath);
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    return res.send(withOptionValued);
  });

  // Error handling
  app.use((err, req, res, next) => {
    logger.error(`[EXPRESS] Error http call`, { error: err });
    res.redirect('/');
    next();
  });

  return app;
};

export default createApp;
