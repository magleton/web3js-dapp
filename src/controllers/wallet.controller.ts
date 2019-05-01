import config from '../config';
import { Response, Request } from 'express';
import { WalletServiceType } from '../services/wallet.service';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import 'reflect-metadata';
import { AuthorizedRequest } from '../requests/authorized.request';
import { IncorrectMnemonic, InsufficientEthBalance, ExceedMaxWithdrawAmount } from '../exceptions/exceptions';
import {s_manager_wallet} from "../entities/s_manager_wallet";
import { getConnection } from 'typeorm';

const TRANSACTION_STATUS_PENDING = 'pending';

const TRANSACTION_TYPE_TOKEN_PURCHASE = 'token_purchase';

/**
 * WalletController
 */
@injectable()
@controller(
    '/wallet'
)
export class WalletController {
    constructor(
        @inject(WalletServiceType) private walletService: WalletServiceInterface,
        @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    ) {}

    /**
     * Create Wallet
     *
     * @param  req  express req object
     * @param  res  express res object
     */
    @httpPost(
        '/createWallet'
    )
    async createWallet(req: Request, res: Response): Promise<void> {
        let result;
        result = await this.walletService.createWallet();
        result.retCode = 1;
        res.json(result);
    }

    /**
     * Get Wallet Info from address
     */
    @httpPost(
        '/moneyInfo'
    )
    async getMoneyInfo(req: AuthorizedRequest, res: Response): Promise<void> {
        console.log(req.body);
        res.json({
            ethBalance: await this.web3Client.getEthBalance(req.body.eth_address),
            tokenBalance: await this.web3Client.getTokenBalanceOf(req.body.eth_address)
        });
    }

    /**
     * Send Token By Mnemonic
     */
    @httpPost(
        '/sendtokenbymnemonic'
    )
    async sendtokenbymnemonic(req: AuthorizedRequest, res: Response): Promise<void> {
        console.log('sendtokenbymnemonic');
        const account = this.web3Client.getAccountByMnemonicAndSalt(req.body.mnemonic, req.body.salt);

        const transactionHash = await this.web3Client.sendTokenByMnemonic({
            from: account.address,
            amount: req.body.sendAmount,
            to: req.body.recvAddress,
            gas: config.web3.defaultTransferGas,
            gasPrice: await this.web3Client.getCurrentGasPrice(),
            },
            req.body.mnemonic,
            req.body.salt
        );

        res.json({
            retCode: 1,
            transactionHash,
            status: TRANSACTION_STATUS_PENDING,
            type: TRANSACTION_TYPE_TOKEN_PURCHASE
        });
    }

    /**
     * Send Token By Mnemonic
     */
    @httpPost(
        '/sendtokenfromadmin'
    )
    async sendtokenfromadmin(req: AuthorizedRequest, res: Response): Promise<void> {
        const managerRepo = await getConnection().getRepository(s_manager_wallet);
        const manager = await managerRepo.findOne({id: 1});

        const transactionHash = await this.web3Client.sendTokenByMnemonic({
                from: manager.eth_address,
                amount: req.body.sendAmount,
                to: req.body.recvAddress,
                gas: config.web3.defaultTransferGas,
                gasPrice: await this.web3Client.getCurrentGasPrice(),
            },
            manager.mnemonic,
            manager.salt
        );

        res.json({
            retCode: 1,
            transactionHash,
            status: TRANSACTION_STATUS_PENDING,
            type: TRANSACTION_TYPE_TOKEN_PURCHASE
        });
    }
    /**
     * Get Transfer Fee
     */
    @httpPost(
        '/transferTxFee'
    )
    async getCurrentTransferFee(req: Request, res: Response): Promise<void> {
        res.json(await this.web3Client.transferFee());
    }
}
