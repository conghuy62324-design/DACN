// Reuse the existing replay in memory; never edit or overwrite historical evidence.
const fs=require('fs'),path=require('path'),Module=require('module');
const original=path.resolve(__dirname,'../business-v61b-20261116/ui-offline-replay.cjs');let source=fs.readFileSync(original,'utf8');
source=source.replace('const dir=__dirname,fixtures=','const dir='+JSON.stringify(__dirname)+',fixtures=');
source=source.replace("path.join(dir,'offline-final-02.json')",JSON.stringify(path.resolve(__dirname,'../business-v61b-20261116/offline-final-02.json')));
const anchor="await expect(page.getByText('Đang chỉnh sửa:',{exact:false})).toBeVisible();";
if(!source.includes(anchor))throw Error('EXISTING_REPLAY_ANCHOR_CHANGED');
source=source.replace(anchor,anchor+"const loaded=page.getByRole('region',{name:'Chuyến đi đã mở',exact:true});await expect(loaded).toContainText('Dự toán cả nhóm đã lưu');await expect(loaded).toContainText('Ngày 1');await expect(loaded).toContainText(trip.days[0].activities[0].title);assert(!(await loaded.innerText()).includes(trip.id));assert(!(await loaded.innerText()).includes('PRIVATE_CANARY'));" );
const runner=new Module(original,module);runner.filename=original;runner.paths=Module._nodeModulePaths(path.dirname(original));runner._compile(source,original);
