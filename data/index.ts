/**
 * Sample data access layer (in-memory, Demo only).
 * Pages should read data through these functions, not import the arrays
 * directly, so the source can later be swapped for a real API/database.
 */
import { users } from "./users";
import { demoAccounts } from "./accounts";

export const getUsers = () => users;
export const getUserById = (id: string) => users.find((u) => u.id === id);

export const getDemoAccounts = () => demoAccounts;

/** Returns the user for valid demo credentials, otherwise undefined. */
export const verifyCredentials = (username: string, password: string) => {
  const account = demoAccounts.find(
    (a) => a.username === username.trim().toLowerCase() && a.password === password,
  );
  return account ? getUserById(account.userId) : undefined;
};
