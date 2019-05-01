require('dotenv').config();
import 'reflect-metadata';
import * as fs from 'fs';

const {
  CLIENT_IP_FORWARD_HEADER,
  LOGGING_LEVEL,
  LOGGING_FORMAT,
  LOGGING_COLORIZE,
  REDIS_URL,
  REDIS_PREFIX,
  HTTP_SERVER,
  PORT,
  HTTPS_PORT,
  HTTPS_SERVER,
  FORCE_HTTPS,
  THROTTLER_WHITE_LIST,
  THROTTLER_INTERVAL,
  THROTTLER_MAX,
  THROTTLER_MIN_DIFF,
  ORM_ENTITIES_DIR,
  ORM_SUBSCRIBER_DIR,
  ORM_MIGRATIONS_DIR,
  API_URL,
  FRONTEND_URL,
  SC_ABI_FOLDER,
  TOKEN_ADDRESS,
  RPC_TYPE,
  RPC_ADDRESS,
  ACCESS_LOG,
  WEB3_RESTORE_START_BLOCK,
  WEB3_BLOCK_OFFSET,
  DEFAULT_TRANSFER_GAS,
  PURCHASE_GAS_LIMIT,
  ICO_END_TIMESTAMP,
} = process.env;

export default {
  app: {
    clientIpHeader: CLIENT_IP_FORWARD_HEADER || 'x-forwarded-for',
    port: parseInt(PORT, 10) || 3000,
    httpsPort: parseInt(HTTPS_PORT, 10) || 4000,
    httpServer: HTTP_SERVER || 'disabled',
    httpsServer: HTTPS_SERVER || 'disabled',
    forceHttps: FORCE_HTTPS || 'disabled',
    apiUrl: API_URL,
    accessLog: ACCESS_LOG || true,
    icoEndTimestamp: parseInt(ICO_END_TIMESTAMP, 10) || 1517443200
  },
  logging: {
    level: LOGGING_LEVEL || 'warn',
    format: LOGGING_FORMAT || 'text',
    colorize: LOGGING_COLORIZE || false
  },
  web3: {
    startBlock: parseInt(WEB3_RESTORE_START_BLOCK, 10) || 1,
    blockOffset: parseInt(WEB3_BLOCK_OFFSET, 10) || 200,
    defaultTransferGas: parseInt(DEFAULT_TRANSFER_GAS, 10) || 100000,
    purchaseGasLimit: parseInt(PURCHASE_GAS_LIMIT, 10) || 100000,
  },
  redis: {
    url: REDIS_URL || 'redis://127.0.0.1:6379',
    prefix: REDIS_PREFIX || 'test_web3_'
  },
  throttler: {
    prefix: 'request_throttler_',
    interval: THROTTLER_INTERVAL || 1000, // time window in milliseconds
    maxInInterval: THROTTLER_MAX || 5, // max number of allowed requests from 1 IP in "interval" time window
    minDifference: THROTTLER_MIN_DIFF || 0, // optional, minimum time between 2 requests from 1 IP
    whiteList: THROTTLER_WHITE_LIST ? THROTTLER_WHITE_LIST.split(',') : [] // requests from these IPs won't be throttled
  },
  contracts: {
    token: {
      address: TOKEN_ADDRESS,
      abi: JSON.parse(fs.readFileSync(SC_ABI_FOLDER + '/token-sc-abi.json').toString())
    }
  },
  typeOrm: {
    type: 'mysql',
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "root",
    "database": "test",
    synchronize: true,
    logging: false,
    migrations: [
      ORM_MIGRATIONS_DIR
    ],
    entities: [
        ORM_ENTITIES_DIR
    ],
    subscribers: [
    ORM_SUBSCRIBER_DIR
    ]
  },
  rpc: {
    type: RPC_TYPE,
    address: RPC_ADDRESS,
    reconnectTimeout: 5000 // in milliseconds
  }
};
