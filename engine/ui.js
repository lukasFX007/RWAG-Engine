const TOAST_TIME = 4000;

const UI={
    root:null,

    init(){
        this.root=document.getElementById("game");
    },

    renderScene(scene){
        this.root.innerHTML="";
        if(scene.image) this.root.appendChild(this.createSceneImage(scene.image));
        this.renderText(scene);
        this.renderChoices(scene);
        Status.render();
    },

    renderText(scene){
        const d=document.createElement("div");
        const text=Array.isArray(scene.text)
            ? scene.text.join("<br><br>")
            : scene.text;

        // iniciálu dostanou jen delší scény, u krátké hlášky by vypadala hloupě
        d.className = text.length > 140 ? "text text--versal" : "text";
        d.innerHTML = text;
        this.root.appendChild(d);
    },

    renderChoices(scene){
        (scene.choices||[]).forEach(c=>{
            const b=document.createElement("button");
            b.className="choice";

            if(this.isChoiceLocked(c)){
                this.renderLockedChoice(b,c);
            }else{
                b.innerHTML=this.choiceMarkup(
                    icons[c.icon] || icons.stopy,
                    c.text
                );
                b.onclick=()=>Engine.gotoScene(c.goto);
            }

            this.root.appendChild(b);
        });
    },

    // znak charakteru akce má vlastní sloupec - viz legenda hry
    choiceMarkup(sigil, text, requirement){
        return `
            <span class="choice-sigil">${sigil}</span>
            <span class="choice-label">
                <span>${text}</span>
                ${requirement
                    ? `<span class="choice-requirement">${requirement}</span>`
                    : ""}
            </span>
        `;
    },

    // disableIf = zamkni, když platí ALESPOŇ JEDNA podmínka
    // enableIf  = odemkni, jen když platí VŠECHNY
    isChoiceLocked(choice){
        if(choice.disableIf && Conditions.evaluateAny(choice.disableIf)){
            return true;
        }
        if(choice.enableIf && !Conditions.evaluateAll(choice.enableIf)){
            return true;
        }
        return false;
    },

    renderLockedChoice(button, choice){
        const requirement =
            Conditions.describeChoiceRequirement(choice);

        button.classList.add("locked");
        button.innerHTML=this.choiceMarkup(
            icons.zamceno,
            choice.text,
            requirement
        );

        // Tupec: [1/hru] skupina může ignorovat podmínku rozhodnutí
        const unlocker = this.findUnlocker();
        if(!unlocker){
            button.disabled = true;
            return;
        }

        button.classList.add("unlockable");
        button.innerHTML=this.choiceMarkup(
            icons.odemceno,
            choice.text,
            `${requirement} &middot; otevře ${unlocker.role.name}`
        );
        button.onclick=()=>{
            Menu.confirm(
                `Odemknout tuto volbu schopností role ${unlocker.role.name} (${unlocker.player.name})? Jde to jen jednou za hru.`,
                ()=>{
                    Menu.close();
                    Menu.page="main";
                    if(Engine.useAbility(
                        unlocker.playerIndex,
                        "advantages",
                        unlocker.abilityIndex
                    )){
                        Engine.state.modifiers.ignore_choice_condition--;
                        Engine.gotoScene(choice.goto);
                    }
                }
            );
            Menu.openMenu();
        };
    },

    // najde nepoužitou schopnost, která umí odemknout podmínku rozhodnutí
    findUnlocker(){
        const players = (Engine.state && Engine.state.players) || [];
        for(let p=0; p<players.length; p++){
            const advantages =
                (players[p].role && players[p].role.advantages) || [];
            for(let a=0; a<advantages.length; a++){
                const effects = advantages[a].effects;
                const type = Array.isArray(effects)
                    ? (effects[0] || {}).type
                    : (effects || {}).type;
                if(
                    type === "ignore_choice_condition" &&
                    !Engine.isAbilityUsed(p, "advantages", a)
                ){
                    return {
                        playerIndex:p,
                        abilityIndex:a,
                        player:players[p],
                        role:players[p].role
                    };
                }
            }
        }
        return null;
    },

    createSceneImage(name){
        const img=document.createElement("img");
        // obrázky scén leží ve složce scénáře, ne v kořeni aplikace
        img.src=(Engine.basePath || "") + "images/" + name;
        img.className="scene-image";
        img.onerror=()=>img.remove();
        return img;
    },

    toast(text){
        if(!text) return;

        let container=document.getElementById("toasts");
        if(!container){
            container=document.createElement("div");
            container.id="toasts";
            document.body.appendChild(container);
        }

        const toast=document.createElement("div");
        toast.className="toast";
        toast.innerHTML=text;
        container.appendChild(toast);

        if(
            window.Settings &&
            Settings.getVibration() &&
            navigator.vibrate
        ){
            navigator.vibrate(SETTINGS_VIBRATION_TIME);
        }

        setTimeout(()=>{
            toast.classList.add("toast-hide");
            setTimeout(()=>toast.remove(), 300);
        }, TOAST_TIME);
    }
};
window.UI=UI;
