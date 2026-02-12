/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'dotenv/config';
import * as joi from 'joi';

interface IEnvVars {
  PORT: number;
  DATABASE_URL: string;

  // ESTO ES PORQUE SE COMUNICAN ENTRE SI LOS MICROSERVICIOS
  PRODUCT_MICROSERVICE_HOST: string;
  PRODUCT_MICROSERVICE_PORT: number;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),

    PRODUCT_MICROSERVICE_HOST: joi.string().required(),
    PRODUCT_MICROSERVICE_PORT: joi.number().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: IEnvVars = value;

export const envs = {
  PORT: envVars.PORT,
  database_url: envVars.DATABASE_URL,

  productMsHost: envVars.PRODUCT_MICROSERVICE_HOST,
  productMsPort: envVars.PRODUCT_MICROSERVICE_PORT,
};
