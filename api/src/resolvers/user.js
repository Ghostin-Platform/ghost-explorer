import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import conf from '../config/conf';
import { verifyMessage } from '../database/ghost';
import {
  createUserIfNotExists,
  delUser,
  getUser,
  getUsers,
  registerUserAddress,
  unregisterUserAddress,
  updateUser,
  userAddress,
  userBalance,
} from '../domain/user';

const setAuthenticationCookie = (token, expires, res) => {
  if (res) {
    const end = new Date(expires * 1000);
    const cookieOpts = {
      httpOnly: true,
      expires: end,
      secure: conf.get('app:cookie_secure'),
    };
    res.cookie('ghostin', token, cookieOpts);
  }
};

const userResolver = {
  Query: {
    users: () => getUsers(),
    me: (_, args, { user }) => getUser(user.email),
  },
  Me: {
    addresses: (me) => userAddress(me.email),
    balance: (me) => userBalance(me.email),
  },
  Mutation: {
    login: async (_, { email, password }, context) => {
      const user = await getUser(email);
      if (!user) return null;
      const match = bcrypt.compareSync(password, user.password);
      if (!match) return null;
      const exp = Math.floor(Date.now() / 1000) + 60 * 60;
      const token = jwt.sign({ data: { user }, exp }, conf.get('app:secret'));
      setAuthenticationCookie(token, exp, context.res);
      return user;
    },
    logout: (_, args, context) => {
      context.res.clearCookie('ghostin');
      return true;
    },
    deleteUser: async (_, { email }) => {
      await delUser(email);
      return getUsers();
    },
    addUser: async (_, { email, password }) => {
      await createUserIfNotExists(email, password);
      return getUsers();
    },
    updateUser: async (_, { name, addressesAlias }, { user }) => {
      return updateUser(user.email, { name, addressesAlias });
    },
    unregisterAddress: async (_, { address }, { user }) => {
      return unregisterUserAddress(user.id, address);
    },
    registerAddress: async (_, { address, signature }, { user }) => {
      const isValid = await verifyMessage(address, signature, 'register');
      if (isValid) {
        await registerUserAddress(user.id, address);
      }
      return user;
    },
  },
};

export default userResolver;
