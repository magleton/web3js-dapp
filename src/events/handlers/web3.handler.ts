import config from '../../config';
import { injectable } from 'inversify';
import * as redis from 'redis';
import { promisify } from 'util';

const Web3 = require('web3');
const net = require('net');

import {
  transaction,
  TRANSACTION_STATUS_PENDING,
  OLS_TRANSFER,
  TRANSACTION_STATUS_CONFIRMED,
} from '../../entities/transaction';
import { getConnection } from 'typeorm';
import { TransactionServiceInterface } from '../../services/transaction.service';
import * as Bull from 'bull';
import { Logger } from '../../logger';
import { u_ols_wallet } from '../../entities/u_ols_wallet';
import {s_manager_wallet} from "../../entities/s_manager_wallet";
import {u_ols_myzc} from "../../entities/u_ols_myzc";
import {u_ols_myzr} from "../../entities/u_ols_myzr";

import {addUserCoin, checkTokenTransfer, addUserDrawCoin, decUserLockedCoin} from "../../helpers/helpers";

export interface Web3HandlerInterface {

}

/* istanbul ignore next */
@injectable()
export class Web3Handler implements Web3HandlerInterface {
  private logger = Logger.getInstance('WEB3_HANDLER');
  web3: any;
  token: any;
  private txService: TransactionServiceInterface;
  private queueWrapper: any;
  private redisClient: redis.RedisClient;
  private redisGetAsync: any;
  private redisSetAsync: any;

  constructor(
    txService
  ) {
    this.redisClient = redis.createClient({
      url: config.redis.url,
      prefix: config.redis.prefix
    });
    this.redisGetAsync = promisify(this.redisClient.get).bind(this.redisClient);
    this.redisSetAsync = promisify(this.redisClient.set).bind(this.redisClient);

    this.txService = txService;

    switch (config.rpc.type) {
      case 'ipc':
        this.web3 = new Web3(new Web3.providers.IpcProvider(config.rpc.address, net));
        break;
      case 'ws':
        const webSocketProvider = new Web3.providers.WebsocketProvider(config.rpc.address);

        webSocketProvider.connection.onclose = () => {
          this.logger.info('Web3 socket connection closed');
          this.onWsClose();
        };

        this.web3 = new Web3(webSocketProvider);
        break;
      case 'http':
        this.web3 = new Web3(config.rpc.address);
        break;
      default:
        throw Error('Unknown Web3 RPC type!');
    }
    console.log("web3 handler");
    this.createContracts();

    if (config.rpc.type !== 'http') {
      this.attachHandlers();
    }

    this.queueWrapper = new Bull('check_transaction', config.redis.url);
    this.queueWrapper.process((job) => {
      return this.checkAndRestoreTransactions(job);
    });
    this.queueWrapper.add({}, {repeat: {cron: '*/10 * * * *'}});
    this.queueWrapper.on('error', (error) => {
      this.logger.exception(error);
    });
    this.logger.verbose('Web3 transactions job worker started');
  }


  async processTokenTransfer(data: any): Promise<void> {
    const txRepo = getConnection().getRepository(transaction);

    const tx = await txRepo.findOne({
      transactionHash: data.transactionHash,
      type: OLS_TRANSFER,
      from: data.returnValues.from,
      to: data.returnValues.to
    });

    const transactionReceipt = await this.web3.eth.getTransactionReceipt(data.transactionHash);
    if (transactionReceipt) {
      const blockData = await this.web3.eth.getBlock(data.blockNumber);
      const status = this.txService.getTxStatusByReceipt(transactionReceipt);

      console.log('--tokenTransfer--');
      let timestamp;
      let blockNumber;
      if (blockData) {
        timestamp = blockData.timestamp;
        blockNumber = blockData.number;
      } else {
        blockNumber = data.blockNumber;
        timestamp = Math.round(+new Date() / 1000);
      }

      const transformedTxData = {
        transactionHash: data.transactionHash,
        from: data.returnValues.from,
        type: OLS_TRANSFER,
        to: data.returnValues.to,
        ethAmount: '0',
        tokenAmount: this.web3.utils.fromWei(data.returnValues.value).toString(),
        status: status,
        timestamp: timestamp,
        blockNumber: blockNumber
      };

      if (!tx) {
        const newTx = txRepo.create(transformedTxData);
        await txRepo.save(newTx);
        this.processReceivedEthOrToken(newTx, data, transactionReceipt);
      } else if (tx.status === TRANSACTION_STATUS_PENDING) {
        tx.status = status;
        tx.blockNumber = blockNumber;
        await txRepo.save(tx);
        this.processReceivedEthOrToken(tx, data, transactionReceipt);
      }
    }
  }

