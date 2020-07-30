import { logger } from './config/conf';

export const EVENT_NEW_BLOCK = 'new_block';
export const EVENT_NEW_TX = 'new_transaction';

export const EVENT_MEMPOOL_ADDED = 'new_mempool';
export const EVENT_MEMPOOL_REMOVED = 'del_mempool';

export const EVENT_UPDATE_INFO = 'update_info';

let clients = [];
const createSeeMiddleware = () => {
  const eventsHandler = (req, res) => {
    const clientId = Date.now();
    const client = {
      id: clientId,
      sendEvent: (event, data) => {
        if (req.finished) {
          logger.info('Trying to write on an already terminated response', { id: client.id });
          return;
        }
        let message = `event: ${event}\n`;
        message += 'data: ';
        message += JSON.stringify(data);
        message += '\n\n';
        res.write(message);
        res.flush();
      },
      close: () => {
        try {
          res.end();
        } catch (e) {
          logger.error(e, 'Failing to close client', { clientId: client.id });
        }
      },
    };
    // Prevent connection timeout
    const intervalId = setInterval(() => {
      res.write(`:\n\n`);
    }, 30000);
    req.on('close', () => {
      clients = clients.filter((c) => c.id !== clientId);
      clearInterval(intervalId);
    });
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-transform', // no-transform is required for dev proxy
    });
    clients.push(client);
  };
  return {
    applyMiddleware: ({ app }) => {
      app.get('/events', eventsHandler);
    },
  };
};

export const broadcast = (event, data) => {
  for (let index = 0; index < clients.length; index += 1) {
    const client = clients[index];
    client.sendEvent(event, data);
  }
};

export default createSeeMiddleware;
