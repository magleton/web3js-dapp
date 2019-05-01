import { Container } from 'inversify';
import { WalletController} from './controllers/wallet.controller';

import { interfaces, TYPE } from 'inversify-express-utils';
import { WalletService, WalletServiceType } from './services/wallet.service';
import { AuthClientType, AuthClient } from './services/auth.client';

import { Web3ClientInterface, Web3ClientType, Web3Client } from './services/web3.client';

import { Auth } from './middlewares/auth';
import config from './config';
import * as express from 'express';
import * as validation from './middlewares/request.validation';
import { Web3HandlerType, Web3HandlerInterface, Web3Handler } from './events/handlers/web3.handler';
import { TransactionService, TransactionServiceInterface, TransactionServiceType } from './services/transaction.service';

let container = new Container();
container.bind<Web3ClientInterface>(Web3ClientType).to(Web3Client).inSingletonScope();
container.bind<TransactionServiceInterface>(TransactionServiceType).to(TransactionService).inSingletonScope();

container.bind<Web3HandlerInterface>(Web3HandlerType).toConstantValue(new Web3Handler(
    container.get<TransactionServiceInterface>(TransactionServiceType)
));

container.bind<AuthClientInterface>(AuthClientType).toConstantValue(new AuthClient());
container.bind<WalletServiceInterface>(WalletServiceType).to(WalletService).inSingletonScope();

const auth = new Auth(container.get<AuthClientInterface>(AuthClientType));
// middlewares
container.bind<express.RequestHandler>('AuthMiddleware').toConstantValue(
    (req: any, res: any, next: any) => auth.authenticate(req, res, next)
);

container.bind<express.RequestHandler>('WithdrawalValidation').toConstantValue(
    (req: any, res: any, next: any) => validation.withdrawal(req, res, next)
);
container.bind<express.RequestHandler>('SendtokenValidation').toConstantValue(
    (req: any, res: any, next: any) => validation.sendtoken(req, res, next)
);
container.bind<express.RequestHandler>('OnlyJumioIp').toConstantValue(
  (req: any, res: any, next: any) => validation.onlyJumioIp(req, res, next)
);
container.bind<express.RequestHandler>('ResendVerificationValidation').toConstantValue(
  (req: any, res: any, next: any) => validation.resendVerification(req, res, next)
);
container.bind<express.RequestHandler>('OnlyAcceptApplicationJson').toConstantValue(
  (req: any, res: any, next: any) => validation.onlyAcceptApplicationJson(req, res, next)
);

// controllers
container.bind<interfaces.Controller>(TYPE.Controller).to(WalletController).whenTargetNamed('WalletController');

export { container };
