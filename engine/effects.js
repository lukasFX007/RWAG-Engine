// Aplikace efektů ze scén, událostí a schopností rolí.
//
// Typy začínající "roleplay_" jsou instrukce pro hráče, ne pro engine -
// zobrazí se jen jako hláška a nic nemění.

const Effects = {

    apply(effects){
        if(!effects) return;
        if(!Array.isArray(effects)) effects=[effects];

        effects.forEach(effect=>{
            // efekt může mít vlastní podmínku (např. jen v určité GPS zóně)
            if(effect.condition && !Conditions.evaluate(effect.condition)){
                console.log("EFEKT PŘESKOČEN (podmínka):", effect);
                return;
            }
            this.applyOne(effect);
        });

        if(window.Status) Status.render();
    },

    applyOne(effect){
        const state = Engine.state;

        switch(effect.type){

            case "reputation":{
                // Šlechtic: [1/hru] skupina může ignorovat jednu ztrátu reputace
                if(
                    effect.value < 0 &&
                    state.modifiers.ignore_reputation_loss > 0
                ){
                    state.modifiers.ignore_reputation_loss--;
                    this.toast(
                        `${icons.koruna} Ztráta reputace ignorována díky schopnosti role.`
                    );
                    return;
                }
                state.reputation += effect.value;
                break;
            }

            case "toast":
                this.toast(effect.text);
                break;

            case "item":
                if(effect.remove){
                    state.inventory = state.inventory.filter(
                        i=>(i.id || i) !== effect.id
                    );
                }else{
                    state.inventory.push({
                        id:effect.id,
                        name:effect.name || effect.id,
                        icon:effect.icon || "batoh"
                    });
                    this.toast(
                        `${icons.batoh} ${effect.name || effect.id}`
                    );
                }
                break;

            case "flag":
                state.flags[effect.id] =
                    effect.value === undefined ? true : effect.value;
                break;

            case "quest":
                state.quests[effect.id] = effect.state || "active";
                this.toast(
                    `${icons.svitek} ${
                        effect.state === "done" ? "Úkol splněn" : "Nový úkol"
                    }: ${effect.name || effect.id}`
                );
                break;

            // Náhodné setkání. Události zatím nemají data (events.json chybí),
            // takže se skupině jen řekne, ať si líznou kartu.
            case "encounter":
                if(state.modifiers.ignore_encounter > 0){
                    state.modifiers.ignore_encounter--;
                    this.toast(
                        `${icons.hodiny} Náhodnému setkání jste předešli.`
                    );
                    return;
                }
                this.toast(
                    `${icons.hodiny} Nastává náhodné setkání - lízněte si kartu události.`
                );
                break;

            // Schopnosti, které jen odemykají budoucí akci.
            case "ignore_reputation_loss":
            case "ignore_choice_condition":
            case "ignore_encounter":
                state.modifiers[effect.type] =
                    (state.modifiers[effect.type] || 0) + 1;
                break;

            case "return_on_choice":
                Engine.goBack();
                break;

            case "nature_quest_done":
                this.toast(
                    `${icons.priroda} Úkol charakteru příroda můžete rovnou splnit.`
                );
                break;

            default:
                if(effect.type && effect.type.indexOf("roleplay_")===0){
                    // instrukce pro hraní postavy - engine nic nedělá
                    return;
                }
                console.warn("Neznámý typ efektu:", effect.type, effect);
        }
    },

    toast(text){
        if(!text) return;
        if(window.UI && UI.toast){
            UI.toast(text);
        }else{
            console.log("TOAST:", text);
        }
    }
};

window.Effects = Effects;
