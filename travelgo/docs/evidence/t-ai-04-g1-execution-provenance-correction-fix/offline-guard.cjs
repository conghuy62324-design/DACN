// No real Ollama or external requests in any offline child, even with a forgotten fake.
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
 const target=new URL(String(url));
 if(!['127.0.0.1','localhost','[::1]'].includes(target.hostname)||target.port==='11434')throw Error('OFFLINE_NATIVE_LLM_NETWORK_FORBIDDEN');
 return nativeFetch(url,init); // Ephemeral local HTTP API test servers only.
};