  /* receive new ETH Or FUC*/
  async processReceivedEthOrToken(tx: transaction, transactionData: any, transactionReceipt: any): Promise<void> {
    const managerRepo = await getConnection().getRepository(s_manager_wallet);
    const manager = await managerRepo.findOne({id: 1});

    if (this.txService.checkMemberAddress(tx.to) && tx.from !== manager.eth_address) { //到用户钱包充值
      this.processChargeEthOrToken(tx);
      return;
    }

    if (this.txService.checkMemberAddress(tx.from) && tx.to === manager.eth_address) { //从用户钱包转账管理者钱包
      this.processTransferEthOrToken(tx, transactionData, transactionReceipt);
      return;
    }

    if (tx.from === manager.eth_address) { //用户以太坊提现或管理者以太坊提现
      this.processWithdrawEthOrToken(tx);
      return;
    }
  }

  /*  处理用户的以太坊充值 */
  async processChargeEthOrToken(tx: transaction): Promise<void> {
    const memberRepo = await getConnection().getRepository(u_ols_wallet);
    const myzrRepo = await getConnection().getRepository(u_ols_myzr);

    if (tx.status == TRANSACTION_STATUS_CONFIRMED) {
      const user = await memberRepo.findOne({
        'eth_address': tx.to,
      });

      if (user) {
        let amount;
        if (checkTokenTransfer(tx.type))
          amount = tx.tokenAmount;
        else
          amount = tx.ethAmount;

        addUserCoin(user, tx.type, amount);

        const myzrData = {
          userid: user.id,
          username: tx.from,
          coinname: tx.type,
          type: 1,    //外部转入
          txid: tx.transactionHash,
          num: amount,
          mum: amount,
          fee: '0',
          addtime: tx.timestamp,
          status: 1
        };

        const newTx = myzrRepo.create(myzrData);
        await myzrRepo.save(newTx);
      }
    }
  }

  /*  从用户的钱包转账到管理者的钱包 */
  async processTransferEthOrToken(tx: transaction, transactionData: any, transactionReceipt: any): Promise<void> {
    const BN = this.web3.utils.BN;
    const memberRepo = await getConnection().getRepository(u_ols_wallet);
    const txFee = this.web3.utils.fromWei(new BN(transactionData.gasPrice).mul(new BN(transactionReceipt.gasUsed)));

    if (tx.status == TRANSACTION_STATUS_CONFIRMED) {
      const user = await memberRepo.findOne({
        'eth_address': tx.from,
      });

      if (user) {
        if (checkTokenTransfer(tx.type))
          addUserDrawCoin(user, tx.type, tx.tokenAmount);
        else
          addUserDrawCoin(user, tx.type, tx.ethAmount);
      }
    }
  }

  /*  用户以太坊提现或管理者以太坊提现 */
  async processWithdrawEthOrToken(tx: transaction): Promise<void> {
    const BN = this.web3.utils.BN;

    const memberRepo = await getConnection().getRepository(u_ols_wallet);
    const withdrawRepo = await getConnection().getRepository(u_ols_myzc);

    const withdrawRecord = await withdrawRepo.findOne({
      'txhash': tx.transactionHash,
    });
    if (withdrawRecord) {
      if (tx.status == TRANSACTION_STATUS_CONFIRMED) {
        withdrawRecord.status = 2;  //成功
        const user = await memberRepo.findOne(withdrawRecord.u_user_id);
        // decUserLockedCoin(user, withdrawRecord);
      } else {
        withdrawRecord.status = 3;  //失败
      }
      withdrawRepo.save(withdrawRecord);
    }
  }

  async checkAndRestoreTransactions(job: any): Promise<boolean> {
    console.log("---------checkAndRestoreTransactions---------");
    const currentBlock = await this.web3.eth.getBlockNumber();
    const lastCheckedBlock = await this.redisGetAsync('lastCheckedBlock');
    const startBlock = lastCheckedBlock ? lastCheckedBlock : config.web3.startBlock;

    const transferEvents = await this.token.getPastEvents('Transfer', { fromBlock: startBlock - config.web3.blockOffset}); //startBlock - config.web3.blockOffset

    for (let event of transferEvents) {
      await this.processTokenTransfer(event);
    }

    await this.redisSetAsync('lastCheckedBlock', currentBlock);

    return true;
  }

  onWsClose() {
    this.logger.error('Web3 socket connection closed. Trying to reconnect');
    const webSocketProvider = new Web3.providers.WebsocketProvider(config.rpc.address);
    webSocketProvider.connection.onclose = () => {
      this.logger.info('Web3 socket connection closed');
      setTimeout(() => {
        this.onWsClose();
      }, config.rpc.reconnectTimeout);
    };

    this.web3.setProvider(webSocketProvider);
    this.createContracts();
    this.attachHandlers();
  }

  createContracts() {
    this.token = new this.web3.eth.Contract(config.contracts.token.abi, config.contracts.token.address);
  }

  attachHandlers() {

    // process token transfers
    this.token.events.Transfer()
      .on('data', (data) => this.processTokenTransfer(data));
  }
}

const Web3HandlerType = Symbol('Web3HandlerInterface');
export { Web3HandlerType };
