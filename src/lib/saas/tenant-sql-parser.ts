/** Split ordinary Prisma SQL while preserving quoted strings, identifiers and -- comments. */
export function splitTenantSql(sql:string):string[] {
 const statements:string[]=[];let current="",quote:"'"|'"'|null=null,comment=false;
 for(let i=0;i<sql.length;i++){
  const c=sql[i],next=sql[i+1];
  if(comment){current+=c;if(c==="\n")comment=false;continue;}
  if(quote){
   current+=c;
   if(c===quote){if(next===quote){current+=next;i++;}else quote=null;}
   continue;
  }
  if(c==="-"&&next==="-"){comment=true;current+=c+next;i++;continue;}
  if(c==="'"||c==='"'){quote=c;current+=c;continue;}
  if(c===";"){
   if(current.replace(/--[^\n]*/g,"").trim())statements.push(current.trim());
   current="";continue;
  }
  current+=c;
 }
 if(quote)throw new Error("Aspas SQL não terminadas em migração.");
 if(current.replace(/--[^\n]*/g,"").trim())throw new Error("Migração com instrução sem terminador.");
 return statements;
}
