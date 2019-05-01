import { injectable } from 'inversify';

const Web3 = require('web3');
const net = require('net');
const ethUtil = require('ethereumjs-util');

const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
import config from '../config';
import 'reflect-metadata';
import { Logger } from '../logger';
import { getConnection } from 'typeorm';
import {s_manager_wallet} from "../entities/s_manager_wallet";

export interface Web3ClientInterface {
  sendTransactionByMnemonic(input: TransactionInput, mnemonic: string, salt: string): Promise<string>;

  sendWithdrawalByMnemonic(input: TransactionInput, mnemonic: string, salt: string): Promise<string>;

  sendTokenByMnemonic(input: TransactionInput, mnemonic: string, salt: string): Promise<string>;

  sendTokenByPrivateKey(input: TransactionInput, privateKey: string): Promise<string>;

  sendTokenWithNoEth(input: TransactionInput, mnemonic: string, salt: string): Promise<string>;

  sendTransactionByPrivateKey(input: TransactionInput, privateKey: string): Promise<string>;

  generateMnemonic(): string;

  getAccountByMnemonicAndSalt(mnemonic: string, salt: string): any;

  getEthBalance(address: string): Promise<string>;

  getTokenBalanceOf(address: string): Promise<string>;

  sufficientBalance(input: TransactionInput): Promise<boolean>;

  getCurrentGasPrice(): Promise<string>;

  transferFee(): Promise<any>;

  isHex(key: any): boolean;
}

const formattedAddress = (address) => {
  return  Buffer.from(ethUtil.stripHexPrefix(address), 'hex');
};
const formattedInt = (int) => {
  return ethUtil.setLengthLeft(int, 32);
};
const formattedBytes32 = (bytes) => {
  return ethUtil.addHexPrefix(bytes.toString('hex'));
};
const hashedTightPacked = (args) => {
  return ethUtil.sha3(Buffer.concat(args));
};

/* istanbul ignore next */
@injectable()
export class Web3Client implements Web3ClientInterface {
  private logger = Logger.getInstance('WEB3CLIENT');

  token: any;
  web3: any;

