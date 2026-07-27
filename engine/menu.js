const Menu = {
    page:"main",
    open:false,
    playersMode:"edit",
    editingAssignedPlayers:false,
    init(){
        const b=document.getElementById("menuButton");
        if(b){
            b.onclick=(e)=>{
                e.stopPropagation();
                this.toggle();
            };
        }

        const panel = document.getElementById("menuPanel");
        if(panel){
            panel.onclick = (e)=>{
                e.stopPropagation();
            };
        }

        document.addEventListener(
            "click",
            (e)=>{
                const panel=document.getElementById("menuPanel");
                if(
                    this.open &&
                    panel &&
                    !panel.contains(e.target) &&
                    e.target.id !== "menuButton"
                ){
                    this.close();
                }
            }
        );
    },

    toggle(){
        this.open=!this.open;
        const p=document.getElementById("menuPanel");
        if(!p) return;
        p.classList.toggle(
            "menu-open",
            this.open
        );
        
        if(this.open){
            this.render();
        }
    },

    openMenu(){
        this.open=true;
        const p=document.getElementById("menuPanel");
        if(p){
            p.classList.add("menu-open");
        }
        this.render();
    },

    close(){
        this.open=false;
        const p=document.getElementById("menuPanel");
        if(p){
            p.classList.remove("menu-open");
        }
    },

    render(){
        console.log("PAGE =", this.page);
        switch(this.page){
            case "settings":
                this.renderSettings();
                break;
            case "about":
                this.renderAbout();
                break;
            case "roles":
                this.renderRoles();
                break;
            case "legend":
                this.renderLegend();
                break;
            case "save":
                this.renderSave();
                break;
            case "confirm":
                this.renderConfirm();
                break;
            default:
                this.renderMain();
        }
    },

    renderMain(){
        if(!Engine.game){
            this.renderLauncherMenu();
        return;
        }
        document.getElementById("menuPanel").innerHTML=`
        <div class="menu-title">
            ${icons.svitek} ${Engine.game?.scenarioName || "Scénář"}
        </div>
        <div class="menu-item" id="menuRoles">
            ${icons.hraci} Hráči a role ${icons.vpred}
        </div>
        <div class="menu-item">${icons.svitek} Úkoly ${icons.zabrana}</div>
        <div class="menu-item">${icons.batoh} Inventář ${icons.zabrana}</div>
        <div class="menu-item" id="menuLegend">
            ${icons.knihy} Přehled pravidel ${icons.vpred}
        </div>
        <div class="menu-item">${icons.graf} Statistiky ${icons.zabrana}</div>
        <div class="menu-item" id="menuSave">
            ${icons.disketa} Uložit / Načíst pozici ${icons.vpred}
        </div>
        <div class="menu-item" id="menuExit">
            ${icons.dvere} Ukončit scénář
        </div>
        <hr>
        <div class="menu-item" id="menuSettings">
            ${icons.nastaveni} Nastavení ${icons.vpred}
        </div>
        <hr>
        <div class="menu-item" id="menuAbout">
            ${icons.info} O aplikaci ${icons.vpred}
        </div>
        `;
        document.getElementById("menuSettings").onclick = (e) => {
            e.stopPropagation();
            this.showSettings();
        };
        document.getElementById("menuAbout").onclick = (e) => {
            e.stopPropagation();
            this.showAbout();
        };
        document.getElementById("menuRoles").onclick=(e)=>{
            e.stopPropagation();
            this.showRoles();
        };
        document.getElementById("menuLegend").onclick=(e)=>{
            e.stopPropagation();
            this.showLegend();
        };
        document.getElementById("menuSave").onclick=(e)=>{
            e.stopPropagation();
            this.showSave();
        };
        document.getElementById("menuExit").onclick=(e)=>{
            e.stopPropagation();
            this.confirm(
                "Opravdu chceš ukončit scénář?",
                ()=>{
                    Engine.exitScenario();
                }
            );
        };
    },

    renderLauncherMenu(){
        document.getElementById("menuPanel").innerHTML=`
        <div class="menu-title">
            ${icons.menu} Menu
        </div>
        <div class="menu-item" id="menuSettings">
            ${icons.nastaveni} Nastavení ${icons.vpred}
        </div>
        <hr>
        <div class="menu-item" id="menuAbout">
            ${icons.info} O aplikaci ${icons.vpred}
        </div>
        `;
        document.getElementById("menuSettings").onclick=(e)=>{
            e.stopPropagation();
            this.showSettings();
        };
        document.getElementById("menuAbout").onclick=(e)=>{
            e.stopPropagation();
            this.showAbout();
        };
    },

    showLegend(){
        this.page="legend";
        this.render();
    },
    
    showSettings(){
        this.page="settings";
        this.render();
    },
    
    showAbout(){
        this.page="about";
        this.render();
    },

    showSave(){
        this.page="save";
        this.render();
    },

    renderSave(){
        const gameId = Engine.game && Engine.game.gameId;
        const saved = gameId ? Save.describe(gameId) : null;

        document.getElementById("menuPanel").innerHTML=`
        <div class="menu-title">
            ${icons.disketa} Uložit / Načíst pozici
        </div>
        <div class="menu-description">
            Hra se ukládá sama po každém rozhodnutí.
            ${saved
                ? `Poslední uložení: <strong>${saved}</strong>.`
                : "Zatím nic uloženo."}
        </div>
        <div class="menu-item" id="saveNow">
            ${icons.disketa} Uložit teď
        </div>
        ${saved ? `
        <div class="menu-item" id="saveLoad">
            ${icons.zpet} Načíst uloženou pozici
        </div>
        <div class="menu-item" id="saveClear">
            ${icons.krizek} Smazat uloženou pozici
        </div>` : ""}
        <hr>
        <div class="menu-item" id="menuBack">
            ${icons.zpet} Zpět do menu
        </div>
        `;

        document.getElementById("saveNow").onclick=(e)=>{
            e.stopPropagation();
            if(Save.save()){
                UI.toast(`${icons.disketa} Pozice uložena.`);
            }else{
                UI.toast(`${icons.krizek} Uložení se nepodařilo.`);
            }
            this.showMain();
        };

        if(saved){
            document.getElementById("saveLoad").onclick=(e)=>{
                e.stopPropagation();
                this.confirm(
                    "Načíst uloženou pozici? Rozehraný postup se zahodí.",
                    ()=>{
                        const data = Save.read(gameId);
                        this.close();
                        this.page="main";
                        Engine.start(gameId, data);
                    }
                );
            };
            document.getElementById("saveClear").onclick=(e)=>{
                e.stopPropagation();
                this.confirm(
                    "Opravdu smazat uloženou pozici?",
                    ()=>{
                        Save.clear(gameId);
                        this.showSave();
                    }
                );
            };
        }

        document.getElementById("menuBack").onclick=(e)=>{
            e.stopPropagation();
            this.showMain();
        };
    },

    renderSettings(){
        document.getElementById("menuPanel").innerHTML=`
        <div class="menu-title">
            ${icons.nastaveni} Nastavení
        </div>
        <div class="menu-section">
            ${icons.den_noc} Barevné schéma
        </div>
            <div class="theme-picker">
                <button
                    id="themeDark"
                    class="theme-preview dark">
                    Aa
                </button>
                <button
                    id="themeLight"
                    class="theme-preview light">
                    Aa
                </button>
                <button
                    id="themeMedieval"
                    class="theme-preview medieval">
                    Aa
                </button>
            </div>
        <div class="menu-section">
            ${icons.font} Font
        </div>
            <div class="theme-picker">
                <button
                    id="fontDefault"
                    class="font-preview font-default">
                    Aa
                </button>
                <button
                    id="fontMedieval"
                    class="font-preview font-medieval">
                    Aa
                </button>
                <button
                    id="fontTypewriter"
                    class="font-preview font-typewriter">
                    Aa
                </button>
            </div>
        <div class="menu-section">
            ${icons.up_down} Velikost písma:
            <span id="fontSizeValue"></span> px
        </div>
            <div class="slider-wrapper">
                <input
                id="fontSizeRange"
                type="range"
                min="10"
                max="30"
                value="16">
            </div>
        <div class="menu-section">
           ${icons.zvonek} Oznámení
        </div>
            <div class="setting-row settings-section">
                <span>${icons.repro_nic} Zvuky</span>
                <button 
                    id="soundToggle"
                    class="toggle-button">
                </button>
            </div>
            <div class="setting-row settings-section">
                <span>${icons.vibrace} Vibrace</span>
                <button 
                    id="vibrationToggle"
                    class="toggle-button">
                </button>
            </div>
        <div class="menu-section">
            ${icons.tv} Další možnosti zobrazení
        </div>
            <div class="checkbox-row settings-section">
                <input type="checkbox" id="choice_confirm" name="choice_confirm" checked />
                <label for="choice_confirm"> Požádat o potvrzení rozhodnutí</label>
            </div>
            <div class="checkbox-row settings-section">
                <input type="checkbox" id="quests_done_hide" name="quests_done_hide" checked />
                <label for="quests_done_hide"> Skrýt splněné úkoly</label>
            </div>
        <hr>
        <div class="menu-item" id="menuBack">
            ${icons.zpet} Zpět do menu
        </div>
        `;
        
        document.getElementById("themeDark").onclick=()=>{
            Settings.setTheme("dark");
        };
        
        document.getElementById("themeLight").onclick=()=>{
            Settings.setTheme("light");
        };
        
        document.getElementById("themeMedieval").onclick=()=>{
            Settings.setTheme("medieval");
        };
        
        document.getElementById("menuBack").onclick = (e) => {
            e.stopPropagation();
            this.showMain();
            
        };
        Settings.updateThemeButtons();
        Settings.updateFontButtons();

        document.getElementById("fontDefault").onclick=()=>{
            Settings.setFont("default");
        };

        document.getElementById("fontMedieval").onclick=()=>{
            Settings.setFont("medieval");
        };

        document.getElementById("fontTypewriter").onclick=()=>{
            Settings.setFont("typewriter");
        };

        const slider=document.getElementById("fontSizeRange");
        const value=document.getElementById("fontSizeValue");

        slider.value =
            Settings.get("font_size",16);

        value.innerText=slider.value;

        slider.oninput=(e)=>{
            Settings.setFontSize(e.target.value);
            value.innerText=e.target.value;
        };

        const updateToggles = ()=>{
            const sound =
                Settings.getSound();
            const vibration =
                Settings.getVibration();
    
            document
                .getElementById("soundToggle")
                .classList.toggle(
                    "on",
                    sound
                );

            document
                .getElementById("soundToggle")
                .innerHTML = sound ? "ON" : "OFF";

            document
                .getElementById("vibrationToggle")
                .classList.toggle(
                    "on",
                    vibration
                );

            document
                .getElementById("vibrationToggle")
                .innerHTML = vibration ? "ON" : "OFF";
        };

        document
        .getElementById("soundToggle")
        .onclick=()=>{
            Settings.setSound(
                !Settings.getSound()
            );
            updateToggles();
        };

        document
        .getElementById("vibrationToggle")
        .onclick=()=>{
            Settings.setVibration(
                !Settings.getVibration()
            );
            
            updateToggles();
        };
        
        updateToggles();
    },

    renderLegend(){
        const legend = Engine.legend;
        if(!legend){
            document.getElementById("menuPanel").innerHTML=`
                <div class="menu-title">
                    ${icons.knihy} Přehled pravidel
                </div>
                <p>
                Legenda není dostupná.
                </p>
                <hr>
                <div class="menu-item" id="menuBack">
                    ${icons.zpet} Zpět do menu
                </div>
            `;
            document.getElementById("menuBack").onclick=()=>{
                this.showMain();
            };
            return;
        }
    
        let html=`
            <div class="menu-title">
                ${icons.knihy} ${legend[0].title}
            </div>
        `;
        legend.slice(1).forEach(section=>{
            html+=`
            <div class="menu-section">
                ${section.subtitle}
            </div>
            `;
            section.items.forEach(item=>{
                html+=`
                <div class="legend-row">
                    <span class="scenario-icon">
                        ${icons[item.icon]}
                    </span>
    
                    <span>
                        ${item.text}
                    </span>
                </div>
                `;
            });
        });
    
        html+=`
            <hr>
            <div class="menu-item" id="menuBack">
                ${icons.zpet} Zpět do menu
            </div>
        `;
    
        document.getElementById("menuPanel").innerHTML=html;
    
        document.getElementById("menuBack").onclick=(e)=>{
            e.stopPropagation();
            this.showMain();
        };
    },
    
    renderAbout(){
        document.getElementById("menuPanel").innerHTML=`
        <div class="menu-title">
            ${icons.info} O aplikaci
        </div>
        <p>
        RWAG Engine
        <br>
        Verze 0.3
        </p>
        <hr>
        <div class="menu-item" id="menuBack">
            ${icons.zpet} Zpět do menu
        </div>
        `;
        document.getElementById("menuBack").onclick = (e) => {
            e.stopPropagation();
            this.showMain();
        };
    },

    renderRoles(){
        if(this.editingAssignedPlayers){
            this.renderAssignedPlayersEditor();
            return;
        }
        const hasRoles =
            Engine.state.players &&
            Engine.state.players.some(
                p=>p.role
            );
        if(hasRoles){
            this.renderAssignedRoles();
        }else{
            this.renderPlayersEditor();
        }
    },

    renderPlayersEditor(){
        if(this.editingAssignedPlayers){
            this.renderAssignedPlayersEditor();
            return;
        }
        const panel=document.getElementById("menuPanel");
        panel.innerHTML=`
        <div class="menu-title">
            ${icons.hraci}
            Správa hráčů
        </div>
        <div class="players-table">
            <div class="players-header">
                <div>Jméno</div>
                <div></div>
                <div>Role</div>
                <div></div>
            </div>
            <div id="playersList"></div>
        </div>
        <div id="playersAdd"></div>
        <hr>
        <div class="menu-item" id="menuBack">
            ${icons.zpet} Zpět do menu
        </div>
        `;
    
        this.renderPlayers();
        
        document.getElementById("menuBack").onclick=(e)=>{
            e.stopPropagation();
            this.showMain();
        };
    },

    renderAssignedPlayersEditor(){
        const panel=document.getElementById("menuPanel");
            panel.innerHTML=`
        <div class="menu-title">
            ${icons.hraci}
            Správa hráčů
        </div>
            <div class="players-table">
                <div class="players-header">
                    <div>Jméno</div>
                    <div></div>
                    <div>Role</div>
                    <div></div>
                </div>
                <div id="assignedPlayersList"></div>
            </div>
        <hr>
        <div class="menu-item" id="menuBack">
            ${icons.zpet} Zpět
        </div>
        `;
        const list=document.getElementById("assignedPlayersList");
            Engine.state.players.forEach((player,index)=>{
        const row=document.createElement("div");
            row.className="player-row-editor";
            row.innerHTML=`
        <div>
            <input 
            class="playerEditName"
            data-index="${index}"
            value="${player.name}">
        </div>

<div class="player-confirm-cell">
    <button
        class="confirmNameChange"
        data-index="${index}">
        ${icons.fajfka}
    </button>
</div>

        <div>
            ${player.role?.name || "-"}
        </div>

<div class="player-confirm-cell">
    <button
        class="confirmCancelPlayer"
        data-index="${index}">
        ${icons.krizek}
    </button>
</div>

        `;
        list.appendChild(row);
        });
        document.getElementById("menuBack").onclick=()=>{
            this.editingAssignedPlayers=false;
            this.playersMode="assigned";
            this.renderRoles();
        };

document.querySelectorAll(".confirmNameChange")
.forEach(button=>{
    const index = button.dataset.index;
    const oldName = Engine.state.players[index].name;
    const input = document.querySelector(
        `.playerEditName[data-index="${index}"]`
    );
    const newName = input.value.trim();
    if(oldName === newName){
        return;
    }
    this.confirm(
        `Skutečně chcete přejmenovat hráče <b>${oldName}</b> na <b>${newName}</b>?`,
        ()=>{
            this.savePlayerName(index);
        },
        ()=>{
            this.editingAssignedPlayers = true;
            this.renderRoles();
        }
    );
});

document.querySelectorAll(".confirmCancelPlayer")
.forEach(button=>{
    const index = button.dataset.index;
    const name = Engine.state.players[index].name;
    this.confirm(
        `Skutečně chcete odstranit hráče <b>${name}</b>?`,
        ()=>{
            this.deletePlayer(index);
        },
        ()=>{
            this.editingAssignedPlayers = true;
            this.renderRoles();
        }
    );
});
        
    },

savePlayerName(index){
    const input=document.querySelector(
        `.playerEditName[data-index="${index}"]`
    );
    if(!input.value.trim()){
        alert("Zadej jméno hráče");
        return;
    }
    Engine.state.players[index].name =
        input.value.trim();
    this.editingAssignedPlayers = true;
    this.renderRoles();
},

deletePlayer(index){
    Engine.state.players.splice(index,1);
    this.editingAssignedPlayers = true;
    this.renderRoles();
},
    
    // Výhody a nevýhody role. Schopnosti s usage "once" dostanou tlačítko,
    // které je spotřebuje - to je ta kartička "1/hru" převedená do appky.
    renderAbilities(player, playerIndex){
        const role = player.role;
        if(!role) return "";

        let html = "";

        (role.advantages || []).forEach((ability,abilityIndex)=>{
            const once =
                ability.usage &&
                ability.usage.type === "once";
            const used =
                Engine.isAbilityUsed(playerIndex,"advantages",abilityIndex);

            html += `
            <div class="role-ability ${used ? "ability-used" : ""}">
                <span>${icons[ability.icon] || icons.plus} ${ability.text}</span>
                ${once
                    ? (used
                        ? `<span class="ability-state">${icons.fajfka} použito</span>`
                        : `<button class="ability-use"
                                data-player="${playerIndex}"
                                data-ability="${abilityIndex}">
                                Použít
                           </button>`)
                    : ""}
            </div>
            `;
        });

        (role.disadvantages || []).forEach(ability=>{
            html += `
            <div class="role-ability">
                <span>${icons[ability.icon] || icons.minus} ${ability.text}</span>
            </div>
            `;
        });

        return html;
    },

    renderAssignedRoles(){
        const panel =
            document.getElementById("menuPanel");
        const players =
            Engine.state.players || [];
        let html = `
            <div class="menu-title">
                ${icons.hraci}
                Hráči a jejich role
            </div>
        `;
        players.forEach((player,playerIndex)=>{
            html += `
            <div class="role-card">
                <div class="role-card-header">
                    ${icons.role} <strong>${player.name}</strong>
                    - ${player.role?.name || "?"}
                </div>
                ${this.renderAbilities(player, playerIndex)}
            </div>
            `;
        });
        html += `
                <button
                    id="editPlayersButton"
                    class="primary-button">
                    ${icons.nastaveni}
                    Upravit hráče
                </button>
                <hr>
                <div class="menu-item" id="menuBack">
                    ${icons.zpet} Zpět do menu
                </div>
            `;
        panel.innerHTML = html;

        panel.querySelectorAll(".ability-use").forEach(button=>{
            button.onclick=(e)=>{
                e.stopPropagation();
                const playerIndex = Number(button.dataset.player);
                const abilityIndex = Number(button.dataset.ability);
                if(Engine.useAbility(playerIndex,"advantages",abilityIndex)){
                    this.renderRoles();
                }
            };
        });

        document.getElementById("editPlayersButton").onclick=(e)=>{
            e.stopPropagation();
            
            console.log("KLIK NA UPRAVIT HRÁČE");
            
            this.editingAssignedPlayers=true;
            this.renderRoles();
        };
        document.getElementById("menuBack").onclick=()=>{
            this.showMain();
        };
    },
        
    renderPlayers(){
        const list=document.getElementById("playersList");
        list.innerHTML="";
        const players=Engine.state.players || [];
        // Hotoví hráči
        players.forEach(player=>{
            const row=document.createElement("div");
            row.className="player-row";
            row.innerHTML=`
                <div class="player-name-cell">
                    <input 
                        class="playerEditName"
                        data-index="${index}"
                        value="${player.name}">
                </div>
                <div class="player-role-cell">
                    ${player.role?.name || "-"}
                </div>
            `;
            list.appendChild(row);
        });
    
        // Rozpracovaní hráči
        Engine.state.pendingPlayers.forEach((player,index)=>{
            const row=document.createElement("div");
            row.className="player-row";
            row.innerHTML=`
                <div class="player-name-cell">
                    ${
                        player.confirmed
                        ?
                        `<span>${player.name}</span>`
                        :
                        `
                        <input
                            class="playerNameInput"
                            data-index="${index}"
                            placeholder="Jméno hráče"
                            value="${player.name}">
                        `
                    }
                </div>
                <div class="player-confirm-cell">
                    ${
                        player.confirmed
                        ? ""
                        : `
                            <button
                                class="confirmName"
                                data-index="${index}">
                                ${icons.fajfka}
                            </button>
                        `
                    }
                </div>
                <div class="player-role-cell">
                    ${
                        this.playersMode === "edit"
                        ? `
                            <button
                                class="cancelPlayer"
                                data-index="${index}">
                                ${icons.krizek}
                            </button>
                        `
                        : ""
                    }
                </div>
            `;
            list.appendChild(row);
        });

        document.querySelectorAll(".confirmName")
        .forEach(button=>{
            button.onclick=()=>{
                const index =
                    button.dataset.index;
                const input =
                    document.querySelector(
                        `.playerNameInput[data-index="${index}"]`
                    );
                if(!input.value.trim()){
                    alert("Zadej jméno hráče");
                    return;
                }
                Engine.state.pendingPlayers[index].name =
                    input.value.trim();
                Engine.state.pendingPlayers[index].confirmed =
                    true;
                console.log(
                    "PENDING:",
                    Engine.state.pendingPlayers
                );
                this.renderRoles();
            };
        });

        document.querySelectorAll(".cancelPlayer")
        .forEach(button=>{
            button.onclick=()=>{
                const type = button.dataset.type;
                const index = Number(button.dataset.index);
                if(type === "player"){
                    Engine.state.players.splice(index,1);
                }else{
                    Engine.state.pendingPlayers.splice(index,1);
                }
                this.renderRoles();
            };
        });
        
         // Plus dole
        const add = document.getElementById("playersAdd");
        const max = Engine.game.players_max || 8;
        const min = Engine.game.players_min || 1;
        const totalRows =
            players.length +
            Engine.state.pendingPlayers.length;
        const confirmedPending =
            Engine.state.pendingPlayers.filter(
                p =>
                    p.confirmed &&
                    p.name.trim() !== ""
            ).length;
        const totalPlayers =
            players.length + confirmedPending;
        const canAssign =
            totalPlayers >= min;
        
        add.innerHTML = "";
        
        // tlačítko +
        if(totalRows < max){
            add.innerHTML += `
                <button id="addPlayer" class="icon-button">
                    ${icons.plus}
                </button>
            `;
        }
        
        // tlačítko potvrdit
        add.innerHTML += `
            <button
                id="confirmPlayers" class="primary-button"
                ${canAssign ? "" : "disabled"}>
                ${icons.kostka}
                Potvrdit a přidělit role
            </button>
        `;

        const addBtn = document.getElementById("addPlayer");
        if(addBtn){
            addBtn.onclick = () => this.addPlayerForm();
        }
        
        document.getElementById("confirmPlayers").onclick = () => {
            this.confirm(
                "Nyní dojde k náhodnému přiřazení rolí jednotlivým hráčům. Přejete si pokračovat?",
                ()=>{
                    this.assignRoles();
                },
                ()=>{
                    this.showRoles();
                },
                ()=>{
                    this.renderRoles();
                }
            );
        };
    },

    assignRoles(){
        const confirmed =
            Engine.state.pendingPlayers.filter(
                p=>p.confirmed
            );
        Engine.state.players = confirmed;
        Engine.state.pendingPlayers = [];
        // vytvoří kopii seznamu rolí
        const roles = [...Engine.game.roles];
        // náhodně je rozdá hráčům
        Engine.state.players.forEach(player=>{
            const index =
                Math.floor(
                    Math.random()*roles.length
                );
            player.role = roles[index];
            roles.splice(index,1);
        });
        this.playersMode="assigned";
        this.renderRoles();
    },
    
    addPlayerForm(){
        Engine.state.pendingPlayers.push({
            name:"",
            confirmed:false,
        });
        this.renderRoles();
    },

    showMain(){
        this.page="main";
        this.render();
    },
    
    showRoles(){
        this.page="roles";
        this.render();
    },

    confirm(text, yesCallback, noCallback){
        this.confirmYes = null;
        this.confirmNo = null;
        this.page = "confirm";
        this.confirmText = text;
        this.confirmYes = yesCallback;
        this.confirmNo = noCallback;
        this.render();
    },

    renderConfirm(){
        console.log("RENDER CONFIRM:", this.confirmText);
        document.getElementById("menuPanel").innerHTML=`
            <div class="menu-title">
                ${icons.otaznik} Potvrzení
            </div>
            <div class="menu-description">
                ${this.confirmText}
            </div>
            <hr>
            <div class="menu-item" id="confirmYes">
                ${icons.fajfka} Ano
            </div>
            <div class="menu-item" id="confirmNo">
                ${icons.krizek} Ne
            </div>
        `;
        document.getElementById("confirmYes").onclick=(e)=>{
            e.stopPropagation();
            if(this.confirmYes){
                this.confirmYes();
            }
        };
        document.getElementById("confirmNo").onclick=(e)=>{
            e.stopPropagation();
                    if(this.confirmNo){
                this.confirmNo();
            }else{
                this.showMain();
            }
        };
    }
};

window.Menu=Menu;
