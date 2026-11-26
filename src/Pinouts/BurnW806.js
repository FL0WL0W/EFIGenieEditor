import CommunicationService_Serial from "../CommunicationService/CommunicationService_Serial.js"
import { communication } from "../communication"

export async function BurnW806(cfg, type, processorDefinition){
    const service = communication.communicationService instanceof CommunicationService_Serial
        ? communication.communicationService
        : new CommunicationService_Serial({ baudRate: 1000000 }, [
            { usbVendorId: 0x1a86, usbProductId: 0x7523 }
        ])
    const bin = buildConfig({ ...cfg.value, type: type }, processorDefinition)

    communication.endian = `little`
    await communication.burnBin(bin, service)
}
