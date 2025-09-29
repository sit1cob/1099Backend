import bcrypt from 'bcrypt';

export const password = {
  async hash(plain: string) {
    const saltRounds = 10;
    return bcrypt.hash(plain, saltRounds);
  },
  async compare(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }
};
