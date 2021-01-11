import zmq from 'zeromq';
import conf, { logger } from '../config/conf';
import { getBlockByHash } from './ghost';

const initBlockListener = async (callback) => {
  return new Promise((resolve, reject) => {
    const sock = zmq.socket('sub');
    const zmqHost = conf.get('app:zmq');
    sock.monitor(50, 0);
    sock.connect(zmqHost);
    sock.on('disconnect', () => {
      reject(new Error('Disconnected from ZeroMQ'));
    });
    sock.on('monitor_error', () => {
      setTimeout(() => sock.monitor(50, 0), 5000);
    });
    sock.subscribe('hashblock');
    sock.on('message', async (topic, message) => {
      const blockHash = message.toString('hex');
      const block = await getBlockByHash(blockHash);
      logger.info(`[Ghost Explorer] Processing block: ${block.height}`);
      await callback(block);
    });
  });
};

export default initBlockListener;
