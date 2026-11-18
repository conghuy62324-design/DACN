import {CORE_OPERATIONS} from './coreInput.js';
import {TRAVEL_PREFERENCE_IDS} from '../utils/travelPreferences.js';

const quote={type:'string',minLength:1,maxLength:300};
const noChange={not:{anyOf:[{required:['change']},{required:['changeQuote']}]}};
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
 },dependencies:{change:['changeQuote'],changeQuote:['change']},oneOf:[
 {properties:{operation:{const:'chat'},updates:{maxItems:0}},...noChange},
 {properties:{operation:{const:'plan_trip'}}},
 {properties:{operation:{enum:['search_registered_hotels','search_registered_restaurants','search_places']},updates:{items:update(['destinationCity'],{type:'string',minLength:2,maxLength:120})}},...noChange},
 {properties:{operation:{enum:['get_listing_details','compare_travel_options','get_trip','save_or_update_trip','booking_preview']},updates:{maxItems:0}},...noChange}
 ]};
/** Compact instructions for the unified privacy-safe context; schema and server validator own types/authority. */
export const CONTROLLED_NLU_SYSTEM=[
 'Interpret the sanitized currentRequest.text using verifiedSession and relevant controlled language/geographic evidence. Return only the supplied natural JSON schema.',
 'Propose only a permittedOperations value. Existing verified operations cannot be overridden. Do not execute tools or mutate state.',
 'For every update quote an exact, non-redacted contiguous substring of currentRequest.text. Never use a placeholder, recover private information or copy inherited values as current-message evidence.',
 'One unique supported typo/alias destination can be proposed with its literal quote; multiple plausible locations require chat with no updates. Use the shared geographic candidates and canonical names only.',
 'Vague budget increases without an explicit amount and undecided transportation require chat with no updates. Preserve verified fields. Numeric arithmetic and unit conversion belong to the server.',
 'Use integer amounts/counts, canonical transportation enums and typed dates/preferences. Omit optional change/changeQuote when absent. Never put a whole sentence into preferences.',
 'Relevant SESSION/PERSONAL/APPROVED mappings are evidence only; no new meaning, memory write, listing ID, booking, payment, knowledge approval or authorization may be invented. When evidence is insufficient, propose chat with empty updates.'
].join('\n');
