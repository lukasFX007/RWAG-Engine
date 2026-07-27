const Status={
render(){
 const bar=document.getElementById("status");
 if(!bar) return;
 if(!Engine.game){
    bar.innerHTML = `
        <button id="menuButton" aria-label="Menu">${icons.menu}</button>
    `;
    Menu.init();
    return;
}
 const r=Engine.state.reputation;
 const icon=r>0?icons.rep_pos:r<0?icons.rep_neg:icons.rep_neu;
 const tone=r>0?"rep-pos":r<0?"rep-neg":"rep-neu";
 bar.innerHTML=`
<button id="menuButton" aria-label="Menu">${icons.menu}</button>

<span class="rep ${tone}" title="Reputace skupiny">
    <span class="rep-icon">${icon}</span>
    <span class="rep-value">${r>0?"+":""}${r}</span>
</span>
`;

if(window.Menu){
    Menu.init();
}
}};
window.Status=Status;


const ScenarioStatus = {
    available:{
        icon:icons.puntik_zeleny,
        text:"K dispozici!"
    },
    preparing:{
        icon:icons.puntik_cerveny,
        text:"Připravujeme..."
    },
    beta:{
        icon:icons.puntik_zluty,
        text:"Probíhá testování."
    },
    get(status){
        return this[status] || {
            icon:"",
            text:status
        };
    }
};

window.ScenarioStatus = ScenarioStatus;
