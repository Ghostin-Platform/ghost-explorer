import zmq from 'zeromq';
import conf, { logger } from '../config/conf';
import { getBlockByHash } from './ghost';

const initBlockListener = (callback) => {
  const sock = zmq.socket('sub');
  const zmqHost = conf.get('app:zmq');
  sock.connect(zmqHost);
  sock.subscribe('hashblock');
  sock.on('message', async (topic, message) => {
    const blockHash = message.toString('hex');
    const block = await getBlockByHash(blockHash);
    logger.info(`[Ghost Explorer] Processing block: ${block.height}`);
    callback(block);
  });
};

export default initBlockListener;
