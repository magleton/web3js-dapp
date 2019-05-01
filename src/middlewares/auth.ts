import { Response, NextFunction } from 'express';
import { AuthorizedRequest } from '../requests/authorized.request';
import { getConnection } from 'typeorm';

export class Auth {
  /**
   * constructor
   */
  constructor(
      private authClient: AuthClientInterface
  ) { }

  async authenticate(req: AuthorizedRequest, res: Response, next: NextFunction) {
    try {
      return next();
    } catch (e) {
      return this.notAuthorized(res);
    }
  }

  notAuthorized(res: Response) {
    return  res.json({
      status: 401,
      message: 'Not Authorized'
    });
  }
}
