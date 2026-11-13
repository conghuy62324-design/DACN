'use strict';
const assert=require('node:assert/strict'),{isIP}=require('node:net');
// Host identities only. No networks, mapped/compatible IPv4-in-IPv6, zones,
// brackets, whitespace, abbreviated IPv4, octal or alternative encodings.
function parseHost(input,expectedFamily){
 assert.equal(typeof input,'string','HOST_ADDRESS_STRING_REQUIRED');assert.ok(input.length>0&&input.length<=49&&!/[^0-9a-fA-F:./]/.test(input),'HOST_ADDRESS_SYNTAX');
 assert.ok(expectedFamily===undefined||expectedFamily===4||expectedFamily===6,'UNSUPPORTED_ADDRESS_FAMILY');
 const match=/^([^/]+)(?:\/(32|128))?$/.exec(input);assert.ok(match,'HOST_PREFIX_REQUIRED');
 const host=match[1],prefix=match[2],family=isIP(host);assert.ok(family===4||family===6,'INVALID_HOST_ADDRESS');
 if(expectedFamily!==undefined)assert.equal(family,expectedFamily,'ADDRESS_FAMILY_MISMATCH');
 assert.ok(prefix===undefined||prefix===(family===4?'32':'128'),'HOST_PREFIX_REQUIRED');
 let bytes,canonical;
 if(family===4){bytes=Buffer.from(host.split('.').map(Number));canonical=[...bytes].join('.');}
 else{
  assert.ok(!host.includes('.'),'IPV4_EMBEDDED_IPV6_UNSUPPORTED');
  const halves=host.split('::');let words;
  if(halves.length===2){const left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];words=[...left,...Array(8-left.length-right.length).fill('0'),...right];}
  else words=host.split(':');
  assert.equal(words.length,8);bytes=Buffer.alloc(16);words.forEach((word,index)=>bytes.writeUInt16BE(Number.parseInt(word,16),index*2));
  const zero80=bytes.subarray(0,10).every(x=>x===0);assert.ok(!(zero80&&bytes[10]===255&&bytes[11]===255),'IPV4_MAPPED_IPV6_UNSUPPORTED');
  const zero96=bytes.subarray(0,12).every(x=>x===0);assert.ok(!(zero96&&bytes.readUInt32BE(12)>1),'IPV4_COMPATIBLE_IPV6_UNSUPPORTED');
  canonical=Array.from({length:8},(_,i)=>bytes.readUInt16BE(i*2).toString(16).padStart(4,'0')).join(':');
 }
 return Object.freeze({family,canonical,hex:bytes.toString('hex'),key:family+':'+bytes.toString('hex')});
}
function assertHostEqual(actual,expected,message='HOST_IDENTITY_MISMATCH'){
 const e=parseHost(expected),a=parseHost(actual,e.family);assert.equal(a.key,e.key,message);return true;
}
module.exports={parseHost,assertHostEqual};
