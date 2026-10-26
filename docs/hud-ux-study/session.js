// Synthetic local session only. No credentials or live backend are used.
localStorage.setItem('token','local-study-only');
localStorage.setItem('activeSubProfile',JSON.stringify({_id:'local-demo',name:'Explorer'}));
localStorage.setItem('selectedMazeDate','2026-10-26');
const studyURL=new URL(location.href);
if(studyURL.searchParams.get('reset')==='1'){
 sessionStorage.removeItem('mazeCompletion:local-demo:2026-10-26');
 studyURL.searchParams.delete('reset');history.replaceState(null,'',studyURL);
}
document.cookie=`hudSave=${new URLSearchParams(location.search).get('save')||'pending'};path=/;SameSite=Strict`;
document.cookie=`hudGrid=${new URLSearchParams(location.search).get('grid')||'daily'};path=/;SameSite=Strict`;
Math.random=()=>0;
