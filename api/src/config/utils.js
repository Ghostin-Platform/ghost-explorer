import axios from 'axios';
import conf from './conf';

export const httpGet = (url, key) => {
  return axios
    .get(url, {
      headers: {
        'content-type': 'application/json',
        'User-Agent': 'jsonrpc',
      },
    })
    .then((response) => {
      const { data } = response;
      return data[key];
    });
};

export const getCoinMarket = () => {
  return httpGet(
    'https://api.coingecko.com/api/v3/simple/price?ids=ghost-by-mcafee&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true',
    'ghost-by-mcafee'
  );
};

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

export const getChainHeight = async () => {
  const blockChainInfo = await rpcCall('getblockchaininfo');
  return blockChainInfo.blocks;
};
