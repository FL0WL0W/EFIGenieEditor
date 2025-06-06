import UITemplate from "../JavascriptUI/UITemplate"
import UINumberWithUnit from "../UI/UINumberWithUnit"
import UIPinSelection from "../UI/UIPinSelection"
import RawInputConfigs from "./RawInputConfigs"
export default class Input_DutyCycle extends UITemplate {
    static displayName = `Duty Cycle Pin Pin`
    static outputUnits = [ `[0.0-1.0]` ]
    static template =   `<label>Pin:</label><div data-element="pin"></div>` +
                        `<br/><label>Minimum Frequency:</label><div data-element="minFrequency"></div>`

    pin = new UIPinSelection({ value: 0xFFFF, pinType: `pwm` })
    minFrequency = new UINumberWithUnit({
        value:          1000,
        step:           1,
        min:            0,
        max:            65535,
        measurement:    `Frequency`,
        valueUnit:      `Hz`
    })
    constructor(prop){
        super()
        this.style.display = `block`
        this.Setup(prop)
    }
}
RawInputConfigs.push(Input_DutyCycle)
customElements.define(`input-dutycycle`, Input_DutyCycle, { extends: `span` })