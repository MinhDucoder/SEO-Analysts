/**
 * @file Bcrypt wrapper for password hashing (cost 12 — ~250ms/hash on
 * modern hardware). Kept as a service so it can be easily swapped for
 * argon2 or a dedicated KMS without touching call sites.
 */
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly cost = 12;

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
