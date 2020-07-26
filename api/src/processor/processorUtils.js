import { fetch } from '../database/redis';

const streamFromResolver = async (position) => {
  const from = await fetch(position);
  if (!from) return '0-0';
  return from;
};

export default streamFromResolver;
