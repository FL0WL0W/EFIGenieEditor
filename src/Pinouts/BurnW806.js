import { communication } from "../communication"

export function BurnW806(cfg, type){
    const saveValue = JSON.stringify(cfg.saveValue)
    const bin = buildConfig({ ...cfg.value, type: type })

    window.localStorage.setItem(`config`, saveValue)

    communication.burnBin(bin).then(function() { alert(`Bin Burned!`)}).catch(function(e) { alert(e)})
}