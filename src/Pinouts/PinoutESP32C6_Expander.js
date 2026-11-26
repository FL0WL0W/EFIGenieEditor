import CommunicationService_WebSocket from "../CommunicationService/CommunicationService_WebSocket.js"
import { communication } from '../communication';
import TopExpander from '../Top/TopExpander';
import { BurnESP32 } from './BurnESP32';
import overlayURL from './ESP32C6_Expander.svg';
import Pinouts from "./Pinouts"
import { downloadBin } from '../download';
Pinouts.ESP32C6_Expander = { 
    name: `ESP32C6 Expander`,
    Overlay: overlayURL,
    OverlayWidth: 200,
    OverlayElementHeight: 6,
    CANBusCount: 2,
    ProcessorDefinition: [
        { type: `INT8`, align: 1, endian: `little` }, 
        { type: `INT16`, align: 2, endian: `little` },
        { type: `INT32`, align: 4, endian: `little` },
        { type: `INT64`, align: 8, endian: `little` },
        { type: `BOOL`, align: 1, endian: `little` }, 
        { type: `UINT8`, align: 1, endian: `little` },
        { type: `UINT16`, align: 2, endian: `little` },
        { type: `UINT32`, align: 4, endian: `little` },
        { type: `UINT64`, align: 8, endian: `little` },
        { type: `FLOAT`, align: 4, endian: `little` },
        { type: `DOUBLE`, align: 8, endian: `little` },
    ],
    Pins: [
        { name: `1`, value: 1, supportedModes: `digitalin digitalout analog pwmout`, overlayX: 62, overlayY: 112, align: `right`},
        { name: `3`, value: 3, supportedModes: `digitalin digitalout analog pwmout`, overlayX: 62, overlayY: 126, align: `right`},
        { name: `4`, value: 4, supportedModes: `digitalin digitalout analog pwmout`, overlayX: 62, overlayY: 133, align: `right`},
        { name: `5`, value: 5, supportedModes: `digitalin digitalout digitalinterrupt analog pwmout`, overlayX: 62, overlayY: 140, align: `right`},
        { name: `6`, value: 6, supportedModes: `digitalin digitalout digitalinterrupt analog pwmout`, overlayX: 62, overlayY: 147, align: `right`},
        { name: `7`, value: 7, supportedModes: `digitalin digitalout digitalinterrupt analog pwmout`, overlayX: 62, overlayY: 154, align: `right`},
        { name: `10`, value: 10, supportedModes: `digitalout pwmout`, overlayX: 140, overlayY: 112, align: `left`},
        { name: `13`, value: 13, supportedModes: `digitalin digitalout`, overlayX: 140, overlayY: 133, align: `left`},
        { name: `14`, value: 14, supportedModes: `digitalin digitalout`, overlayX: 140, overlayY: 140, align: `left`},
        { name: `16`,  value: 16,  supportedModes: `digitalin digitalout digitalinterrupt analog pwmout`, overlayX: 140, overlayY: 154, align: `left`},
    ],
    Type: "TopExpander",
    Top: TopExpander,
    Burn: async function(cfg) {
        // const bin = buildConfig({ ...cfg.value, type: this.Type }, this.ProcessorDefinition);
        // downloadBin(bin, 'Expander-Config.bin');
        await BurnESP32(cfg, this.Type, this.ProcessorDefinition);
    },
    Connect: function() {
        const service = communication.communicationService instanceof CommunicationService_WebSocket
            ? communication.communicationService
            : new CommunicationService_WebSocket("/EFIGenieCommunication")
        communication.endian = `little`
        return communication.connect(service)
    }
}
