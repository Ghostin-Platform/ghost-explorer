import * as bcrypt from 'bcrypt';
import * as R from 'ramda';
import { addInSet, delInSet, delObject, getObject, listObject, readSet, storeObject } from '../database/redis';
import { elFindByIds, elUpdateByIds, INDEX_ADDRESS } from '../database/elasticSearch';

export const ROLE_ROOT = 'ROOT';
export const ROLE_VET = 'VET';
export const ROLE_DEFAULT = 'DEFAULT';
const USER = 'user';
const ADDRESSES = 'addresses';

export const deleteUsers = (ids) => delObject(USER, ids);

export const getUsers = async () => {
  const users = await listObject('user');
  return users.map((user) => R.assoc('roles', user.roles ? user.roles.split(',') : [], user));
};

export const delUser = async (email) => {
  await delObject(USER, email);
};
export const getUser = async (email) => {
  const user = await getObject(`${USER}:${email}`);
  return user ? R.assoc('roles', user.roles ? user.roles.split(',') : [], user) : null;
};

export const createUserIfNotExists = async (email, password, roles = []) => {
  const user = await getUser(email);
  if (!user) {
    const hash = bcrypt.hashSync(password, 10);
    return storeObject(USER, email, {
      id: email,
      email,
      name: email,
      password: hash,
      addressesAlias: '',
      roles: roles.join(','),
    });
  }
  return user;
};

export const userAddress = async (email) => {
  const sets = await readSet(ADDRESSES, email);
  return sets.length > 0 ? elFindByIds(sets) : [];
};

export const updateUser = async (email, data) => {
  await storeObject(USER, email, data);
  if (data.addressesAlias !== null) {
    // Need to update all indexed address alias
    const sets = await readSet(ADDRESSES, email);
    await elUpdateByIds(sets, { alias: data.addressesAlias }, [INDEX_ADDRESS]);
  }
  return getUser(email);
};

export const userBalance = async (email) => {
  const addresses = await userAddress(email);
  return R.sum(addresses.map((a) => a.balance));
};

export const unregisterUserAddress = async (email, addressId) => {
  await delInSet(`${ADDRESSES}:${email}`, addressId);
  await elUpdateByIds([addressId], { alias: '' }, [INDEX_ADDRESS]);
  return getUser(email);
};

export const registerUserAddress = async (email, addressId) => {
  await addInSet(`${ADDRESSES}:${email}`, addressId);
  const user = await getUser(email);
  await elUpdateByIds([addressId], { alias: user.addressesAlias }, [INDEX_ADDRESS]);
};
