import axios from 'axios';
import conf from './conf';

export const rpcCall = async (method, params, wallet = null) => {
  const baseURL = conf.get('app:daemon_rpc:uri');
  const dataParams = JSON.stringify({ id: 2, method, params });
  return axios
    .post(wallet ? `/wallet/${wallet}` : '/', dataParams, {
      baseURL,
      withCredentials: true,
      headers: {
        'content-type': 'application/json',
        'User-Agent': 'jsonrpc',
      },
      auth: {
        username: conf.get('app:daemon_rpc:user'),
        password: conf.get('app:daemon_rpc:pass'),
      },
    })
    .then((response) => {
      const { data } = response;
      if (data.error) throw Error(data.error);
      return data.result;
    })
    .catch((err) => {
      const { error } = err.response.data;
      if (error.code === -1 || error.code === -5 || error.code === -8) return null;
      throw Error(err);
    });
};

export const getTransaction = (txId) => rpcCall('getrawtransaction', [txId, 1]);

export const getChainHeight = async () => {
  const blockChainInfo = await rpcCall('getblockchaininfo');
  return blockChainInfo.blocks;
};
