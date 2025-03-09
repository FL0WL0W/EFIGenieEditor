import { communication, Serial } from "../communication"

export async function BurnW806(cfg, type){
    communication._serial = new Serial({ baudRate: 1000000 }, [ 
            { usbVendorId: 0x1a86, usbProductId: 0x7523 } 
        ])
    const bin = buildConfig({ ...cfg.value, type: type })

    await communication.burnBin(bin)
}