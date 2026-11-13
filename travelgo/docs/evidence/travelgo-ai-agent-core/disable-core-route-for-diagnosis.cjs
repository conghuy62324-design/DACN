// Counterfactual in-memory ONLY. No source/dist or historical assertions modified.
const Module=require('node:module'),compile=Module.prototype._compile;
Module.prototype._compile=function(source,file){if(file.replaceAll('\\','/').endsWith('/backend/dist/routes/agentRoutes.js'))source=source.replace(/^const agentCoreRoutes_js_1 = require\("\.\/agentCoreRoutes\.js"\);\r?\n/m,'').replace(/^\s*router\.use\('\/core', \(0, agentCoreRoutes_js_1\.createAgentCoreRouter\)\(\)\);\r?\n/m,'');return compile.call(this,source,file);};
