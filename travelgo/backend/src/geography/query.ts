import {fn,col,where,Op} from 'sequelize';
import {resolveLocation,geographicKeys} from './vietnam.js';
import {HttpError} from '../utils/httpError.js';
// Exact normalized comparisons, bound through Sequelize. No unaccent extension/schema/data mutation.
const groups=['àáảãạăằắẳẵặâầấẩẫậ','èéẻẽẹêềếểễệ','ìíỉĩị','òóỏõọôồốổỗộơờớởỡợ','ùúủũụưừứửữự','ỳýỷỹỵ','đ'];
const accents=groups.join(''),plain=groups.map((v,i)=>['a','e','i','o','u','y','d'][i].repeat(v.length)).join('');
const normalized=(column:string)=>fn('btrim',fn('regexp_replace',fn('regexp_replace',fn('translate',fn('lower',col(column)),accents,plain),'[̀-ͯ]','','g'),'[.[:space:]_-]+',' ','g'));
export function locationWhere(value:string,cityColumn:string,provinceColumn?:string){
 const location=resolveLocation(value);if(!location)throw new HttpError(400,'Địa điểm chưa có trong danh mục.','INVALID_LOCATION_ID');
 if(location.kind==='all')return {};
 const keys=geographicKeys(location),parts:any[]=[where(normalized(cityColumn),{[Op.in]:keys.city})];
 if(location.id.startsWith('area:'))return{[Op.and]:[parts[0],locationWhere(location.provinceCode!,cityColumn,provinceColumn)]};
 if(provinceColumn&&keys.province.length)parts.push(where(normalized(provinceColumn),{[Op.in]:keys.province}));
 return {[Op.or]:parts};
}
