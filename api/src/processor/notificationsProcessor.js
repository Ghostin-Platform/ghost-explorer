/* eslint-disable no-await-in-loop */
import { listenNotifications } from '../database/redis';
import { broadcast } from '../seeMiddleware';
import { getNetworkInfo } from '../database/ghost';

const EVENT_UPDATE_INFO = 'update_info';

const notificationsProcessor = async () => {
  await listenNotifications(async ({ key, data }) => {
    await broadcast(key, data);
    const networkInfo = await getNetworkInfo();
    await broadcast(EVENT_UPDATE_INFO, networkInfo);
  });
};

export default notificationsProcessor;
