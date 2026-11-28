import {setTimeout as pause} from 'node:timers/promises';

type CycleResult={status:string;results:readonly {status:string}[]};

export async function runReviewWorkerLoop(ops:{
    prepare:()=>Promise<unknown>;
    reconcile:()=>Promise<unknown>;
    drain:()=>Promise<CycleResult>;
    prune?:()=>Promise<number>;
    stop:()=>void;
    close:()=>Promise<unknown>;
},options:{pollMs:number;maxCycles:number;log:(event:Record<string,unknown>)=>void}){
    const controller=new AbortController();
    const stop=()=>{
        if(controller.signal.aborted)return;
        ops.stop();
        controller.abort();
    };
    process.on('SIGTERM',stop);
    process.on('SIGINT',stop);
    try{
        await ops.prepare();
        let cycles=0;
        while(!controller.signal.aborted){
            const started=performance.now();
            await ops.reconcile();
            if(controller.signal.aborted)break;
            const result=await ops.drain();
            const pruned=!controller.signal.aborted&&ops.prune?await ops.prune():0;
            options.log({event:'REVIEW_WORKER_CYCLE',cycle:++cycles,status:result.status,
                processed:result.results.length,completed:result.results.filter(r=>r.status==='COMPLETED').length,
                pruned,durationMs:Math.round(performance.now()-started)});
            if(controller.signal.aborted||options.maxCycles&&cycles>=options.maxCycles)break;
            try{await pause(options.pollMs,undefined,{signal:controller.signal});}
            catch(error){if(!controller.signal.aborted)throw error;}
        }
        return {status:'STOPPED'};
    }finally{
        try{await ops.close();}
        finally{process.off('SIGTERM',stop);process.off('SIGINT',stop);}
    }
}
