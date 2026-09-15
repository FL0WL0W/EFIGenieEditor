import { communication, Socket } from '../communication';
import TopExpander from '../Top/TopExpander';
import { BurnESP32 } from './BurnESP32';
import overlayURL from './ESP32C6_Expander.svg';
import Pinouts from "./Pinouts"
Pinouts.ESP32C6_Expander = { 
    name: `ESP32C6 Expander`,
    Overlay: overlayURL,
    OverlayWidth: 610,
    OverlayElementHeight: 25,
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
        { name: `1`, value: 1, supportedModes: `digitalin digitalout analog pwmout`, overlayX: 120, overlayY: 345, align: `right`},
        { name: `3`, value: 3, supportedModes: `digitalin digitalout analog pwmout`, overlayX: 120, overlayY: 391, align: `right`},
        { name: `4`, value: 4, supportedModes: `digitalin digitalout analog pwmout`, overlayX: 120, overlayY: 414, align: `right`},
        { name: `5`, value: 5, supportedModes: `digitalin digitalout digitalinterrupt analog pwmout`, overlayX: 120, overlayY: 437, align: `right`},
        { name: `6`, value: 6, supportedModes: `digitalin digitalout digitalinterrupt analog pwmout`, overlayX: 120, overlayY: 460, align: `right`},
        { name: `7`, value: 7, supportedModes: `digitalin digitalout digitalinterrupt analog pwmout`, overlayX: 120, overlayY: 483, align: `right`},
        { name: `10`, value: 10, supportedModes: `digitalout pwmout`, overlayX: 345, overlayY: 345, align: `left`},
        { name: `13`, value: 14, supportedModes: `digitalin digitalout`, overlayX: 345, overlayY: 414, align: `left`},
        { name: `14`, value: 14, supportedModes: `digitalin digitalout`, overlayX: 345, overlayY: 437, align: `left`},
        { name: `16`,  value: 16,  supportedModes: `digitalin digitalout digitalinterrupt analog pwmout`, overlayX: 345, overlayY: 483, align: `left`},
    ],
    Type: "TopExpander",
    Top: TopExpander,
    Burn: async function(cfg) {
        await BurnESP32(cfg, this.Type, this.ProcessorDefinition);
    },
    Connect: function() {
        communication._serial = new Socket("EFIGenieCommunication")
        communication.connect()
    }
}