import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const firebaseCli=process.platform==='win32'
  ?path.join(process.env.APPDATA||'', 'npm','node_modules','firebase-tools','lib','bin','firebase.js')
  :'/usr/local/lib/node_modules/firebase-tools/lib/bin/firebase.js';
if(!fs.existsSync(firebaseCli)){process.stderr.write('Firebase CLI global tidak ditemukan.\n');process.exit(1);}
const environment={...process.env};
for(const name of ['ANTHROPIC_API_KEY','CODEX_API_KEY','OPENAI_API_KEY','OPENAI_BASE_URL','DEBUG'])delete environment[name];

const suites=[
  {name:'Project A rules',config:'../../firebase.json',project:'demo-media-intelligence',command:'npm run test:project-a'},
  {name:'Project B rules',config:'../../services-project/firebase.json',project:'demo-disperindag-services',command:'npm run test:services'}
];

for(const suite of suites){
  process.stdout.write(`\n=== ${suite.name} ===\n`);
  const result=spawnSync(process.execPath,[firebaseCli,'emulators:exec','--only','firestore','--project',suite.project,'--config',suite.config,suite.command],{cwd:root,env:environment,stdio:'inherit',shell:false});
  if(result.error){process.stderr.write(`${suite.name} gagal dimulai.\n`);process.exit(1);}
  if(result.status!==0)process.exit(result.status??1);
}
