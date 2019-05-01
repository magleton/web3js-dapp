import * as request from 'web-request';
import { injectable } from 'inversify';
import config from '../config';
import 'reflect-metadata';
import { Logger } from '../logger';

/* istanbul ignore next */
@injectable()
export class AuthClient implements AuthClientInterface {
}

const AuthClientType = Symbol('AuthClientInterface');
export { AuthClientType };
