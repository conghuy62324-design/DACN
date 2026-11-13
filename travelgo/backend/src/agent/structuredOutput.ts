import Ajv from 'ajv';
import {HttpError} from '../utils/httpError.js';

// The transport constraint is not an authority boundary. Validate custom providers as strictly as native output.
const ajv=new Ajv({strict:false,allErrors:true,coerceTypes:false,useDefaults:false,removeAdditional:false});
const validators=new WeakMap<object,ReturnType<Ajv['compile']>>();
export function assertStructuredOutput(schema:object,value:unknown):void{
 let validate=validators.get(schema);if(!validate){validate=ajv.compile(schema);validators.set(schema,validate);}
 if(!validate(value))throw new HttpError(502,'AI trả về cấu trúc chưa hợp lệ. Mình chưa thay đổi thông tin.','AGENT_INVALID_PROVIDER_OUTPUT');
}
