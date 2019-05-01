import { Request } from 'express';
import * as fs from 'fs';
import * as i18next from 'i18next';
import { ETHEREUM_TRANSFER, OLS_TRANSFER } from '../entities/transaction';
import { u_ols_wallet } from '../entities/u_ols_wallet';
import { getConnection } from 'typeorm';

function escape(str: string): string {
  return str.replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

export function base64encode(email: string): string {
  return escape(Buffer.from(email, 'utf8').toString('base64'));
}

function unescape(str: string): string {
  return (str + '==='.slice((str.length + 3) % 4))
        .replace(/-/g, '+')
        .replace(/_/g, '/');
}

export function base64decode(str) {
  return Buffer.from(unescape(str), 'base64').toString('utf8');
}

export function translateCustomMessage(message: string, lang: string, fields: any) {
  const langPath = __dirname + `/../resources/locales/${lang}/errors.json`;
  const translations = fs.existsSync(langPath) ? require(langPath) : null;

  i18next.init({
    lng: lang.toString(),
    resources: translations
  });

  return i18next.t(message, fields);
}

export async function addUserCoin(user, type, amount) {
  const memberRepo = await getConnection().getRepository(u_ols_wallet);

  if (type === OLS_TRANSFER) {
    let charge_amount = parseFloat(user.charge_amount);
    charge_amount += parseFloat(amount);// 增加用户的FUC充值量
    user.charge_amount = charge_amount.toString();

    let token_amount = parseFloat(user.amount);
    token_amount += parseFloat(amount);           // 增加用户的现在OLS量
    user.amount = token_amount.toString();        // 增加用户的现在OLS量
  }
  await memberRepo.save(user);
}

export async function addUserDrawCoin(user, type, amount) {
  const memberRepo = await getConnection().getRepository(u_ols_wallet);

  if (type === OLS_TRANSFER) {
    let draw_amount = parseFloat(user.draw_amount);
    draw_amount += parseFloat(amount);// 减少用户的FUC充值量
    user.draw_amount = draw_amount.toString();
  }
  await memberRepo.save(user);
}

export async function decUserLockedCoin(user, withdrawRecord) {
  const memberRepo = await getConnection().getRepository(u_ols_wallet);

  if (withdrawRecord.coinname === ETHEREUM_TRANSFER) {
    let lock_amount = parseFloat(user.ethd);
    lock_amount -= parseFloat(withdrawRecord.amount); // 增加用户的充值量
    user.ethd = lock_amount.toString();
  }
  await memberRepo.save(user);
}

export function checkTokenTransfer(type: string) {
  if (type === OLS_TRANSFER)
    return true;
  return false;
}
