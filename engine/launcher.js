console.log("launcher.js načten");

const Launcher = {
    scenarios: [],
    async init() {
        Settings.load();
        console.log("Launcher.init()");
        console.log("LAUNCHER INIT");
        const response = await fetch(
            "games/scenarios.json"
        );
        if (!response.ok) {
            throw new Error(
                "Nelze načíst seznam scénářů"
            );
        }
        this.scenarios = await response.json();
        Menu.init();
        Status.render();
        this.render();
    },

    render() {
        const root = document.getElementById(
            "launcher"
        );
        if(!root) return;
        root.innerHTML="";
        const title=document.createElement("h2");
        title.innerText="Vyber scénář";
        
        root.appendChild(title);

        const container=document.createElement(
        "div"
        );
        container.className="scenario-list";
        this.scenarios.forEach(
            scenario=>{
                const status =
                    ScenarioStatus.get(
                        scenario.status
                    );
                const saved =
                    window.Save
                        ? Save.describe(scenario.id)
                        : null;
                const card=document.createElement(
                    "div"
                );
                card.className="scenario-card";
                card.innerHTML=`
                <div class="scenario-image">
                    <img src="${scenario.image}">
                </div>
                <div class="scenario-info">
                    <div class="scenario-title">
                        ${scenario.name}
                    </div>
                    <div class="scenario-description">
                        ${scenario.description}
                    </div>
                </div>
                <div class="scenario-details">
                    <div class="scenario-detail">
                        <span class="scenario-icon">
                            ${icons.pin}
                        </span>
                        <span>
                             ${scenario.location}
                        </span>
                    </div>
                    <div class="scenario-detail">
                        <span class="scenario-icon">
                            ${icons.stopky}
                        </span>
                        <span>
                            ${scenario.time}
                        </span>
                    </div>
                    <div class="scenario-detail">
                        <span class="scenario-icon">
                            ${icons.hraci}
                        </span>
                        <span>
                            ${scenario.players}
                        </span>
                    </div>
                    <div class="scenario-detail">
                        <span class="scenario-icon">
                            ${status.icon}
                        </span>
                        <span>
                            ${status.text}
                        </span>
                    </div>
                </div>
                ${saved
                    ? `<button class="scenario-continue">
                           ${icons.disketa} Pokračovat (${saved})
                       </button>`
                    : ""}
                `;
                card.onclick=()=>{
                    this.startScenario(
                        scenario
                    );
                };
                if(saved){
                    card.querySelector(".scenario-continue")
                        .onclick=(e)=>{
                            e.stopPropagation();
                            this.startScenario(
                                scenario,
                                Save.read(scenario.id)
                            );
                        };
                }
                container.appendChild(card);
            }
        );
        root.appendChild(container);
    },

    startScenario(scenario, saved) {
        console.log(
            "START SCENARIO:",
            scenario.id,
            saved ? "(pokračování)" : "(nová hra)"
        );

        document.getElementById(
            "launcher"
        ).style.display = "none";

        document.getElementById(
            "game"
        ).style.display = "block";

        Engine.start(
            scenario.id,
            saved
        );
    }
};