  constructor() {
    switch (config.rpc.type) {
      case 'ipc':
        this.web3 = new Web3(new Web3.providers.IpcProvider(config.rpc.address, net));
        break;
      case 'ws':
        const webSocketProvider = new Web3.providers.WebsocketProvider(config.rpc.address);

        webSocketProvider.connection.onclose = () => {
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

    this.createContracts();
  }

  sendTransactionByMnemonic(input: TransactionInput, mnemonic: string, salt: string): Promise<string> {
    const privateKey = this.getPrivateKeyByMnemonicAndSalt(mnemonic, salt);
    const params = {
      value: this.web3.utils.toWei(input.amount.toString()),
      from: input.from,
      to: input.to,
      gas: input.gas,
      gasPrice: this.web3.utils.toWei(input.gasPrice, 'gwei')
    };

    return new Promise<string>((resolve, reject) => {
      this.sufficientBalance(input).then((sufficient) => {
        if (!sufficient) {
          reject({
            message: '您的以太坊量不足'
          });
        }

        this.web3.eth.accounts.signTransaction(params, privateKey).then(transaction => {
          this.web3.eth.sendSignedTransaction(transaction.rawTransaction)
            .on('transactionHash', transactionHash => {
              resolve(transactionHash);
            })
            .on('error', (error) => {
              reject(error);
            })
            .catch((error) => {
              reject(error);
            });
        });
      });
    });
  }

    sendWithdrawalByMnemonic(input: TransactionInput, mnemonic: string, salt: string): Promise<string> {
        const privateKey = this.getPrivateKeyByMnemonicAndSalt(mnemonic, salt);
        const params = {
            value: 0,
            to: this.token.options.address,
            gas: 200000,
            data: this.token.methods.transfer(input.to, this.web3.utils.toWei(input.amount.toString())).encodeABI()
        };


        return new Promise<string>((resolve, reject) => {
            this.sufficientBalance(input).then((sufficient) => {
                if (!sufficient) {
                    reject({
                        message: '您的以太坊量不足'
                    });
                }

                this.web3.eth.accounts.signTransaction(params, privateKey).then(transaction => {
                    this.web3.eth.sendSignedTransaction(transaction.rawTransaction)
                        .on('transactionHash', transactionHash => {
                            resolve(transactionHash);
                        })
                        .on('error', (error) => {
                            reject(error);
                        })
                        .catch((error) => {
                            reject(error);
                        });
                });
            });
        });
    }
  async sendTokenByMnemonic(input: TransactionInput, mnemonic: string, salt: string): Promise<string> {
    const privateKey = this.getPrivateKeyByMnemonicAndSalt(mnemonic, salt);

    const params = {
      value: 0,
      to: this.token.options.address,
      gasPrice:this.web3.utils.toWei(await this.getCurrentGasPrice(), "gwei"),
      gas:60000,
      data: this.token.methods.transfer(input.to, this.web3.utils.toWei(input.amount.toString())).encodeABI()
    };

    return new Promise<string>((resolve, reject) => {
      this.sufficientTokenBalance(input).then((sufficient) => {

        if (!sufficient) {
          reject({
            message: '您的代币量不足'
          });
        }

        this.web3.eth.accounts.signTransaction(params, privateKey).then(transaction => {
          this.web3.eth.sendSignedTransaction(transaction.rawTransaction)
              .on('transactionHash', transactionHash => {
                resolve(transactionHash);
              })
              .on('error', (error) => {
                reject(error);
              })
              .catch((error) => {
                reject(error);
              });
        });
      });
    });
  }

  sendTokenByPrivateKey(input: TransactionInput, privateKey: string): Promise<string> {
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);

    const params = {
      value: 0,
      from: account.address,
      to: this.token.options.address,
      gas: input.gas,
      gasPrice: this.web3.utils.toWei(input.gasPrice, 'gwei'),
      data: this.token.methods.transfer(input.to, this.web3.utils.toWei(input.amount.toString())).encodeABI()
    };
    input.from = account.address;

    return new Promise<string>((resolve, reject) => {
      this.sufficientTokenBalance(input).then((sufficient) => {
        if (!sufficient) {
          reject({
            message: '您的代币量不足'
          });
        }
        account.signTransaction(params).then(transaction => {
          this.web3.eth.sendSignedTransaction(transaction.rawTransaction)
              .on('transactionHash', transactionHash => {
                resolve(transactionHash);
              })
              .on('error', (error) => {
                reject(error);
              })
              .catch((error) => {
                reject(error);
              });
        });
      });
    });
  }

  async sendTokenWithNoEth(input: TransactionInput, mnemonic: string, salt: string): Promise<string> {
    const BN = this.web3.utils.BN;

    const manager = await await getConnection().getRepository(s_manager_wallet).findOne({id:1});
    const privateKey = this.getPrivateKeyByMnemonicAndSalt(mnemonic, salt);

    const managerPK = manager.private_key;

    const fee = 10; //manager.transfer_fee;
    const nonce = 33;

    const components = [
      Buffer.from('48664c16', 'hex'),
      formattedAddress(config.contracts.token.address),
      formattedAddress(input.to),
      formattedInt(new BN(this.web3.utils.toWei(input.amount.toString()))),
      formattedInt(new BN(this.web3.utils.toWei(fee.toString()))),
      formattedInt(nonce)
    ];

    var _privateKey = privateKey.substr(2);
    var privateKey1 = Buffer.from(_privateKey, 'hex')

    const vrs = ethUtil.ecsign(hashedTightPacked(components), privateKey1);
    const sig = ethUtil.toRpcSig(vrs.v, vrs.r, vrs.s);

    const params = {
      value: 0,
      to: this.token.options.address,
      gasPrice:this.web3.utils.toWei(await this.getCurrentGasPrice(), "gwei"),
      gas:600000,
      data: this.token.methods.transferPreSigned(sig, input.to, this.web3.utils.toWei(input.amount.toString()), this.web3.utils.toWei(fee.toString()), nonce)
          .encodeABI()
    };

    return new Promise<string>((resolve, reject) => {
      this.sufficientTokenBalance(input).then((sufficient) => {

        if (!sufficient) {
          reject({
            message: '您的代币量不足'
          });
        }

        this.web3.eth.accounts.signTransaction(params, manager.private_key).then(transaction => {

          this.web3.eth.sendSignedTransaction(transaction.rawTransaction)
              .on('transactionHash', transactionHash => {
                resolve(transactionHash);
              })
              .on('error', (error) => {
                reject(error);
              })
              .catch((error) => {
                reject(error);
              });
        });
      });
    });
  }


  sendTransactionByPrivateKey(input: TransactionInput, privateKey: string): Promise<string> {
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);

    const params = {
      value: this.web3.utils.toWei(input.amount.toString()),
      from: account.address,
      to: input.to,
      gas: input.gas,
      gasPrice: this.web3.utils.toWei(input.gasPrice, 'gwei')
    };

    return new Promise<string>((resolve, reject) => {
      account.signTransaction(params).then(transaction => {
        this.web3.eth.sendSignedTransaction(transaction.rawTransaction)
          .on('transactionHash', transactionHash => {
            resolve(transactionHash);
          })
          .on('error', (error) => {
            reject(error);
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  }

  generateMnemonic(): string {
    return bip39.generateMnemonic();
  }

  getAccountByMnemonicAndSalt(mnemonic: string, salt: string): any {
    const privateKey = this.getPrivateKeyByMnemonicAndSalt(mnemonic, salt);
    return this.web3.eth.accounts.privateKeyToAccount(privateKey);
  }

  getPrivateKeyByMnemonicAndSalt(mnemonic: string, salt: string) {
    // get seed
    const hdWallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic, salt));

    // get first of available wallets
    const path = 'm/44\'/60\'/0\'/0/0';

    // get wallet
    const wallet = hdWallet.derivePath(path).getWallet();

    // get private key
    return '0x' + wallet.getPrivateKey().toString('hex');
  }

  async getEthBalance(address: string): Promise<string> {
    return this.web3.utils.fromWei(
      await this.web3.eth.getBalance(address)
    );
  }

  async getTokenBalanceOf(address: string): Promise<string> {
    return this.web3.utils.fromWei(await this.token.methods.balanceOf(address).call()).toString();
  }

  sufficientBalance(input: TransactionInput): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.web3.eth.getBalance(input.from)
        .then((balance) => {
          const BN = this.web3.utils.BN;
          const txFee = new BN(input.gas).mul(new BN(this.web3.utils.toWei(input.gasPrice, 'gwei')));
          const total = new BN(this.web3.utils.toWei(input.amount)).add(txFee);
          resolve(total.lte(new BN(balance)));
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  sufficientTokenBalance(input: TransactionInput): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.getTokenBalanceOf(input.from)
          .then((balance) => {
            const BN = this.web3.utils.BN;
            resolve(parseFloat(input.amount) <= parseFloat(balance));
          })
          .catch((error) => {
            reject(error);
          });
    });
  }

  onWsClose() {
    const webSocketProvider = new Web3.providers.WebsocketProvider(config.rpc.address);
    webSocketProvider.connection.onclose = () => {
      setTimeout(() => {
        this.onWsClose();
      }, config.rpc.reconnectTimeout);
    };

    this.web3.setProvider(webSocketProvider);
    this.createContracts();
  }

  createContracts() {
    this.token = new this.web3.eth.Contract(config.contracts.token.abi, config.contracts.token.address);
  }

  async getCurrentGasPrice(): Promise<string> {
    return this.web3.utils.fromWei(await this.web3.eth.getGasPrice(), 'gwei');
  }

  async transferFee(): Promise<any> {
    const gasPrice = await this.getCurrentGasPrice();
    const gas = config.web3.defaultTransferGas;
    const BN = this.web3.utils.BN;

    return {
      retCode:1,
      gasPrice,
      gas,
      expectedTxFee: this.web3.utils.fromWei(
        new BN(gas).mul(new BN(this.web3.utils.toWei(gasPrice, 'gwei'))).toString()
      )
    };
  }

  isHex(key: any): boolean {
    return this.web3.utils.isHex(key);
  }
}

const Web3ClientType = Symbol('Web3ClientInterface');
export {Web3ClientType};
