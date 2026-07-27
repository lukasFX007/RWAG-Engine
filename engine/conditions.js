// Vyhodnocování podmínek u voleb, schopností rolí a událostí.
//
// Neznámý typ podmínky hru NIKDY nezamyká - vrátí true a jen zaloguje varování.
// Díky tomu jde hrát obsah, jehož mechanika ještě není hotová (např. gps_zone).

const CONDITION_OPERATORS = {
    "<"  : (a,b)=>a<b,
    "<=" : (a,b)=>a<=b,
    ">"  : (a,b)=>a>b,
    ">=" : (a,b)=>a>=b,
    "==" : (a,b)=>a===b,
    "="  : (a,b)=>a===b,
    "!=" : (a,b)=>a!==b
};

// opačný operátor - pro popis toho, co je potřeba splnit
const CONDITION_OPPOSITES = {
    "<":">=", "<=":">", ">":"<=", ">=":"<", "==":"!=", "=":"!=", "!=":"=="
};

const CONDITION_LABELS = {
    reputation:"reputace",
    players:"počet hráčů"
};

const Conditions = {

    // seznam podmínek se vyhodnocuje jako AND (musí platit všechny)
    evaluateAll(list){
        if(!list) return true;
        if(!Array.isArray(list)) list=[list];
        return list.every(c=>this.evaluate(c));
    },

    // seznam podmínek jako OR (stačí jedna) - používá se u disableIf
    evaluateAny(list){
        if(!list) return false;
        if(!Array.isArray(list)) list=[list];
        return list.some(c=>this.evaluate(c));
    },

    evaluate(condition){
        if(!condition) return true;

        const state = (window.Engine && Engine.state) || {};

        switch(condition.type){

            case "and":
                return this.evaluateAnd(condition.conditions);

            case "or":
                return this.evaluateOr(condition.conditions);

            case "not":
                return this.evaluateNot(condition.condition || condition.conditions);

            case "reputation":
                return this.compare(state.reputation || 0, condition);

            case "players":
                return this.compare((state.players || []).length, condition);

            // předmět v inventáři
            case "item":{
                const has = (state.inventory || []).some(
                    i=>(i.id || i) === condition.id
                );
                return condition.has === false ? !has : has;
            }

            // libovolný příznak nastavený efektem
            case "flag":{
                const value = (state.flags || {})[condition.id];
                if(condition.value === undefined){
                    return !!value;
                }
                return value === condition.value;
            }

            // je ve skupině hráč s danou rolí?
            case "role":{
                const has = (state.players || []).some(
                    p=>p.role && p.role.id === condition.id
                );
                return condition.has === false ? !has : has;
            }

            // navštívená scéna
            case "visited":
                return (state.visited || []).includes(condition.id);

            // splněný úkol
            case "quest":{
                const quest = (state.quests || {})[condition.id];
                return condition.state
                    ? quest === condition.state
                    : quest === "done";
            }

            default:
                console.warn(
                    "Neznámý typ podmínky (propouštím):",
                    condition.type,
                    condition
                );
                return true;
        }
    },

    evaluateAnd(list){
        if(!list) return true;
        return list.every(c=>this.evaluate(c));
    },

    evaluateOr(list){
        if(!list) return true;
        return list.some(c=>this.evaluate(c));
    },

    evaluateNot(condition){
        return !this.evaluate(condition);
    },

    compare(actual, condition){
        const operator =
            CONDITION_OPERATORS[condition.operator || ">="];
        if(!operator){
            console.warn(
                "Neznámý operátor podmínky:",
                condition.operator
            );
            return true;
        }
        return operator(actual, condition.value);
    },

    // Popis podmínky pro hráče. Se změnou negate=true popisuje, CO JE POTŘEBA
    // SPLNIT, aby podmínka nebránila - proto se u číselných obrací operátor.
    // (disableIf říká, kdy je volba zamčená; hráči chceme ukázat opak.)
    describe(condition, negate){
        if(!condition) return "";

        switch(condition.type){
            case "reputation":
            case "players":{
                const raw = condition.operator || ">=";
                const operator = negate
                    ? (CONDITION_OPPOSITES[raw] || raw)
                    : raw;
                return `${CONDITION_LABELS[condition.type]} ${operator} ${condition.value}`;
            }
            case "item":
                return `předmět: ${condition.id}`;
            case "role":
                return `ve skupině role: ${condition.id}`;
            case "quest":
                return `splněný úkol: ${condition.id}`;
            case "visited":
                return `navštívená scéna: ${condition.id}`;
            case "flag":
                return `${condition.id}`;
            default:
                return condition.type;
        }
    },

    describeAll(list, negate){
        if(!list) return "";
        if(!Array.isArray(list)) list=[list];
        return list
            .map(c=>this.describe(c, negate))
            .filter(Boolean)
            .join(", ");
    },

    // popis požadavku u zamčené volby - bere disableIf i enableIf
    describeChoiceRequirement(choice){
        if(choice.disableIf){
            return this.describeAll(choice.disableIf, true);
        }
        if(choice.enableIf){
            return this.describeAll(choice.enableIf, false);
        }
        return "";
    }
};

window.Conditions = Conditions;
