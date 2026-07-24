
(() => {
  const button=document.getElementById('registerDocument');if(!button)return;
  button.addEventListener('click',()=>{
    const label=document.getElementById('documentLabel').value.trim();
    const type=document.getElementById('documentType').value;
    const file=document.getElementById('billFile')?.files?.[0];
    if(!label){showToast('Add a document label first');return;}
    let os={version:'5.0',tasks:[],documents:[],consent:{}};
    try{os={...os,...(JSON.parse(localStorage.getItem('saveEarnPaulV5OS'))||{})};}catch(_){}
    os.documents=Array.isArray(os.documents)?os.documents:[];
    os.documents.push({id:crypto.randomUUID(),label,type,fileName:file?.name||'File not selected',addedAt:new Date().toISOString()});
    localStorage.setItem('saveEarnPaulV5OS',JSON.stringify(os));
    showToast('Document metadata added to My Household');
    window.trackSafe?.('document_metadata_saved',{type});
  });
})();
