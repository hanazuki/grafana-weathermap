import * as z from 'zod/v4/mini';

export const json = <O>(schema: z.core.$ZodType<O>) =>
  z.codec(z.string(), schema, {
    decode: (str) => JSON.parse(str),
    encode: (val) => JSON.stringify(val),
  });
