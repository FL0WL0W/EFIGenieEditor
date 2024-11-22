import UITemplate from "../JavascriptUI/UITemplate"
import UIPinSelection from "../UI/UIPinSelection"
import FloatOutputConfigs from "./FloatOutputConfigs"
import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import GenericConfigs from "../Calculation/GenericConfigs"
export default class Output_PWM extends UITemplate {
    static displayName = `PWM Pin`
    static template =   `<label>Pin:</label><div data-element="pin"></div><div data-element="period"></div><div data-element="pulseWidth"></div>`

    pin = new UIPinSelection({ value: 0xFFFF, pinType: `pwmout` })
    period = new CalculationOrVariableSelection({
        label:          `Period`,
        outputUnits:    [ `s` ],
        displayUnits:   [ `ms` ],
        calculations: GenericConfigs
    })
    pulseWidth = new CalculationOrVariableSelection({
        label:          `PulseWidth`,
        outputUnits:    [ `s` ],
        displayUnits:   [ `ms` ],
        calculations: GenericConfigs
    })
    
    constructor(prop){
        super()
        this.style.display = `block`
        this.Setup(prop)
    }

    RegisterVariables(reference) {
        this.period.RegisterVariables(reference)
        this.pulseWidth.RegisterVariables(reference)
    }
}
FloatOutputConfigs.push(Output_PWM)
customElements.define(`output-pwm`, Output_PWM, { extends: `span` })