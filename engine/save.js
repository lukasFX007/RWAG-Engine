// Uložení a načtení rozehrané pozice.
//
// Ukládá se do localStorage zvlášť pro každý scénář, takže rozehraná hra
// v jednom scénáři nepřepíše rozehranou hru v jiném.
// Autosave běží po každém přechodu na scénu - osmihodinová hra v terénu
// nesmí skončit tím, že někomu zhasne displej.

const SAVE_VERSION = 1;
const SAVE_PREFIX = "rwag_save_";

const Save = {

    key(gameId){
        return SAVE_PREFIX + gameId;
    },

    save(){
        if(!Engine.game || !Engine.currentScene){
            return false;
        }
        const data = {
            version:SAVE_VERSION,
            gameId:Engine.game.gameId,
            scenarioName:Engine.game.scenarioName,
            sceneId:Engine.currentScene.id,
            savedAt:new Date().toISOString(),
            state:Engine.state
        };
        try{
            localStorage.setItem(
                this.key(data.gameId),
                JSON.stringify(data)
            );
            console.log("ULOŽENO:", data.gameId, data.sceneId);
            return true;
        }catch(e){
            console.error("Uložení selhalo", e);
            return false;
        }
    },

    autosave(){
        return this.save();
    },

    read(gameId){
        try{
            const raw = localStorage.getItem(this.key(gameId));
            if(!raw) return null;
            const data = JSON.parse(raw);
            if(data.version !== SAVE_VERSION){
                console.warn(
                    "Uložená pozice má jinou verzi, ignoruji:",
                    data.version
                );
                return null;
            }
            return data;
        }catch(e){
            console.error("Načtení pozice selhalo", e);
            return null;
        }
    },

    has(gameId){
        return !!this.read(gameId);
    },

    clear(gameId){
        localStorage.removeItem(this.key(gameId));
        console.log("POZICE SMAZÁNA:", gameId);
    },

    // krátký popis pro menu, např. "Tajemství Nebákova - 27.7.2026 14:32"
    describe(gameId){
        const data = this.read(gameId);
        if(!data) return null;
        const date = new Date(data.savedAt);
        return `${date.toLocaleDateString("cs-CZ")} ${date.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}`;
    }
};

window.Save = Save;
