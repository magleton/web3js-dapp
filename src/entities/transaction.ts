import { Column, PrimaryGeneratedColumn, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import 'reflect-metadata';
import { Index } from 'typeorm/decorator/Index';

export const TRANSACTION_STATUS_PENDING = '0';
export const TRANSACTION_STATUS_CONFIRMED = '1';
export const TRANSACTION_STATUS_FAILED = '2';

export const ETHEREUM_TRANSFER = 'eth';
export const OLS_TRANSFER = 'ols';

@Entity()
export class transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  transactionHash: string;

  @Column()
  timestamp: number;

  @Column()
  blockNumber: number;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  ethAmount: string;

  @Column()
  tokenAmount: string;

  @Column()
  status: string;

  @Column()
  type: string;
}
