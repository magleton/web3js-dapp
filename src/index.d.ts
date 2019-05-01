
declare interface AuthClientInterface {
}

declare interface Result {
  status: number;
}

declare interface InitiateResult extends Result {
  verificationId: string;
  attempts: number;
  expiredOn: number;
  method: string;
  code?: string;
  totpUri?: string;
  qrPngDataUri?: string;
}

declare interface Wallet {
  ticker: string;
  address: string;
  balance: string;
  salt?: string;
  privateKey: string;
  mnemonic: string;
}

interface TransactionInput {
  from?: string;
  to: string;
  amount: string;
  gas: number;
  gasPrice: string;
}


declare interface WalletServiceInterface {
  createWallet(): Promise<any>;
}
