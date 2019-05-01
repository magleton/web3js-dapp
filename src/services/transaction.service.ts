import {
  transaction,
  OLS_TRANSFER,
  TRANSACTION_STATUS_CONFIRMED,
  TRANSACTION_STATUS_FAILED,
  ETHEREUM_TRANSFER
} from '../entities/transaction';
import {getConnection, getManager} from 'typeorm';
import { injectable } from 'inversify';
import config from '../config';
import {s_manager_wallet} from "../entities/s_manager_wallet";
import { u_ols_wallet } from '../entities/u_ols_wallet';

const abiDecoder = require('abi-decoder');
const Web3 = require('web3');
const net = require('net');

interface FromToTokenAmount {
  from: string;
  to: string;
  tokenAmount: string;
}

export interface TransactionServiceInterface {
  getFromToTokenAmountByTxDataAndType(txData: any, type: string): FromToTokenAmount;

  getTxStatusByReceipt(receipt: any): string;

  getTxTypeByData(transactionData: any): string;

  getTxByTxData(transactionData: any): Promise<transaction>;

  getUserCountByTxData(txData: any): Promise<number>;

  checkMemberAddress(addr: string): Promise<boolean>;

  updateTx(tx: transaction, status: string, blockData: any): Promise<void>;

  createAndSaveTransaction(transactionData: any, status: string, blockData?: any): Promise<void>;
}

@injectable()
export class TransactionService implements TransactionServiceInterface {
  web3: any;

  constructor() {
    if (config.rpc.type === 'ipc') {
      this.web3 = new Web3(new Web3.providers.IpcProvider(config.rpc.address, net));
    } else {
      this.web3 = new Web3(config.rpc.address);
    }
  }

  async getTxByTxData(transactionData: any): Promise<transaction> {
    const type = this.getTxTypeByData(transactionData);
    const { from, to } = this.getFromToTokenAmountByTxDataAndType(transactionData, type);

    const txRepo = getConnection().getRepository(transaction);
    return await txRepo.findOne({
      transactionHash: transactionData.hash,
      type,
      from,
      to
    });
  }

  getFromToTokenAmountByTxDataAndType(txData: any, type: string): FromToTokenAmount {
    let from = this.web3.utils.toChecksumAddress(txData.from);
    let to = "";
    let tokenAmount = "";

    // direct transfer calls of tokens
    if (type === OLS_TRANSFER) {
      abiDecoder.addABI(config.contracts.token.abi);
      const decodedData = abiDecoder.decodeMethod(txData.input);
      if (decodedData.name === 'transfer') {
        const BN = this.web3.utils.BN;
        to = this.web3.utils.toChecksumAddress(decodedData.params[0].value);
        // new BN(this.web3.utils.toWei(gasPrice, 'gwei'))
        tokenAmount = this.web3.utils.fromWei(new BN(decodedData.params[1].value).toString()).toString();
      }
    } else if (txData.to) {
      to = this.web3.utils.toChecksumAddress(txData.to);
    }

    return {
      from,
      to,
      tokenAmount
    };
  }

  getTxStatusByReceipt(receipt: any): string {
    if (receipt.status === true) {
      return TRANSACTION_STATUS_CONFIRMED;
    } else {
      return TRANSACTION_STATUS_FAILED;
    }
  }

  getTxTypeByData(transactionData: any): string {
    if (transactionData.to && transactionData.to.toLowerCase() === config.contracts.token.address.toLowerCase()) {
      return OLS_TRANSFER;
    }

    return ETHEREUM_TRANSFER;
  }

  async getUserCountByTxData(txData: any): Promise<number> {
    let query;
    let count1;

    const type = this.getTxTypeByData(txData);
    const { from, to } = this.getFromToTokenAmountByTxDataAndType(txData, type);
    if (to) {
      count1 = await getConnection().createQueryBuilder()
          .select("id")
          .from(s_manager_wallet, "s_manager_wallet")
          .where("s_manager_wallet.eth_address = :from or s_manager_wallet.eth_address = :to", { from: from, to: to })
          .getCount();
    } else {
      count1 = await getConnection().createQueryBuilder()
          .select("id")
          .from(s_manager_wallet, "s_manager_wallet")
          .where("s_manager_wallet.eth_address = :from", { from: from})
          .getCount();
    }

    return count1;
  }

  async updateTx(tx: transaction, status: string, blockData: any): Promise<void> {
    const txRepo = getConnection().getRepository(transaction);
    tx.status = status;
    tx.timestamp = blockData.timestamp;
    tx.blockNumber = blockData.number;
    await txRepo.save(tx);
  }

  async createAndSaveTransaction(transactionData: any, status: string, blockData?: any ): Promise<void> {
    const txRepo = getConnection().getRepository(transaction);
    const type = this.getTxTypeByData(transactionData);
    const { from, to, tokenAmount } = this.getFromToTokenAmountByTxDataAndType(transactionData, type);

    let timestamp;
    let blockNumber;

    if (blockData) {
      timestamp = blockData.timestamp;
      blockNumber = blockData.number;
    } else {
      timestamp = Math.round(+new Date() / 1000);
    }

    const transformedTxData = {
      transactionHash: transactionData.hash,
      from,
      type,
      to,
      ethAmount: this.web3.utils.fromWei(transactionData.value).toString(),
      tokenAmount: tokenAmount,
      status,
      timestamp,
      blockNumber
    };

    const txToSave = txRepo.create(transformedTxData);
    await txRepo.save(txToSave);
  }

  async checkMemberAddress(addr: string): Promise<boolean> {
    let count;

    count = await getConnection().createQueryBuilder()
        .select("id")
        .from(u_ols_wallet, "u_ols_wallet")
        .where("u_ols_wallet.eth_address = :addr", { addr: addr})
        .getCount();

    return count>0;
  }
}

const TransactionServiceType = Symbol('TransactionServiceInterface');
export {TransactionServiceType};
