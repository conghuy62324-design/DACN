"""Remove only local test passwords/JWTs from this task's failed-browser trace before sealing."""
import json, pathlib, re, zipfile, os
here=pathlib.Path(__file__).resolve().parent
root=here.parents[3]
credentials=json.loads((root/'.local/catalog-staging/accounts.json').read_text(encoding='utf-8'))
password=credentials['password'].encode()
changed=[]
for source in here.glob('browser-*/artifacts/**/trace.zip'):
    assert source.resolve().is_relative_to(here)
    temporary=source.with_suffix('.redacted.zip')
    count=0
    with zipfile.ZipFile(source) as old, zipfile.ZipFile(temporary,'w',compression=zipfile.ZIP_DEFLATED) as new:
        for item in old.infolist():
            data=old.read(item.filename)
            count+=data.count(password)
            data=data.replace(password,b'REDACTED_LOCAL_TEST_PASSWORD')
            data,n=re.subn(rb'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',b'REDACTED_LOCAL_TEST_JWT',data)
            count+=n
            new.writestr(item,data)
    os.replace(temporary,source)
    changed.append({'trace':source.relative_to(here).as_posix(),'secretOccurrencesRedacted':count})
(here/'trace-redaction.json').write_text(json.dumps({'scope':'Only new V4 traces; password/JWT values only; assertions/errors/screenshots unchanged','traces':changed},indent=2),encoding='utf-8')
print(json.dumps({'traces':len(changed),'redacted':sum(t['secretOccurrencesRedacted'] for t in changed)}))
