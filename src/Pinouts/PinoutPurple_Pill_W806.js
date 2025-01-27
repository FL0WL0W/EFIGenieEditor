import { BurnW806 } from './BurnW806';
import Pinouts from "./Pinouts"
Pinouts.Purple_Pill_W806 = { 
    name: `Purple pill: W806`,
    Overlay: `images/W806_Overlay.png`,
    OverlayWidth: 577,
    OverlayElementHeight: 22,
    Pins: [
        { name: `PA_0`,  value: (32*0 + 0 ), supportedModes: `digitalin digitalout digitalinterrupt analog pwm`, overlayX: 577, overlayY: 220, align: `right`},
        { name: `PA_1`,  value: (32*0 + 1 ), supportedModes: `digitalin digitalout digitalinterrupt analog pwm`, overlayX: 577, overlayY: 242, align: `right`},
        { name: `PA_2`,  value: (32*0 + 2 ), supportedModes: `digitalin digitalout digitalinterrupt analog pwm`, overlayX: 577, overlayY: 264, align: `right`},
        { name: `PA_3`,  value: (32*0 + 3 ), supportedModes: `digitalin digitalout digitalinterrupt analog pwm`, overlayX: 577, overlayY: 286, align: `right`},
        { name: `PA_4`,  value: (32*0 + 4 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 308, align: `right`},
        { name: `PA_5`,  value: (32*0 + 5 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 330, align: `right`},
        { name: `PA_6`,  value: (32*0 + 6 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 352, align: `right`},
        { name: `PA_7`,  value: (32*0 + 7 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 374, align: `right`},
        { name: `PA_8`,  value: (32*0 + 8 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 440, align: `left`},
        { name: `PA_9`,  value: (32*0 + 9 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 418, align: `left`},
        { name: `PA_10`, value: (32*0 + 10), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 396, align: `left`},
        { name: `PA_11`, value: (32*0 + 11), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 374, align: `left`},
        { name: `PA_12`, value: (32*0 + 12), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 352, align: `left`},
        { name: `PA_13`, value: (32*0 + 13), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 352, align: `left`},
        { name: `PA_14`, value: (32*0 + 14), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 352, align: `left`},
        { name: `PA_15`, value: (32*0 + 15), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 330, align: `left`},
        { name: `PB_0`,  value: (32*1 + 0 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 396, align: `right`},
        { name: `PB_1`,  value: (32*1 + 1 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 418, align: `right`},
        { name: `PB_2`,  value: (32*1 + 2 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 440, align: `right`},
        { name: `PB_3`,  value: (32*1 + 3 ), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 308, align: `left`},
        { name: `PB_27`, value: (32*1 + 27), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 462, align: `right`},
        { name: `PB_4`,  value: (32*1 + 4 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 286, align: `left`},
        { name: `PB_5`,  value: (32*1 + 5 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 264, align: `left`},
        { name: `PB_6`,  value: (32*1 + 6 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 242, align: `left`},
        { name: `PB_7`,  value: (32*1 + 7 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 220, align: `left`},
        { name: `PB_8`,  value: (32*1 + 8 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 198, align: `left`},
        { name: `PB_9`,  value: (32*1 + 9 ), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 176, align: `left`},
        { name: `PB_10`, value: (32*1 + 10), supportedModes: `digitalin digitalout digitalinterrupt`, overlayX: 577, overlayY: 462, align: `right`},
        { name: `PB_12`, value: (32*1 + 12), supportedModes: `digitalin digitalout digitalinterrupt pwm`, overlayX: 577, overlayY: 528, align: `left`},

        { name: `PB_15`, value: (32*1 + 15), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 577, overlayY: 462, align: `left`},
        { name: `PB_14`, value: (32*1 + 14), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 577, overlayY: 484, align: `left`},
        { name: `PB_13`, value: (32*1 + 13), supportedModes: `digitalin digitalout digitalinterrupt pwm` , overlayX: 577, overlayY: 506, align: `left`},
    ],
    Type: `TopEngine`,
    Burn: function(cfg) {
        BurnW806(cfg, this.Type);
    }
}