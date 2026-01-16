import { hash, compare } from "bcryptjs";

export function hashInviteCode(code: string) {
  return hash(code, 10);
}

export function verifyInviteCode(code: string, hashValue: string) {
  return compare(code, hashValue);
}
