import { communication, Serial } from '../communication';
import { BurnW806 } from './BurnW806';
import overlayURL from './Purple_Pill_W806.svg';
import Pinouts from "./Pinouts"
import TopEngine from '../Top/TopEngine';
Pinouts.Purple_Pill_W806 = { 
    name: `Purple pill: W806`,
    Overlay: overlayURL,
    OverlayWidth: 720,
    OverlayElementHeight: 22,
    Pins: [
        { name: `PA_0`,  value: (32*0 + 0 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 560, align: `left`},
        { name: `PA_1`,  value: (32*0 + 1 ), supportedModes: `digitalin digitalout digitalinterrupt analog pwm`, overlayX: 568, overlayY: 537, align: `left`},
        { name: `PA_2`,  value: (32*0 + 2 ), supportedModes: `digitalin digitalout digitalinterrupt analog pwm`, overlayX: 568, overlayY: 514, align: `left`},
        { name: `PA_3`,  value: (32*0 + 3 ), supportedModes: `digitalin digitalout digitalinterrupt analog pwm`, overlayX: 568, overlayY: 491, align: `left`},
        { name: `PA_4`,  value: (32*0 + 4 ), supportedModes: `digitalin digitalout digitalinterrupt analog pwm`, overlayX: 568, overlayY: 468, align: `left`},
        { name: `PA_5`,  value: (32*0 + 5 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 568, overlayY: 445, align: `left`},
        { name: `PA_6`,  value: (32*0 + 6 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 568, overlayY: 422, align: `left`},
        { name: `PA_7`,  value: (32*0 + 7 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 399, align: `left`},
        { name: `PA_8`,  value: (32*0 + 8 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 568, overlayY: 376, align: `left`},
        { name: `PA_9`,  value: (32*0 + 9 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 568, overlayY: 353, align: `left`},
        { name: `PA_10`, value: (32*0 + 10), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 330, align: `left`},
        { name: `PA_11`, value: (32*0 + 11), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 307, align: `left`},
        { name: `PA_12`, value: (32*0 + 12), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 284, align: `left`},
        { name: `PA_13`, value: (32*0 + 13), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 261, align: `left`},
        { name: `PA_14`, value: (32*0 + 14), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 238, align: `left`},
        { name: `PA_15`, value: (32*0 + 15), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 568, overlayY: 215, align: `left`},
        { name: `PB_0`,  value: (32*1 + 0 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 192, align: `left`},
        { name: `PB_1`,  value: (32*1 + 1 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 169, align: `left`},
        { name: `PB_2`,  value: (32*1 + 2 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 146, align: `left`},
        { name: `PB_3`,  value: (32*1 + 3 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 568, overlayY: 123, align: `left`},
        { name: `PB_27`, value: (32*1 + 27), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 568, overlayY: 100, align: `left`},
        { name: `PB_4`,  value: (32*1 + 4 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 568, overlayY: 77, align: `left`},
        { name: `PB_5`,  value: (32*1 + 5 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 555, overlayY: 77, align: `right`},
        { name: `PB_6`,  value: (32*1 + 6 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 555, overlayY: 100, align: `right`},
        { name: `PB_7`,  value: (32*1 + 7 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 555, overlayY: 123, align: `right`},
        { name: `PB_8`,  value: (32*1 + 8 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 555, overlayY: 146, align: `right`},
        { name: `PB_9`,  value: (32*1 + 9 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 555, overlayY: 169, align: `right`},
        { name: `PB_12`, value: (32*1 + 12), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 555, overlayY: 192, align: `right`},
        { name: `PB_13`, value: (32*1 + 13), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 215, align: `right`},
        { name: `PB_14`, value: (32*1 + 14), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 238, align: `right`},
        { name: `PB_15`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 261, align: `right`},
        { name: `PB_10`, value: (32*1 + 10), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 555, overlayY: 284, align: `right`},
        { name: `PB_11`, value: (32*1 + 10), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 555, overlayY: 307, align: `right`},
        { name: `PB_16`, value: (32*1 + 14), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 330, align: `right`},
        { name: `PB_17`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt` , overlayX: 555, overlayY: 353, align: `right`},
        { name: `PB_18`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt` , overlayX: 555, overlayY: 376, align: `right`},
        { name: `PB_26`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 399, align: `right`},
        { name: `PB_25`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 422, align: `right`},
        { name: `PB_24`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 445, align: `right`},
        { name: `PB_22`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt` , overlayX: 555, overlayY: 468, align: `right`},
        { name: `PB_21`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt` , overlayX: 555, overlayY: 491, align: `right`},
        { name: `PB_20`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 514, align: `right`},
        { name: `PB_19`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 555, overlayY: 537, align: `right`},

    ],
    Type: "TopEngine",
    Top: TopEngine,
    Burn: async function(cfg) {
        await BurnW806(cfg, this.Type);
    },
    Connect: function() {
        communication._serial = new Serial({ baudRate: 1000000 }, [ 
                { usbVendorId: 0x1a86, usbProductId: 0x7523 } 
            ])
        communication.connect()
    }
}