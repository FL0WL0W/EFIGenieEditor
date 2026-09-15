import overlayURL from './E78.svg';
import Pinouts from './Pinouts';
import TopEngine from '../Top/TopEngine';
import buildConfig from '../buildConfig';
import { downloadBin } from '../download';

// E78DigitalService uses connector * 100 + cavity (X2-5 is 205). Keep this
// list in connector numbering, not MPC5566 SIU pad numbering. The available
// digital mappings below follow EFIGenieE78/src/E78DigitalService.cpp.
const input = 'digitalin';
const interruptInput = 'digitalin digitalinterrupt';
const output = 'digitalout';
const inputOutput = 'digitalin digitalout';
const analogInput = 'analogin';

const connectorPins = {
    // Blue MX123: 56 cavities. The 56-way header has no power blade.
    1: [
        [2, 'APP2', analogInput], 
        [3, 'MAF', interruptInput], 
        [4, '', interruptInput],
        [5, '', interruptInput], 
        [6, '', input],
        [7, '', interruptInput], 
        [8, 'Humidity', interruptInput],
        [9, 'Turbo IAP', analogInput], 
        [10, 'APP1', analogInput], 
        [11, 'Throttle IAP', analogInput], 
        [12, 'A/C Pressure', analogInput], 
        [14, 'Secondary fuel pump', output], 
        [18, 'Accessory wake', interruptInput],
        [27, 'Starter relay', output], 
        [28, 'Fuel pump relay', output],
        [33, 'Brake', input], 
        [34, 'Park/neutral', input],
        [40, 'Powertrain relay', output], 
        [41, 'Cooling fan relay', output],
        [44, '', interruptInput], 
        [45, 'IAT', analogInput], 
        [46, 'ECT2', analogInput], 
        [47, 'Charge indicator', inputOutput],
        [50, '', output], 
        [51, 'Delphi output', output],
        [52, 'Check engine lamp', output], 
        [53, 'A/C clutch relay', output],
        [54, 'High-speed fan', output], 
        [55, '', output],
        [56, 'EVAP vent', output],
    ],
    // Black MX123: 72 signal cavities plus one separate power blade.
    2: [
        [1, 'Ignition', output],
        [2, 'Injector', output], 
        [3, 'Injector', output],
        [4, 'Injector', output], 
        [5, 'Injector', output],
        [6, 'Injector', output], 
        [7, 'Injector', output],
        [8, 'Injector', output], 
        [9, 'Injector', output],
        [10, 'Exhaust cam phaser', output], 
        [11, 'Intake cam phaser', output],
        [12, '', output], 
        [14, 'Thermostat heater', output],
        [15, 'ETC open', output], 
        [16, 'ETC close', output],
        [17, 'Ignition', output], 
        [18, 'Ignition', output],
        [31, 'Oil pressure switch', interruptInput], 
        [32, '', output],
        [33, 'Ignition', output], 
        [34, 'Ignition', output],
        [45, 'Throttle SENT', interruptInput],
        [46, 'Turbo Boost IAT', analogInput], 
        [52, 'O2 heater', output], 
        [53, 'Ignition', output],
        [54, 'Ignition', output], 
        [55, 'Ignition', output],
        [56, 'Crank', interruptInput], 
        [57, 'Exhaust cam', interruptInput],
        [59, '', interruptInput], 
        [60, 'Intake cam', interruptInput],
        [61, 'Oil Pressure', analogInput], 
        [62, '', analogInput], 
        [63, 'TPS1', analogInput], 
        [64, '', analogInput], 
        [65, 'TPS2', analogInput], 
        [66, '', analogInput], 
        [67, 'O2B1S1', analogInput], 
        [68, 'O2B2S1', analogInput], 
        [69, 'Knock', input], [72, 'O2 heater', output],
    ],
    // Gray MX123: 72 signal cavities plus one separate power blade.
    3: [
        [1, 'Reverse switch', interruptInput], 
        [2, '', interruptInput],
        [3, 'Delphi output', output], 
        [4, 'Delphi output', output],
        [5, 'Delphi output', output], 
        [6, 'Delphi output', output],
        [7, '', output], 
        [8, 'Delphi output', output],
        [9, 'Delphi output', output], 
        [10, 'EVAP purge', output],
        [11, 'Delphi output', output], 
        [12, 'Intake manifold valve', output],
        [13, 'Turbo bypass', output], 
        [14, 'Delphi output', output],
        [15, 'Wastegate', output], 
        [16, 'O2 heater (tentative)', output],
        [17, 'Generator field', output], 
        [18, '', interruptInput],
        [32, 'O2 heater', output], 
        [33, '', interruptInput],
        [34, '', interruptInput], 
        [44, 'Fuel Level 2', analogInput], 
        [45, 'MAP', analogInput], 
        [46, 'ECT', analogInput], 
        [47, '', analogInput], 
        [48, 'Vehicle speed', interruptInput],
        [53, '', interruptInput], 
        [54, '', interruptInput],
        [55, 'Vehicle speed', interruptInput],
        [56, '', analogInput], 
        [57, '', analogInput], 
        [58, 'Clutch/Brake', analogInput], 
        [59, '', analogInput], 
        [60, '', analogInput], 
        [61, '', analogInput], 
        [62, '', analogInput], 
        [63, 'Fuel Tank Pressure', analogInput], 
        [64, 'Fuel Level 1', analogInput],
        [65, 'O2B2S2', analogInput], 
        [67, 'O2B1S2', analogInput], 
    ],
};


