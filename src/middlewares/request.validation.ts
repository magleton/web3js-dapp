import * as Joi from 'joi';
import config from '../config';
import { Response, Request, NextFunction } from 'express';
import { AuthorizedRequest } from '../requests/authorized.request';
import { base64decode } from '../helpers/helpers';
import * as fs from 'fs';
import * as i18next from 'i18next';
import { responseErrorWithObject } from '../helpers/responses';

const options = {
  allowUnknown: true,
  language: {}
};

const verificationSchema = Joi.object().keys({
  verificationId: Joi.string().required(),
  code: Joi.string().required(),
  method: Joi.string().required()
}).required();

const passwordRegex = /^[a-zA-Z0\d!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{8,}$/;
const phoneNumberRegex = /^\+[1-9]\d{1,14}$/;

export function withdrawal(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object().keys({
        tokenAmount: Joi.number().required().min(100),
        mnemonic: Joi.string().required()
    });

    commonValidate(422, schema, req, res, next);
}

export function sendtoken(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    recvAddress: Joi.number().required(),
    sendAmount: Joi.number().required(),
    mnemonic: Joi.string().required()
  });

  commonValidate(422, schema, req, res, next);
}

export function onlyJumioIp(req: Request, res: Response, next: NextFunction) {
  const jumioIps = [
    '184.106.91.66',
    '184.106.91.67',
    '104.130.61.196',
    '146.20.77.156',
    '34.202.241.227',
    '34.226.103.119',
    '34.226.254.127',
    '52.53.95.123',
    '52.52.51.178',
    '54.67.101.173',
    '162.13.228.132',
    '162.13.228.134',
    '162.13.229.103',
    '162.13.229.104',
    '34.253.41.236',
    '52.209.180.134',
    '52.48.0.25',
    '35.157.27.193',
    '52.57.194.92',
    '52.58.113.86'
  ];

  let ip = req.header(config.app.clientIpHeader as string) || req.ip;

  /*
   Check if IP has ipv6 prefix and remove it.
   See: https://stackoverflow.com/questions/29411551/express-js-req-ip-is-returning-ffff127-0-0-1
   */
  if (ip.substr(0, 7) === '::ffff:') {
    ip = ip.substr(7);
  }

  if (jumioIps.indexOf(ip) === -1) {
    return res.status(403).send();
  } else {
    return next();
  }
}

export function resendVerification(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    email: Joi.string().email().required()
  });

  commonValidate(422, schema, req, res, next);
}

export function onlyAcceptApplicationJson(req: Request, res: Response, next: NextFunction) {
  if (!req.header('Content-Type') ||
      (req.header('Content-Type') !== 'application/json' && !req.header('Content-Type').includes('application/x-www-form-urlencoded')))
  {
    responseErrorWithObject(res, {
      message: 'Unsupported "Accept" header'
    }, 406);
  } else {
    return next();
  }
}

export function commonValidate(code: number, schema: Joi.Schema, req: Request, res: Response, next: NextFunction) {
  const lang = req.acceptsLanguages() || 'en';
  const langPath = __dirname + `/../resources/locales/${lang}/validation.json`;

  if (fs.existsSync(langPath)) {
    options.language = require(langPath);
  }

  const result = Joi.validate(req.body, schema, options);
  if (result.error) {
    responseErrorWithObject(res,result, code);
  } else {
    return next();
  }
}

export function translateCustomMessage(message: string, req: Request) {
  const lang = req.acceptsLanguages() || 'en';
  const langPath = __dirname + `/../resources/locales/${lang}/errors.json`;
  const translations = fs.existsSync(langPath) ? require(langPath) : null;

  i18next.init({
    lng: lang.toString(),
    resources: translations
  });

  return i18next.t(message);
}