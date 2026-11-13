'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const canonical=Object.freeze({motorbike:'Xe m\u00e1y',car:'\u00d4 t\u00f4',dong:'\u20ab',end:'K\u1ebft th\u00fac phi\u00ean G2',reference:'B\u1ea3n tham kh\u1ea3o t\u1eeb Planner. Ch\u01b0a l\u01b0u chuy\u1ebfn \u0111i ho\u1eb7c \u0111\u1eb7t d\u1ecbch v\u1ee5.'});
function assertUiStrings(candidate){assert.deepStrictEqual(candidate,canonical,'UI_LITERAL_CORRUPT_BEFORE_LOCATOR');return true;}
function readUiStrings(file=path.join(__dirname,'ui-strings.json')){const text=new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(file));assert.ok(!text.includes('\ufffd'),'INVALID_UTF8');const value=JSON.parse(text);assertUiStrings(value);return Object.freeze(value);}
const UI=readUiStrings();
const money=value=>new Intl.NumberFormat('vi-VN').format(value)+' '+UI.dong;
async function assertConfirmationControls(page){
  assertUiStrings(UI);
  for(const name of [UI.motorbike,UI.car]){
    const button=page.getByRole('button',{name,exact:true});
    assert.equal(await button.count(),1,'UI_CONFIRMATION_BUTTON_MISSING: '+name);
    assert.equal(await button.isEnabled(),true,'UI_CONFIRMATION_BUTTON_DISABLED: '+name);
  }
  return true;
}
async function clickConfirmation(page,name,{beforeClick=()=>{}}={}){
  assert.ok(name===canonical.motorbike||name===canonical.car,'UI_LITERAL_CORRUPT_BEFORE_LOCATOR');
  const button=page.getByRole('button',{name,exact:true});
  assert.equal(await button.count(),1,'UI_CONFIRMATION_BUTTON_MISSING: '+name);
  assert.equal(await button.isEnabled(),true,'UI_CONFIRMATION_BUTTON_DISABLED: '+name);
  await beforeClick();
  await button.evaluate(el=>el.scrollIntoView({block:'center'}));
  await page.evaluate(()=>window.scrollBy(0,-80));
  await button.click({timeout:5000});
  return true;
}
async function assertCompletedUi(page,result,expect){
  assertUiStrings(UI);
  const turn=page.getByTestId('agent-turn').last();
  // Accessible name below is escaped ASCII source, decoded to exact Unicode.
  const region=turn.locator('section[aria-label="L\u1ecbch tr\u00ecnh \u0111\u1ec1 xu\u1ea5t"]');
  await expect(region).toBeVisible();
  const p=result.itinerary,cost=result.cost;
  for(const text of [p.title,p.startDate,p.endDate,money(cost.estimated),money(cost.budget),p.budgetAdvice,UI.reference])await expect(region).toContainText(text);
  await expect(region).toContainText(cost.budgetStatus==='over_budget'?'V\u01b0\u1ee3t ng\u00e2n s\u00e1ch: '+money(cost.overBudget):'Trong ng\u00e2n s\u00e1ch \u0111\u00e3 nh\u1eadp');
  await expect(region.locator('h4')).toHaveCount(p.days.length);
  const dayRegions=region.locator('section').filter({has:page.locator('h4')});
  await expect(dayRegions).toHaveCount(p.days.length);
  for(const [dayIndex,day] of p.days.entries()){
    const dayRegion=dayRegions.nth(dayIndex);
    await expect(dayRegion).toContainText(day.date);
    await expect(dayRegion).toContainText('D\u1ef1 to\u00e1n ng\u00e0y: '+money(day.dayEstimatedCostVND));
    await expect(dayRegion).toContainText('Chi ph\u00ed l\u01b0u tr\u00fa: '+money(day.lodgingEstimatedCostVND));
    const items=dayRegion.locator('ol > li');await expect(items).toHaveCount(day.activities.length);
    for(const [activityIndex,activity] of day.activities.entries()){
      const item=items.nth(activityIndex);
      await expect(item.getByText(activity.title,{exact:true})).toBeVisible();
      await expect(item).toContainText('D\u1ef1 to\u00e1n: '+money(activity.estimatedCostVND));
      if(activity.costSource)await expect(item).toContainText(activity.costSource);
    }
  }
  for(const warning of result.warnings)await expect(region).toContainText(warning);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'UI_HORIZONTAL_OVERFLOW');
  return true;
}
module.exports={UI,money,assertUiStrings,readUiStrings,assertConfirmationControls,clickConfirmation,assertCompletedUi};
