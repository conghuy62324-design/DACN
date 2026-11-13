// MOCK_ONLY layer isolation. Never imported by app. No production bypass option added.
// Used ONLY after full real-policy regression, to isolate the pre-existing provider
// validation/recovery/gate paths from the newly approved pre-inference short-circuit.
const path=require('node:path');
const completeness=require(path.resolve(__dirname,'../../../backend/dist/agent/currentCompleteness.js'));
completeness.assessCurrentCompleteness=()=>({status:'UNDETERMINED',reason:'OUTSIDE_PROVEN_GRAMMAR'});
