import {CORE_OPERATIONS} from './coreInput.js';
import {TRAVEL_PREFERENCE_IDS} from '../utils/travelPreferences.js';

const quote={type:'string',minLength:1,maxLength:300};
const update=(fields:string[],value:object)=>({type:'object',additionalProperties:false,required:['field','value','quote'],properties:{field:{type:'string',enum:fields},value,quote}});
/** Same NATURAL_CHAT_V3 wire shape; values are now constrained by their field, without coercion. */
export const NATURAL_RESPONSE_SCHEMA={type:'object',additionalProperties:false,required:['kind','operation','updates'],properties:{
 kind:{const:'natural'},operation:{type:'string',enum:['chat',...CORE_OPERATIONS]},
 updates:{type:'array',maxItems:10,items:{oneOf:[
  update(['departureCity','destinationCity'],{type:'string',minLength:2,maxLength:120}),
  update(['startDate','endDate'],{type:'string',pattern:'^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'}),
  update(['adults'],{type:'integer',minimum:1,maximum:100}),
  update(['children'],{type:'integer',minimum:0,maximum:100}),
  update(['totalBudget'],{type:'integer',minimum:1,maximum:1000000000000}),
  update(['transportation'],{type:'string',enum:['car','motorbike']}),
  update(['preferences'],{type:'array',maxItems:8,uniqueItems:true,items:{type:'string',enum:[...TRAVEL_PREFERENCE_IDS]}})
 ]}},
 change:{type:'string',enum:['hotel_cheaper','hotel_other','restaurant_other','exclude_seafood']},changeQuote:quote
 },dependencies:{change:['changeQuote'],changeQuote:['change']}};
