import { communication } from "../communication"

export async function BurnW806(cfg, type){
    communication._serial = new Serial({ baudRate: 1000000 }, [ 
            { usbVendorId: 0x1a86, usbProductId: 0x7523 } 
        ])
    const saveValue = JSON.stringify(cfg.saveValue)
    const bin = buildConfig({ ...cfg.value, type: type })

    window.localStorage.setItem(`config`, saveValue)

    await communication.burnBin(bin)
}