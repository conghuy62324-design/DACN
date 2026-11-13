const c=require('./common.cjs');
const runner=c.fs.readFileSync(c.path.join(c.evidence,'run-regression-final.cjs'),'utf8').replaceAll('final-security-verified','release-verified');
c.fs.writeFileSync(c.path.join(c.evidence,'run-regression-release.cjs'),runner,{flag:'wx'});
const fixture=c.fs.readFileSync(c.path.join(c.evidence,'run-foundation-final.cjs'),'utf8').replaceAll('foundation-fixture-diff-final','foundation-fixture-diff-release').replaceAll('foundation-single-intent-control-final','foundation-single-intent-control-release').replaceAll("'.final.js'","'.release.js'");
c.fs.writeFileSync(c.path.join(c.evidence,'run-foundation-release.cjs'),fixture,{flag:'wx'});
const tests=c.json('docs/evidence/t-ai-04-g1-natural-language-proof-fix/natural-proof-verified.json');
console.log(JSON.stringify({passed:tests.passed,failed:tests.failed,negative:tests.negativeGateAttempts,wrong:tests.wrongArgumentAttempts,falsePositive:tests.falsePositiveAuthorization}));
