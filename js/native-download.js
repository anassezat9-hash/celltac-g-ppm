(function(){
  if(!window.AndroidDownload||!window.XLSX)return;
  const original=XLSX.writeFile.bind(XLSX);
  XLSX.writeFile=function(wb,filename,opts){
    try{
      const base64=XLSX.write(wb,{bookType:'xlsx',type:'base64',compression:true});
      window.__nativeDownloadResult=function(ok,msg){
        const el=document.getElementById('exportMsg');
        if(el){el.className=ok?'msg ok':'msg err';el.textContent=ok?'✓ تم حفظ ملف Excel في مجلد Downloads.':'تعذر حفظ ملف Excel: '+msg;}
      };
      window.AndroidDownload.saveBase64(String(filename||'CelltacGPPM_Report.xlsx'),base64);
    }catch(e){
      console.error('Native Excel download failed:',e);
      original(wb,filename,opts);
    }
  };
})();