function makePin(connector, cavity, functionName, supportedModes) {
    let column = 0;
    let row = 0;
    if(connector === 1) {
        // Blue MX123: 56 cavities, 4 columns of 14 rows.
        column = Math.floor((cavity - 1) / 14);
        row = (cavity - 1) % 14;
    } else {
        // Black and gray MX123: 72 cavities, 4 columns of 18 rows.
        if(cavity > 52) {
            row = cavity - 53;
            column = 3;
        } else if(cavity > 32) {
            row = cavity - 33;
            column = 2;
        } else if(cavity > 16) {
            row = cavity - 17;
            column = 1;
        } else {
            row = cavity - 1;
            column = 0;
        }
    }
    return {
        name: `X${connector}-${cavity}${functionName ? ` ${functionName}` : ''}`,
        value: connector * 100 + cavity,
        supportedModes,
        // UIPinOverlay positions a right-aligned label at
        // OverlayWidth - overlayX, so convert the desired left edge here.
        overlayX: 500 + column * 1075 - (column < 2 ? 0 : 400),
        overlayY: 5630 - row * 120 + (connector-1) * 2520,
        align: column < 2 ? `right` : `left`,
    };
}

Pinouts.E78 = {
    name: 'E78',
    Overlay: overlayURL,
    OverlayWidth: 3950,
    OverlayElementHeight: 120,
    // Current EFIGenieE78 initializes only FlexCAN-A.
    CANBusCount: 1,
    ProcessorDefinition: [
        { type: `INT8`, align: 1, endian: `big` }, 
        { type: `INT16`, align: 2, endian: `big` },
        { type: `INT32`, align: 4, endian: `big` },
        { type: `INT64`, align: 8, endian: `big` },
        { type: `BOOL`, align: 1, endian: `big` }, 
        { type: `UINT8`, align: 1, endian: `big` },
        { type: `UINT16`, align: 2, endian: `big` },
        { type: `UINT32`, align: 4, endian: `big` },
        { type: `UINT64`, align: 8, endian: `big` },
        { type: `FLOAT`, align: 4, endian: `big` },
        { type: `DOUBLE`, align: 8, endian: `big` },
    ],
    Pins: Object.entries(connectorPins).flatMap(([connector, pins]) =>
        pins.map(([cavity, functionName, supportedModes]) =>
            makePin(Number(connector), cavity, functionName, supportedModes))),
    Type: 'TopEngine',
    Top: TopEngine,
    Burn: async function(cfg) {
        const bin = buildConfig({ ...cfg.value, type: this.Type }, this.ProcessorDefinition);
        downloadBin(bin, 'E78-Config.bin');
    },
    Connect: function() {
        throw new Error('E78 communication transport is not configured yet.');
    },
};
