const fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'run-final-regression.cjs'),'utf8')
 .replace("const output=path.join(__dirname,'final-run');fs.mkdirSync(output);","const artifactDirectory=path.join(__dirname,'final-verified');fs.mkdirSync(artifactDirectory);")
 .replaceAll('path.join(output,','path.join(artifactDirectory,');
fs.writeFileSync(path.join(__dirname,'run-final-verified.cjs'),script,{flag:'wx'});
