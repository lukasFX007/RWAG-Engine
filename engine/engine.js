const Engine = {
    game:null,
    currentScene:null,
    state:null,

    async start(scenarioId, saved){
        this.state = this.defaultState();
        try{
            await this.loadGame(scenarioId);
            await this.loadRoles();
            await this.loadLegend();
            UI.init();
            if(saved){
                // rozehraná pozice přepíše čerstvý stav
                this.state = Object.assign(
                    this.defaultState(),
                    saved.state
                );
                console.log(
                    "POKRAČUJI OD SCÉNY:",
                    saved.sceneId
                );
            }
            Status.render();
            this.gotoScene(
                saved ? saved.sceneId : this.game.startScene
            );
            Menu.init();
        }catch(e){
            console.error(e);
            document.getElementById("game").innerHTML="❌ "+e.message;
        }
    },

    async loadGame(scenarioId){
        console.log(
            "LOAD GAME ID:",
            scenarioId
        );
        const scenario =
            Launcher.scenarios.find(
                s=>s.id===scenarioId
            );
        if(!scenario){
            throw new Error(
                "Scénář nenalezen"
            );
        }
    
        const response =
            await fetch(
                scenario.file
            );
        if(!response.ok){
            throw new Error(
                "Nelze načíst scénář"
            );
        }
    
        this.game =
            await response.json();
    
        // základní cesta ke scénáři
        this.basePath =
            scenario.file.substring(
                0,
                scenario.file.lastIndexOf("/")
            ) + "/";

        const rolesResponse =
            await fetch(
                scenario.file.substring(
                    0,
                    scenario.file.lastIndexOf("/")
                ) + "/roles.json"
            );
        
        this.roles =
            await rolesResponse.json();
        
        // načtení rolí
        try{
            const rolesResponse =
                await fetch(
                    this.basePath + "roles.json"
                );
            if(rolesResponse.ok){
                const rolesData =
                    await rolesResponse.json();
                this.game.roles =
                    rolesData.roles;
                console.log(
                    "ROLES LOADED:",
                    this.game.roles
                );
            }else{
                this.game.roles=[];
            }
        }catch(e){
            console.warn(
                "Role nelze načíst",
                e
            );
            this.game.roles=[];
        }
    
        console.log(
            "BASE PATH:",
            this.basePath
        );
    },
    
    async loadRoles(){
        const roles =
            await Roles.load(
                this.basePath + this.game.roleSet
            );
        this.state.roles = [...roles];
        console.log(
            "AVAILABLE ROLES:",
            this.state.roles
        );
    },

    async loadLegend(){
        if(!this.game.legend){
            console.log(
                "Scénář nemá legendu"
            );
            return;
        }
        const response =
            await fetch(
                this.basePath + this.game.legend
            );
        if(!response.ok){
            throw new Error(
                "Nelze načíst legendu"
            );
        }
        this.legend =
            await response.json();
         console.log(
            "LEGEND LOADED:",
            this.legend
        );
    },
    
    getScene(id){
        return this.game?.scenes?.find(s=>s.id===id) || null;
    },

    gotoScene(id){
        const scene=this.getScene(id);
        if(!scene) throw new Error("Scéna nenalezena: "+id);

        if(this.currentScene && this.currentScene.id !== id){
            this.state.history.push(this.currentScene.id);
        }
        this.currentScene=scene;

        // efekty scény se aplikují jen při první návštěvě.
        // Navštívené scény jsou ve stavu (ne na scéně), aby přežily uložení.
        if(!this.state.visited.includes(id)){
            this.state.visited.push(id);
            if(window.Effects) Effects.apply(scene.effects);
        }

        UI.renderScene(scene);
        if(window.Save) Save.autosave();
    },

    // Vzdělaný pedant: [1/hru] můžete vzít zpět jedno rozhodnutí
    goBack(){
        const previous = this.state.history.pop();
        if(!previous){
            if(window.UI) UI.toast("Není kam se vrátit.");
            return false;
        }
        const scene = this.getScene(previous);
        if(!scene){
            return false;
        }
        this.currentScene = scene;
        UI.renderScene(scene);
        if(window.Save) Save.autosave();
        return true;
    },

    abilityKey(playerIndex, kind, index){
        return playerIndex + ":" + kind + ":" + index;
    },

    isAbilityUsed(playerIndex, kind, index){
        return !!this.state.usedAbilities[
            this.abilityKey(playerIndex, kind, index)
        ];
    },

    // Použití schopnosti role. kind = "advantages" | "disadvantages"
    useAbility(playerIndex, kind, index){
        const player = this.state.players[playerIndex];
        if(!player || !player.role) return false;

        const ability = (player.role[kind] || [])[index];
        if(!ability) return false;

        const key = this.abilityKey(playerIndex, kind, index);
        const once =
            ability.usage &&
            ability.usage.type === "once";

        if(once && this.state.usedAbilities[key]){
            return false;
        }
        if(
            ability.condition &&
            !Conditions.evaluate(ability.condition)
        ){
            if(window.UI) UI.toast("Podmínka pro použití není splněna.");
            return false;
        }

        if(once){
            this.state.usedAbilities[key] = true;
        }
        Effects.apply(ability.effects);
        if(window.Save) Save.autosave();
        return true;
    },

    addPlayer(name){
        if(!name){
            return false;
        }
        if(this.state.roles.length===0){
            return false;
        }
        const index =
            Math.floor(
                Math.random() *
                this.state.roles.length
            );
        const role =
            this.state.roles.splice(
                index,
                1
            )[0];
        this.state.players.push({
            name:name,
            role:role
        });
        console.log(
            "PLAYER:",
            this.state.players
        );
        console.log(
            "REMAINING ROLES:",
            this.state.roles
        );
        return true;
    },

    assignRandomRole(playerIndex){
        const players =
            this.state.pendingPlayers;
        const player =
            players[playerIndex];
        if(!player){
            console.error("Hráč nenalezen");
            return;
        }
    
        // již použité role
        const usedRoles =
            this.state.players
            .map(p=>p.role?.id)
            .filter(Boolean);
    
        // dostupné role
        const availableRoles =
            this.roles.roles.filter(
                role=>!usedRoles.includes(role.id)
            );
    
        if(availableRoles.length===0){
            alert("Nejsou dostupné žádné role.");
            return;
        }
    
        // náhodný výběr
        const randomRole =
            availableRoles[
                Math.floor(
                    Math.random()*availableRoles.length
                )
            ];
    
        // přiřazení
        player.role=randomRole;
    
        // přesun hráče mezi hotové
        this.state.players.push(player);
        this.state.pendingPlayers.splice(
            playerIndex,
            1
        );
    
        console.log(
            "PŘIŘAZENA ROLE:",
            randomRole
        );
    },
    
    exitScenario(){
        this.game = null;
        this.legend = null;
        this.state = this.defaultState();
    
        document.getElementById("game").style.display="none";
        document.getElementById("launcher").style.display="block";
    
        Menu.page="main";
        Menu.close();
        Launcher.render();
    },

    defaultState(){
        return {
            reputation:0,
            inventory:[],
            roles:[],
            players:[],
            pendingPlayers:[],
            flags:{},
            quests:{},
            visited:[],
            history:[],
            // schopnosti rolí, které se teprve uplatní (počítadla)
            modifiers:{
                ignore_reputation_loss:0,
                ignore_choice_condition:0,
                ignore_encounter:0
            },
            usedAbilities:{}
        };
    },
    
};

window.Engine=Engine;
