import { Web3ClientType, Web3ClientInterface } from './web3.client';

import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import {translateCustomMessage} from '../helpers/helpers';

import config from '../config';
import { getConnection } from 'typeorm';
import * as bcrypt from 'bcrypt-nodejs';
import { Logger } from '../logger';


/**
 * WalletService
 */
@injectable()
export class WalletService implements WalletServiceInterface {
    private logger = Logger.getInstance('WALLET_SERVICE');

    /**
     * constructor
     */
    constructor(
        @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    ) { }

    /**
     * Save user's data
     *
     * @param userData user info
     * @return promise
     */
    async createWallet(): Promise<Wallet> {

        const mnemonic = this.web3Client.generateMnemonic();
        const salt = bcrypt.genSaltSync();
        const account = this.web3Client.getAccountByMnemonicAndSalt(mnemonic, salt);

        let resultWallets: Wallet = {
                ticker: 'ETH',
                address: account.address,
                balance: '0',
                mnemonic: mnemonic,
                privateKey: account.privateKey,
                salt: salt
            };


        return resultWallets;
    }
}

const WalletServiceType = Symbol('WalletServiceInterface');
export { WalletServiceType };
