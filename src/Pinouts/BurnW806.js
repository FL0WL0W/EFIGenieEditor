import { communication } from "../communication"

export async function BurnW806(cfg, type){
    const saveValue = JSON.stringify(cfg.saveValue)
    const bin = buildConfig({ ...cfg.value, type: type })

    window.localStorage.setItem(`config`, saveValue)

    await communication.burnBin(bin)
}